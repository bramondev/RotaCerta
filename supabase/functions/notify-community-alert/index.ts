import {
  getOneSignalAppId,
  getOneSignalRestApiKey,
  sendOneSignalNotification,
} from "../_shared/push.ts";

const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
};

const alertTitles: Record<string, string> = {
  blitz: "Blitz reportada na comunidade",
  danger: "Novo alerta de trânsito ou acidente",
  restaurante: "Novo alerta sobre restaurante",
};

type AlertPayload = {
  appId?: string;
  authorId?: string;
  post?: {
    description?: string;
    id?: string;
    location?: string;
    type?: string;
    zone?: string;
  };
};

const buildNotificationText = (post: NonNullable<AlertPayload["post"]>) => {
  const location = post.location?.trim();
  const zone = post.zone?.trim();
  const description = post.description?.trim();
  const pieces = [location, zone ? `Zona ${zone}` : null, description].filter(Boolean);
  return pieces.join(" • ").slice(0, 120);
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      headers: corsHeaders,
      status: 405,
    });
  }

  try {
    const payload = (await request.json()) as AlertPayload;
    const { appId, authorId, post } = payload;

    if (!authorId || !post?.id || !post.type) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        headers: corsHeaders,
        status: 400,
      });
    }

    const baseUrl =
      Deno.env.get("PUBLIC_APP_URL") ??
      request.headers.get("origin") ??
      "";

    const normalizedBaseUrl = baseUrl.replace(/\/$/, "");
    const communityUrl = normalizedBaseUrl ? `${normalizedBaseUrl}/#/community` : undefined;
    const communityIcon = normalizedBaseUrl ? `${normalizedBaseUrl}/Rotacertaoficial.jpg` : undefined;

    const oneSignalAppId = getOneSignalAppId(appId);
    const oneSignalRestApiKey = getOneSignalRestApiKey();

    const notificationPayload = {
      app_id: oneSignalAppId,
      big_picture: communityIcon,
      chrome_web_icon: communityIcon,
      contents: {
        en: buildNotificationText(post) || "Abra a comunidade para ver o novo alerta.",
        pt: buildNotificationText(post) || "Abra a comunidade para ver o novo alerta.",
      },
      data: {
        communityPostId: post.id,
        screen: "community",
        type: post.type,
      },
      filters: [
        {
          field: "tag",
          key: "user_role",
          relation: "=",
          value: "motoboy",
        },
        { operator: "AND" },
        {
          field: "tag",
          key: "supabase_user_id",
          relation: "!=",
          value: authorId,
        },
      ],
      headings: {
        en: alertTitles[post.type] || "Novo alerta da comunidade",
        pt: alertTitles[post.type] || "Novo alerta da comunidade",
      },
      large_icon: communityIcon,
      target_channel: "push",
      web_url: communityUrl,
    };

    const oneSignalResult = await sendOneSignalNotification(
      oneSignalRestApiKey,
      notificationPayload,
    );

    return new Response(
      JSON.stringify({
        result: oneSignalResult,
        success: true,
      }),
      {
        headers: corsHeaders,
        status: 200,
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unexpected error",
      }),
      {
        headers: corsHeaders,
        status: 500,
      },
    );
  }
});
