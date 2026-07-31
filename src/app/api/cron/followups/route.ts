import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { executeDueFollowups } from "@/lib/followups/execute-due-followups";
import { generateFollowupMessage } from "@/lib/followups/generate-followup";
import { resolveTransport } from "@/lib/followups/transport";

/**
 * POST /api/cron/followups
 *
 * Protected cron endpoint for executing due follow-up events.
 *
 * Authentication:
 *   Authorization: Bearer ${CRON_SECRET}
 *   The CRON_SECRET env var must be set in .env.local
 *
 * n8n configuration:
 *   - HTTP method: POST
 *   - URL: https://<domain>/api/cron/followups
 *   - Header: Authorization: Bearer <value of CRON_SECRET>
 *   - Recommended interval: every 15 minutes
 *
 * Response: { found, claimed, executed, skipped, failed }
 */
export async function POST(request: NextRequest) {
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

  try {
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
  } catch (err) {
    console.error("Cron followups error:", err);
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 },
    );
  }
}
