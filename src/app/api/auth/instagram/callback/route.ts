import { NextResponse, type NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import {
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  getInstagramMe,
} from "@/lib/instagram/oauth";
import type { InstagramCredentials } from "@/lib/instagram/types";

/**
 * GET /api/auth/instagram/callback
 *
 * Receives the OAuth callback from Instagram Login.
 * Verifies the CSRF state, exchanges the authorization code for a
 * long-lived access token, fetches the Instagram account ID, and
 * upserts the channel row for the authenticated user.
 *
 * Never exposes the token to the browser — it is stored server-side
 * in the Supabase `channels.credentials` column only.
 */
export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const { searchParams } = request.nextUrl;

  const state = searchParams.get("state");
  const code = searchParams.get("code");
  const metaError = searchParams.get("error");
  const metaErrorDescription = searchParams.get("error_description");

  // User denied access or Instagram returned an error
  if (metaError) {
    console.error("Instagram OAuth error from Meta:", metaError, metaErrorDescription);
    const errorKey =
      metaError === "access_denied" ? "access_denied" : "oauth_failed";
    return NextResponse.redirect(new URL(`/channels?error=${errorKey}`, appUrl));
  }

  // CSRF verification — constant-time comparison prevents timing attacks
  const storedState = request.cookies.get("ig_oauth_state")?.value;
  const stateValid =
    typeof storedState === "string" &&
    typeof state === "string" &&
    storedState.length === state.length &&
    storedState
      .split("")
      .every((char, i) => char === (state as string)[i]);

  if (!stateValid) {
    return NextResponse.redirect(new URL("/channels?error=invalid_state", appUrl));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/channels?error=no_code", appUrl));
  }

  // Confirm the user is still authenticated
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", appUrl));
  }

  const appId = process.env.META_APP_ID!;
  const appSecret = process.env.META_APP_SECRET!;
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI!;

  try {
    // 1. Short-lived token (valid ~1 hour)
    const { access_token: shortToken } = await exchangeCodeForToken(
      code,
      appId,
      appSecret,
      redirectUri,
    );

    // 2. Long-lived token (valid ~60 days)
    const { access_token: longToken } = await exchangeForLongLivedToken(
      shortToken,
      appId,
      appSecret,
    );

    // 3. Fetch Instagram account ID (IGSID)
    const { id: instagramAccountId } = await getInstagramMe(longToken);

    if (!instagramAccountId) {
      return NextResponse.redirect(
        new URL("/channels?error=not_professional", appUrl),
      );
    }

    // 4. Upsert channel — service client bypasses RLS
    const serviceClient = await createServiceClient();
    const credentials: InstagramCredentials = {
      instagram_account_id: instagramAccountId,
      page_access_token: longToken,
    };

    const { error: upsertError } = await serviceClient
      .from("channels")
      .upsert(
        {
          user_id: user.id,
          type: "instagram",
          status: "active",
          credentials,
        },
        { onConflict: "user_id,type" },
      );

    if (upsertError) {
      console.error("Channel upsert error:", upsertError);
      return NextResponse.redirect(new URL("/channels?error=db_error", appUrl));
    }
  } catch (err) {
    console.error("Instagram OAuth flow error:", err);
    return NextResponse.redirect(new URL("/channels?error=oauth_failed", appUrl));
  }

  // Clear CSRF cookie and redirect to success
  const response = NextResponse.redirect(
    new URL("/channels?connected=true", appUrl),
  );
  response.cookies.set("ig_oauth_state", "", { maxAge: 0, path: "/" });

  return response;
}
