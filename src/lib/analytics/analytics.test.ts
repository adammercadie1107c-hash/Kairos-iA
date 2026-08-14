import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const clientSource = readFileSync(
  join(__dirname, "posthog-client.ts"),
  "utf-8",
);

const serverSource = readFileSync(
  join(__dirname, "posthog-server.ts"),
  "utf-8",
);

const eventsSource = readFileSync(
  join(__dirname, "events.ts"),
  "utf-8",
);

const providerSource = readFileSync(
  join(__dirname, "../../app/posthog-provider.tsx"),
  "utf-8",
);

const identifySource = readFileSync(
  join(__dirname, "../../app/(app)/posthog-identify.tsx"),
  "utf-8",
);

const rootLayoutSource = readFileSync(
  join(__dirname, "../../app/layout.tsx"),
  "utf-8",
);

const appLayoutSource = readFileSync(
  join(__dirname, "../../app/(app)/layout.tsx"),
  "utf-8",
);

const authActionsSource = readFileSync(
  join(__dirname, "../../app/(auth)/actions.ts"),
  "utf-8",
);

const prospectActionsSource = readFileSync(
  join(__dirname, "../../app/(app)/prospects/actions.ts"),
  "utf-8",
);

const agentActionsSource = readFileSync(
  join(__dirname, "../../app/(app)/agent/actions.ts"),
  "utf-8",
);

const webhookSource = readFileSync(
  join(__dirname, "../../app/api/webhooks/instagram/route.ts"),
  "utf-8",
);

const followupExecSource = readFileSync(
  join(__dirname, "../followups/execute-due-followups.ts"),
  "utf-8",
);

const inboxActionsSource = readFileSync(
  join(__dirname, "../../app/(app)/inbox/actions.ts"),
  "utf-8",
);

const instagramCallbackSource = readFileSync(
  join(__dirname, "../../app/api/auth/instagram/callback/route.ts"),
  "utf-8",
);

describe("PostHog: app never crashes if PostHog is absent", () => {
  it("client initPostHog checks for env vars before init", () => {
    expect(clientSource).toContain("NEXT_PUBLIC_POSTHOG_KEY");
    expect(clientSource).toContain("NEXT_PUBLIC_POSTHOG_HOST");
    expect(clientSource).toContain("if (!key || !host) return");
  });

  it("server getClient reuses NEXT_PUBLIC_POSTHOG_KEY (no separate secret)", () => {
    expect(serverSource).toContain("NEXT_PUBLIC_POSTHOG_KEY");
    expect(serverSource).toContain("NEXT_PUBLIC_POSTHOG_HOST");
    expect(serverSource).not.toContain("POSTHOG_API_KEY");
    expect(serverSource).toContain("if (!apiKey || !host) return null");
  });

  it("client functions wrapped in try/catch", () => {
    const catchCount = (clientSource.match(/} catch \{/g) || []).length;
    expect(catchCount).toBeGreaterThanOrEqual(4);
  });

  it("server trackServerEvent wrapped in try/catch", () => {
    expect(serverSource).toContain("try {");
    expect(serverSource).toContain("} catch {");
  });
});

describe("PostHog: identify and reset", () => {
  it("PostHogProvider is in root layout", () => {
    expect(rootLayoutSource).toContain("PostHogProvider");
    expect(rootLayoutSource).toContain("<PostHogProvider>");
  });

  it("PostHogIdentify is in app layout with userId and email", () => {
    expect(appLayoutSource).toContain("PostHogIdentify");
    expect(appLayoutSource).toContain("userId={user.id}");
    expect(appLayoutSource).toContain("email={user.email}");
  });

  it("identifyUser calls posthog.identify with userId", () => {
    expect(clientSource).toContain("posthog.identify(userId");
  });

  it("resetUser calls posthog.reset()", () => {
    expect(clientSource).toContain("posthog.reset()");
  });
});

describe("PostHog: events defined and tracked", () => {
  const requiredEvents = [
    "user_signed_up",
    "instagram_connected",
    "agent_configured",
    "conversation_received",
    "prospect_created",
    "prospect_qualified",
    "booking_sent",
    "handoff_triggered",
    "followup_scheduled",
    "followup_sent",
    "coach_alert_created",
    "prospect_marked_won",
    "prospect_marked_lost",
  ];

  for (const event of requiredEvents) {
    it(`defines event '${event}'`, () => {
      expect(eventsSource).toContain(`"${event}"`);
    });
  }

  it("user_signed_up is tracked in signup action", () => {
    expect(authActionsSource).toContain("USER_SIGNED_UP");
    expect(authActionsSource).toContain("trackServerEvent");
  });

  it("instagram_connected is tracked in callback", () => {
    expect(instagramCallbackSource).toContain("INSTAGRAM_CONNECTED");
    expect(instagramCallbackSource).toContain("trackServerEvent");
  });

  it("agent_configured is tracked in agent actions", () => {
    expect(agentActionsSource).toContain("AGENT_CONFIGURED");
    expect(agentActionsSource).toContain("trackServerEvent");
  });

  it("conversation_received is tracked in webhook", () => {
    expect(webhookSource).toContain("CONVERSATION_RECEIVED");
  });

  it("prospect_created is tracked in manual create and auto sync", () => {
    expect(prospectActionsSource).toContain("PROSPECT_CREATED");
    expect(webhookSource).toContain("PROSPECT_CREATED");
  });

  it("prospect_qualified is tracked in webhook", () => {
    expect(webhookSource).toContain("PROSPECT_QUALIFIED");
  });

  it("booking_sent is tracked in webhook", () => {
    expect(webhookSource).toContain("BOOKING_SENT");
  });

  it("handoff_triggered is tracked in webhook and inbox actions", () => {
    expect(webhookSource).toContain("HANDOFF_TRIGGERED");
    expect(inboxActionsSource).toContain("HANDOFF_TRIGGERED");
  });

  it("followup_scheduled is tracked in webhook", () => {
    expect(webhookSource).toContain("FOLLOWUP_SCHEDULED");
  });

  it("followup_sent is tracked in execute-due-followups", () => {
    expect(followupExecSource).toContain("FOLLOWUP_SENT");
  });

  it("coach_alert_created is tracked in webhook", () => {
    expect(webhookSource).toContain("COACH_ALERT_CREATED");
  });

  it("prospect_marked_won is tracked in prospect actions", () => {
    expect(prospectActionsSource).toContain("PROSPECT_MARKED_WON");
  });

  it("prospect_marked_lost is tracked in prospect actions", () => {
    expect(prospectActionsSource).toContain("PROSPECT_MARKED_LOST");
  });
});

describe("PostHog: no sensitive data sent", () => {
  it("signup does not send password", () => {
    const signupSection = authActionsSource.slice(
      authActionsSource.indexOf("trackServerEvent"),
    );
    const callEnd = signupSection.indexOf(");");
    const call = signupSection.slice(0, callEnd);
    expect(call).not.toContain("password");
  });

  it("webhook does not send message text in events", () => {
    const trackCalls = webhookSource.split("trackServerEvent");
    for (let i = 1; i < trackCalls.length; i++) {
      const callEnd = trackCalls[i].indexOf(");");
      const call = trackCalls[i].slice(0, callEnd);
      expect(call).not.toContain("text");
      expect(call).not.toContain("content");
      expect(call).not.toContain("access_token");
      expect(call).not.toContain("credentials");
    }
  });

  it("instagram callback does not send token in events", () => {
    const trackSection = instagramCallbackSource.slice(
      instagramCallbackSource.indexOf("trackServerEvent"),
    );
    const callEnd = trackSection.indexOf(");");
    const call = trackSection.slice(0, callEnd);
    expect(call).not.toContain("token");
    expect(call).not.toContain("credentials");
  });

  it("client posthog config does not enable console log recording", () => {
    expect(clientSource).toContain("enable_recording_console_log: false");
  });
});

describe("PostHog: Session Replay", () => {
  it("session recording is explicitly enabled in init config", () => {
    expect(clientSource).toContain("disable_session_recording: false");
  });

  it("session_recording config with input masking is present", () => {
    expect(clientSource).toContain("session_recording:");
    expect(clientSource).toContain("maskAllInputs: true");
  });

  it("init config does not disable recording", () => {
    expect(clientSource).not.toContain("disable_session_recording: true");
  });

  it("optOutPostHog stops capturing and recording", () => {
    expect(clientSource).toContain("opt_out_capturing");
    expect(clientSource).toContain("stopSessionRecording");
  });

  it("startSessionRecording is called after identify", () => {
    const identifySection = clientSource.slice(
      clientSource.indexOf("function identifyUser"),
      clientSource.indexOf("function resetUser"),
    );
    expect(identifySection).toContain("posthog.identify(userId");
    expect(identifySection).toContain("posthog.startSessionRecording()");
    const identifyIdx = identifySection.indexOf("posthog.identify");
    const startIdx = identifySection.indexOf("posthog.startSessionRecording");
    expect(startIdx).toBeGreaterThan(identifyIdx);
  });

  it("dev logs include session replay URL", () => {
    expect(clientSource).toContain("get_session_replay_url()");
  });

  it("init runs only once (guard flag)", () => {
    expect(clientSource).toContain("if (initialized) return");
    expect(clientSource).toContain("initialized = true");
  });
});

const consentSource = readFileSync(
  join(__dirname, "consent.ts"),
  "utf-8",
);

const cookieBannerSource = readFileSync(
  join(__dirname, "../../app/cookie-banner.tsx"),
  "utf-8",
);

const cookieActionsSource = readFileSync(
  join(__dirname, "../../app/cookie-actions.ts"),
  "utf-8",
);

describe("RGPD: cookie consent controls PostHog", () => {
  it("consent module persists to localStorage", () => {
    expect(consentSource).toContain("localStorage.setItem");
    expect(consentSource).toContain("localStorage.getItem");
    expect(consentSource).toContain("kairos_cookie_consent");
  });

  it("consent module returns null when no choice made", () => {
    expect(consentSource).toContain("return null");
  });

  it("resetConsent removes localStorage key", () => {
    expect(consentSource).toContain("localStorage.removeItem");
  });

  it("PostHogProvider only inits when consent is accepted", () => {
    expect(providerSource).toContain("getConsent");
    expect(providerSource).toContain('"accepted"');
  });

  it("cookie banner calls initPostHog on accept", () => {
    expect(cookieBannerSource).toContain("initPostHog");
  });

  it("cookie banner calls optOutPostHog on decline", () => {
    expect(cookieBannerSource).toContain("optOutPostHog");
  });

  it("cookie banner persists consent to Supabase", () => {
    expect(cookieBannerSource).toContain("saveCookieConsent");
  });

  it("cookie actions upserts to cookie_consents table", () => {
    expect(cookieActionsSource).toContain("cookie_consents");
    expect(cookieActionsSource).toContain("upsert");
  });

  it("cookie banner is in root layout", () => {
    expect(rootLayoutSource).toContain("CookieBanner");
  });
});

describe("PostHog: events are sent once per action", () => {
  it("signup tracks user_signed_up once", () => {
    const matches = authActionsSource.match(/USER_SIGNED_UP/g);
    expect(matches?.length).toBe(1);
  });

  it("webhook tracks conversation_received once per handler", () => {
    const matches = webhookSource.match(/CONVERSATION_RECEIVED/g);
    expect(matches?.length).toBe(1);
  });
});
