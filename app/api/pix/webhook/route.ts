export async function POST() {
  // A confirmação exibida ao cliente é validada diretamente na API da UmbrellaPag.
  return Response.json({ received: true });
}
