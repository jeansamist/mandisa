import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { API_URL, apiHeaders } from "@/lib/api";
import { MS_SESSION_COOKIE } from "@/lib/ms-session";

// Server-side client for the admin API (/admin/*). The session token never reaches client JS.

export class MsApiError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(code);
  }
}

export async function msSessionToken() {
  return (await cookies()).get(MS_SESSION_COOKIE)?.value ?? null;
}

/**
 * Calls the admin API with the current session. Redirects to the login page
 * when the session is missing or expired.
 */
export async function msApi<T>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const token = await msSessionToken();
  if (!token) redirect("/ms/login");
  const res = await fetch(`${API_URL}/admin${path}`, {
    method: init.method ?? "GET",
    headers: apiHeaders({
      "content-type": "application/json",
      "x-admin-session": token,
    }),
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
  });
  if (res.status === 401) redirect("/ms/login");
  if (res.status === 204) return undefined as T;
  const json = (await res.json().catch(() => null)) as
    ({ error?: string; details?: unknown } & Record<string, unknown>) | null;
  if (!res.ok)
    throw new MsApiError(json?.error ?? "generic", res.status, json?.details);
  return json as T;
}

/** For server actions: the API error code, or null on success. */
export async function msMutate(
  path: string,
  init: { method: string; body?: unknown },
): Promise<{ ok: true } | { ok: false; error: string; details?: unknown }> {
  try {
    await msApi(path, init);
    return { ok: true };
  } catch (err) {
    if (err instanceof MsApiError)
      return { ok: false, error: err.code, details: err.details };
    throw err;
  }
}
