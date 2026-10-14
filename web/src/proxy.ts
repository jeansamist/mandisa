import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { MS_SESSION_COOKIE } from "./lib/ms-session";

const intl = createMiddleware(routing);

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Management system: not localized; send visitors without a session to the login page.
  // (Pages still verify the session with the API: this is only a fast redirect.)
  if (pathname === "/ms" || pathname.startsWith("/ms/")) {
    const hasSession = request.cookies.has(MS_SESSION_COOKIE);
    if (!hasSession && pathname !== "/ms/login") {
      return NextResponse.redirect(new URL("/ms/login", request.url));
    }
    return NextResponse.next();
  }

  return intl(request);
}

export const config = {
  // Skip API routes, Next.js internals and files with an extension (e.g. favicon.svg).
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
