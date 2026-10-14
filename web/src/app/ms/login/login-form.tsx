"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/app/ms/actions";

const errors: Record<string, string> = {
  invalid_credentials: "Email ou mot de passe incorrect.",
  too_many_attempts: "Trop de tentatives. Réessayez dans 15 minutes.",
  network: "Connexion à l'API impossible.",
};

export default function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    loginAction,
    { error: null },
  );
  return (
    <form action={action} className="grid gap-4">
      <label className="ms-label">
        Email
        <input
          className="ms-input"
          name="email"
          type="email"
          autoComplete="username"
          required
        />
      </label>
      <label className="ms-label">
        Mot de passe
        <input
          className="ms-input"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </label>
      {state.error && (
        <p className="text-sm text-ms-error" role="alert">
          {errors[state.error] ?? "Connexion impossible."}
        </p>
      )}
      <button className="ms-btn mt-2" disabled={pending}>
        {pending ? "Connexion…" : "Se connecter"}
      </button>
    </form>
  );
}
