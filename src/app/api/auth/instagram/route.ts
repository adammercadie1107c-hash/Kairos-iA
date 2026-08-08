import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/auth/instagram
 *
 * Starts the Instagram Login OAuth flow to connect an
 * Instagram Professional account. Requires an active Supabase session.
 * Sets a CSRF nonce cookie then redirects to Instagram's authorization dialog.
 */
export async function GET(_request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", appUrl));
  }

  const appId = process.env.META_APP_ID;
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI;

  if (!appId || !redirectUri) {
    console.error("META_APP_ID or INSTAGRAM_REDIRECT_URI not configured");
    return NextResponse.redirect(new URL("/channels?error=not_configured", appUrl));
  }

  const nonce = crypto.randomUUID();

  const scopes = [
    "instagram_business_basic",
    "instagram_business_manage_messages",
  ].join(",");

  const authUrl = new URL("https://www.instagram.com/oauth/authorize");
  authUrl.searchParams.set("client_id", appId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", scopes);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("state", nonce);

  const response = NextResponse.redirect(authUrl);
  response.cookies.set("ig_oauth_state", nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  return response;
}
