"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { API_URL, apiHeaders } from "@/lib/api";
import { msMutate, msSessionToken } from "@/lib/ms-api";
import { MS_SESSION_COOKIE } from "@/lib/ms-session";

export type LoginState = { error: string | null };

export async function loginAction(
  _prev: LoginState,
  form: FormData,
): Promise<LoginState> {
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  let res: Response;
  try {
    res = await fetch(`${API_URL}/admin/auth/login`, {
      method: "POST",
      headers: apiHeaders({ "content-type": "application/json" }),
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });
  } catch {
    return { error: "network" };
  }
  const json = (await res.json().catch(() => null)) as {
    token?: string;
    expiresAt?: string;
    error?: string;
  } | null;
  if (!res.ok || !json?.token)
    return { error: json?.error ?? "invalid_credentials" };

  (await cookies()).set(MS_SESSION_COOKIE, json.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/ms",
    expires: json.expiresAt ? new Date(json.expiresAt) : undefined,
  });
  redirect("/ms");
}

export async function logoutAction() {
  if (await msSessionToken())
    await msMutate("/auth/logout", { method: "POST" });
  (await cookies()).delete({ name: MS_SESSION_COOKIE, path: "/ms" });
  redirect("/ms/login");
}
