"use client";

import { type ReactNode, FormEvent, useCallback, useState } from "react";
import { Download, Loader2, Send, Sparkles, UserRound } from "lucide-react";
import api from "@/lib/api/axios";

interface ChatTable {
  columns: string[];
  rows: string[][];
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  intent?: string;
  table?: ChatTable | null;
  exportToken?: string | null;
}

const SUGGESTIONS = [
  "Diplomasi360 aktif öğrenci sayısı",
  "KADEME+ katılımcı listesi",
  "Pergel başvuru durumları",
  "Tüm projeler özet",
  "Yardım",
];

function renderSimpleMarkdown(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    const m = part.match(/^\*\*([^*]+)\*\*$/);
    if (m) {
      return (
        <strong key={i} className="font-bold text-white">
          {m[1]}
        </strong>
      );
    }
    return (
      <span key={i} className="whitespace-pre-wrap">
        {part}
      </span>
    );
  });
}

export function AdminChatbotPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Merhaba. Proje adı veya türü ile birlikte sorunuzu yazın; veritabanından özet veya liste getirebilirim. Örnek: \"Diplomasi360 aktif öğrenci sayısı\" veya \"Eurodesk katılımcı listesi\".",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [exportingId, setExportingId] = useState<string | null>(null);

  const sendMessage = useCallback(async (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", text: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const { data } = await api.post<{
        reply: string;
        intent: string;
        table: ChatTable | null;
        export_token: string | null;
        export_available: boolean;
      }>("/admin/chatbot/query", { message: trimmed });

      setMessages((prev) => [
        ...prev,
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
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: "assistant",
          text: "İstek işlenemedi. Oturumunuzun süresi dolmuş olabilir veya sunucu hatası oluştu.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void sendMessage(input);
  };

  const handleExport = async (token: string, messageId: string) => {
    setExportingId(messageId);
    try {
      const response = await api.get(`/admin/chatbot/export/${encodeURIComponent(token)}`, {
        responseType: "blob",
      });
      const disposition = response.headers["content-disposition"] as string | undefined;
      let filename = "asistan_export.csv";
      if (disposition) {
        const match = /filename="?([^";]+)"?/i.exec(disposition);
        if (match?.[1]) filename = match[1];
      }
      const blob = new Blob([response.data], { type: "text/csv;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("CSV indirilemedi. Dışa aktarma bağlantısının süresi dolmuş olabilir.");
    } finally {
      setExportingId(null);
    }
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-400">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white">Veri Asistanı</h1>
            <p className="text-sm text-muted-foreground">
              Kural tabanlı sorgular — yalnızca yetkiniz dahilindeki projeler. Tam doğal dil yerine anahtar kelime ve proje eşleşmesi kullanılır.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => void sendMessage(s)}
              disabled={loading}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:border-indigo-500/40 hover:text-white disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-panel flex max-h-[min(560px,calc(100vh-280px))] flex-col overflow-hidden rounded-3xl border border-white/10">
        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          {messages.map((m) => (
            <div key={m.id} className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              {m.role === "assistant" && (
                <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-300">
                  <Sparkles className="h-4 w-4" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-2xl px-5 py-4 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-indigo-600 text-white"
                    : "border border-white/10 bg-black/30 text-muted-foreground"
                }`}
              >
                {m.role === "assistant" ? renderSimpleMarkdown(m.text) : m.text}
                {m.intent && m.role === "assistant" && (
                  <p className="mt-3 border-t border-white/10 pt-2 text-[10px] font-bold uppercase tracking-widest text-indigo-400/80">
                    Niyet: {m.intent}
                  </p>
                )}
                {m.table && m.table.rows.length > 0 && (
                  <div className="mt-4 overflow-x-auto rounded-xl border border-white/10">
                    <table className="w-full min-w-[320px] text-left text-xs">
                      <thead className="bg-white/5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        <tr>
                          {m.table.columns.map((c) => (
                            <th key={c} className="px-3 py-2">
                              {c}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {m.table.rows.slice(0, 25).map((row, ri) => (
                          <tr key={ri} className="border-t border-white/5 hover:bg-white/[0.03]">
                            {row.map((cell, ci) => (
                              <td key={ci} className="px-3 py-2 text-white/90">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {m.table.rows.length > 25 && (
                      <p className="border-t border-white/5 px-3 py-2 text-[10px] text-muted-foreground">
                        Tabloda ilk 25 satır gösteriliyor; tamamı CSV ile indirilebilir.
                      </p>
                    )}
                  </div>
                )}
                {m.exportToken && (
                  <button
                    type="button"
                    onClick={() => void handleExport(m.exportToken!, m.id)}
                    disabled={exportingId === m.id}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-emerald-400 transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
                  >
                    {exportingId === m.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    CSV indir
                  </button>
                )}
              </div>
              {m.role === "user" && (
                <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-muted-foreground">
                  <UserRound className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 pl-12 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
              Yanıt hazırlanıyor…
            </div>
          )}
        </div>

        <form onSubmit={onSubmit} className="border-t border-white/10 bg-black/20 p-4">
          <div className="flex gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Örn: Diplomasi360 aktif öğrenci sayısı"
              className="flex-1 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-indigo-500/40"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 disabled:opacity-40"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              Gönder
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
