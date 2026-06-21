"use client";

import { type ReactNode, FormEvent, useCallback, useState } from "react";
import { Bot, Download, Loader2, Send, Sparkles, UserRound } from "lucide-react";
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
  "KADEME+ katılımcı listesi limit 50",
  "Pergel başvuru özeti son 30 gün",
  "Eurodesk başvuru listesi",
  "Diplomasi360 dönem dağılımı",
  "Pergel kredi özeti",
  "Diplomasi360 ve Pergel karşılaştır",
  "Tüm projeler özet",
  "Diplomasi360 mali özet son 90 gün",
  "KPD yedek liste",
  "Zirve başvuru bekleyen",
  "Yardım",
];

function renderSimpleMarkdown(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    const m = part.match(/^\*\*([^*]+)\*\*$/);
    if (m) {
      return (
        <strong key={i} className="font-semibold text-indigo-950">
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
      text:
        "Merhaba. Yönetebildiğiniz proje adı veya türüyle birlikte sorunuzu yazın; katılımcı özeti, liste, başvuru, dönem dağılımı, kredi veya mali özet getirebilirim.\n\nÖrnek: \"Diplomasi360 dönem dağılımı\", \"Pergel başvuru listesi son 14 gün\". Aşağıdaki kısayolları da kullanabilirsiniz.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [exportingId, setExportingId] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (raw: string) => {
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
        }>("/panel/chatbot/query", { message: trimmed });

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
    },
    [loading],
  );

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void sendMessage(input);
  };

  const handleExport = async (token: string, messageId: string) => {
    setExportingId(messageId);
    try {
      const response = await api.get(`/panel/chatbot/export/${encodeURIComponent(token)}`, {
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
    <div className="mx-auto flex max-w-4xl flex-col gap-8 pb-8">
      <header className="rounded-3xl border border-slate-200/90 bg-gradient-to-br from-white via-slate-50/80 to-indigo-50/40 p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="flex gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/25">
              <Bot className="h-7 w-7" aria-hidden />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" aria-hidden />
                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Panel</p>
              </div>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">Veri asistanı</h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
                Kural tabanlı, yetki ve proje kapsamına uygun özetler. Tam doğal dil yerine anahtar kelime ve proje eşleşmesi
                kullanılır; tabloları CSV olarak indirebilirsiniz.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 border-t border-slate-200/80 pt-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Hızlı sorular</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => void sendMessage(s)}
                disabled={loading}
                className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-left text-xs font-medium text-slate-700 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50/80 hover:text-indigo-950 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="flex max-h-[min(560px,calc(100vh-280px))] flex-col overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-sm">
        <div className="flex-1 space-y-5 overflow-y-auto p-5 md:p-6">
          {messages.map((m) => (
            <div key={m.id} className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              {m.role === "assistant" && (
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                  <Sparkles className="h-4 w-4" aria-hidden />
                </div>
              )}
              <div
                className={`max-w-[min(100%,42rem)] rounded-2xl px-4 py-3.5 text-sm leading-relaxed shadow-sm md:px-5 md:py-4 ${
                  m.role === "user"
                    ? "bg-indigo-600 text-white"
                    : "border border-slate-200/90 bg-slate-50/90 text-slate-800"
                }`}
              >
                {m.role === "assistant" ? renderSimpleMarkdown(m.text) : m.text}
                {m.intent && m.role === "assistant" && m.intent !== "empty" && (
                  <p className="mt-3 border-t border-slate-200/80 pt-2 text-[10px] font-medium uppercase tracking-wider text-slate-400">
                    {m.intent}
                  </p>
                )}
                {m.table && m.table.rows.length > 0 && (
                  <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
                    <table className="w-full min-w-[320px] text-left text-xs">
                      <thead className="bg-slate-100/90 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                        <tr>
                          {m.table.columns.map((c) => (
                            <th key={c} className="px-3 py-2.5">
                              {c}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {m.table.rows.slice(0, 25).map((row, ri) => (
                          <tr key={ri} className="border-t border-slate-100 hover:bg-slate-50/80">
                            {row.map((cell, ci) => (
                              <td key={ci} className="px-3 py-2 text-slate-800">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {m.table.rows.length > 25 && (
                      <p className="border-t border-slate-100 px-3 py-2 text-[10px] text-slate-500">
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
                    className="mt-4 inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-900 transition hover:bg-emerald-100 disabled:opacity-50"
                  >
                    {exportingId === m.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    CSV indir
                  </button>
                )}
              </div>
              {m.role === "user" && (
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-600">
                  <UserRound className="h-4 w-4" aria-hidden />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 pl-12 text-xs text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
              Yanıt hazırlanıyor…
            </div>
          )}
        </div>

        <form onSubmit={onSubmit} className="border-t border-slate-200 bg-slate-50/90 p-4 md:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Örn: Diplomasi360 dönem dağılımı · Pergel kredi özeti · KADEME+ başvuru listesi"
              className="min-h-[48px] flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-indigo-500/0 transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:opacity-40"
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
