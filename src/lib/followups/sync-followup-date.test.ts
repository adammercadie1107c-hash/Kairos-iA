import { describe, it, expect } from "vitest";
import { syncFollowupDate } from "./sync-followup-date";

type Filter = { column: string; op: string; value: unknown };

function createMockSupabase(tables: Record<string, Record<string, unknown>[]>) {
  function createQueryBuilder(tableName: string) {
    let filters: Filter[] = [];
    let insertData: Record<string, unknown> | null = null;
    let updateData: Record<string, unknown> | null = null;
    let limitVal = Infinity;
    let neqFilters: Array<{ column: string; value: unknown }> = [];
    let orderCol: string | null = null;

    function matchesFilters(row: Record<string, unknown>): boolean {
      const eqMatch = filters.every((f) => {
        const val = row[f.column];
        switch (f.op) {
          case "eq": return val === f.value;
          case "is": return val === f.value;
          default: return true;
        }
      });
      const neqMatch = neqFilters.every((f) => row[f.column] !== f.value);
      return eqMatch && neqMatch;
    }

    function resolve(): Promise<{ data: unknown; error: unknown }> {
      if (insertData) {
        const newRow = { id: `evt-${Date.now()}-${Math.random().toString(36).slice(2)}`, ...insertData };
        tables[tableName] = tables[tableName] ?? [];
        tables[tableName].push(newRow);
        insertData = null;
        filters = [];
        neqFilters = [];
        return Promise.resolve({ data: newRow, error: null });
      }
      if (updateData) {
        const rows = (tables[tableName] ?? []).filter(matchesFilters);
        for (const row of rows) Object.assign(row, updateData);
        updateData = null;
        filters = [];
        neqFilters = [];
        return Promise.resolve({ data: rows, error: null });
      }
      let rows = (tables[tableName] ?? []).filter(matchesFilters);
      if (orderCol) {
        rows = rows.sort((a, b) =>
          String(b[orderCol!] ?? "").localeCompare(String(a[orderCol!] ?? "")),
        );
      }
      rows = rows.slice(0, limitVal);
      filters = [];
      neqFilters = [];
      limitVal = Infinity;
      orderCol = null;
      return Promise.resolve({ data: rows, error: null });
    }

    const builder: Record<string, unknown> = {
      select() { return builder; },
      eq(col: string, val: unknown) { filters.push({ column: col, op: "eq", value: val }); return builder; },
      is(col: string, val: unknown) { filters.push({ column: col, op: "is", value: val }); return builder; },
      neq(col: string, val: unknown) { neqFilters.push({ column: col, value: val }); return builder; },
      limit(n: number) { limitVal = n; return builder; },
      order(col: string) { orderCol = col; return builder; },
      insert(data: Record<string, unknown>) { insertData = data; return builder; },
      update(data: Record<string, unknown>) { updateData = data; return builder; },
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

  return { from(table: string) { return createQueryBuilder(table); } };
}

const PROSPECT_ID = "prospect-1";
const CONTACT_ID = "contact-1";
const USER_ID = "user-1";
const CONV_ID = "conv-1";

describe("syncFollowupDate", () => {
  it("creates scheduled_event when none pending", async () => {
    const tables: Record<string, Record<string, unknown>[]> = {
      prospects: [{ id: PROSPECT_ID, user_id: USER_ID, contact_id: CONTACT_ID }],
      conversations: [{ id: CONV_ID, contact_id: CONTACT_ID, user_id: USER_ID, status: "qualifying", created_at: "2025-01-01" }],
      scheduled_events: [],
    };

    const iso = new Date(Date.now() + 86400000).toISOString();
    const result = await syncFollowupDate(createMockSupabase(tables) as never, {
      prospectId: PROSPECT_ID,
      userId: USER_ID,
      dateTimeIso: iso,
    });

    expect(result.synced).toBe(true);
    expect(tables.scheduled_events.length).toBe(1);
    expect(tables.scheduled_events[0].scheduled_at).toBe(iso);
    expect(tables.scheduled_events[0].type).toBe("followup");
    expect(tables.scheduled_events[0].conversation_id).toBe(CONV_ID);
  });

  it("updates existing pending event instead of creating duplicate", async () => {
    const oldIso = new Date(Date.now() + 86400000).toISOString();
    const newIso = new Date(Date.now() + 172800000).toISOString();
    const tables: Record<string, Record<string, unknown>[]> = {
      prospects: [{ id: PROSPECT_ID, user_id: USER_ID, contact_id: CONTACT_ID }],
      conversations: [{ id: CONV_ID, contact_id: CONTACT_ID, user_id: USER_ID, status: "qualifying", created_at: "2025-01-01" }],
      scheduled_events: [{ id: "evt-1", conversation_id: CONV_ID, executed_at: null, cancelled: false, scheduled_at: oldIso }],
    };

    const result = await syncFollowupDate(createMockSupabase(tables) as never, {
      prospectId: PROSPECT_ID,
      userId: USER_ID,
      dateTimeIso: newIso,
    });

    expect(result.synced).toBe(true);
    expect(tables.scheduled_events.length).toBe(1);
    expect(tables.scheduled_events[0].scheduled_at).toBe(newIso);
  });

  it("updates conversations.next_followup_at when setting date", async () => {
    const tables: Record<string, Record<string, unknown>[]> = {
      prospects: [{ id: PROSPECT_ID, user_id: USER_ID, contact_id: CONTACT_ID }],
      conversations: [{ id: CONV_ID, contact_id: CONTACT_ID, user_id: USER_ID, status: "qualifying", created_at: "2025-01-01", next_followup_at: null }],
      scheduled_events: [],
    };

    const iso = new Date(Date.now() + 86400000).toISOString();
    await syncFollowupDate(createMockSupabase(tables) as never, {
      prospectId: PROSPECT_ID,
      userId: USER_ID,
      dateTimeIso: iso,
    });

    expect(tables.conversations[0].next_followup_at).toBe(iso);
  });

  it("cancels pending event and clears dates when dateTimeIso is null", async () => {
    const tables: Record<string, Record<string, unknown>[]> = {
      prospects: [{ id: PROSPECT_ID, user_id: USER_ID, contact_id: CONTACT_ID }],
      conversations: [{ id: CONV_ID, contact_id: CONTACT_ID, user_id: USER_ID, status: "qualifying", created_at: "2025-01-01", next_followup_at: "2025-01-15T09:00:00Z" }],
      scheduled_events: [{ id: "evt-1", conversation_id: CONV_ID, executed_at: null, cancelled: false }],
    };

    const result = await syncFollowupDate(createMockSupabase(tables) as never, {
      prospectId: PROSPECT_ID,
      userId: USER_ID,
      dateTimeIso: null,
    });

    expect(result.synced).toBe(true);
    expect(tables.scheduled_events[0].cancelled).toBe(true);
    expect(tables.conversations[0].next_followup_at).toBeNull();
  });

  it("returns no_linked_contact when prospect has no contact_id", async () => {
    const tables: Record<string, Record<string, unknown>[]> = {
      prospects: [{ id: PROSPECT_ID, user_id: USER_ID, contact_id: null }],
      conversations: [],
      scheduled_events: [],
    };

    const result = await syncFollowupDate(createMockSupabase(tables) as never, {
      prospectId: PROSPECT_ID,
      userId: USER_ID,
      dateTimeIso: new Date().toISOString(),
    });

    expect(result.synced).toBe(false);
    expect(result.reason).toBe("no_linked_contact");
  });

  it("returns no_active_conversation when no open conversation", async () => {
    const tables: Record<string, Record<string, unknown>[]> = {
      prospects: [{ id: PROSPECT_ID, user_id: USER_ID, contact_id: CONTACT_ID }],
      conversations: [{ id: CONV_ID, contact_id: CONTACT_ID, user_id: USER_ID, status: "closed", created_at: "2025-01-01" }],
      scheduled_events: [],
    };

    const result = await syncFollowupDate(createMockSupabase(tables) as never, {
      prospectId: PROSPECT_ID,
      userId: USER_ID,
      dateTimeIso: new Date().toISOString(),
    });

    expect(result.synced).toBe(false);
    expect(result.reason).toBe("no_active_conversation");
  });

  it("ignores already-executed events when checking for pending", async () => {
    const tables: Record<string, Record<string, unknown>[]> = {
      prospects: [{ id: PROSPECT_ID, user_id: USER_ID, contact_id: CONTACT_ID }],
      conversations: [{ id: CONV_ID, contact_id: CONTACT_ID, user_id: USER_ID, status: "qualifying", created_at: "2025-01-01" }],
      scheduled_events: [{ id: "evt-done", conversation_id: CONV_ID, executed_at: "2025-01-10T00:00:00Z", cancelled: false }],
    };

    const iso = new Date(Date.now() + 86400000).toISOString();
    await syncFollowupDate(createMockSupabase(tables) as never, {
      prospectId: PROSPECT_ID,
      userId: USER_ID,
      dateTimeIso: iso,
    });

    expect(tables.scheduled_events.length).toBe(2);
    expect(tables.scheduled_events[1].scheduled_at).toBe(iso);
  });

  it("ignores cancelled events when checking for pending", async () => {
    const tables: Record<string, Record<string, unknown>[]> = {
      prospects: [{ id: PROSPECT_ID, user_id: USER_ID, contact_id: CONTACT_ID }],
      conversations: [{ id: CONV_ID, contact_id: CONTACT_ID, user_id: USER_ID, status: "qualifying", created_at: "2025-01-01" }],
      scheduled_events: [{ id: "evt-cancelled", conversation_id: CONV_ID, executed_at: null, cancelled: true }],
    };

    const iso = new Date(Date.now() + 86400000).toISOString();
    await syncFollowupDate(createMockSupabase(tables) as never, {
      prospectId: PROSPECT_ID,
      userId: USER_ID,
      dateTimeIso: iso,
    });

    expect(tables.scheduled_events.length).toBe(2);
  });
});
