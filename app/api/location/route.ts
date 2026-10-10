type CloudflareLocation = {
  city?: string;
  region?: string;
  regionCode?: string;
  country?: string;
};

type FallbackLocation = {
  success?: boolean;
  city?: string;
  region_code?: string;
};

const visitorIp = (request: Request) => {
  const raw =
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    "";
  const value = raw.trim();
  return /^[0-9a-f:.]+$/i.test(value) ? value : "";
};

export async function GET(request: Request) {
  const cf = (request as Request & { cf?: CloudflareLocation }).cf;
  let city = typeof cf?.city === "string" ? cf.city.trim() : "";
  let state =
    typeof cf?.regionCode === "string" && cf.regionCode.trim()
      ? cf.regionCode.trim().toUpperCase()
      : typeof cf?.region === "string"
        ? cf.region.trim()
        : "";

  if (!city) {
    const ip = visitorIp(request);
    if (ip) {
      try {
        const response = await fetch(
          `https://ipwho.is/${encodeURIComponent(ip)}?fields=success,city,region_code`,
          {
            headers: { Accept: "application/json" },
            signal: AbortSignal.timeout(1800),
          },
        );
        if (response.ok) {
          const fallback = (await response.json()) as FallbackLocation;
          if (fallback.success !== false && fallback.city?.trim()) {
            city = fallback.city.trim();
            state = fallback.region_code?.trim().toUpperCase() || state;
          }
        }
      } catch {
        // Mantém o resultado da Cloudflare quando o serviço auxiliar não responder.
      }
    }
  }

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
