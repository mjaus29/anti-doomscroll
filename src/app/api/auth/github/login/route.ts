import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

const OAUTH_STATE_COOKIE = "copilot_oauth_state";
const OAUTH_RETURN_TO_COOKIE = "copilot_oauth_return_to";

function getBaseUrl(request: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  const protocol = request.headers.get("x-forwarded-proto") || "http";
  const host =
    request.headers.get("x-forwarded-host") || request.headers.get("host");

  if (!host) {
    throw new Error("Cannot resolve host for OAuth redirect URI.");
  }

  return `${protocol}://${host}`;
}

export async function GET(request: NextRequest) {
  const secureCookies = process.env.NODE_ENV === "production";
  const clientId = process.env.GITHUB_CLIENT_ID?.trim();
  if (!clientId) {
    return NextResponse.json(
      { error: "Missing GITHUB_CLIENT_ID for GitHub OAuth." },
      { status: 500 }
    );
  }

  const state = randomUUID();
  const nextPath = request.nextUrl.searchParams.get("next") || "/";
  const safeNext = nextPath.startsWith("/") ? nextPath : "/";
  const baseUrl = getBaseUrl(request);
  const redirectUri = `${baseUrl}/api/auth/github/callback`;

  const authorizeUrl = new URL("https://github.com/login/oauth/authorize");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("scope", "read:user");

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookies,
    path: "/",
    maxAge: 60 * 10,
  });
  response.cookies.set(OAUTH_RETURN_TO_COOKIE, safeNext, {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookies,
    path: "/",
    maxAge: 60 * 10,
  });

  return response;
}
