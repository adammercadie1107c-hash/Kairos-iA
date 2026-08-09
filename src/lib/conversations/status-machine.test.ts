import { describe, it, expect } from "vitest";
import { canTransitionStatus } from "./status-machine";

describe("canTransitionStatus", () => {
  it("allows normal forward progression", () => {
    expect(canTransitionStatus("new", "qualifying", false)).toBe(true);
    expect(canTransitionStatus("qualifying", "qualified", false)).toBe(true);
    expect(canTransitionStatus("qualified", "booking_sent", false)).toBe(true);
  });

  it("blocks booking_sent → qualified regression", () => {
    expect(canTransitionStatus("booking_sent", "qualified", false)).toBe(false);
    expect(canTransitionStatus("booking_sent", "qualifying", false)).toBe(false);
    expect(canTransitionStatus("booking_sent", "new", false)).toBe(false);
  });

  it("blocks qualified → qualifying regression", () => {
    expect(canTransitionStatus("qualified", "qualifying", false)).toBe(false);
    expect(canTransitionStatus("qualified", "new", false)).toBe(false);
  });

  it("blocks disqualified → commercial statuses (AI)", () => {
    expect(canTransitionStatus("disqualified", "qualifying", false)).toBe(false);
    expect(canTransitionStatus("disqualified", "qualified", false)).toBe(false);
    expect(canTransitionStatus("disqualified", "booking_sent", false)).toBe(false);
  });

  it("blocks closed → anything (AI)", () => {
    expect(canTransitionStatus("closed", "new", false)).toBe(false);
    expect(canTransitionStatus("closed", "qualifying", false)).toBe(false);
    expect(canTransitionStatus("closed", "qualified", false)).toBe(false);
    expect(canTransitionStatus("closed", "handoff", false)).toBe(false);
  });

  it("allows handoff from any status (not a commercial regression)", () => {
    expect(canTransitionStatus("qualifying", "handoff", false)).toBe(true);
    expect(canTransitionStatus("qualified", "handoff", false)).toBe(true);
    expect(canTransitionStatus("booking_sent", "handoff", false)).toBe(true);
  });

  it("allows disqualified from any active status", () => {
    expect(canTransitionStatus("qualifying", "disqualified", false)).toBe(true);
    expect(canTransitionStatus("qualified", "disqualified", false)).toBe(true);
  });

  it("allows closed from any status", () => {
    expect(canTransitionStatus("qualifying", "closed", false)).toBe(true);
    expect(canTransitionStatus("booking_sent", "closed", false)).toBe(true);
  });

  it("allows human to reopen closed conversations", () => {
    expect(canTransitionStatus("closed", "qualifying", true)).toBe(true);
    expect(canTransitionStatus("closed", "handoff", true)).toBe(true);
  });

  it("allows human to requalify disqualified conversations", () => {
    expect(canTransitionStatus("disqualified", "qualifying", true)).toBe(true);
    expect(canTransitionStatus("disqualified", "qualified", true)).toBe(true);
  });

  it("same status is always allowed", () => {
    expect(canTransitionStatus("qualifying", "qualifying", false)).toBe(true);
    expect(canTransitionStatus("closed", "closed", false)).toBe(true);
  });
});
