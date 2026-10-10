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

type IpApiLocation = {
  city?: string;
  region_code?: string;
  error?: boolean;
};

type ReverseLocation = {
  address?: {
    city?: string;
    town?: string;
    municipality?: string;
    village?: string;
    state?: string;
    [key: string]: string | undefined;
  };
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
  const url = new URL(request.url);
  const latitude = Number(url.searchParams.get("lat"));
  const longitude = Number(url.searchParams.get("lon"));

  if (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  ) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude.toFixed(5)}&lon=${longitude.toFixed(5)}&zoom=10&addressdetails=1&accept-language=pt-BR`,
        {
          headers: {
            Accept: "application/json",
            "User-Agent": "SushiHousePrime/1.0 (sushihouseprime@outlook.com)",
          },
          signal: AbortSignal.timeout(3500),
        },
      );
      if (response.ok) {
        const reverse = (await response.json()) as ReverseLocation;
        const address = reverse.address || {};
        const city =
          address.city ||
          address.town ||
          address.municipality ||
          address.village ||
          "";
        const isoState = Object.entries(address).find(([key]) =>
          key.startsWith("ISO3166-2-lvl"),
        )?.[1];
        const state = isoState?.split("-").pop() || address.state || "";
        if (city) return locationResponse(city, state);
      }
    } catch {
      // Se a conversão das coordenadas falhar, usa a localização aproximada.
    }
  }

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

      if (!city) {
        try {
          const response = await fetch(
            `https://ipapi.co/${encodeURIComponent(ip)}/json/`,
            {
              headers: {
                Accept: "application/json",
                "User-Agent": "SushiHousePrime/1.0",
              },
              signal: AbortSignal.timeout(2200),
            },
          );
          if (response.ok) {
            const fallback = (await response.json()) as IpApiLocation;
            if (!fallback.error && fallback.city?.trim()) {
              city = fallback.city.trim();
              state = fallback.region_code?.trim().toUpperCase() || state;
            }
          }
        } catch {
          // Sem uma resposta confiável, a interface mantém o texto neutro.
        }
      }
    }
  }

  return locationResponse(city, state);
}

const locationResponse = (city: string, state: string) =>
  Response.json(
    { city: city || null, state: state || null },
    {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        "CDN-Cache-Control": "no-store",
        "Cloudflare-CDN-Cache-Control": "no-store",
      },
    },
  );
