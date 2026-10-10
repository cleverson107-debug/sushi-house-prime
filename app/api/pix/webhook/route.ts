const TRANSACTIONS_URL =
  "https://api-gateway.umbrellapag.com/api/user/transactions";

import { sendMetaPurchase } from "../../../../lib/meta-conversions";

type WebhookPayload = {
  objectId?: unknown;
};

type UmbrellaTransaction = {
  id?: string;
  status?: string;
  amount?: number;
  paidAt?: string | null;
  endToEndId?: string | null;
  metadata?: string | Record<string, unknown> | null;
};

type TransactionMetadata = {
  orderId?: string;
  cartItems?: Array<{ externalRef?: string }>;
  meta?: {
    eventId?: string;
    eventSourceUrl?: string;
    fbp?: string;
    fbc?: string;
    clientUserAgent?: string;
    clientIp?: string;
    customer?: {
      name?: string;
      email?: string;
      phone?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      country?: string;
    };
  };
};

function readMetadata(value: UmbrellaTransaction["metadata"]) {
  if (!value) return {} as TransactionMetadata;
  if (typeof value === "object") return value as TransactionMetadata;
  try {
    return JSON.parse(value) as TransactionMetadata;
  } catch {
    return {} as TransactionMetadata;
  }
}

const transactionIdPattern = /^[a-zA-Z0-9_-]{8,100}$/;

export async function POST(request: Request) {
  const apiKey = process.env.UMBRELLAPAG_API_KEY;
  if (!apiKey)
    return Response.json(
      { received: false, error: "Integração não configurada." },
      { status: 503 },
    );

  let payload: WebhookPayload;
  try {
    payload = (await request.json()) as WebhookPayload;
  } catch {
    return Response.json(
      { received: false, error: "Payload inválido." },
      { status: 400 },
    );
  }

  const transactionId = String(payload.objectId || "");
  if (!transactionIdPattern.test(transactionId))
    return Response.json(
      { received: false, error: "Transação inválida." },
      { status: 400 },
    );

  try {
    const providerResponse = await fetch(
      `${TRANSACTIONS_URL}/${encodeURIComponent(transactionId)}`,
      {
        headers: {
          "x-api-key": apiKey,
          "User-Agent": "UMBRELLAB2B/1.0",
        },
        cache: "no-store",
      },
    );
    const provider = (await providerResponse.json()) as {
      data?: UmbrellaTransaction;
      message?: string;
    };

    if (!providerResponse.ok || provider.data?.id !== transactionId)
      return Response.json(
        {
          received: false,
          error: provider.message || "Transação não confirmada pela operadora.",
        },
        { status: 502 },
      );

    const transaction = provider.data;
    const status = String(transaction.status || "").toUpperCase();
    const paid = ["PAID", "APPROVED", "COMPLETED"].includes(status);

    let metaPurchaseSent = false;
    if (paid) {
      const metadata = readMetadata(transaction.metadata);
      const orderId = metadata.orderId || transactionId;
      const meta = metadata.meta || {};
      try {
        await sendMetaPurchase({
          eventId: `purchase_${transactionId}`,
          eventSourceUrl:
            meta.eventSourceUrl || "https://delivery-sushi-house.upnexa.com.br/",
          value: Math.max(0, Number(transaction.amount) || 0),
          currency: "BRL",
          contentIds: (metadata.cartItems || [])
            .map((item) => String(item.externalRef || ""))
            .filter(Boolean),
          orderId,
          customer: meta.customer,
          fbp: meta.fbp,
          fbc: meta.fbc,
          clientIpAddress: meta.clientIp,
          clientUserAgent: meta.clientUserAgent,
        });
        metaPurchaseSent = true;
      } catch (error) {
        console.error("Meta Purchase não enviado; webhook poderá ser repetido", {
          transactionId,
          message: error instanceof Error ? error.message : "erro desconhecido",
        });
        return Response.json(
          {
            received: false,
            verified: true,
            transactionId,
            status,
            paid,
            metaPurchaseSent: false,
          },
          { status: 502, headers: { "Cache-Control": "no-store" } },
        );
      }
    }

    console.info("UmbrellaPag webhook verificado", {
      transactionId,
      status,
      amount: transaction.amount,
      paid,
      paidAt: transaction.paidAt || null,
      hasEndToEndId: Boolean(transaction.endToEndId),
    });

    return Response.json(
      {
        received: true,
        verified: true,
        transactionId,
        status,
        paid,
        metaPurchaseSent,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { received: false, error: "Falha ao validar a transação." },
      { status: 502 },
    );
  }
}

export function GET() {
  return Response.json(
    { service: "UmbrellaPag transaction webhook", status: "ready" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
