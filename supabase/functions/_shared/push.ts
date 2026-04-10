import admin from "npm:firebase-admin@12.0.0";

import { createServiceClient } from "./supabase.ts";

export const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
};

type LegacyTagFilter = {
  field?: string;
  key?: string;
  relation?: string;
  value?: unknown;
};

type LegacyOneSignalPayload = {
  big_picture?: string;
  chrome_web_icon?: string;
  contents?: Record<string, string>;
  data?: Record<string, unknown>;
  filters?: Array<LegacyTagFilter | { operator?: string }>;
  headings?: Record<string, string>;
  large_icon?: string;
  web_url?: string;
};

type ProfileRecipient = {
  fcm_token: string | null;
  id: string;
};

const INVALID_FCM_TOKEN_ERRORS = new Set([
  "messaging/invalid-registration-token",
  "messaging/registration-token-not-registered",
]);

const ensureFirebaseAdmin = () => {
  if (admin.apps.length > 0) {
    return admin.messaging();
  }

  const serviceAccountRaw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");

  if (!serviceAccountRaw) {
    throw new Error("Missing FIREBASE_SERVICE_ACCOUNT secret");
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountRaw);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    throw new Error(
      `Invalid FIREBASE_SERVICE_ACCOUNT secret: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    );
  }

  return admin.messaging();
};

const getDedupedRecipients = (recipients: ProfileRecipient[]) => {
  const tokenMap = new Map<string, ProfileRecipient>();

  for (const recipient of recipients) {
    const token = recipient.fcm_token?.trim();

    if (!token || tokenMap.has(token)) {
      continue;
    }

    tokenMap.set(token, {
      ...recipient,
      fcm_token: token,
    });
  }

  return [...tokenMap.values()];
};

const cleanupInvalidTokens = async (
  recipients: ProfileRecipient[],
  response: admin.messaging.BatchResponse,
) => {
  const invalidUserIds = recipients
    .map((recipient, index) => {
      const errorCode = response.responses[index]?.error?.code;

      if (!errorCode || !INVALID_FCM_TOKEN_ERRORS.has(errorCode)) {
        return null;
      }

      return recipient.id;
    })
    .filter((userId): userId is string => Boolean(userId));

  if (invalidUserIds.length === 0) {
    return;
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("profiles")
    .update({ fcm_token: null })
    .in("id", invalidUserIds);

  if (error) {
    console.error("Failed to clear invalid FCM tokens:", error);
  }
};

const buildFcmData = (
  payloadData?: Record<string, unknown>,
  webUrl?: string,
) => {
  const stringifiedData: Record<string, string> = {};

  if (payloadData) {
    for (const [key, value] of Object.entries(payloadData)) {
      stringifiedData[key] = String(value);
    }
  }

  if (webUrl) {
    stringifiedData.targetUrl = webUrl;
  }

  return stringifiedData;
};

const sendFcmToRecipients = async (
  recipients: ProfileRecipient[],
  payload: LegacyOneSignalPayload,
) => {
  const normalizedRecipients = getDedupedRecipients(recipients);

  if (normalizedRecipients.length === 0) {
    return { recipients: 0, results: [] };
  }

  const messaging = ensureFirebaseAdmin();
  const title = payload.headings?.pt || payload.headings?.en || "Rota Certa";
  const body = payload.contents?.pt || payload.contents?.en || "Nova notificacao na area!";
  const iconUrl =
    payload.chrome_web_icon || payload.large_icon || payload.big_picture || undefined;
  const webUrl = payload.web_url;

  const response = await messaging.sendEachForMulticast({
    data: buildFcmData(payload.data, webUrl),
    tokens: normalizedRecipients.map((recipient) => recipient.fcm_token!).filter(Boolean),
    webpush: {
      fcmOptions: webUrl ? { link: webUrl } : undefined,
      headers: {
        Urgency: "high",
      },
      notification: {
        body,
        icon: iconUrl,
        title,
      },
    },
  });

  await cleanupInvalidTokens(normalizedRecipients, response);

  return {
    recipients: response.successCount,
    results: [response],
  };
};

const resolveRecipientsFromFilters = async (
  filters?: LegacyOneSignalPayload["filters"],
) => {
  const supabase = createServiceClient();
  let query = supabase.from("profiles").select("id, fcm_token").not("fcm_token", "is", null);

  for (const filter of filters ?? []) {
    if (!("field" in filter) || filter.field !== "tag" || !filter.key) {
      continue;
    }

    const relation = typeof filter.relation === "string" ? filter.relation : "=";
    const value = String(filter.value ?? "").trim();

    if (!value) {
      continue;
    }

    if (filter.key === "user_role") {
      if (relation === "=") {
        query = query.eq("user_type", value);
      } else if (relation === "!=") {
        query = query.neq("user_type", value);
      }
    }

    if (filter.key === "supabase_user_id") {
      if (relation === "=") {
        query = query.eq("id", value);
      } else if (relation === "!=") {
        query = query.neq("id", value);
      }
    }
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []).filter((recipient) => Boolean(recipient.fcm_token));
};

export const getRequestBaseUrl = (request: Request) => {
  const baseUrl = Deno.env.get("PUBLIC_APP_URL") ?? request.headers.get("origin") ?? "";

  return baseUrl.replace(/\/$/, "");
};

export const getAppIconUrl = (request: Request) => {
  const baseUrl = getRequestBaseUrl(request);
  return baseUrl ? `${baseUrl}/Rotacertaoficial.jpg` : undefined;
};

export const buildAppRouteUrl = (request: Request, route: string) => {
  const baseUrl = getRequestBaseUrl(request);
  return baseUrl ? `${baseUrl}${route}` : undefined;
};

export const getOneSignalRestApiKey = () => "firebase_migrated";

export const getOneSignalAppId = (providedAppId?: string) =>
  providedAppId?.trim() || "firebase_migrated";

export const sendOneSignalNotification = async (
  _restApiKey: string,
  payload: LegacyOneSignalPayload,
) => {
  const recipients = await resolveRecipientsFromFilters(payload.filters);
  return await sendFcmToRecipients(recipients, payload);
};

export const sendOneSignalToUsers = async ({
  contents,
  data,
  headings,
  iconUrl,
  userIds,
  webUrl,
}: {
  appId?: string;
  contents: Record<string, string>;
  data?: Record<string, unknown>;
  headings: Record<string, string>;
  iconUrl?: string;
  restApiKey?: string;
  userIds: string[];
  webUrl?: string;
}) => {
  const normalizedUserIds = [...new Set(userIds.filter(Boolean))];

  if (normalizedUserIds.length === 0) {
    return { recipients: 0, results: [] };
  }

  const supabase = createServiceClient();
  const { data: recipients, error } = await supabase
    .from("profiles")
    .select("id, fcm_token")
    .in("id", normalizedUserIds)
    .not("fcm_token", "is", null);

  if (error) {
    throw error;
  }

  return await sendFcmToRecipients(recipients ?? [], {
    big_picture: iconUrl,
    chrome_web_icon: iconUrl,
    contents,
    data,
    headings,
    large_icon: iconUrl,
    web_url: webUrl,
  });
};
