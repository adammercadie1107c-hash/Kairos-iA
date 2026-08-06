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
  const { searchParams } = request.nextUrl;

  const state = searchParams.get("state");
  const code = searchParams.get("code");
  const metaError = searchParams.get("error");
  const metaErrorDescription = searchParams.get("error_description");

  // Helper to redirect with error params, using request URL origin
  const redirectWithError = (errorKey: string) => {
    const url = request.nextUrl.clone();
    url.pathname = "/channels";
    url.searchParams.set("error", errorKey);
    return NextResponse.redirect(url);
  };

  if (metaError) {
    console.error("Facebook OAuth error:", metaError, metaErrorDescription);
    const key = metaError === "access_denied" ? "access_denied" : "oauth_failed";
    return redirectWithError(key);
  }

  // CSRF — char-by-char comparison prevents timing attacks
  const storedState = request.cookies.get("ig_oauth_state")?.value;
  const stateValid =
    typeof storedState === "string" &&
    typeof state === "string" &&
    storedState.length === state.length &&
    storedState.split("").every((c, i) => c === (state as string)[i]);

  if (!stateValid) {
    return redirectWithError("invalid_state");
  }

  if (!code) {
    return redirectWithError("no_code");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    return NextResponse.redirect(loginUrl);
  }

  const appId = process.env.META_APP_ID!;
  const appSecret = process.env.META_APP_SECRET!;
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI!;

  try {
    const { access_token: shortToken } = await exchangeCodeForToken(
      code,
      appId,
      appSecret,
      redirectUri,
    );

    const { access_token: longUserToken } = await exchangeForLongLivedToken(
      shortToken,
      appId,
      appSecret,
    );

    const pages = await getUserPages(longUserToken);

    if (pages.length === 0) {
      return redirectWithError("no_pages");
    }

    let instagramAccountId: string | null = null;
    let pageAccessToken: string | null = null;
    let pageId: string | null = null;

    for (const page of pages) {
      const igId = await getInstagramAccountFromPage(page.id, page.access_token);
      if (igId) {
        instagramAccountId = igId;
        pageAccessToken = page.access_token;
        pageId = page.id;
        break;
      }
    }

    if (!instagramAccountId || !pageAccessToken || !pageId) {
      return redirectWithError("no_instagram_account");
    }

    // 5. Upsert channel — service client bypasses RLS
    const serviceClient = await createServiceClient();
    const credentials: InstagramCredentials = {
      instagram_account_id: instagramAccountId,
      page_access_token: pageAccessToken,
      page_id: pageId,
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
      return redirectWithError("db_error");
    }
  } catch (err) {
    console.error("Instagram OAuth flow error:", err);
    return redirectWithError("oauth_failed");
  }

  // Success redirect
  const successUrl = request.nextUrl.clone();
  successUrl.pathname = "/channels";
  successUrl.search = "?connected=true";
  const response = NextResponse.redirect(successUrl);
  response.cookies.set("ig_oauth_state", "", { maxAge: 0, path: "/" });

  return response;
}
