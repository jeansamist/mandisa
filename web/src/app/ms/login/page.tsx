import type { Metadata } from "next";
import LoginForm from "./login-form";

export const metadata: Metadata = { title: "Connexion" };

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="ms-card w-full max-w-sm p-8">
        <p className="font-serif text-3xl font-semibold text-ms-green">
          Mandisa
        </p>
        <p className="mb-6 text-sm text-ms-ink/60">Espace de gestion</p>
        <LoginForm />
      </div>
    </main>
  );
}
