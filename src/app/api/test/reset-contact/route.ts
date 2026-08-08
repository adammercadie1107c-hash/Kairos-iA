import { NextResponse, type NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

/**
 * POST /api/test/reset-contact
 *
 * Dev-only endpoint. Completely resets a contact by Instagram sender ID
 * so the next DM from the same IGSID is treated as a brand-new prospect.
 *
 * Body: { external_id: string, confirm?: boolean }
 *   - Without confirm: returns a preview of what will be deleted.
 *   - With confirm: true: performs the deletion.
 */
export async function POST(request: NextRequest) {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_TEST_TOOLS !== "true"
  ) {
    return NextResponse.json(
      { error: "Test tools disabled in production" },
      { status: 403 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { external_id?: string; confirm?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const { external_id, confirm } = body;

  if (!external_id || typeof external_id !== "string") {
    return NextResponse.json(
      { error: "external_id is required (string)" },
      { status: 400 },
    );
  }

  const service = await createServiceClient();

  const { data: contact } = await service
    .from("contacts")
    .select("id, display_name, external_id, channel_id")
    .eq("external_id", external_id)
    .eq("user_id", user.id)
    .single();

  if (!contact) {
    return NextResponse.json(
      { error: "Contact not found for this user" },
      { status: 404 },
    );
  }

  const { data: conversations } = await service
    .from("conversations")
    .select("id")
    .eq("contact_id", contact.id)
    .eq("user_id", user.id);

  const conversationIds = (conversations ?? []).map((c) => c.id);

  if (!confirm) {
    let messageCount = 0;
    let logCount = 0;
    let eventCount = 0;

    if (conversationIds.length > 0) {
      const [msgs, logs, evts] = await Promise.all([
        service
          .from("messages")
          .select("*", { count: "exact", head: true })
          .in("conversation_id", conversationIds),
        service
          .from("agent_logs")
          .select("*", { count: "exact", head: true })
          .in("conversation_id", conversationIds),
        service
          .from("scheduled_events")
          .select("*", { count: "exact", head: true })
          .in("conversation_id", conversationIds),
      ]);
      messageCount = msgs.count ?? 0;
      logCount = logs.count ?? 0;
      eventCount = evts.count ?? 0;
    }

    const { count: prospectCount } = await service
      .from("prospects")
      .select("*", { count: "exact", head: true })
      .eq("contact_id", contact.id)
      .eq("user_id", user.id);

    return NextResponse.json({
      confirm_required: true,
      contact: {
        id: contact.id,
        external_id: contact.external_id,
        display_name: contact.display_name,
      },
      will_delete: {
        messages: messageCount,
        agent_logs: logCount,
        scheduled_events: eventCount,
        prospects: prospectCount ?? 0,
        conversations: conversationIds.length,
        contacts: 1,
      },
      instruction:
        "Renvoyez avec confirm: true pour supprimer ces données.",
    });
  }

  // FK-safe deletion order
  if (conversationIds.length > 0) {
    await service
      .from("agent_logs")
      .delete()
      .in("conversation_id", conversationIds);

    await service
      .from("scheduled_events")
      .delete()
      .in("conversation_id", conversationIds);

    await service
      .from("messages")
      .delete()
      .in("conversation_id", conversationIds);
  }

  await service
    .from("prospects")
    .delete()
    .eq("contact_id", contact.id)
    .eq("user_id", user.id);

  await service
    .from("conversations")
    .delete()
    .eq("contact_id", contact.id)
    .eq("user_id", user.id);

  await service
    .from("contacts")
    .delete()
    .eq("id", contact.id)
    .eq("user_id", user.id);

  return NextResponse.json({
    reset: true,
    external_id,
    deleted: {
      conversations: conversationIds.length,
      contact_id: contact.id,
    },
  });
}
