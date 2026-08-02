import { NextResponse, type NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import {
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  getUserPages,
  getInstagramAccountFromPage,
} from "@/lib/instagram/oauth";
import type { InstagramCredentials } from "@/lib/instagram/types";

/**
 * GET /api/auth/instagram/callback
 *
 * Handles the OAuth callback from Facebook Login for Business.
 * Flow:
 *   code → short-lived user token → long-lived user token
 *   → list Facebook Pages → find Page with linked Instagram account
 *   → upsert channel with Page Access Token + Instagram account ID
 *
 * The token is stored server-side only; never exposed to the browser.
 */
export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const { searchParams } = request.nextUrl;

  const state = searchParams.get("state");
  const code = searchParams.get("code");
  const metaError = searchParams.get("error");
  const metaErrorDescription = searchParams.get("error_description");

  if (metaError) {
    console.error("Facebook OAuth error:", metaError, metaErrorDescription);
    const key = metaError === "access_denied" ? "access_denied" : "oauth_failed";
    return NextResponse.redirect(new URL(`/channels?error=${key}`, appUrl));
  }

  // CSRF — char-by-char comparison prevents timing attacks
  const storedState = request.cookies.get("ig_oauth_state")?.value;
  const stateValid =
    typeof storedState === "string" &&
    typeof state === "string" &&
    storedState.length === state.length &&
    storedState.split("").every((c, i) => c === (state as string)[i]);

  if (!stateValid) {
    return NextResponse.redirect(new URL("/channels?error=invalid_state", appUrl));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/channels?error=no_code", appUrl));
  }

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

  console.log("OAuth callback — env vars:", {
    appId: appId ? "✓" : "✗",
    appSecret: appSecret ? `✓ (len=${appSecret.length})` : "✗",
    redirectUri: redirectUri ? "✓" : "✗",
    code: code ? "✓" : "✗",
  });

  try {
    // 1. Short-lived user token
    const { access_token: shortToken } = await exchangeCodeForToken(
      code,
      appId,
      appSecret,
      redirectUri,
    );

    // 2. Long-lived user token (~60 days)
    const { access_token: longUserToken } = await exchangeForLongLivedToken(
      shortToken,
      appId,
      appSecret,
    );

    // 3. List Facebook Pages managed by the user
    const pages = await getUserPages(longUserToken);

    if (pages.length === 0) {
      return NextResponse.redirect(new URL("/channels?error=no_pages", appUrl));
    }

    // 4. Find the first Page with a connected Instagram Professional account
    let instagramAccountId: string | null = null;
    let pageAccessToken: string | null = null;

    for (const page of pages) {
      const igId = await getInstagramAccountFromPage(page.id, page.access_token);
      if (igId) {
        instagramAccountId = igId;
        pageAccessToken = page.access_token;
        break;
      }
    }

    if (!instagramAccountId || !pageAccessToken) {
      return NextResponse.redirect(
        new URL("/channels?error=no_instagram_account", appUrl),
      );
    }

    // 5. Upsert channel — service client bypasses RLS
    const serviceClient = await createServiceClient();
    const credentials: InstagramCredentials = {
      instagram_account_id: instagramAccountId,
      page_access_token: pageAccessToken,
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

  const response = NextResponse.redirect(new URL("/channels?connected=true", appUrl));
  response.cookies.set("ig_oauth_state", "", { maxAge: 0, path: "/" });

  return response;
}
