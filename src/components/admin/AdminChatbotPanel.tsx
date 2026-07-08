"use client";

import { useCallback, useState } from "react";
import { Bot, Sparkles } from "lucide-react";
import api from "@/lib/api/axios";
import { ChatComposer } from "./chatbot/ChatComposer";
import { ChatMessages } from "./chatbot/ChatMessages";
import { ChatSuggestions } from "./chatbot/ChatSuggestions";
import { CHATBOT_SUGGESTIONS } from "./chatbot/suggestions";
import type { ChatbotQueryResponse, ChatMessage } from "./chatbot/types";

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  text: "Merhaba. Yetkinizin kapsadığı panel verileri için özet, liste ve karşılaştırma çıkarabilirim. Proje bazlı sorgularda proje adıyla birlikte yazabilirsiniz.",
};

export function AdminChatbotPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = useCallback(
    async (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed || loading) return;

      const userMessage: ChatMessage = { id: `u-${Date.now()}`, role: "user", text: trimmed };
      setMessages((current) => [...current, userMessage]);
      setInput("");
      setLoading(true);

      try {
        const { data } = await api.post<ChatbotQueryResponse>("/panel/chatbot/query", { message: trimmed });
        setMessages((current) => [
          ...current,
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            text: data.reply,
            intent: data.intent,
            table: data.table,
            exportToken: data.export_token,
          },
        ]);
      } catch {
        setMessages((current) => [
          ...current,
          {
            id: `e-${Date.now()}`,
            role: "assistant",
            text: "İstek işlenemedi. Oturum veya yetki durumunuzu kontrol edip tekrar deneyin.",
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading],
  );

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 pb-8">
      <header className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
              <Bot className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                Panel
              </div>
              <h1 className="text-xl font-bold tracking-tight text-slate-950 md:text-2xl">Veri Asistanı</h1>
            </div>
          </div>
          <div className="min-w-0 flex-1 lg:max-w-3xl">
            <ChatSuggestions suggestions={CHATBOT_SUGGESTIONS} disabled={loading} onSelect={(value) => void sendMessage(value)} />
          </div>
        </div>
      </header>

      <section className="flex h-[min(680px,calc(100vh-220px))] min-h-[520px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
        <ChatMessages messages={messages} loading={loading} />
        <ChatComposer value={input} loading={loading} onChange={setInput} onSubmit={() => void sendMessage(input)} />
      </section>
    </div>
  );
}