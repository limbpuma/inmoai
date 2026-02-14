/**
 * tRPC Proxy Route
 * Forwards requests to the API server to avoid CORS issues
 */

const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export async function GET(request: Request) {
  return handleRequest(request);
}

export async function POST(request: Request) {
  return handleRequest(request);
}

async function handleRequest(request: Request) {
  const url = new URL(request.url);
  const trpcPath = url.pathname.replace("/api/trpc", "");
  const targetUrl = `${API_URL}/api/trpc${trpcPath}${url.search}`;

  console.log(`[tRPC Proxy] ${request.method} ${targetUrl}`);

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    const authHeader = request.headers.get("authorization");
    if (authHeader) headers["authorization"] = authHeader;

    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) headers["cookie"] = cookieHeader;

    const body = request.method !== "GET" ? await request.text() : undefined;

    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
    });

    const data = await response.text();
    const contentType = response.headers.get("Content-Type") || "application/json";

    return new Response(data, {
      status: response.status,
      headers: { "Content-Type": contentType },
    });
  } catch (error) {
    console.error("[tRPC Proxy] Error:", error);
    return Response.json(
      { error: `Failed to connect to API server at ${API_URL}` },
      { status: 502 }
    );
  }
}
