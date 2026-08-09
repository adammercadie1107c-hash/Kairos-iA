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

describe("prospect: first_name is optional", () => {
  it("form does not mark first_name as required", () => {
    const firstNameField = formSource.slice(
      formSource.indexOf('name="first_name"') - 200,
      formSource.indexOf('name="first_name"') + 50,
    );
    expect(firstNameField).not.toContain("required");
  });

  it("validation does not reject empty first_name", () => {
    expect(actionsSource).not.toContain(
      'fieldErrors.first_name = "Veuillez renseigner le prénom."',
    );
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
  it("actions export updateFollowupDate", () => {
    expect(actionsSource).toContain("export async function updateFollowupDate");
  });

  it("actions export cancelFollowup", () => {
    expect(actionsSource).toContain("export async function cancelFollowup");
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

  it("detail page has datetime-local input for followup", () => {
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
});
