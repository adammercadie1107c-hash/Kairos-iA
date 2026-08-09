import type { SupabaseClient } from "@supabase/supabase-js";

export type Period = "7d" | "30d" | "all";

export interface DashboardKpis {
  conversationsReceived: number;
  prospetsQualifying: number;
  prospectsQualified: number;
  qualificationRate: number;
  bookingSent: number;
  handoffs: number;
  followupsExecuted: number;
  prospectsWon: number;
  prospectsLost: number;
  pipeline: PipelineCounts;
}

export interface PipelineCounts {
  new: number;
  qualifying: number;
  qualified: number;
  booking_sent: number;
  handoff: number;
  closed: number;
}

function periodStart(period: Period): string | null {
  if (period === "all") return null;
  const days = period === "7d" ? 7 : 30;
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function fetchDashboardKpis(
  supabase: SupabaseClient,
  userId: string,
  period: Period,
): Promise<DashboardKpis> {
  const since = periodStart(period);

  let convQuery = supabase
    .from("conversations")
    .select("id, status, ai_enabled, created_at")
    .eq("user_id", userId);

  if (since) {
    convQuery = convQuery.gte("created_at", since);
  }

  const { data: conversations } = await convQuery;
  const convs = conversations ?? [];

  const conversationsReceived = convs.length;

  const pipeline: PipelineCounts = {
    new: 0,
    qualifying: 0,
    qualified: 0,
    booking_sent: 0,
    handoff: 0,
    closed: 0,
  };

  let handoffs = 0;

  for (const c of convs) {
    const s = c.status as string;
    if (s in pipeline) {
      pipeline[s as keyof PipelineCounts]++;
    }
    if (s === "handoff" || !c.ai_enabled) {
      handoffs++;
    }
  }

  const prospetsQualifying = pipeline.qualifying;
  const prospectsQualified = pipeline.qualified + pipeline.booking_sent;
  const bookingSent = pipeline.booking_sent;

  const qualifiableConvs = convs.filter(
    (c) => !["new", "closed"].includes(c.status as string),
  ).length;
  const qualificationRate =
    qualifiableConvs > 0
      ? Math.round((prospectsQualified / qualifiableConvs) * 100)
      : 0;

  let evtQuery = supabase
    .from("scheduled_events")
    .select("id, conversation_id")
    .eq("type", "followup")
    .not("executed_at", "is", null);

  if (since) {
    evtQuery = evtQuery.gte("executed_at", since);
  }

  const { data: executedEvents } = await evtQuery;

  const userConvIds = new Set(convs.map((c) => c.id as string));
  const followupsExecuted = (executedEvents ?? []).filter((e) =>
    userConvIds.has(e.conversation_id as string),
  ).length;

  let prospectQuery = supabase
    .from("prospects")
    .select("id, status")
    .eq("user_id", userId);

  if (since) {
    prospectQuery = prospectQuery.gte("updated_at", since);
  }

  const { data: prospects } = await prospectQuery;
  const prospectsWon = (prospects ?? []).filter(
    (p) => p.status === "gagne",
  ).length;
  const prospectsLost = (prospects ?? []).filter(
    (p) => p.status === "perdu",
  ).length;

  return {
    conversationsReceived,
    prospetsQualifying,
    prospectsQualified,
    qualificationRate,
    bookingSent,
    handoffs,
    followupsExecuted,
    prospectsWon,
    prospectsLost,
    pipeline,
  };
}
