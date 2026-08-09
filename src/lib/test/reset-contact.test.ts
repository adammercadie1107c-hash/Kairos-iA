import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const routeSource = readFileSync(
  join(__dirname, "../../app/api/test/reset-contact/route.ts"),
  "utf-8",
);

describe("reset-contact: environment guard", () => {
  it("blocks production when ALLOW_TEST_TOOLS is not set", () => {
    expect(routeSource).toContain('NODE_ENV === "production"');
    expect(routeSource).toContain('ALLOW_TEST_TOOLS !== "true"');
  });

  it("returns 403 when blocked", () => {
    expect(routeSource).toContain("status: 403");
  });
});

describe("reset-contact: authentication", () => {
  it("checks supabase auth session", () => {
    expect(routeSource).toContain("auth.getUser()");
  });

  it("returns 401 when not authenticated", () => {
    expect(routeSource).toContain("status: 401");
  });
});

describe("reset-contact: confirmation step", () => {
  it("requires confirm: true before deleting", () => {
    expect(routeSource).toContain("confirm_required: true");
    expect(routeSource).toContain("if (!confirm)");
  });

  it("returns a preview of what will be deleted", () => {
    expect(routeSource).toContain("will_delete");
    expect(routeSource).toContain("messages");
    expect(routeSource).toContain("agent_logs");
    expect(routeSource).toContain("scheduled_events");
    expect(routeSource).toContain("prospects");
    expect(routeSource).toContain("conversations");
    expect(routeSource).toContain("contacts");
  });
});

describe("reset-contact: user_id isolation", () => {
  it("filters contact lookup by user_id", () => {
    const contactSelect = routeSource.slice(
      routeSource.indexOf('.from("contacts")'),
    );
    const firstUserFilter = contactSelect.indexOf('.eq("user_id", user.id)');
    expect(firstUserFilter).toBeGreaterThan(-1);
  });

  it("filters conversations by user_id", () => {
    const convSection = routeSource.slice(
      routeSource.indexOf('.from("conversations")'),
    );
    expect(convSection).toContain('.eq("user_id", user.id)');
  });

  it("filters prospect deletion by user_id", () => {
    const prospectDelete = routeSource.slice(
      routeSource.lastIndexOf('.from("prospects")'),
    );
    expect(prospectDelete).toContain('.eq("user_id", user.id)');
  });

  it("filters contact deletion by user_id", () => {
    const lines = routeSource.split("\n");
    const deleteContactLines = lines.reduce((acc, line, i) => {
      if (line.includes('.from("contacts")') && i > 0) {
        const context = lines.slice(i, i + 5).join("\n");
        if (context.includes(".delete()")) acc.push(context);
      }
      return acc;
    }, [] as string[]);
    expect(deleteContactLines.length).toBeGreaterThan(0);
    for (const block of deleteContactLines) {
      expect(block).toContain('.eq("user_id", user.id)');
    }
  });
});

describe("reset-contact: FK-safe deletion order", () => {
  it("deletes agent_logs before conversations", () => {
    const agentLogsDelete = routeSource.indexOf('from("agent_logs")');
    const convsDelete = routeSource.lastIndexOf('from("conversations")');
    expect(agentLogsDelete).toBeGreaterThan(-1);
    expect(convsDelete).toBeGreaterThan(agentLogsDelete);
  });

  it("deletes scheduled_events before conversations", () => {
    const eventsDelete = routeSource.indexOf('from("scheduled_events")');
    const convsDelete = routeSource.lastIndexOf('from("conversations")');
    expect(eventsDelete).toBeGreaterThan(-1);
    expect(convsDelete).toBeGreaterThan(eventsDelete);
  });

  it("deletes messages before conversations", () => {
    const msgsDelete = routeSource.indexOf('from("messages")');
    const convsDelete = routeSource.lastIndexOf('from("conversations")');
    expect(msgsDelete).toBeGreaterThan(-1);
    expect(convsDelete).toBeGreaterThan(msgsDelete);
  });

  it("deletes prospects before contacts", () => {
    const prospDelete = routeSource.lastIndexOf('from("prospects")');
    const contactDelete = routeSource.lastIndexOf('from("contacts")');
    expect(prospDelete).toBeGreaterThan(-1);
    expect(contactDelete).toBeGreaterThan(prospDelete);
  });

  it("deletes conversations before contacts", () => {
    const convDelete = routeSource.lastIndexOf('from("conversations")');
    const contactDelete = routeSource.lastIndexOf('from("contacts")');
    expect(convDelete).toBeGreaterThan(-1);
    expect(contactDelete).toBeGreaterThan(convDelete);
  });
});

describe("reset-contact: does not touch protected data", () => {
  it("never references channels table for deletion", () => {
    const deleteBlocks = routeSource
      .split("\n")
      .filter((l) => l.includes(".delete()"));
    for (const line of deleteBlocks) {
      expect(line).not.toContain("channels");
    }
  });

  it("never references agent_configs", () => {
    expect(routeSource).not.toContain("agent_configs");
  });

  it("never references profiles", () => {
    expect(routeSource).not.toContain("profiles");
  });

  it("never modifies credentials or tokens", () => {
    expect(routeSource).not.toContain("credentials");
    expect(routeSource).not.toContain("access_token");
  });
});

describe("reset-contact: input validation", () => {
  it("requires external_id", () => {
    expect(routeSource).toContain("!external_id");
  });

  it("returns 404 when contact not found", () => {
    expect(routeSource).toContain("status: 404");
  });

  it("returns 400 for invalid input", () => {
    expect(routeSource).toContain("status: 400");
  });
});
