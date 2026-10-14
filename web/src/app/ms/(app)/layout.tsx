import { Suspense } from "react";
import Link from "next/link";
import { logoutAction } from "@/app/ms/actions";
import { msApi } from "@/lib/ms-api";
import type { AdminIdentity } from "@/lib/ms-types";
import MsNav, { NavLinks } from "@/components/ms/nav";
import { Loading } from "@/components/ms/ui";

async function CurrentAdmin() {
  const { admin } = await msApi<{ admin: AdminIdentity }>("/auth/me");
  return (
    <div className="text-xs text-white/70">
      <p className="font-medium text-white">{admin.name}</p>
      <p>{admin.email}</p>
    </div>
  );
}

// Authenticated shell: the session is checked against the API on every page.
export default function MsAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      <aside className="flex flex-col gap-6 bg-ms-deep p-5 md:sticky md:top-0 md:h-screen">
        <Link
          href="/ms"
          className="font-serif text-2xl font-semibold text-white"
        >
          Mandisa <span className="text-sm font-normal text-white/60">MS</span>
        </Link>
        <Suspense fallback={<NavLinks pathname={null} />}>
          <MsNav />
        </Suspense>
        <div className="mt-auto grid gap-3 border-t border-white/10 pt-4">
          <Suspense fallback={null}>
            <CurrentAdmin />
          </Suspense>
          <form action={logoutAction}>
            <button className="text-xs font-medium text-white/80 underline hover:text-white">
              Se déconnecter
            </button>
          </form>
          <Link href="/fr" className="text-xs text-white/60 hover:text-white">
            Voir le site ↗
          </Link>
        </div>
      </aside>
      <main className="min-w-0 p-4 md:p-8">
        <Suspense fallback={<Loading />}>{children}</Suspense>
      </main>
    </div>
  );
}
