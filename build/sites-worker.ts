import handler from "vinext/server/fetch-handler";
import { runWithConnectorBinding } from "../lib/connector-context";
import type { ConnectorBinding } from "../lib/connector-contract.mjs";

const STOREFRONT_CACHE_VERSION = "2026-10-10-location-performance-v4";

export default {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext<{ CONNECTORS?: ConnectorBinding }>) {
    let binding = ctx.props?.CONNECTORS;
    // Local preview emulates the same request-scoped capability. This branch and
    // the auxiliary service binding are absent from production builds.
    if (import.meta.env.DEV && !binding && env.CONNECTORS) {
      const preview = env.CONNECTORS;
      const expiresAt = Date.now() + 60_000;
      binding = {
        async getContext() {
          if (Date.now() >= expiresAt) return { status: "request_context_expired" };
          return preview.getContext?.() ?? { status: "binding_unavailable" };
        },
        async invoke(connectorId, actionName, args) {
          if (Date.now() >= expiresAt) {
            return { status: "request_context_expired", message: "This request has expired. Please try again." };
          }
          return preview.invoke(connectorId, actionName, args);
        },
      };
    }
    const url = new URL(request.url);
    const acceptsHtml = request.headers.get("accept")?.includes("text/html");
    const isPublicStorefront =
      request.method === "GET" &&
      url.pathname === "/" &&
      acceptsHtml &&
      !request.headers.has("RSC") &&
      !request.headers.has("Next-Router-State-Tree");

    if (!isPublicStorefront)
      return runWithConnectorBinding(binding, () =>
        handler.fetch(request, env, ctx),
      );

    const cacheUrl = new URL(request.url);
    cacheUrl.search = `?shell=${STOREFRONT_CACHE_VERSION}`;
    const cacheKey = new Request(cacheUrl, {
      method: "GET",
      headers: { accept: "text/html" },
    });
    const cached = await caches.default.match(cacheKey);
    if (cached) {
      const headers = new Headers(cached.headers);
      headers.set("X-Storefront-Cache", "HIT");
      return new Response(cached.body, {
        status: cached.status,
        statusText: cached.statusText,
        headers,
      });
    }

    const response = await runWithConnectorBinding(binding, () =>
      handler.fetch(request, env, ctx),
    );
    if (!response.ok) return response;

    const headers = new Headers(response.headers);
    headers.set(
      "Cache-Control",
      "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800",
    );
    headers.set("X-Storefront-Cache", "MISS");
    const cacheable = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
    ctx.waitUntil(caches.default.put(cacheKey, cacheable.clone()));
    return cacheable;
  },
};
