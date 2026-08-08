import { NextResponse, type NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import {
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  getInstagramUserInfo,
} from "@/lib/instagram/oauth";
import type { InstagramCredentials } from "@/lib/instagram/types";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const state = searchParams.get("state");
  const code = searchParams.get("code");
  const metaError = searchParams.get("error");
  const metaErrorDescription = searchParams.get("error_description");

  const redirectWithError = (errorKey: string) => {
    const url = request.nextUrl.clone();
    url.pathname = "/channels";
    url.searchParams.set("error", errorKey);
    return NextResponse.redirect(url);
  };

  if (metaError) {
    console.error("Instagram OAuth error:", metaError, metaErrorDescription);
    const key = metaError === "access_denied" ? "access_denied" : "oauth_failed";
    return redirectWithError(key);
  }

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

    const { access_token: longToken } = await exchangeForLongLivedToken(
      shortToken,
      appSecret,
    );

    const userInfo = await getInstagramUserInfo(longToken);

    const serviceClient = await createServiceClient();
    const credentials: InstagramCredentials = {
      access_token: longToken,
      instagram_user_id: userInfo.user_id,
      instagram_username: userInfo.username,
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

  const successUrl = request.nextUrl.clone();
  successUrl.pathname = "/channels";
  successUrl.search = "?connected=true";
  const response = NextResponse.redirect(successUrl);
  response.cookies.set("ig_oauth_state", "", { maxAge: 0, path: "/" });

  return response;
}
