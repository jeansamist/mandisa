import { API_URL, apiHeaders } from "@/lib/api";

const MAX_BODY_BYTES = 32_000;

/**
 * Relay for the browser tracker (public/mt.js): the browser cannot call the
 * API directly (it has no internal key), so batches go through this route.
 */
export async function POST(request: Request) {
  // Only accept batches sent from this site's own pages.
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && host && new URL(origin).host !== host) {
    return new Response(null, { status: 403 });
  }

  const body = await request.text();
  if (!body || body.length > MAX_BODY_BYTES) {
    return new Response(null, { status: 413 });
  }

  try {
    const res = await fetch(`${API_URL}/analytics/events`, {
      method: "POST",
      headers: apiHeaders({
        "content-type": "application/json",
        "x-client-user-agent": request.headers.get("user-agent") ?? "",
      }),
      body,
      cache: "no-store",
    });
    return new Response(null, { status: res.ok ? 204 : 400 });
  } catch {
    // Analytics are best effort: never surface an error to the visitor.
    return new Response(null, { status: 202 });
  }
}
