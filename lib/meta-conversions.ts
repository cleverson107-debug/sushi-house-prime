const META_PIXEL_ID = "1442564798019869";
const DEFAULT_GRAPH_VERSION = "v24.0";

type MetaCustomer = {
  name?: string;
  email?: string;
  phone?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
};

export type MetaPurchaseInput = {
  eventId: string;
  eventSourceUrl: string;
  value: number;
  currency?: string;
  contentIds?: string[];
  orderId: string;
  customer?: MetaCustomer;
  fbp?: string;
  fbc?: string;
  clientIpAddress?: string;
  clientUserAgent?: string;
};

const normalize = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

async function hash(value?: string, digitsOnly = false) {
  if (!value) return undefined;
  const normalized = digitsOnly ? value.replace(/\D/g, "") : normalize(value);
  if (!normalized) return undefined;
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(normalized),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export async function sendMetaPurchase(input: MetaPurchaseInput) {
  const accessToken = process.env.META_CONVERSIONS_API_TOKEN;
  if (!accessToken)
    throw new Error("META_CONVERSIONS_API_TOKEN não configurado.");

  const nameParts = String(input.customer?.name || "").trim().split(/\s+/);
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ");
  const userData = Object.fromEntries(
    Object.entries({
      em: await hash(input.customer?.email),
      ph: await hash(input.customer?.phone, true),
      fn: await hash(firstName),
      ln: await hash(lastName),
      ct: await hash(input.customer?.city),
      st: await hash(input.customer?.state),
      zp: await hash(input.customer?.zipCode, true),
      country: await hash(input.customer?.country || "br"),
      external_id: await hash(input.orderId),
      fbp: input.fbp || undefined,
      fbc: input.fbc || undefined,
      client_ip_address: input.clientIpAddress || undefined,
      client_user_agent: input.clientUserAgent || undefined,
    }).filter(([, value]) => Boolean(value)),
  );

  const graphVersion =
    process.env.META_GRAPH_API_VERSION || DEFAULT_GRAPH_VERSION;
  const response = await fetch(
    `https://graph.facebook.com/${graphVersion}/${META_PIXEL_ID}/events`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        access_token: accessToken,
        data: [
          {
            event_name: "Purchase",
            event_time: Math.floor(Date.now() / 1000),
            event_id: input.eventId,
            action_source: "website",
            event_source_url: input.eventSourceUrl,
            user_data: userData,
            custom_data: {
              currency: input.currency || "BRL",
              value: Number((input.value / 100).toFixed(2)),
              content_type: "product",
              content_ids: input.contentIds || [],
              order_id: input.orderId,
            },
          },
        ],
      }),
    },
  );
  const result = (await response.json()) as Record<string, unknown>;
  if (!response.ok || result.error)
    throw new Error(`Meta CAPI rejeitou o evento (${response.status}).`);
  return result;
}
