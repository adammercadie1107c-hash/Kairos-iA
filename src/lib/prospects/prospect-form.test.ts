import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const formSource = readFileSync(
  join(__dirname, "../../app/(app)/prospects/prospect-form.tsx"),
  "utf-8",
);

const actionsSource = readFileSync(
  join(__dirname, "../../app/(app)/prospects/actions.ts"),
  "utf-8",
);

const tableSource = readFileSync(
  join(__dirname, "../../app/(app)/prospects/prospects-table.tsx"),
  "utf-8",
);

const detailSource = readFileSync(
  join(__dirname, "../../app/(app)/prospects/[id]/page.tsx"),
  "utf-8",
);

const quickActionsSource = readFileSync(
  join(__dirname, "../../app/(app)/prospects/[id]/prospect-actions.tsx"),
  "utf-8",
);

const listPageSource = readFileSync(
  join(__dirname, "../../app/(app)/prospects/page.tsx"),
  "utf-8",
);

describe("prospect: first_name is optional", () => {
  it("form does not pass required to first_name FormField", () => {
    const firstNameIdx = formSource.indexOf('name="first_name"');
    const fieldStart = formSource.lastIndexOf("<FormField", firstNameIdx);
    const fieldEnd = formSource.indexOf("/>", firstNameIdx);
    const fieldBlock = formSource.slice(fieldStart, fieldEnd);
    expect(fieldBlock).not.toContain("required");
  });

  it("form has noValidate to prevent browser native validation", () => {
    expect(formSource).toContain("noValidate");
  });

  it("FormField does not add HTML required attribute to input", () => {
    const formFieldFn = formSource.slice(
      formSource.indexOf("function FormField("),
    );
    const inputTag = formFieldFn.slice(
      formFieldFn.indexOf("<input"),
      formFieldFn.indexOf("/>", formFieldFn.indexOf("<input")) + 2,
    );
    expect(inputTag).not.toContain("required");
  });

  it("server validation does not reject empty first_name", () => {
    expect(actionsSource).not.toContain(
      'fieldErrors.first_name = "Veuillez renseigner le prénom."',
    );
    expect(actionsSource).not.toContain("!firstName");
  });

  it("table uses fallback display name for empty names", () => {
    expect(tableSource).toContain("prospectDisplayName");
    expect(tableSource).toContain("Prospect Instagram");
  });

  it("detail page uses fallback display name for empty names", () => {
    expect(detailSource).toContain("prospectDisplayName");
    expect(detailSource).toContain("Prospect Instagram");
  });
});

describe("prospect: followup date management", () => {
  it("prospect form modal uses datetime-local for followup", () => {
    const followupSection = formSource.slice(
      formSource.indexOf("Prochaine relance"),
    );
    expect(followupSection).toContain('type="datetime-local"');
    expect(followupSection).not.toContain('type="date"');
  });

  it("prospect form converts datetime-local to ISO before submitting", () => {
    expect(formSource).toContain("new Date(rawFollowup).toISOString()");
  });

  it("actions export updateFollowupDate", () => {
    expect(actionsSource).toContain("export async function updateFollowupDate");
  });

  it("actions export cancelFollowup", () => {
    expect(actionsSource).toContain("export async function cancelFollowup");
  });

  it("actions validate followup with Date object, not string compare", () => {
    const validateSection = actionsSource.slice(
      actionsSource.indexOf("function validateForm"),
      actionsSource.indexOf("if (Object.keys(fieldErrors)"),
    );
    expect(validateSection).toContain("new Date(nextFollowup)");
    expect(validateSection).not.toContain("todayDateStr");
    expect(validateSection).not.toContain("< todayStr");
  });

  it("updateFollowupDate calls syncFollowupDate", () => {
    expect(actionsSource).toContain("syncFollowupDate");
  });

  it("cancelFollowup passes null dateTimeIso", () => {
    const cancelSection = actionsSource.slice(
      actionsSource.indexOf("async function cancelFollowup"),
    );
    expect(cancelSection).toContain("dateTimeIso: null");
  });

  it("cancelFollowup sets prospect.next_followup_at to null", () => {
    const cancelSection = actionsSource.slice(
      actionsSource.indexOf("async function cancelFollowup"),
    );
    expect(cancelSection).toContain("next_followup_at: null");
  });

  it("detail page quick actions has datetime-local input", () => {
    expect(quickActionsSource).toContain("datetime-local");
  });

  it("detail page has cancel followup button", () => {
    expect(quickActionsSource).toContain("handleCancelFollowup");
    expect(quickActionsSource).toContain("Annuler la relance");
  });

  it("updateProspect syncs followup to conversations/events", () => {
    const updateSection = actionsSource.slice(
      actionsSource.indexOf("async function updateProspect"),
      actionsSource.indexOf("async function deleteProspect"),
    );
    expect(updateSection).toContain("syncFollowupDate");
  });

  it("detail page fetches pending scheduled_event for exact time", () => {
    expect(detailSource).toContain("scheduled_events");
    expect(detailSource).toContain("pendingFollowupAt");
    expect(detailSource).toContain('is("executed_at", null)');
    expect(detailSource).toContain('eq("cancelled", false)');
  });

  it("detail page passes pendingFollowupAt to ProspectQuickActions", () => {
    expect(detailSource).toContain(
      "nextFollowupAt={pendingFollowupAt ?? prospect.next_followup_at}",
    );
  });

  it("detail page shows full datetime for pending followup", () => {
    expect(detailSource).toContain("formatDateTime(pendingFollowupAt)");
  });
});

describe("prospect list: followup column shows datetime from scheduled_events", () => {
  it("list page fetches pending scheduled_events for conversations", () => {
    expect(listPageSource).toContain("scheduled_events");
    expect(listPageSource).toContain('is("executed_at", null)');
    expect(listPageSource).toContain('eq("cancelled", false)');
    expect(listPageSource).toContain('eq("type", "followup")');
  });

  it("list page builds followupTimestamps map", () => {
    expect(listPageSource).toContain("followupTimestamps");
    expect(listPageSource).toContain("followupTimestamps[prospect.id]");
  });

  it("list page passes followupTimestamps to ProspectsTable", () => {
    expect(listPageSource).toContain("followupTimestamps={followupTimestamps}");
  });

  it("table accepts followupTimestamps prop", () => {
    expect(tableSource).toContain("followupTimestamps");
  });

  it("table uses followupTimestamps for display with date+time format", () => {
    expect(tableSource).toContain("formatFollowup");
    expect(tableSource).toContain("followupTimestamps?.[p.id]");
  });

  it("table sort uses followupTimestamps when available", () => {
    expect(tableSource).toContain("followupTimestamps?.[a.id]");
    expect(tableSource).toContain("followupTimestamps?.[b.id]");
  });

  it("formatFollowup renders date + time in fr-FR locale", () => {
    expect(tableSource).toContain("function formatFollowup");
    expect(tableSource).toContain('"2-digit"');
    expect(tableSource).toContain("hour:");
    expect(tableSource).toContain("minute:");
  });
});
