"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Calendar, CheckCircle2, Clock, FileText, Loader2, MessageSquareText, UserCheck, XCircle } from "lucide-react";
import api from "@/lib/api/axios";

interface Application {
  id: number;
  project: {
    name: string;
    type: string;
  };
  period?: {
    name: string;
  } | null;
  program?: {
    title: string;
  } | null;
  status: string;
  created_at: string;
  interview_at?: string | null;
  rejection_reason?: string | null;
  auto_rejected?: boolean;
  auto_rejection_reason?: string | null;
  consent_text_snapshot?: string | null;
  consent_accepted_at?: string | null;
  form_entries?: Array<{
    id: string;
    label: string;
    type: string;
    value?: unknown;
    file?: {
      original_name?: string | null;
      mime_type?: string | null;
      size?: number | null;
      download_url?: string | null;
    } | null;
  }>;
}

type StatusIcon = typeof Clock;

const statusConfig: Record<string, { label: string; color: string; icon: StatusIcon }> = {
  pending: { label: "Beklemede", color: "border border-blue-200 bg-blue-50 text-blue-700", icon: Clock },
  accepted: { label: "Kabul Edildi", color: "bg-green-500/10 text-green-500", icon: CheckCircle2 },
  rejected: { label: "Reddedildi", color: "bg-red-500/10 text-red-500", icon: XCircle },
  waitlisted: { label: "Yedek Listede", color: "border border-blue-200 bg-blue-50 text-blue-700", icon: AlertCircle },
  interview_planned: { label: "Mülakat Planlandı", color: "border border-blue-200 bg-blue-50 text-blue-700", icon: UserCheck },
  interview_passed: { label: "Mülakat Geçildi", color: "bg-emerald-500/10 text-emerald-500", icon: CheckCircle2 },
  interview_failed: { label: "Mülakat Olumsuz", color: "bg-rose-500/10 text-rose-500", icon: XCircle },
};

function formatDate(value?: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("tr-TR");
}

function formatDateTime(value?: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleString("tr-TR");
}

function formatEntryValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function nextStepText(application: Application): string {
  switch (application.status) {
    case "pending":
      return "Başvurun değerlendirme sırası bekliyor.";
    case "waitlisted":
      return "Yedek listedesin; kontenjan acilirsa bilgilendirme alacaksin.";
    case "interview_planned":
      return `Mülakat tarihin: ${formatDateTime(application.interview_at)}.`;
    case "interview_passed":
      return "Mülakat olumlu; nihai kabul karari bekleniyor.";
    case "accepted":
      return "Başvurun kabul edildi; proje katılım kaydın oluşturulabilir.";
    case "interview_failed":
      return application.rejection_reason || "Mülakat sonucu olumsuz değerlendirildi.";
    case "rejected":
      return application.rejection_reason || application.auto_rejection_reason || "Başvurun olumsuz değerlendirildi.";
    default:
      return "Başvuru sürecin güncelleniyor.";
  }
}

export default function StudentApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const downloadFormFile = async (url: string, filename: string) => {
    setDownloadError(null);
    try {
      const response = await api.get<Blob>(url, { responseType: "blob" });
      const blobUrl = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      setDownloadError("Başvuru dosyası indirilemedi. Lütfen tekrar deneyin.");
    }
  };

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const response = await api.get<{ applications: Application[] }>("/applications");
        setApplications(response.data.applications ?? []);
      } catch (error) {
        console.error("Başvurular çekilemedi", error);
      } finally {
        setLoading(false);
      }
    };

    void fetchApplications();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>

    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-primary">
          <FileText className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Başvurularım</h1>
          <p className="text-sm text-muted-foreground">Yaptiginiz tüm program basvurularinin güncel durumu.</p>
        </div>
      </div>

      {downloadError ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{downloadError}</p> : null}

      {applications.length === 0 ? (
        <div className="glass-panel rounded-3xl p-20 text-center text-muted-foreground">Henüz bir başvurunuz bulunmuyor.</div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {applications.map((application, index) => {
            const config = statusConfig[application.status] || statusConfig.pending;
            const Icon = config.icon;
            const formEntries = application.form_entries ?? [];

            return (
              <motion.div
                key={application.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="glass-panel rounded-3xl border border-border/50 p-6"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className={`mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${config.color}`}>
                      <Icon className="h-4 w-4" />
                      {config.label.toUpperCase()}
                    </div>
                    <h2 className="text-xl font-extrabold text-foreground">{application.project.name}</h2>
                    {application.program?.title ? (
                      <p className="mt-2 text-sm font-semibold text-foreground">Program: {application.program.title}</p>
                    ) : null}
                    <p className="mt-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">{application.project.type || "Proje"}</p>
                  </div>

                  <div className="grid grid-cols-1 gap-3 text-sm text-muted-foreground sm:grid-cols-2 lg:min-w-[420px]">
                    <div className="rounded-2xl border border-border/50 bg-muted/20 p-4">
                      <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                        <Calendar className="h-4 w-4" />
                        Dönem
                      </div>
                      <div className="font-bold text-foreground">{application.period?.name ?? "-"}</div>
                    </div>
                    <div className="rounded-2xl border border-border/50 bg-muted/20 p-4">
                      <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                        <Clock className="h-4 w-4" />
                        Başvuru
                      </div>
                      <div className="font-bold text-foreground">{formatDate(application.created_at)}</div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-primary/10 bg-primary/5 p-4">
                  <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary">
                    <MessageSquareText className="h-4 w-4" />
                    Süreç Bilgisi
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">{nextStepText(application)}</p>
                </div>

                {formEntries.length > 0 ? (
                  <details className="mt-5 rounded-2xl border border-border/50 bg-muted/10 p-4">
                    <summary className="cursor-pointer text-sm font-bold text-foreground">Gönderilen form cevaplari</summary>
                    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                      {formEntries.map((entry) => (
                        <div key={entry.id} className="rounded-xl border border-border/50 bg-background/70 p-3">
                          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{entry.label}</div>
                          {entry.file ? (
                            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm font-semibold text-foreground">
                              <span>{entry.file.original_name || "Dosya"}</span>
                              {entry.file.download_url ? (
                                <button
                                  type="button"
                                  onClick={() => void downloadFormFile(entry.file?.download_url || "", entry.file?.original_name || `basvuru_${application.id}_${entry.id}`)}
                                  className="rounded-lg border border-primary/30 px-3 py-1 text-xs font-bold text-primary hover:bg-primary/10"
                                >
                                  İndir
                                </button>
                              ) : null}
                            </div>
                          ) : (
                            <div className="mt-2 break-words text-sm text-muted-foreground">{formatEntryValue(entry.value)}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </details>
                ) : null}
                <details className="mt-4 rounded-2xl border border-border/50 bg-muted/10 p-4">
                  <summary className="cursor-pointer text-sm font-bold text-foreground">Başvuru koşulu onayı</summary>
                  {application.consent_accepted_at && application.consent_text_snapshot ? (
                    <div className="mt-3 text-sm text-muted-foreground">
                      <p>Kabul zamanı: {formatDateTime(application.consent_accepted_at)}</p>
                      <p className="mt-2 whitespace-pre-line">{application.consent_text_snapshot}</p>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-muted-foreground">Bu eski başvuru için onay kaydı bulunmuyor.</p>
                  )}
                </details>
              </motion.div>
            );
          })}
        </div>
      )}

      <div className="flex items-start gap-4 rounded-2xl border border-primary/10 bg-primary/5 p-6">
        <AlertCircle className="h-6 w-6 shrink-0 text-primary" />
        <p className="text-sm leading-relaxed text-muted-foreground">
          <span className="font-bold text-primary">Not:</span> Başvurunuz yedek listede ise asil listeden feragat edenler olduğunda sistem tarafından otomatik olarak davet mesajı alirsiniz.
        </p>
      </div>
    </div>
  );
}
