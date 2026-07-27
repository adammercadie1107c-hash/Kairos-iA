import { z } from "zod";

export const CONVERSATION_STATUSES = [
  "new",
  "qualifying",
  "qualified",
  "booking_sent",
  "handoff",
  "disqualified",
  "closed",
] as const;

export const AgentDecisionSchema = z.object({
  action: z.enum([
    "reply",
    "ask_qualification",
    "send_booking",
    "escalate",
    "schedule_followup",
  ]),
  message: z.string(),
  reason_code: z.enum([
    "greeting",
    "faq_answer",
    "qualification_progress",
    "all_fields_collected",
    "objection_handled",
    "booking_ready",
    "low_confidence",
    "human_requested",
    "off_topic",
    "sensitive_topic",
    "followup_needed",
    "not_a_fit",
  ]),
  handoff_reason: z.string().nullable(),
  extracted_info: z.record(z.string(), z.string()).optional(),
  new_status: z.enum(CONVERSATION_STATUSES).optional(),
  confidence: z.number().min(0).max(1),
});

export type AgentDecision = z.infer<typeof AgentDecisionSchema>;
