import { Bot, UserRound } from "lucide-react";
import { ExportButtons } from "@/components/shared/ExportButtons";
import type { ChatMessage } from "./types";
import { renderSimpleMarkdown } from "./render-markdown";

interface ChatMessagesProps {
  messages: ChatMessage[];
  loading: boolean;
}

export function ChatMessages({ messages, loading }: ChatMessagesProps) {
  return (
    <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5 md:px-5">
      {messages.map((message) => (
        <div key={message.id} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
          {message.role === "assistant" ? (
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
              <Bot className="h-4 w-4" aria-hidden />
            </div>
          ) : null}

          <div
            className={`max-w-[min(100%,46rem)] rounded-xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
              message.role === "user"
                ? "bg-slate-900 text-white"
                : "border border-slate-200 bg-white text-slate-800"
            }`}
          >
            {message.role === "assistant" ? renderSimpleMarkdown(message.text) : message.text}

            {message.intent && message.role === "assistant" && !["empty", "help"].includes(message.intent) ? (
              <p className="mt-3 border-t border-slate-200 pt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {message.intent}
              </p>
            ) : null}

            {message.table && message.table.rows.length > 0 ? (
              <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-white">
                <table className="w-full min-w-[420px] text-left text-xs">
                  <thead className="bg-slate-100 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                    <tr>
                      {message.table.columns.map((column) => (
                        <th key={column} className="px-3 py-2.5">
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {message.table.rows.slice(0, 25).map((row, rowIndex) => (
                      <tr key={rowIndex} className="border-t border-slate-100 hover:bg-slate-50">
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex} className="px-3 py-2 text-slate-800">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {message.table.rows.length > 25 ? (
                  <p className="border-t border-slate-100 px-3 py-2 text-[10px] text-slate-500">
                    Ilk 25 satir gosteriliyor.
                  </p>
                ) : null}
              </div>
            ) : null}

            {message.exportToken ? (
              <div className="mt-4">
                <ExportButtons
                  endpoint={`/panel/chatbot/export/${encodeURIComponent(message.exportToken)}`}
                  filename="veri_asistani_ciktisi"
                  buttonLabel="Disa Aktar"
                />
              </div>
            ) : null}
          </div>

          {message.role === "user" ? (
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-slate-700">
              <UserRound className="h-4 w-4" aria-hidden />
            </div>
          ) : null}
        </div>
      ))}

      {loading ? (
        <div className="flex items-center gap-2 pl-12 text-xs font-medium text-slate-500">
          <span className="h-2 w-2 animate-pulse rounded-full bg-slate-900" />
          Yanit hazirlaniyor
        </div>
      ) : null}
    </div>
  );
}