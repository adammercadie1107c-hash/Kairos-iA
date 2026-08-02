import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/auth/instagram
 *
 * Starts the Instagram Login OAuth flow.
 * Requires an authenticated Supabase session.
 * Sets a CSRF nonce cookie then redirects the browser to Instagram's
 * authorization endpoint (Instagram Login, not Facebook Login).
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

  const authUrl = new URL("https://api.instagram.com/oauth/authorize");
  authUrl.searchParams.set("client_id", appId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set(
    "scope",
    "instagram_business_basic,instagram_business_manage_messages",
  );
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
