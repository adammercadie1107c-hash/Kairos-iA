import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { executeDueFollowups } from "@/lib/followups/execute-due-followups";
import { generateFollowupMessage } from "@/lib/followups/generate-followup";
import { resolveTransport } from "@/lib/followups/transport";

/**
 * GET & POST /api/cron/followups
 *
 * Executes due follow-up events. Called automatically by Vercel Cron
 * every 15 minutes (GET), or manually via POST for testing.
 *
 * Authentication:
 *   Authorization: Bearer ${CRON_SECRET}
 *   The CRON_SECRET env var must be set in Vercel project settings.
 *
 * Vercel Cron configuration: see vercel.json at project root.
 *
 * Response: { found, claimed, executed, skipped, failed }
 */

function verifyCronAuth(request: NextRequest): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 },
    );
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}

async function handleFollowups(): Promise<NextResponse> {
  const supabase = await createServiceClient();

  const result = await executeDueFollowups(
    {
      supabase,
      generateMessage: generateFollowupMessage,
      resolveTransport,
    },
    { batchSize: 10 },
  );

  return NextResponse.json({
    found: result.found,
    claimed: result.claimed,
    executed: result.executed,
    skipped: result.skipped,
    failed: result.failed,
  });
}

export async function GET(request: NextRequest) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  try {
    return await handleFollowups();
  } catch (err) {
    console.error("Cron followups error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  try {
    return await handleFollowups();
  } catch (err) {
    console.error("Cron followups error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
