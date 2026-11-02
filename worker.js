// Frontend calls append an allowlisted path, e.g.
// `${WORKER_BASE_URL}/web/train-routes` or `/web/all-trains/info`.
const UPSTREAM_BASE_URL = "https://railspaapi.shohoz.com/v1.0/";
const MAX_REQUEST_BYTES = 16 * 1024;
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 15_000;

const ALLOWED_ROUTES = new Map([
  ["/web/all-trains/info", new Set(["GET"])],
  ["/web/train-routes", new Set(["POST"])],
]);

const ALLOWED_ORIGINS = new Set([
  "https://trainseatchecker.tech",
  "http://trainseatchecker.tech",
]);

function isAllowedOrigin(origin) {
  if (ALLOWED_ORIGINS.has(origin)) {
    return true;
  }

  try {
    const url = new URL(origin);
    return url.protocol === "http:" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1");
  } catch {
    return false;
  }
}

function jsonResponse(payload, status, corsHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...corsHeaders,
    },
  });
}

function getCorsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Requested-With",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

async function readLimitedBody(stream, maxBytes) {
  if (!stream) {
    return new Uint8Array();
  }

  const reader = stream.getReader();
  const chunks = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel();
      throw new RangeError("Request body is too large.");
    }
    chunks.push(value);
  }

  const result = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

export default {
  async fetch(request) {
    const origin = request.headers.get("Origin");
    if (origin && !isAllowedOrigin(origin)) {
      return jsonResponse({ error: "Origin is not allowed." }, 403, { "Vary": "Origin" });
    }

    const corsHeaders = origin ? getCorsHeaders(origin) : { "Vary": "Origin" };
    const requestUrl = new URL(request.url);
    const methods = ALLOWED_ROUTES.get(requestUrl.pathname);

    if (!methods) {
      return jsonResponse({
        error: "Route is not allowed.",
        allowedRoutes: [
          "GET /web/all-trains/info",
          "POST /web/train-routes",
        ],
      }, 404, corsHeaders);
    }

    if (request.method === "OPTIONS") {
      const requestedMethod = request.headers.get("Access-Control-Request-Method");
      if (!requestedMethod || !methods.has(requestedMethod)) {
        return jsonResponse({ error: "Method is not allowed for this route." }, 405, corsHeaders);
      }

      const requestedHeaders = (request.headers.get("Access-Control-Request-Headers") || "")
        .split(",")
        .map((header) => header.trim().toLowerCase())
        .filter(Boolean);
      const allowedHeaders = new Set(["content-type", "x-requested-with"]);
      if (requestedHeaders.some((header) => !allowedHeaders.has(header))) {
        return jsonResponse({ error: "Requested header is not allowed." }, 403, corsHeaders);
      }

      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (!methods.has(request.method)) {
      return jsonResponse({ error: "Method is not allowed for this route." }, 405, corsHeaders);
    }

    if (requestUrl.search) {
      return jsonResponse({ error: "Query parameters are not allowed for this route." }, 400, corsHeaders);
    }

    const upstreamUrl = new URL(requestUrl.pathname.slice(1), UPSTREAM_BASE_URL);
    const upstreamHeaders = new Headers({
      "Accept": "application/json",
      "X-Requested-With": "XMLHttpRequest",
    });
    let body;

    if (request.method === "POST") {
      const contentLength = Number(request.headers.get("Content-Length"));
      if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
        return jsonResponse({ error: "Request body is too large." }, 413, corsHeaders);
      }

      const contentType = request.headers.get("Content-Type") || "";
      if (!contentType.toLowerCase().startsWith("application/json")) {
        return jsonResponse({ error: "Content-Type must be application/json." }, 415, corsHeaders);
      }

      let rawBodyBytes;
      try {
        rawBodyBytes = await readLimitedBody(request.body, MAX_REQUEST_BYTES);
      } catch {
        return jsonResponse({ error: "Request body is too large." }, 413, corsHeaders);
      }
      if (!rawBodyBytes.byteLength) {
        return jsonResponse({ error: "Request body is missing or too large." }, 413, corsHeaders);
      }

      let payload;
      try {
        payload = JSON.parse(new TextDecoder().decode(rawBodyBytes));
      } catch {
        return jsonResponse({ error: "Request body must be valid JSON." }, 400, corsHeaders);
      }

      if (
        requestUrl.pathname === "/web/train-routes" &&
        (!payload || typeof payload.model !== "string" || !/^\d{1,6}$/.test(payload.model))
      ) {
        return jsonResponse({ error: "The model field must be a train number." }, 400, corsHeaders);
      }

      body = JSON.stringify(payload);
      upstreamHeaders.set("Content-Type", "application/json");
    }

    try {
      const upstreamResponse = await fetch(upstreamUrl, {
        method: request.method,
        headers: upstreamHeaders,
        body,
        redirect: "manual",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (upstreamResponse.status >= 300 && upstreamResponse.status < 400) {
        return jsonResponse({ error: "Upstream redirects are not permitted." }, 502, corsHeaders);
      }

      const responseBody = await readLimitedBody(upstreamResponse.body, MAX_RESPONSE_BYTES);

      return new Response(responseBody, {
        status: upstreamResponse.status,
        headers: {
          ...corsHeaders,
          "Content-Type": upstreamResponse.headers.get("Content-Type") || "application/json",
          "Cache-Control": "no-store",
        },
      });
    } catch (error) {
      console.error("Railsheba API request failed:", error);
      return jsonResponse({ error: "Unable to fetch data from the train API." }, 502, corsHeaders);
    }
  },
};
