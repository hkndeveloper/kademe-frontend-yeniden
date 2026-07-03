export interface ChatTable {
  columns: string[];
  rows: string[][];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  intent?: string;
  table?: ChatTable | null;
  exportToken?: string | null;
}

export interface ChatbotQueryResponse {
  reply: string;
  intent: string;
  table: ChatTable | null;
  export_token: string | null;
  export_available: boolean;
}