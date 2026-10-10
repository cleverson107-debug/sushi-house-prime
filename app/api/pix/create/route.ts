import { products } from "../../../menu-data";

const API_URL = "https://api-gateway.umbrellapag.com/api/user/transactions";

type CheckoutItem = { id: number; quantity: number };
type Customer = Record<string, string>;
type MetaTracking = {
  fbp?: string;
  fbc?: string;
  eventSourceUrl?: string;
  clientUserAgent?: string;
};

function findString(value: unknown, keys: RegExp): string {
  if (!value || typeof value !== "object") return "";
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (keys.test(key) && typeof entry === "string" && entry.trim())
      return entry.trim();
  }
  for (const entry of Object.values(value as Record<string, unknown>)) {
    const found = findString(entry, keys);
    if (found) return found;
  }
  return "";
}

export async function POST(request: Request) {
  const apiKey = process.env.UMBRELLAPAG_API_KEY;
  if (!apiKey)
    return Response.json(
      { error: "Pagamento ainda não configurado." },
      { status: 503 },
    );

  try {
    const body = (await request.json()) as {
      items?: CheckoutItem[];
      customer?: Customer;
      mode?: string;
      coupon?: string;
      tracking?: MetaTracking;
    };
    const customer = body.customer || {};
    const requestedItems = Array.isArray(body.items)
      ? body.items.slice(0, 40)
      : [];
    const items = requestedItems.flatMap((entry) => {
      const product = products.find(
        (candidate) => candidate.id === Number(entry.id),
      );
      const quantity = Math.max(
        1,
        Math.min(20, Math.trunc(Number(entry.quantity) || 1)),
      );
      return product
        ? [
            {
              title: product.name,
              unitPrice: Math.round(product.price * 100),
              quantity,
              tangible: true,
              externalRef: String(product.id),
            },
          ]
        : [];
    });
    if (!items.length)
      return Response.json(
        { error: "Seu pedido está vazio." },
        { status: 400 },
      );

    const cleanDocument = String(customer.document || "").replace(/\D/g, "");
    const cleanPhone = String(customer.phone || "").replace(/\D/g, "");
    const cleanZip = String(customer.zipCode || "").replace(/\D/g, "");
    if (cleanDocument.length !== 11)
      return Response.json(
        { error: "Informe um CPF válido com 11 números." },
        { status: 400 },
      );
    if (!String(customer.email || "").includes("@"))
      return Response.json(
        { error: "Informe um e-mail válido." },
        { status: 400 },
      );

    const address = {
      street: customer.street || "Retirada na loja",
      streetNumber: customer.streetNumber || "S/N",
      complement: customer.complement || "",
      zipCode: cleanZip || "00000000",
      neighborhood: customer.neighborhood || "Retirada",
      city: customer.city || "Retirada",
      state: customer.state || "MT",
      country: "BR",
    };
    const originalAmount = items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    );
    if (originalAmount < 1000)
      return Response.json(
        { error: "O valor mínimo para pedidos é R$ 10,00." },
        { status: 400 },
      );
    const couponCode = String(body.coupon || "")
      .trim()
      .toUpperCase();
    const discount =
      couponCode === "CUPOM5" && originalAmount >= 2000 ? 500 : 0;
    const amount = originalAmount - discount;
    const externalRef = crypto.randomUUID();
    const paymentItems = items;
    const clientIp =
      request.headers.get("CF-Connecting-IP") ||
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      "127.0.0.1";
    const origin = new URL(request.url).origin;
    const tracking = body.tracking || {};
    const eventSourceUrl = String(tracking.eventSourceUrl || origin).startsWith(
      origin,
    )
      ? String(tracking.eventSourceUrl || origin).slice(0, 500)
      : origin;
    const payload = {
      amount,
      currency: "BRL",
      paymentMethod: "PIX",
      installments: 1,
      customer: {
        name: customer.name,
        email: customer.email,
        document: { number: cleanDocument, type: "CPF" },
        phone: cleanPhone,
        externalRef,
        address,
      },
      shipping: { fee: 0, address },
      items: paymentItems,
      pix: { expiresInDays: 1 },
      postbackUrl: `${origin}/api/pix/webhook`,
      metadata: JSON.stringify({
        orderId: externalRef,
        originalAmount,
        discount,
        coupon: discount ? couponCode : null,
        cartItems: items,
        fulfillment: body.mode || "delivery",
        meta: {
          eventId: `purchase_${externalRef}`,
          eventSourceUrl,
          fbp: String(tracking.fbp || "").slice(0, 250),
          fbc: String(tracking.fbc || "").slice(0, 500),
          clientUserAgent: String(
            tracking.clientUserAgent || request.headers.get("user-agent") || "",
          ).slice(0, 500),
          clientIp,
          customer: {
            name: String(customer.name || "").slice(0, 150),
            email: String(customer.email || "").slice(0, 254),
            phone: cleanPhone,
            city: String(address.city || "").slice(0, 100),
            state: String(address.state || "").slice(0, 2),
            zipCode: cleanZip,
            country: "br",
          },
        },
      }),
      traceable: true,
      ip: clientIp,
    };

    const providerResponse = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "User-Agent": "UMBRELLAB2B/1.0",
      },
      body: JSON.stringify(payload),
    });
    const provider = (await providerResponse.json()) as Record<string, unknown>;
    if (!providerResponse.ok || provider.error) {
      return Response.json(
        {
          error: String(
            provider.message || "A operadora não conseguiu gerar o PIX.",
          ),
        },
        { status: 502 },
      );
    }
    const data = (provider.data || provider) as Record<string, unknown>;
    const transactionId = String(data.id || "");
    const possibleQr = findString(
      data,
      /^(qrCode|qrcode|copyPaste|copy_and_paste|brCode|payload)$/i,
    );
    const possibleImage = findString(
      data,
      /^(qrCodeBase64|qrImage|encodedImage|base64)$/i,
    );
    const qrImage = possibleImage
      ? possibleImage.startsWith("data:image")
        ? possibleImage
        : `data:image/png;base64,${possibleImage}`
      : possibleQr.startsWith("data:image") || possibleQr.startsWith("iVBOR")
        ? possibleQr.startsWith("data:image")
          ? possibleQr
          : `data:image/png;base64,${possibleQr}`
        : "";
    const copyPaste = qrImage
      ? findString(data, /^(copyPaste|copy_and_paste|brCode|payload|emv)$/i)
      : possibleQr;
    if (!transactionId || !copyPaste)
      return Response.json(
        {
          error:
            "O PIX foi criado, mas a operadora não retornou o código copia e cola. Tente novamente.",
        },
        { status: 502 },
      );

    return Response.json(
      {
        transactionId,
        copyPaste,
        qrImage: qrImage || undefined,
        status: String(data.status || "WAITING_PAYMENT"),
        purchaseEventId: `purchase_${transactionId}`,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "Não foi possível gerar o PIX agora. Tente novamente." },
      { status: 500 },
    );
  }
}
