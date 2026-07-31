import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  splitName,
  extractEmail,
  extractPhone,
  buildNotes,
  syncQualifiedContactToProspect,
} from "./contact-to-prospect";

// --- Unit tests for pure helpers ---

describe("splitName", () => {
  it("splits first and last name", () => {
    assert.deepStrictEqual(splitName("Jean Dupont"), { first: "Jean", last: "Dupont" });
  });
  it("handles single name", () => {
    assert.deepStrictEqual(splitName("Marie"), { first: "Marie", last: "" });
  });
  it("handles multi-part last name", () => {
    assert.deepStrictEqual(splitName("Jean Pierre Dupont"), { first: "Jean", last: "Pierre Dupont" });
  });
  it("handles empty string", () => {
    assert.deepStrictEqual(splitName(""), { first: "", last: "" });
  });
});

describe("extractEmail", () => {
  it("finds email from 'email' key", () => {
    assert.equal(extractEmail({ email: "test@example.com" }), "test@example.com");
  });
  it("finds email from 'Email' key (case-insensitive)", () => {
    assert.equal(extractEmail({ Email: "FOO@bar.com" }), "foo@bar.com");
  });
  it("finds email from 'e-mail' key", () => {
    assert.equal(extractEmail({ "e-mail": "a@b.com" }), "a@b.com");
  });
  it("returns empty if no email key", () => {
    assert.equal(extractEmail({ objectif: "perdre du poids" }), "");
  });
  it("returns empty if email value is invalid", () => {
    assert.equal(extractEmail({ email: "not-an-email" }), "");
  });
});

describe("extractPhone", () => {
  it("finds phone from 'telephone' key", () => {
    assert.equal(extractPhone({ "téléphone": "06 12 34 56 78" }), "06 12 34 56 78");
  });
  it("finds phone from 'phone' key", () => {
    assert.equal(extractPhone({ phone: "+33612345678" }), "+33612345678");
  });
  it("finds phone from 'mobile' key", () => {
    assert.equal(extractPhone({ mobile: "06 00 00 00 00" }), "06 00 00 00 00");
  });
  it("returns empty if no phone key", () => {
    assert.equal(extractPhone({ objectif: "prise de masse" }), "");
  });
});

describe("buildNotes", () => {
  it("builds notes from info, skipping email/phone/name", () => {
    const info = {
      email: "a@b.com",
      objectif: "Perdre 5kg",
      budget: "200-300 EUR",
      phone: "06",
      "prénom": "Jean",
    };
    const notes = buildNotes(info);
    assert.ok(notes.includes("Objectif : Perdre 5kg"));
    assert.ok(notes.includes("Budget : 200-300 EUR"));
    assert.ok(!notes.includes("email"));
    assert.ok(!notes.includes("phone"));
    assert.ok(!notes.includes("prénom"));
  });
  it("returns empty for info with only email", () => {
    assert.equal(buildNotes({ email: "a@b.com" }), "");
  });
  it("normalizes known keys", () => {
    assert.equal(buildNotes({ constraints: "pas de gluten" }), "Contraintes : pas de gluten");
  });
});

// --- Integration tests with mocked Supabase ---

type Filter = { column: string; op: string; value: unknown };

function createMockSupabase(tables: Record<string, Record<string, unknown>[]>) {
  function createQueryBuilder(tableName: string) {
    let filters: Filter[] = [];
    let insertData: Record<string, unknown> | null = null;
    let updateData: Record<string, unknown> | null = null;
    let pendingSelect = false;

    function matchesFilters(row: Record<string, unknown>): boolean {
      return filters.every((f) => {
        const val = row[f.column];
        switch (f.op) {
          case "eq": return val === f.value;
          case "ilike": return typeof val === "string" && typeof f.value === "string" && val.toLowerCase() === f.value.toLowerCase();
          case "is": return val === f.value;
          default: return true;
        }
      });
    }

    function resolve(): Promise<{ data: unknown; error: unknown }> {
      if (insertData) {
        const newRow = { id: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`, ...insertData };
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
      const rows = (tables[tableName] ?? []).filter(matchesFilters);
      filters = [];
      return Promise.resolve({ data: rows, error: null });
    }

    const builder: Record<string, unknown> = {
      select(_fields?: string) {
        pendingSelect = true;
        return builder;
      },
      eq(col: string, val: unknown) {
        filters.push({ column: col, op: "eq", value: val });
        return builder;
      },
      ilike(col: string, val: unknown) {
        filters.push({ column: col, op: "ilike", value: val });
        return builder;
      },
      is(col: string, val: unknown) {
        filters.push({ column: col, op: "is", value: val });
        return builder;
      },
      insert(data: Record<string, unknown>) {
        insertData = data;
        return builder;
      },
      update(data: Record<string, unknown>) {
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

  return { from(table: string) { return createQueryBuilder(table); } };
}

describe("syncQualifiedContactToProspect", () => {
  const USER_ID = "user-1";
  const CONTACT_ID = "contact-1";
  const CONV_ID = "conv-1";

  it("test 1: creates prospect for qualified contact", async () => {
    const tables: Record<string, Record<string, unknown>[]> = {
      conversations: [{ id: CONV_ID, status: "qualified", contact_id: CONTACT_ID, user_id: USER_ID }],
      contacts: [{ id: CONTACT_ID, display_name: "Marie Curie", extracted_info: { email: "marie@lab.fr", objectif: "Recherche avancee" }, external_id: "ext-1" }],
      prospects: [],
    };
    const result = await syncQualifiedContactToProspect(createMockSupabase(tables) as never, CONV_ID, USER_ID);
    assert.equal(result.action, "created");
    assert.equal(tables.prospects.length, 1);
    assert.equal(tables.prospects[0].first_name, "Marie");
    assert.equal(tables.prospects[0].last_name, "Curie");
    assert.equal(tables.prospects[0].email, "marie@lab.fr");
    assert.equal(tables.prospects[0].contact_id, CONTACT_ID);
    assert.equal(tables.prospects[0].status, "contacte");
  });

  it("test 2: running twice does not create a duplicate", async () => {
    const tables: Record<string, Record<string, unknown>[]> = {
      conversations: [{ id: CONV_ID, status: "qualified", contact_id: CONTACT_ID, user_id: USER_ID }],
      contacts: [{ id: CONTACT_ID, display_name: "Jean", extracted_info: {}, external_id: "ext-1" }],
      prospects: [],
    };
    const sb = createMockSupabase(tables) as never;
    const r1 = await syncQualifiedContactToProspect(sb, CONV_ID, USER_ID);
    assert.equal(r1.action, "created");
    const r2 = await syncQualifiedContactToProspect(sb, CONV_ID, USER_ID);
    assert.equal(r2.action, "updated");
    assert.equal(tables.prospects.length, 1);
  });

  it("test 3: updates existing prospect linked by contact_id", async () => {
    const tables: Record<string, Record<string, unknown>[]> = {
      conversations: [{ id: CONV_ID, status: "qualified", contact_id: CONTACT_ID, user_id: USER_ID }],
      contacts: [{ id: CONTACT_ID, display_name: "Sophie Martin", extracted_info: { "téléphone": "06 11 22 33 44" }, external_id: "ext-1" }],
      prospects: [{ id: "prospect-1", user_id: USER_ID, contact_id: CONTACT_ID, first_name: "Sophie", last_name: "", email: "", phone: "", notes: "" }],
    };
    const result = await syncQualifiedContactToProspect(createMockSupabase(tables) as never, CONV_ID, USER_ID);
    assert.equal(result.action, "updated");
    assert.equal(result.prospectId, "prospect-1");
    assert.equal(tables.prospects[0].phone, "06 11 22 33 44");
    assert.equal(tables.prospects[0].last_name, "Martin");
  });

  it("test 4: links manual prospect with same email", async () => {
    const tables: Record<string, Record<string, unknown>[]> = {
      conversations: [{ id: CONV_ID, status: "qualified", contact_id: CONTACT_ID, user_id: USER_ID }],
      contacts: [{ id: CONTACT_ID, display_name: "Luc", extracted_info: { email: "luc@test.com" }, external_id: "ext-1" }],
      prospects: [{ id: "manual-prospect", user_id: USER_ID, contact_id: null, first_name: "Luc", last_name: "Besson", email: "luc@test.com", phone: "", notes: "Prospect saisi manuellement" }],
    };
    const result = await syncQualifiedContactToProspect(createMockSupabase(tables) as never, CONV_ID, USER_ID);
    assert.equal(result.action, "updated");
    assert.equal(result.prospectId, "manual-prospect");
    assert.equal(tables.prospects[0].contact_id, CONTACT_ID);
    assert.equal(tables.prospects[0].notes, "Prospect saisi manuellement");
    assert.equal(tables.prospects.length, 1);
  });

  it("test 5: creates prospect without email", async () => {
    const tables: Record<string, Record<string, unknown>[]> = {
      conversations: [{ id: CONV_ID, status: "qualified", contact_id: CONTACT_ID, user_id: USER_ID }],
      contacts: [{ id: CONTACT_ID, display_name: "Instagram User", extracted_info: { objectif: "Prise de masse" }, external_id: "ext-1" }],
      prospects: [],
    };
    const result = await syncQualifiedContactToProspect(createMockSupabase(tables) as never, CONV_ID, USER_ID);
    assert.equal(result.action, "created");
    assert.equal(tables.prospects[0].email, "");
    assert.equal(tables.prospects[0].first_name, "Instagram");
  });

  it("test 6: two users same email create separate prospects", async () => {
    const tables: Record<string, Record<string, unknown>[]> = {
      conversations: [
        { id: CONV_ID, status: "qualified", contact_id: CONTACT_ID, user_id: USER_ID },
        { id: "conv-2", status: "qualified", contact_id: "contact-2", user_id: "user-2" },
      ],
      contacts: [
        { id: CONTACT_ID, display_name: "Alice", extracted_info: { email: "shared@test.com" }, external_id: "ext-1" },
        { id: "contact-2", display_name: "Bob", extracted_info: { email: "shared@test.com" }, external_id: "ext-2" },
      ],
      prospects: [],
    };
    const sb = createMockSupabase(tables) as never;
    const r1 = await syncQualifiedContactToProspect(sb, CONV_ID, USER_ID);
    const r2 = await syncQualifiedContactToProspect(sb, "conv-2", "user-2");
    assert.equal(r1.action, "created");
    assert.equal(r2.action, "created");
    assert.equal(tables.prospects.length, 2);
    assert.equal(tables.prospects[0].user_id, USER_ID);
    assert.equal(tables.prospects[1].user_id, "user-2");
  });

  it("test 7: non-qualified conversation skips", async () => {
    const tables: Record<string, Record<string, unknown>[]> = {
      conversations: [{ id: CONV_ID, status: "qualifying", contact_id: CONTACT_ID, user_id: USER_ID }],
      contacts: [{ id: CONTACT_ID, display_name: "Test", extracted_info: {}, external_id: "ext-1" }],
      prospects: [],
    };
    const result = await syncQualifiedContactToProspect(createMockSupabase(tables) as never, CONV_ID, USER_ID);
    assert.equal(result.action, "skipped");
    assert.equal(result.reason, "not_qualified");
    assert.equal(tables.prospects.length, 0);
  });

  it("test 8: empty extracted values do not overwrite manual data", async () => {
    const tables: Record<string, Record<string, unknown>[]> = {
      conversations: [{ id: CONV_ID, status: "qualified", contact_id: CONTACT_ID, user_id: USER_ID }],
      contacts: [{ id: CONTACT_ID, display_name: "", extracted_info: {}, external_id: "ext-1" }],
      prospects: [{ id: "p-manual", user_id: USER_ID, contact_id: CONTACT_ID, first_name: "Saisie Manuelle", last_name: "Important", email: "manual@test.com", phone: "06 99 99 99 99", notes: "Notes manuelles importantes" }],
    };
    const result = await syncQualifiedContactToProspect(createMockSupabase(tables) as never, CONV_ID, USER_ID);
    assert.equal(result.action, "updated");
    assert.equal(tables.prospects[0].first_name, "Saisie Manuelle");
    assert.equal(tables.prospects[0].last_name, "Important");
    assert.equal(tables.prospects[0].email, "manual@test.com");
    assert.equal(tables.prospects[0].phone, "06 99 99 99 99");
    assert.equal(tables.prospects[0].notes, "Notes manuelles importantes");
  });
});
