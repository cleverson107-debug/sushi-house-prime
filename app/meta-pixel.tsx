"use client";

import { useEffect } from "react";

export const META_PIXEL_ID = "1442564798019869";

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & {
      callMethod?: (...args: unknown[]) => void;
      queue?: unknown[][];
      loaded?: boolean;
      version?: string;
      push?: (...args: unknown[]) => void;
    };
    _fbq?: Window["fbq"];
    __metaPageViewTracked?: boolean;
  }
}

type MetaEventParameters = Record<string, unknown>;

const cookieValue = (name: string) => {
  if (typeof document === "undefined") return "";
  const match = document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${name}=`));
  if (!match) return "";
  const value = match.slice(name.length + 1);
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

export function getMetaBrowserContext() {
  return {
    fbp: cookieValue("_fbp"),
    // A Meta exige o valor oficial de _fbc sem reconstrução ou normalização.
    fbc: cookieValue("_fbc"),
    eventSourceUrl:
      typeof window === "undefined" ? "" : window.location.href,
    clientUserAgent:
      typeof navigator === "undefined" ? "" : navigator.userAgent,
  };
}

export function createMetaEventId(prefix: string) {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}_${random}`;
}

export function trackMetaEvent(
  name: "PageView" | "InitiateCheckout" | "Purchase",
  parameters: MetaEventParameters,
  eventId: string,
) {
  if (typeof window === "undefined" || !window.fbq) return false;
  window.fbq("track", name, parameters, { eventID: eventId });
  return true;
}

export function MetaPixel() {
  useEffect(() => {
    // Migração única: versões anteriores criavam _fbc manualmente a partir da
    // URL. Removemos esse legado para o SDK oficial recriar o cookie sem alterar
    // o fbclid. O marcador evita interferir em cookies oficiais futuros.
    if (
      localStorage.getItem("meta-fbc") &&
      !localStorage.getItem("meta-fbc-official-v2")
    ) {
      document.cookie = "_fbc=; Max-Age=0; Path=/; SameSite=Lax; Secure";
      localStorage.setItem("meta-fbc-official-v2", "1");
    }
    localStorage.removeItem("meta-fbc");

    if (!window.fbq) {
      const fbq = function (...args: unknown[]) {
        if (fbq.callMethod) fbq.callMethod(...args);
        else fbq.queue?.push(args);
      } as NonNullable<Window["fbq"]>;
      fbq.queue = [];
      fbq.loaded = true;
      fbq.version = "2.0";
      window.fbq = fbq;
      window._fbq = fbq;
      fbq("init", META_PIXEL_ID);
      let loaded = false;
      const loadPixel = () => {
        if (loaded) return;
        loaded = true;
        const script = document.createElement("script");
        script.async = true;
        script.src = "https://connect.facebook.net/en_US/fbevents.js";
        document.head.appendChild(script);
        window.removeEventListener("pointerdown", loadPixel);
        window.removeEventListener("keydown", loadPixel);
        window.removeEventListener("scroll", loadPixel);
      };
      window.addEventListener("pointerdown", loadPixel, {
        once: true,
        passive: true,
      });
      window.addEventListener("keydown", loadPixel, { once: true });
      window.addEventListener("scroll", loadPixel, {
        once: true,
        passive: true,
      });
      window.setTimeout(loadPixel, 10_000);
    }

    if (!window.__metaPageViewTracked) {
      window.__metaPageViewTracked = true;
      trackMetaEvent("PageView", {}, createMetaEventId("pageview"));
    }
  }, []);

  return null;
}
