const TRANSACTIONS_URL =
  "https://api-gateway.umbrellapag.com/api/user/transactions";

type WebhookPayload = {
  objectId?: unknown;
};

type UmbrellaTransaction = {
  id?: string;
  status?: string;
  amount?: number;
  paidAt?: string | null;
  endToEndId?: string | null;
};

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

    console.info("UmbrellaPag webhook verificado", {
      transactionId,
      status,
      amount: transaction.amount,
      paid,
      paidAt: transaction.paidAt || null,
      hasEndToEndId: Boolean(transaction.endToEndId),
    });

    return Response.json(
      { received: true, verified: true, transactionId, status, paid },
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
