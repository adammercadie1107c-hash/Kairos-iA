export type ConversationStatus =
  | "new"
  | "qualifying"
  | "qualified"
  | "booking_sent"
  | "handoff"
  | "disqualified"
  | "closed";

export type MessageRole = "contact" | "agent" | "human" | "system";

export type ChannelType = "demo" | "instagram" | "whatsapp";

export type ChannelStatus = "active" | "inactive" | "pending";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
}

export interface AgentConfig {
  id: string;
  user_id: string;
  business_name: string;
  business_description: string;
  offer: string;
  tone: string;
  faq: Array<{ q: string; a: string }>;
  qualification_questions: string[];
  required_qualification_fields: string[];
  qualification_rules: Record<string, unknown>;
  booking_link: string;
  booking_message: string;
  max_followups: number;
  created_at: string;
  updated_at: string;
}

export interface Channel {
  id: string;
  user_id: string;
  type: ChannelType;
  status: ChannelStatus;
  credentials: Record<string, never>;
  created_at: string;
}

export interface Contact {
  id: string;
  user_id: string;
  channel_id: string;
  external_id: string;
  display_name: string | null;
  extracted_info: Record<string, string>;
  created_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  contact_id: string;
  channel_id: string;
  status: ConversationStatus;
  ai_enabled: boolean;
  followup_count: number;
  next_followup_at: string | null;
  last_message_at: string | null;
  summary: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AgentLog {
  id: string;
  conversation_id: string;
  input_tokens: number | null;
  output_tokens: number | null;
  latency_ms: number | null;
  decision: string | null;
  reason_code: string | null;
  handoff_reason: string | null;
  error: string | null;
  raw_output: unknown;
  created_at: string;
}

export type ProspectStatus =
  | "nouveau"
  | "contacte"
  | "a_relancer"
  | "gagne"
  | "perdu";

export interface Prospect {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  company: string;
  email: string;
  phone: string;
  status: ProspectStatus;
  next_followup_at: string | null;
  last_followup_at: string | null;
  next_action: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface ScheduledEvent {
  id: string;
  conversation_id: string;
  type: "followup";
  scheduled_at: string;
  executed_at: string | null;
  cancelled: boolean;
  created_at: string;
}
