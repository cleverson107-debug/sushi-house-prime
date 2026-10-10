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
  return match ? decodeURIComponent(match.slice(name.length + 1)) : "";
};

const persistentFbc = () => {
  if (typeof window === "undefined") return "";
  const fromCookie = cookieValue("_fbc");
  if (fromCookie) {
    localStorage.setItem("meta-fbc", fromCookie);
    return fromCookie;
  }
  const fbclid = new URLSearchParams(window.location.search).get("fbclid");
  if (fbclid) {
    const value = `fb.1.${Date.now()}.${fbclid}`;
    localStorage.setItem("meta-fbc", value);
    document.cookie = `_fbc=${encodeURIComponent(value)}; Max-Age=7776000; Path=/; SameSite=Lax; Secure`;
    return value;
  }
  return localStorage.getItem("meta-fbc") || "";
};

export function getMetaBrowserContext() {
  return {
    fbp: cookieValue("_fbp"),
    fbc: persistentFbc(),
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
      const script = document.createElement("script");
      script.async = true;
      script.src = "https://connect.facebook.net/en_US/fbevents.js";
      document.head.appendChild(script);
      fbq("init", META_PIXEL_ID);
    }

    persistentFbc();
    if (!window.__metaPageViewTracked) {
      window.__metaPageViewTracked = true;
      trackMetaEvent("PageView", {}, createMetaEventId("pageview"));
    }
  }, []);

  return null;
}
