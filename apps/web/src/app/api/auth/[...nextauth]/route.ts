import { NextResponse } from "next/server";

/**
 * Stub auth handlers for development
 * Returns mock responses for NextAuth endpoints
 */

export async function GET(request: Request) {
  const url = new URL(request.url);

  // Handle /api/auth/session
  if (url.pathname.endsWith("/session")) {
    return Response.json(null);
  }

  // Handle /api/auth/csrf
  if (url.pathname.endsWith("/csrf")) {
    return Response.json({ csrfToken: "stub-csrf-token" });
  }

  // Handle /api/auth/providers
  if (url.pathname.endsWith("/providers")) {
    return Response.json({});
  }

  // Handle /api/auth/callback/*
  if (url.pathname.includes("/callback")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return Response.json({ error: "Not found" }, { status: 404 });
}

export async function POST(request: Request) {
  const url = new URL(request.url);

  // Handle sign out
  if (url.pathname.includes("/signout")) {
    return Response.json({ url: "/" });
  }

  // Handle sign in
  if (url.pathname.includes("/signin")) {
    return Response.json({ error: "Auth not configured" }, { status: 501 });
  }

  // Handle callback
  if (url.pathname.includes("/callback")) {
    return Response.json({ url: "/" });
  }

  return Response.json({ error: "Not found" }, { status: 404 });
}
