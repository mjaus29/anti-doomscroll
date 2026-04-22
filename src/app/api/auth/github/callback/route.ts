import { NextRequest, NextResponse } from "next/server";

const OAUTH_STATE_COOKIE = "copilot_oauth_state";
const OAUTH_RETURN_TO_COOKIE = "copilot_oauth_return_to";
const OAUTH_TOKEN_COOKIE = "copilot_github_token";

export async function GET(request: NextRequest) {
  const secureCookies = process.env.NODE_ENV === "production";
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const stateCookie = request.cookies.get(OAUTH_STATE_COOKIE)?.value;

  if (!code || !state || !stateCookie || state !== stateCookie) {
    return NextResponse.json(
      { error: "Invalid OAuth callback state." },
      { status: 400 }
    );
  }

  const clientId = process.env.GITHUB_CLIENT_ID?.trim();
  const clientSecret = process.env.GITHUB_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "Missing GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET." },
      { status: 500 }
    );
  }

  const tokenResponse = await fetch(
    "https://github.com/login/oauth/access_token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
      cache: "no-store",
    }
  );

  const data = (await tokenResponse.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!tokenResponse.ok || !data.access_token) {
    return NextResponse.json(
      {
        error:
          data.error_description ||
          data.error ||
          "Failed to exchange OAuth code for token.",
      },
      { status: 401 }
    );
  }

  const returnTo = request.cookies.get(OAUTH_RETURN_TO_COOKIE)?.value || "/";
  const safeReturnTo = returnTo.startsWith("/") ? returnTo : "/";

  const response = NextResponse.redirect(new URL(safeReturnTo, request.url));
  response.cookies.set(OAUTH_TOKEN_COOKIE, data.access_token, {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookies,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  response.cookies.delete(OAUTH_STATE_COOKIE);
  response.cookies.delete(OAUTH_RETURN_TO_COOKIE);

  return response;
}
