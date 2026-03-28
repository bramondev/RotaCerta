import {
  buildAppRouteUrl,
  corsHeaders,
  getAppIconUrl,
  getOneSignalAppId,
  getOneSignalRestApiKey,
  sendOneSignalNotification,
} from "../_shared/push.ts";

type DeliveryPayload = {
  appId?: string;
  delivery?: {
    category?: string;
    companyName?: string;
    dropoffAddress?: string;
    id?: string;
    pickupAddress?: string;
    price?: number;
    title?: string;
  };
};

const buildDeliveryText = (delivery: NonNullable<DeliveryPayload["delivery"]>) => {
  const details = [
    delivery.companyName?.trim(),
    delivery.title?.trim(),
    delivery.price ? `R$ ${Number(delivery.price).toFixed(2)}` : null,
  ].filter(Boolean);

  return details.join(" • ").slice(0, 120);
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
    const { appId, delivery } = (await request.json()) as DeliveryPayload;

    if (!delivery?.id) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        headers: corsHeaders,
        status: 400,
      });
    }

    const restApiKey = getOneSignalRestApiKey();
    const oneSignalAppId = getOneSignalAppId(appId);
    const iconUrl = getAppIconUrl(request);
    const webUrl = buildAppRouteUrl(request, "/#/delivery-panel");

    const oneSignalResult = await sendOneSignalNotification(restApiKey, {
      app_id: oneSignalAppId,
      big_picture: iconUrl,
      chrome_web_icon: iconUrl,
      contents: {
        en: buildDeliveryText(delivery) || "Nova entrega disponivel no radar.",
        pt: buildDeliveryText(delivery) || "Nova entrega disponivel no radar.",
      },
      data: {
        deliveryId: delivery.id,
        screen: "delivery-panel",
        type: "delivery",
      },
      filters: [
        {
          field: "tag",
          key: "user_role",
          relation: "=",
          value: "motoboy",
        },
      ],
      headings: {
        en: "Nova entrega no radar",
        pt: "Nova entrega no radar",
      },
      large_icon: iconUrl,
      target_channel: "push",
      web_url: webUrl,
    });

    return new Response(JSON.stringify({ result: oneSignalResult, success: true }), {
      headers: corsHeaders,
      status: 200,
    });
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
