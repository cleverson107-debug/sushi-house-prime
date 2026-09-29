const API_URL = "https://api-gateway.umbrellapag.com/api/user/transactions";

export async function GET(request: Request) {
  const apiKey = process.env.UMBRELLAPAG_API_KEY;
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!apiKey)
    return Response.json(
      { error: "Pagamento não configurado." },
      { status: 503 },
    );
  if (!/^[a-zA-Z0-9_-]{8,100}$/.test(id))
    return Response.json({ error: "Transação inválida." }, { status: 400 });
  try {
    const response = await fetch(`${API_URL}/${encodeURIComponent(id)}`, {
      headers: { "x-api-key": apiKey, "User-Agent": "UMBRELLAB2B/1.0" },
      cache: "no-store",
    });
    const provider = (await response.json()) as {
      data?: { status?: string; paidAt?: string };
      message?: string;
    };
    if (!response.ok)
      return Response.json(
        { error: provider.message || "Falha ao consultar pagamento." },
        { status: 502 },
      );
    const status = String(provider.data?.status || "").toUpperCase();
    return Response.json(
      {
        paid: ["PAID", "APPROVED", "COMPLETED"].includes(status),
        status,
        paidAt: provider.data?.paidAt || null,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "Falha ao consultar pagamento." },
      { status: 502 },
    );
  }
}
