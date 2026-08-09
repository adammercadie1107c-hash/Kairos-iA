import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  executeDueFollowups,
  type FollowupDeps,
  type GenerateMessageFn,
} from "./execute-due-followups";
import type { FollowupTransport, SendFollowupResult } from "./transport";

// ---------------------------------------------------------------------------
// Mock Supabase
// ---------------------------------------------------------------------------

type Row = Record<string, unknown>;
type Filter = { column: string; op: string; value: unknown };

function createMockSupabase(tables: Record<string, Row[]>) {
  function createQueryBuilder(tableName: string) {
    let filters: Filter[] = [];
    let orFilter: string | null = null;
    let insertData: Row | null = null;
    let updateData: Row | null = null;
    let orderCol: string | null = null;
    let orderAsc = true;
    let limitN: number | null = null;

    function matchesFilters(row: Row): boolean {
      const basic = filters.every((f) => {
        const val = row[f.column];
        switch (f.op) {
          case "eq":
            return val === f.value;
          case "is":
            if (f.value === null) return val === null || val === undefined;
            return val === f.value;
          case "lt":
            return typeof val === "number"
              ? val < (f.value as number)
              : String(val ?? "") < String(f.value);
          case "lte":
            return String(val ?? "") <= String(f.value);
          case "gte":
            return String(val ?? "") >= String(f.value);
          case "ilike":
            return (
              typeof val === "string" &&
              typeof f.value === "string" &&
              val.toLowerCase() === f.value.toLowerCase()
            );
          default:
            return true;
        }
      });
      if (!basic) return false;
      if (!orFilter) return true;
      return parseOr(orFilter, row);
    }

    function parseOr(expr: string, row: Row): boolean {
      const parts = expr.split(",");
      return parts.some((part) => {
        const m = part.match(/^(\w+)\.(is|lt|gt|eq)\.(.+)$/);
        if (!m) return false;
        const [, col, op, rawVal] = m;
        const actual = row[col];
        if (op === "is" && rawVal === "null") return actual === null || actual === undefined;
        if (op === "lt") return String(actual ?? "") < rawVal;
        if (op === "eq") return String(actual) === rawVal;
        return false;
      });
    }

    function resolve(): Promise<{ data: unknown; error: unknown }> {
      if (insertData) {
        const newRow: Row = {
          id: `gen-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          created_at: new Date().toISOString(),
          ...insertData,
        };
        tables[tableName] = tables[tableName] ?? [];
        tables[tableName].push(newRow);
        insertData = null;
        filters = [];
        orFilter = null;
        return Promise.resolve({ data: newRow, error: null });
      }

      if (updateData) {
        const rows = (tables[tableName] ?? []).filter(matchesFilters);
        for (const row of rows) Object.assign(row, updateData);
        updateData = null;
        filters = [];
        orFilter = null;
        return Promise.resolve({ data: rows, error: null });
      }

      let rows = (tables[tableName] ?? []).filter(matchesFilters);

      if (orderCol) {
        rows = [...rows].sort((a, b) => {
          const av = String(a[orderCol!] ?? "");
          const bv = String(b[orderCol!] ?? "");
          return orderAsc ? av.localeCompare(bv) : bv.localeCompare(av);
        });
      }

      if (limitN !== null) {
        rows = rows.slice(0, limitN);
      }

      filters = [];
      orFilter = null;
      orderCol = null;
      limitN = null;
      return Promise.resolve({ data: rows, error: null });
    }

    const builder: Record<string, unknown> = {
      select(_fields?: string) { // eslint-disable-line @typescript-eslint/no-unused-vars
        return builder;
      },
      eq(col: string, val: unknown) {
        filters.push({ column: col, op: "eq", value: val });
        return builder;
      },
      is(col: string, val: unknown) {
        filters.push({ column: col, op: "is", value: val });
        return builder;
      },
      lt(col: string, val: unknown) {
        filters.push({ column: col, op: "lt", value: val });
        return builder;
      },
      lte(col: string, val: unknown) {
        filters.push({ column: col, op: "lte", value: val });
        return builder;
      },
      gte(col: string, val: unknown) {
        filters.push({ column: col, op: "gte", value: val });
        return builder;
      },
      ilike(col: string, val: unknown) {
        filters.push({ column: col, op: "ilike", value: val });
        return builder;
      },
      or(expr: string) {
        orFilter = expr;
        return builder;
      },
      order(col: string, opts?: { ascending?: boolean }) {
        orderCol = col;
        orderAsc = opts?.ascending !== false;
        return builder;
      },
      limit(n: number) {
        limitN = n;
        return builder;
      },
      insert(data: Row) {
        insertData = data;
        return builder;
      },
      update(data: Row) {
        updateData = data;
        return builder;
      },
      then(onFulfilled: (val: { data: unknown; error: unknown }) => void) {
        return resolve().then(onFulfilled);
      },
      single() {
        return resolve().then((r) => {
          const d = Array.isArray(r.data) ? r.data[0] ?? null : r.data;
          return { data: d, error: d ? null : { message: "not found" } };
        });
      },
      maybeSingle() {
        return resolve().then((r) => {
          const d = Array.isArray(r.data) ? r.data[0] ?? null : r.data;
          return { data: d, error: null };
        });
      },
    };

    return builder;
  }

  return {
    from(table: string) {
      return createQueryBuilder(table);
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const USER_ID = "user-1";
const CONV_ID = "conv-1";
const CONTACT_ID = "contact-1";
const CHANNEL_ID = "channel-1";
const CONFIG_ID = "config-1";

const pastDate = (hoursAgo: number) =>
  new Date(Date.now() - hoursAgo * 3_600_000).toISOString();

const futureDate = (hoursAhead: number) =>
  new Date(Date.now() + hoursAhead * 3_600_000).toISOString();

function baseConfig(): Row {
  return {
    id: CONFIG_ID,
    user_id: USER_ID,
    business_name: "TestBiz",
    business_description: "Coaching fitness",
    offer: "Programmes personnalises",
    tone: "professionnel",
    faq: [],
    qualification_questions: [],
    required_qualification_fields: [],
    qualification_rules: {},
    booking_link: "",
    booking_message: "",
    max_followups: 3,
    created_at: pastDate(100),
    updated_at: pastDate(100),
  };
}

function baseTables(eventOverrides: Partial<Row> = {}): Record<string, Row[]> {
  return {
    scheduled_events: [
      {
        id: "event-1",
        conversation_id: CONV_ID,
        type: "followup",
        scheduled_at: pastDate(1),
        executed_at: null,
        cancelled: false,
        processing_at: null,
        attempts_count: 0,
        last_error: null,
        created_at: pastDate(25),
        ...eventOverrides,
      },
    ],
    conversations: [
      {
        id: CONV_ID,
        user_id: USER_ID,
        contact_id: CONTACT_ID,
        channel_id: CHANNEL_ID,
        status: "qualifying",
        ai_enabled: true,
        followup_count: 0,
        next_followup_at: pastDate(1),
        last_message_at: pastDate(25),
        created_at: pastDate(48),
      },
    ],
    contacts: [
      {
        id: CONTACT_ID,
        user_id: USER_ID,
        channel_id: CHANNEL_ID,
        external_id: "ext-1",
        display_name: "Test Contact",
        extracted_info: {},
        created_at: pastDate(48),
      },
    ],
    channels: [
      {
        id: CHANNEL_ID,
        user_id: USER_ID,
        type: "demo",
        status: "active",
        created_at: pastDate(100),
      },
    ],
    agent_configs: [baseConfig()],
    messages: [
      {
        id: "msg-1",
        conversation_id: CONV_ID,
        role: "contact",
        content: "Bonjour",
        metadata: {},
        created_at: pastDate(26),
      },
      {
        id: "msg-2",
        conversation_id: CONV_ID,
        role: "agent",
        content: "Bonjour, comment puis-je vous aider ?",
        metadata: {},
        created_at: pastDate(25),
      },
    ],
    prospects: [
      {
        id: "prospect-1",
        user_id: USER_ID,
        contact_id: CONTACT_ID,
        first_name: "Test",
        last_name: "Contact",
        email: null,
        phone: null,
        status: "a_relancer",
        next_followup_at: pastDate(1).split("T")[0],
        last_followup_at: null,
        updated_at: pastDate(25),
      },
    ],
  };
}

const mockGenerator: GenerateMessageFn = async () => ({
  message: "Bonjour, avez-vous eu le temps de reflechir a notre offre ?",
});

const failingGenerator: GenerateMessageFn = async () => {
  throw new Error("API_ERROR");
};

function demoTransport(): FollowupTransport {
  return {
    async send(params, supabase): Promise<SendFollowupResult> {
      const { error } = await supabase.from("messages").insert({
        conversation_id: params.conversationId,
        role: "agent",
        content: params.content,
        metadata: params.metadata,
      });
      if (error)
        return {
          delivered: false,
          error: (error as { message: string }).message,
          errorCode: "delivery_failed",
        };
      return { delivered: true };
    },
  };
}

function unsupportedTransport(): FollowupTransport {
  return {
    async send(): Promise<SendFollowupResult> {
      return {
        delivered: false,
        error: "unsupported_transport: instagram",
        errorCode: "unsupported_transport",
      };
    },
  };
}

function makeDeps(
  tables: Record<string, Row[]>,
  opts?: {
    generator?: GenerateMessageFn;
    transport?: (type: string) => FollowupTransport;
  },
): FollowupDeps {
  return {
    supabase: createMockSupabase(tables) as never,
    generateMessage: opts?.generator ?? mockGenerator,
    resolveTransport: opts?.transport ?? (() => demoTransport()),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("executeDueFollowups", () => {
  it("executes a due event in simulator", async () => {
    const tables = baseTables();
    const deps = makeDeps(tables);

    const result = await executeDueFollowups(deps);

    assert.equal(result.found, 1);
    assert.equal(result.claimed, 1);
    assert.equal(result.executed, 1);
    assert.equal(result.skipped, 0);
    assert.equal(result.failed, 0);

    const event = tables.scheduled_events[0];
    assert.ok(event.executed_at, "executed_at should be set");
    assert.equal(event.processing_at, null, "processing_at should be cleared");

    const conv = tables.conversations[0];
    assert.equal(conv.followup_count, 1);
    assert.ok(conv.next_followup_at, "next_followup_at should be set for chained followup");

    const prospect = tables.prospects[0];
    assert.ok(prospect.last_followup_at);
    assert.ok(prospect.next_followup_at, "prospect next_followup_at should be set for chained followup");

    const agentMessages = tables.messages.filter(
      (m) =>
        m.role === "agent" &&
        (m.metadata as Record<string, unknown>)?.is_followup === true,
    );
    assert.equal(agentMessages.length, 1);
  });

  it("ignores future events", async () => {
    const tables = baseTables({ scheduled_at: futureDate(2) });
    const deps = makeDeps(tables);

    const result = await executeDueFollowups(deps);

    assert.equal(result.found, 0);
    assert.equal(result.executed, 0);
    assert.equal(tables.scheduled_events[0].executed_at, null);
  });

  it("ignores cancelled events", async () => {
    const tables = baseTables({ cancelled: true });
    const deps = makeDeps(tables);

    const result = await executeDueFollowups(deps);

    assert.equal(result.found, 0);
    assert.equal(result.executed, 0);
  });

  it("ignores already executed events", async () => {
    const tables = baseTables({ executed_at: pastDate(0.5) });
    const deps = makeDeps(tables);

    const result = await executeDueFollowups(deps);

    assert.equal(result.found, 0);
    assert.equal(result.executed, 0);
  });

  it("two workers cannot execute the same event", async () => {
    const tables = baseTables();

    const deps1 = makeDeps(tables);
    const deps2: FollowupDeps = {
      ...deps1,
      supabase: deps1.supabase,
    };

    const r1 = await executeDueFollowups(deps1);
    assert.equal(r1.executed, 1);

    const r2 = await executeDueFollowups(deps2);
    assert.equal(r2.found, 0, "second worker should find 0 candidates");
    assert.equal(r2.executed, 0);

    const agentFollowups = tables.messages.filter(
      (m) =>
        m.role === "agent" &&
        (m.metadata as Record<string, unknown>)?.is_followup === true,
    );
    assert.equal(agentFollowups.length, 1, "only one follow-up message sent");
  });

  it("recently claimed event is not re-claimed", async () => {
    const tables = baseTables({
      processing_at: new Date().toISOString(),
    });
    const deps = makeDeps(tables);

    const result = await executeDueFollowups(deps);

    assert.equal(result.found, 0);
    assert.equal(result.claimed, 0);
  });

  it("expired claim is re-claimable", async () => {
    const tables = baseTables({
      processing_at: pastDate(1),
    });
    const deps = makeDeps(tables);

    const result = await executeDueFollowups(deps, {
      lockTimeoutMinutes: 5,
    });

    assert.equal(result.found, 1);
    assert.equal(result.claimed, 1);
    assert.equal(result.executed, 1);
  });

  it("inbound reply cancels pending events", async () => {
    const tables = baseTables();
    tables.messages.push({
      id: "msg-inbound-after",
      conversation_id: CONV_ID,
      role: "contact",
      content: "En fait je suis interesse",
      metadata: {},
      created_at: new Date().toISOString(),
    });

    const deps = makeDeps(tables);
    const result = await executeDueFollowups(deps);

    assert.equal(result.skipped, 1);
    assert.equal(result.executed, 0);
    assert.equal(tables.scheduled_events[0].cancelled, true);
  });

  it("max_followups respected", async () => {
    const tables = baseTables();
    tables.conversations[0].followup_count = 3;
    (tables.agent_configs[0] as Row).max_followups = 3;

    const deps = makeDeps(tables);
    const result = await executeDueFollowups(deps);

    assert.equal(result.skipped, 1);
    assert.equal(result.executed, 0);
    assert.equal(tables.scheduled_events[0].cancelled, true);
  });

  it("generation failure does not set executed_at", async () => {
    const tables = baseTables();
    const deps = makeDeps(tables, { generator: failingGenerator });

    const result = await executeDueFollowups(deps);

    assert.equal(result.failed, 1);
    assert.equal(result.executed, 0);

    const event = tables.scheduled_events[0];
    assert.equal(event.executed_at, null);
    assert.equal(event.processing_at, null);
    assert.ok(
      String(event.last_error).includes("API_ERROR"),
      "last_error should contain the error",
    );
    assert.equal(event.attempts_count, 1);
  });

  it("unsupported Instagram transport does not set executed_at", async () => {
    const tables = baseTables();
    tables.channels[0].type = "instagram";

    const deps = makeDeps(tables, {
      transport: () => unsupportedTransport(),
    });

    const result = await executeDueFollowups(deps);

    assert.equal(result.failed, 1);
    assert.equal(result.executed, 0);

    const event = tables.scheduled_events[0];
    assert.equal(event.executed_at, null);
    assert.ok(
      String(event.last_error).includes("unsupported"),
      "last_error should mention unsupported",
    );
    assert.equal(event.attempts_count, 1);
  });

  it("attempts_count and last_error updated on failure", async () => {
    const tables = baseTables({ attempts_count: 2 });
    const deps = makeDeps(tables, { generator: failingGenerator });

    const result = await executeDueFollowups(deps);

    assert.equal(result.failed, 1);
    const event = tables.scheduled_events[0];
    assert.equal(event.attempts_count, 3);
    assert.ok(event.last_error);
  });

  it("exhausted retries are not picked up", async () => {
    const tables = baseTables({ attempts_count: 5 });
    const deps = makeDeps(tables);

    const result = await executeDueFollowups(deps);

    assert.equal(result.found, 0);
    assert.equal(result.executed, 0);
  });

  it("CRM dates updated after execution with chain", async () => {
    const tables = baseTables();
    tables.prospects[0].next_followup_at = "2026-07-31";

    const deps = makeDeps(tables);
    await executeDueFollowups(deps);

    assert.ok(tables.conversations[0].next_followup_at, "next_followup_at should be set for next chain");
    assert.ok(tables.prospects[0].next_followup_at, "prospect next_followup_at should be set for next chain");
    assert.ok(tables.prospects[0].last_followup_at, "last_followup_at should be set");
  });

  it("CRM dates cleared when max_followups reached after execution", async () => {
    const tables = baseTables();
    tables.conversations[0].followup_count = 2;
    (tables.agent_configs[0] as Row).max_followups = 3;
    tables.prospects[0].next_followup_at = "2026-07-31";

    const deps = makeDeps(tables);
    await executeDueFollowups(deps);

    assert.equal(tables.conversations[0].next_followup_at, null);
    assert.equal(tables.prospects[0].next_followup_at, null);
    assert.ok(tables.prospects[0].last_followup_at);
  });

  it("user isolation: different user conversation skips", async () => {
    const tables = baseTables();
    tables.conversations[0].user_id = "other-user";

    const deps = makeDeps(tables);
    const result = await executeDueFollowups(deps);

    assert.equal(result.skipped, 1);
    assert.equal(result.executed, 0);
    assert.equal(tables.scheduled_events[0].cancelled, true);
  });

  it("closed conversation skips", async () => {
    const tables = baseTables();
    tables.conversations[0].status = "closed";

    const deps = makeDeps(tables);
    const result = await executeDueFollowups(deps);

    assert.equal(result.skipped, 1);
    assert.equal(result.executed, 0);
    assert.equal(tables.scheduled_events[0].cancelled, true);
  });

  it("AI disabled conversation skips", async () => {
    const tables = baseTables();
    tables.conversations[0].ai_enabled = false;

    const deps = makeDeps(tables);
    const result = await executeDueFollowups(deps);

    assert.equal(result.skipped, 1);
    assert.equal(tables.scheduled_events[0].cancelled, true);
  });

  // --- Chained followup tests ---

  it("followup 1 executed → followup 2 event created", async () => {
    const tables = baseTables();
    tables.conversations[0].followup_count = 0;
    (tables.agent_configs[0] as Row).max_followups = 3;
    tables.contacts[0].extracted_info = {};

    const deps = makeDeps(tables);
    const result = await executeDueFollowups(deps);

    assert.equal(result.executed, 1);
    assert.equal(tables.scheduled_events.length, 2, "should have original + new event");

    const pendingEvents = tables.scheduled_events.filter(
      (e) => !e.executed_at && !e.cancelled,
    );
    assert.equal(pendingEvents.length, 1, "one new pending event should exist");
    assert.ok(
      new Date(pendingEvents[0].scheduled_at as string).getTime() >
        Date.now() + 71 * 3_600_000,
      "next event should be ~72h in the future",
    );
  });

  it("followup 2 not created when max_followups reached", async () => {
    const tables = baseTables();
    tables.conversations[0].followup_count = 2;
    (tables.agent_configs[0] as Row).max_followups = 3;

    const deps = makeDeps(tables);
    const result = await executeDueFollowups(deps);

    assert.equal(result.executed, 1);
    assert.equal(tables.conversations[0].followup_count, 3);

    const pendingEvents = tables.scheduled_events.filter(
      (e) => !e.executed_at && !e.cancelled,
    );
    assert.equal(pendingEvents.length, 0, "no new pending event when max reached");
    assert.equal(tables.conversations[0].next_followup_at, null);
  });

  it("no duplicate pending events created", async () => {
    const tables = baseTables();
    tables.scheduled_events.push({
      id: "event-future",
      conversation_id: CONV_ID,
      type: "followup",
      scheduled_at: futureDate(48),
      executed_at: null,
      cancelled: false,
      processing_at: null,
      attempts_count: 0,
      last_error: null,
      created_at: pastDate(1),
    });

    const deps = makeDeps(tables);
    const result = await executeDueFollowups(deps);

    assert.equal(result.executed, 1);

    const pendingEvents = tables.scheduled_events.filter(
      (e) => !e.executed_at && !e.cancelled,
    );
    assert.equal(pendingEvents.length, 1, "existing future event prevents duplication");
    assert.equal(pendingEvents[0].id, "event-future");
  });

  it("handoff status prevents chained followup", async () => {
    const tables = baseTables();
    tables.conversations[0].status = "handoff";

    const deps = makeDeps(tables);
    const result = await executeDueFollowups(deps);

    assert.equal(result.skipped, 1);
    assert.equal(result.executed, 0);

    const pendingEvents = tables.scheduled_events.filter(
      (e) => !e.executed_at && !e.cancelled,
    );
    assert.equal(pendingEvents.length, 0);
  });

  it("disqualified status prevents chained followup", async () => {
    const tables = baseTables();
    tables.conversations[0].status = "disqualified";

    const deps = makeDeps(tables);
    const result = await executeDueFollowups(deps);

    assert.equal(result.skipped, 1);

    const pendingEvents = tables.scheduled_events.filter(
      (e) => !e.executed_at && !e.cancelled,
    );
    assert.equal(pendingEvents.length, 0);
  });

  it("context with extracted_info passed to generator", async () => {
    const tables = baseTables();
    tables.contacts[0].extracted_info = { objectif: "perdre 10kg", budget: "500€" };
    tables.conversations[0].status = "qualifying";

    let capturedContext: unknown = null;
    const contextCapturingGenerator: GenerateMessageFn = async (
      _history,
      _config,
      _num,
      context,
    ) => {
      capturedContext = context;
      return { message: "Relance contextualisée" };
    };

    const deps = makeDeps(tables, { generator: contextCapturingGenerator });
    await executeDueFollowups(deps);

    assert.ok(capturedContext, "context should be passed to generator");
    const ctx = capturedContext as { extractedInfo: Record<string, string>; conversationStatus: string };
    assert.equal(ctx.conversationStatus, "qualifying");
    assert.equal(ctx.extractedInfo.objectif, "perdre 10kg");
    assert.equal(ctx.extractedInfo.budget, "500€");
  });

  it("generator receives different followupNumber for chain", async () => {
    const tables = baseTables();
    tables.conversations[0].followup_count = 1;
    (tables.agent_configs[0] as Row).max_followups = 3;

    let capturedFollowupNumber = 0;
    const numberCapturingGenerator: GenerateMessageFn = async (
      _history,
      _config,
      num,
    ) => {
      capturedFollowupNumber = num;
      return { message: "Relance numéro " + num };
    };

    const deps = makeDeps(tables, { generator: numberCapturingGenerator });
    await executeDueFollowups(deps);

    assert.equal(capturedFollowupNumber, 2, "followup number should be 2");
  });
});
