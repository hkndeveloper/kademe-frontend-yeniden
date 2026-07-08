import { Bot, FileDown, Table2, UserRound } from "lucide-react";
import { ExportButtons } from "@/components/shared/ExportButtons";
import type { ChatMessage } from "./types";
import { renderSimpleMarkdown } from "./render-markdown";

interface ChatMessagesProps {
  messages: ChatMessage[];
  loading: boolean;
}

const PREVIEW_ROW_LIMIT = 25;

const intentLabels: Record<string, string> = {
  all_summary: "Genel Proje Özeti",
  announcement_list: "Duyuru Listesi",
  announcement_summary: "Duyuru Özeti",
  application_list: "Başvuru Listesi",
  application_stats: "Başvuru Özeti",
  assignment_list: "Ödev Listesi",
  assignment_summary: "Ödev Özeti",
  certificate_list: "Sertifika Listesi",
  certificate_summary: "Sertifika Özeti",
  credit_summary: "Kredi Özeti",
  digital_bohca_list: "Dijital Bohça Listesi",
  digital_bohca_summary: "Dijital Bohça Özeti",
  financial_summary: "Mali Özet",
  log_list: "Log Listesi",
  log_summary: "Log Özeti",
  participant_list: "Katılımcı Listesi",
  participant_period_breakdown: "Dönem Dağılımı",
  participant_stats: "Katılımcı Özeti",
  period_list: "Dönem Listesi",
  period_summary: "Dönem Özeti",
  program_list: "Program Listesi",
  program_summary: "Program Özeti",
  project_comparison: "Proje Karşılaştırması",
  project_special_modules_summary: "Proje Özel Modül Özeti",
  request_list: "Talep Listesi",
  request_summary: "Talep Özeti",
  staff_list: "Personel Listesi",
  staff_summary: "Personel Özeti",
  support_list: "Destek Listesi",
  support_summary: "Destek Özeti",
  trainer_list: "Eğitmen Listesi",
  trainer_summary: "Eğitmen Özeti",
  user_list: "Kullanıcı Listesi",
  user_summary: "Kullanıcı Özeti",
  volunteer_list: "Gönüllü Fırsatları",
  volunteer_summary: "Gönüllü Özeti",
  log_unavailable: "Log Kaynağı Okunamadı",
  no_match: "Proje Eşleşmedi",
  no_projects: "Proje Erişimi Yok",
  permission_denied: "Yetki Uyarısı",
  system_cv_guide: "CV Yetki Bilgisi",
  system_permission_guide: "Yetki Modeli",
  system_project_module_guide: "Proje Modül Bilgisi",
};

function intentLabel(intent?: string): string | null {
  if (!intent || ["empty", "help"].includes(intent)) return null;
  return intentLabels[intent] ?? intent.replaceAll("_", " ");
}

function isNumericCell(value: string): boolean {
  return /^-?\d+([.,]\d+)?$/.test(value.trim());
}

export function ChatMessages({ messages, loading }: ChatMessagesProps) {
  return (
    <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5 md:px-5">
      {messages.map((message) => {
        const label = intentLabel(message.intent);
        const rowCount = message.table?.rows.length ?? 0;
        const previewRows = message.table?.rows.slice(0, PREVIEW_ROW_LIMIT) ?? [];
        const hiddenRowCount = Math.max(rowCount - PREVIEW_ROW_LIMIT, 0);

        return (
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

              {label && message.role === "assistant" ? (
                <p className="mt-3 border-t border-slate-200 pt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  {label}
                </p>
              ) : null}

              {message.table ? (
                <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2.5">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-slate-700 shadow-sm ring-1 ring-slate-200">
                        <Table2 className="h-3.5 w-3.5" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800">Tablo Çıktısı</p>
                        {label ? <p className="truncate text-[10px] font-medium text-slate-500">{label}</p> : null}
                      </div>
                    </div>
                    <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-600 ring-1 ring-slate-200">
                      {rowCount.toLocaleString("tr-TR")} satır
                    </span>
                  </div>

                  {rowCount > 0 ? (
                    <div className="overflow-x-auto">
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
                          {previewRows.map((row, rowIndex) => (
                            <tr key={rowIndex} className="border-t border-slate-100 hover:bg-slate-50">
                              {row.map((cell, cellIndex) => (
                                <td key={cellIndex} className={`px-3 py-2 text-slate-800 ${isNumericCell(cell) ? "text-right tabular-nums" : ""}`}>
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="px-3 py-6 text-center text-xs font-medium text-slate-500">
                      Gösterilecek satır bulunamadı.
                    </div>
                  )}

                  {hiddenRowCount > 0 ? (
                    <p className="border-t border-slate-100 bg-slate-50 px-3 py-2 text-[10px] font-medium text-slate-500">
                      İlk {PREVIEW_ROW_LIMIT.toLocaleString("tr-TR")} satır gösteriliyor. Kalan {hiddenRowCount.toLocaleString("tr-TR")} satır dışa aktarım dosyasında yer alır.
                    </p>
                  ) : null}
                </div>
              ) : null}

              {message.exportToken ? (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-2 text-xs text-slate-600">
                    <FileDown className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                    <span className="font-medium">CSV, Excel, PDF veya Word olarak indirebilirsiniz.</span>
                  </div>
                  <ExportButtons
                    endpoint={`/panel/chatbot/export/${encodeURIComponent(message.exportToken)}`}
                    filename="veri_asistani_ciktisi"
                    buttonLabel="Dışa Aktar"
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
        );
      })}

      {loading ? (
        <div className="flex items-center gap-2 pl-12 text-xs font-medium text-slate-500">
          <span className="h-2 w-2 animate-pulse rounded-full bg-slate-900" />
          Yanıt hazırlanıyor
        </div>
      ) : null}
    </div>
  );
}