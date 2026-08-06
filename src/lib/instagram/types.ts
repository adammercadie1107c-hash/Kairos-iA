export interface IGWebhookPayload {
  object: "instagram";
  entry: IGEntry[];
}

export interface IGEntry {
  id: string;
  time: number;
  messaging: IGMessagingEvent[];
}

export interface IGMessagingEvent {
  sender: { id: string };
  recipient: { id: string };
  timestamp: number;
  message?: {
    mid: string;
    text?: string;
    is_echo?: boolean;
  };
}

export interface IGSendResponse {
  recipient_id: string;
  message_id: string;
}

export interface InstagramCredentials {
  page_access_token: string;
  page_id: string;
  instagram_account_id: string;
}
