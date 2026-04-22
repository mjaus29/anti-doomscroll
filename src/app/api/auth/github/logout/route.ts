import { NextResponse } from "next/server";

const OAUTH_TOKEN_COOKIE = "copilot_github_token";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(OAUTH_TOKEN_COOKIE);
  return response;
}
