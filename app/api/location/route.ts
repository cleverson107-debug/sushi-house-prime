type CloudflareLocation = {
  city?: string;
  region?: string;
  regionCode?: string;
  country?: string;
};

export async function GET(request: Request) {
  const cf = (request as Request & { cf?: CloudflareLocation }).cf;
  const city = typeof cf?.city === "string" ? cf.city.trim() : "";
  const state =
    typeof cf?.regionCode === "string" && cf.regionCode.trim()
      ? cf.regionCode.trim().toUpperCase()
      : typeof cf?.region === "string"
        ? cf.region.trim()
        : "";

  return Response.json(
    { city: city || null, state: state || null },
    {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        "CDN-Cache-Control": "no-store",
        "Cloudflare-CDN-Cache-Control": "no-store",
      },
    },
  );
}
