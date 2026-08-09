import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { parseSignedRequest } from "@/lib/meta/signed-request";
import { nanoid } from "nanoid";

export async function POST(request: NextRequest) {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) {
    console.error("[data-deletion] META_APP_SECRET not configured");
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 500 },
    );
  }

  let signedRequest: string;
  try {
    const formData = await request.formData();
    signedRequest = formData.get("signed_request") as string;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  if (!signedRequest) {
    return NextResponse.json(
      { error: "Missing signed_request" },
      { status: 400 },
    );
  }

  const payload = parseSignedRequest(signedRequest, appSecret);
  if (!payload) {
    return NextResponse.json(
      { error: "Invalid signed_request" },
      { status: 403 },
    );
  }

  const fbUserId = payload.user_id;
  const confirmationCode = nanoid(12);

  const supabase = await createServiceClient();

  try {
    await purgeUserDataByFacebookId(supabase, fbUserId, confirmationCode);
  } catch (err) {
    console.error("[data-deletion] purge error:", err);
    return NextResponse.json(
      { error: "Deletion processing failed" },
      { status: 500 },
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://localhost:3000";
  const statusUrl = `${appUrl}/deletion-status?code=${confirmationCode}`;

  return NextResponse.json({
    url: statusUrl,
    confirmation_code: confirmationCode,
  });
}

async function purgeUserDataByFacebookId(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  fbUserId: string,
  confirmationCode: string,
) {
  const { data: channels } = await supabase
    .from("channels")
    .select("id, user_id, credentials")
    .eq("type", "instagram")
    .eq("status", "active");

  const matchedChannel = (channels ?? []).find((ch) => {
    const creds = ch.credentials as Record<string, unknown> | null;
    if (!creds) return false;
    const igUserId = creds.instagram_user_id as string | undefined;
    return igUserId === fbUserId;
  });

  if (!matchedChannel) {
    console.warn(
      `[data-deletion] no channel found for FB user ${fbUserId}, logging request`,
    );
    await logDeletionRequest(supabase, fbUserId, confirmationCode, "no_channel_found");
    return;
  }

  const userId = matchedChannel.user_id;

  const { data: conversations } = await supabase
    .from("conversations")
    .select("id")
    .eq("user_id", userId);

  const conversationIds = (conversations ?? []).map((c) => c.id);

  if (conversationIds.length > 0) {
    await supabase
      .from("agent_logs")
      .delete()
      .in("conversation_id", conversationIds);

    await supabase
      .from("scheduled_events")
      .delete()
      .in("conversation_id", conversationIds);

    await supabase
      .from("messages")
      .delete()
      .in("conversation_id", conversationIds);
  }

  await supabase.from("conversations").delete().eq("user_id", userId);

  await supabase.from("prospects").delete().eq("user_id", userId);

  await supabase.from("contacts").delete().eq("user_id", userId);

  await supabase
    .from("channels")
    .update({ status: "inactive", credentials: {} })
    .eq("user_id", userId);

  await supabase.from("agent_configs").delete().eq("user_id", userId);

  await logDeletionRequest(supabase, fbUserId, confirmationCode, "completed");
}

async function logDeletionRequest(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  fbUserId: string,
  confirmationCode: string,
  status: string,
) {
  await supabase.from("data_deletion_requests").insert({
    fb_user_id: fbUserId,
    confirmation_code: confirmationCode,
    status,
    requested_at: new Date().toISOString(),
  }).then(({ error }) => {
    if (error) {
      console.error("[data-deletion] failed to log request:", error.message);
    }
  });
}
