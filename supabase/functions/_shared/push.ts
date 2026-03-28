export const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
};

type OneSignalPayload = Record<string, unknown>;

export const getRequestBaseUrl = (request: Request) => {
  const baseUrl =
    Deno.env.get("PUBLIC_APP_URL") ??
    request.headers.get("origin") ??
    "";

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

export const getOneSignalRestApiKey = () => {
  const oneSignalRestApiKey = Deno.env.get("ONESIGNAL_REST_API_KEY");

  if (!oneSignalRestApiKey) {
    throw new Error("Missing ONESIGNAL_REST_API_KEY secret");
  }

  return oneSignalRestApiKey;
};

export const getOneSignalAppId = (providedAppId?: string) => {
  const oneSignalAppId =
    Deno.env.get("ONESIGNAL_APP_ID")?.trim() ||
    providedAppId?.trim();

  if (!oneSignalAppId) {
    throw new Error("Missing ONESIGNAL_APP_ID");
  }

  return oneSignalAppId;
};

export const sendOneSignalNotification = async (
  restApiKey: string,
  payload: OneSignalPayload,
) => {
  const oneSignalResponse = await fetch("https://api.onesignal.com/notifications", {
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Key ${restApiKey}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    method: "POST",
  });

  const oneSignalResult = await oneSignalResponse.json();

  if (!oneSignalResponse.ok) {
    const details = JSON.stringify(oneSignalResult);
    if (oneSignalResponse.status === 401) {
      throw new Error(
        `OneSignal unauthorized (401). Check ONESIGNAL_REST_API_KEY and ONESIGNAL_APP_ID. Details: ${details}`,
      );
    }

    throw new Error(details);
  }

  return oneSignalResult;
};

export const sendOneSignalToUsers = async ({
  appId,
  contents,
  data,
  headings,
  iconUrl,
  restApiKey,
  userIds,
  webUrl,
}: {
  appId: string;
  contents: Record<string, string>;
  data?: Record<string, unknown>;
  headings: Record<string, string>;
  iconUrl?: string;
  restApiKey: string;
  userIds: string[];
  webUrl?: string;
}) => {
  const normalizedUserIds = [...new Set(userIds.filter(Boolean))];

  const results = [];

  for (const userId of normalizedUserIds) {
    const payload: Record<string, unknown> = {
      app_id: appId,
      contents,
      data,
      filters: [
        {
          field: "tag",
          key: "supabase_user_id",
          relation: "=",
          value: userId,
        },
      ],
      headings,
      target_channel: "push",
    };

    if (iconUrl) {
      payload.big_picture = iconUrl;
      payload.chrome_web_icon = iconUrl;
      payload.large_icon = iconUrl;
    }

    if (webUrl) {
      payload.web_url = webUrl;
    }

    results.push(await sendOneSignalNotification(restApiKey, payload));
  }

  return {
    recipients: normalizedUserIds.length,
    results,
  };
};
