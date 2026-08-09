import { describe, it, expect, vi, beforeEach } from "vitest";
import { ensureFollowupScheduled } from "./ensure-followup";

type Filter = { column: string; op: string; value: unknown };

function createMockSupabase(tables: Record<string, Record<string, unknown>[]>) {
  function createQueryBuilder(tableName: string) {
    let filters: Filter[] = [];
    let insertData: Record<string, unknown> | null = null;
    let updateData: Record<string, unknown> | null = null;
    let limitVal = Infinity;

    function matchesFilters(row: Record<string, unknown>): boolean {
      return filters.every((f) => {
        const val = row[f.column];
        switch (f.op) {
          case "eq": return val === f.value;
          case "is": return val === f.value;
          default: return true;
        }
      });
    }

    function resolve(): Promise<{ data: unknown; error: unknown }> {
      if (insertData) {
        const newRow = { id: `evt-${Date.now()}-${Math.random().toString(36).slice(2)}`, ...insertData };
        tables[tableName] = tables[tableName] ?? [];
        tables[tableName].push(newRow);
        insertData = null;
        filters = [];
        return Promise.resolve({ data: newRow, error: null });
      }
      if (updateData) {
        const rows = (tables[tableName] ?? []).filter(matchesFilters);
        for (const row of rows) Object.assign(row, updateData);
        updateData = null;
        filters = [];
        return Promise.resolve({ data: rows, error: null });
      }
      const rows = (tables[tableName] ?? []).filter(matchesFilters).slice(0, limitVal);
      filters = [];
      limitVal = Infinity;
      return Promise.resolve({ data: rows, error: null });
    }

    const builder: Record<string, unknown> = {
      select() { return builder; },
      eq(col: string, val: unknown) { filters.push({ column: col, op: "eq", value: val }); return builder; },
      is(col: string, val: unknown) { filters.push({ column: col, op: "is", value: val }); return builder; },
      limit(n: number) { limitVal = n; return builder; },
      insert(data: Record<string, unknown>) { insertData = data; return builder; },
      update(data: Record<string, unknown>) { updateData = data; return builder; },
      then(onFulfilled: (val: { data: unknown; error: unknown }) => void) {
        return resolve().then(onFulfilled);
      },
      single() {
        return resolve().then((r) => {
          const d = Array.isArray(r.data) ? r.data[0] ?? null : r.data;
          return { data: d, error: null };
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

  return { from(table: string) { return createQueryBuilder(table); } };
}

const CONV_ID = "conv-1";
const CONTACT_ID = "contact-1";
const USER_ID = "user-1";

function baseOpts(overrides?: Partial<Parameters<typeof ensureFollowupScheduled>[1]>) {
  return {
    conversationId: CONV_ID,
    contactId: CONTACT_ID,
    userId: USER_ID,
    maxFollowups: 3,
    currentFollowupCount: 0,
    ...overrides,
  };
}

describe("ensureFollowupScheduled", () => {
  it("schedules followup when no pending event exists", async () => {
    const tables: Record<string, Record<string, unknown>[]> = {
      scheduled_events: [],
      conversations: [{ id: CONV_ID }],
      prospects: [{ contact_id: CONTACT_ID, user_id: USER_ID }],
    };

    const result = await ensureFollowupScheduled(
      createMockSupabase(tables) as never,
      baseOpts(),
    );

    expect(result.scheduled).toBe(true);
    expect(tables.scheduled_events.length).toBe(1);
    expect(tables.scheduled_events[0].conversation_id).toBe(CONV_ID);
    expect(tables.scheduled_events[0].type).toBe("followup");
    expect(tables.scheduled_events[0].scheduled_at).toBeDefined();
  });

  it("does not schedule when pending event already exists", async () => {
    const tables: Record<string, Record<string, unknown>[]> = {
      scheduled_events: [
        { id: "existing-1", conversation_id: CONV_ID, executed_at: null, cancelled: false },
      ],
      conversations: [{ id: CONV_ID }],
      prospects: [{ contact_id: CONTACT_ID, user_id: USER_ID }],
    };

    const result = await ensureFollowupScheduled(
      createMockSupabase(tables) as never,
      baseOpts(),
    );

    expect(result.scheduled).toBe(false);
    expect(result.reason).toBe("event_already_pending");
    expect(tables.scheduled_events.length).toBe(1);
  });

  it("does not schedule when max_followups reached", async () => {
    const tables: Record<string, Record<string, unknown>[]> = {
      scheduled_events: [],
      conversations: [{ id: CONV_ID }],
      prospects: [{ contact_id: CONTACT_ID, user_id: USER_ID }],
    };

    const result = await ensureFollowupScheduled(
      createMockSupabase(tables) as never,
      baseOpts({ currentFollowupCount: 3, maxFollowups: 3 }),
    );

    expect(result.scheduled).toBe(false);
    expect(result.reason).toBe("max_followups_reached");
    expect(tables.scheduled_events.length).toBe(0);
  });

  it("ignores cancelled events when checking for pending", async () => {
    const tables: Record<string, Record<string, unknown>[]> = {
      scheduled_events: [
        { id: "cancelled-1", conversation_id: CONV_ID, executed_at: null, cancelled: true },
      ],
      conversations: [{ id: CONV_ID }],
      prospects: [{ contact_id: CONTACT_ID, user_id: USER_ID }],
    };

    const result = await ensureFollowupScheduled(
      createMockSupabase(tables) as never,
      baseOpts(),
    );

    expect(result.scheduled).toBe(true);
    expect(tables.scheduled_events.length).toBe(2);
  });

  it("ignores already executed events when checking for pending", async () => {
    const tables: Record<string, Record<string, unknown>[]> = {
      scheduled_events: [
        { id: "done-1", conversation_id: CONV_ID, executed_at: "2025-01-01T00:00:00Z", cancelled: false },
      ],
      conversations: [{ id: CONV_ID }],
      prospects: [{ contact_id: CONTACT_ID, user_id: USER_ID }],
    };

    const result = await ensureFollowupScheduled(
      createMockSupabase(tables) as never,
      baseOpts(),
    );

    expect(result.scheduled).toBe(true);
  });

  it("updates conversation.next_followup_at", async () => {
    const tables: Record<string, Record<string, unknown>[]> = {
      scheduled_events: [],
      conversations: [{ id: CONV_ID, next_followup_at: null }],
      prospects: [{ contact_id: CONTACT_ID, user_id: USER_ID }],
    };

    await ensureFollowupScheduled(
      createMockSupabase(tables) as never,
      baseOpts(),
    );

    expect(tables.conversations[0].next_followup_at).toBeDefined();
  });

  it("updates prospect.next_followup_at", async () => {
    const tables: Record<string, Record<string, unknown>[]> = {
      scheduled_events: [],
      conversations: [{ id: CONV_ID }],
      prospects: [{ contact_id: CONTACT_ID, user_id: USER_ID, next_followup_at: null }],
    };

    await ensureFollowupScheduled(
      createMockSupabase(tables) as never,
      baseOpts(),
    );

    expect(tables.prospects[0].next_followup_at).toBeDefined();
  });

  it("scheduled_at is ~24h in the future", async () => {
    const tables: Record<string, Record<string, unknown>[]> = {
      scheduled_events: [],
      conversations: [{ id: CONV_ID }],
      prospects: [{ contact_id: CONTACT_ID, user_id: USER_ID }],
    };

    const before = Date.now();
    await ensureFollowupScheduled(
      createMockSupabase(tables) as never,
      baseOpts(),
    );

    const scheduledAt = new Date(tables.scheduled_events[0].scheduled_at as string).getTime();
    const expectedMin = before + 23 * 60 * 60 * 1000;
    const expectedMax = before + 25 * 60 * 60 * 1000;
    expect(scheduledAt).toBeGreaterThan(expectedMin);
    expect(scheduledAt).toBeLessThan(expectedMax);
  });
});
