import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/navigation";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const intlMiddleware = createMiddleware(routing);

// Routes that require authentication (without locale prefix)
const protectedRoutes = ["/dashboard", "/settings", "/favorites"];
const adminRoutes = ["/admin"];
const authRoutes = ["/login", "/register"];

// Strip locale prefix from pathname for auth checks
function stripLocale(pathname: string): string {
  const localePattern = /^\/(es|de|en)(\/|$)/;
  return pathname.replace(localePattern, "/") || "/";
}

export function middleware(request: NextRequest) {
  // Run intl middleware first (locale detection + redirect)
  const response = intlMiddleware(request);

  // Auth logic using locale-stripped pathname
  const pathnameWithoutLocale = stripLocale(request.nextUrl.pathname);

  const sessionToken =
    request.cookies.get("next-auth.session-token")?.value ||
    request.cookies.get("__Secure-next-auth.session-token")?.value;

  const isAuthenticated = !!sessionToken;

  // Redirect authenticated users away from auth pages
  if (
    isAuthenticated &&
    authRoutes.some((route) => pathnameWithoutLocale.startsWith(route))
  ) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Protect routes that require authentication
  if (
    !isAuthenticated &&
    protectedRoutes.some((route) => pathnameWithoutLocale.startsWith(route))
  ) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin routes protection
  if (
    !isAuthenticated &&
    adminRoutes.some((route) => pathnameWithoutLocale.startsWith(route))
  ) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|public).*)",
  ],
};
