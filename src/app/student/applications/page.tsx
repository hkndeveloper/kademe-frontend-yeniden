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
  status: string;
  created_at: string;
  interview_at?: string | null;
  rejection_reason?: string | null;
  auto_rejected?: boolean;
  auto_rejection_reason?: string | null;
  form_entries?: Array<{
    id: string;
    label: string;
    type: string;
    value?: unknown;
    file?: {
      original_name?: string | null;
      mime_type?: string | null;
      size?: number | null;
    } | null;
  }>;
}

type StatusIcon = typeof Clock;

const statusConfig: Record<string, { label: string; color: string; icon: StatusIcon }> = {
  pending: { label: "Beklemede", color: "bg-yellow-500/10 text-yellow-500", icon: Clock },
  accepted: { label: "Kabul Edildi", color: "bg-green-500/10 text-green-500", icon: CheckCircle2 },
  rejected: { label: "Reddedildi", color: "bg-red-500/10 text-red-500", icon: XCircle },
  waitlisted: { label: "Yedek Listede", color: "bg-blue-500/10 text-blue-500", icon: AlertCircle },
  interview_planned: { label: "Mulakat Planlandi", color: "bg-purple-500/10 text-purple-500", icon: UserCheck },
  interview_passed: { label: "Mulakat Gecildi", color: "bg-emerald-500/10 text-emerald-500", icon: CheckCircle2 },
  interview_failed: { label: "Mulakat Olumsuz", color: "bg-rose-500/10 text-rose-500", icon: XCircle },
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
      return "Basvurun degerlendirme sirasi bekliyor.";
    case "waitlisted":
      return "Yedek listedesin; kontenjan acilirsa bilgilendirme alacaksin.";
    case "interview_planned":
      return `Mulakat tarihin: ${formatDateTime(application.interview_at)}.`;
    case "interview_passed":
      return "Mulakat olumlu; nihai kabul karari bekleniyor.";
    case "accepted":
      return "Basvurun kabul edildi; proje katilim kaydin olusturulabilir.";
    case "interview_failed":
      return application.rejection_reason || "Mulakat sonucu olumsuz degerlendirildi.";
    case "rejected":
      return application.rejection_reason || application.auto_rejection_reason || "Basvurun olumsuz degerlendirildi.";
    default:
      return "Basvuru surecin guncelleniyor.";
  }
}

export default function StudentApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const response = await api.get<{ applications: Application[] }>("/applications");
        setApplications(response.data.applications ?? []);
      } catch (error) {
        console.error("Basvurular cekilemedi", error);
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
          <h1 className="text-2xl font-bold">Basvurularim</h1>
          <p className="text-sm text-muted-foreground">Yaptiginiz tum program basvurularinin guncel durumu.</p>
        </div>
      </div>

      {applications.length === 0 ? (
        <div className="glass-panel rounded-3xl p-20 text-center text-muted-foreground">Henuz bir basvurunuz bulunmuyor.</div>
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
                    <p className="mt-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">{application.project.type || "Proje"}</p>
                  </div>

                  <div className="grid grid-cols-1 gap-3 text-sm text-muted-foreground sm:grid-cols-2 lg:min-w-[420px]">
                    <div className="rounded-2xl border border-border/50 bg-muted/20 p-4">
                      <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                        <Calendar className="h-4 w-4" />
                        Donem
                      </div>
                      <div className="font-bold text-foreground">{application.period?.name ?? "-"}</div>
                    </div>
                    <div className="rounded-2xl border border-border/50 bg-muted/20 p-4">
                      <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                        <Clock className="h-4 w-4" />
                        Basvuru
                      </div>
                      <div className="font-bold text-foreground">{formatDate(application.created_at)}</div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-primary/10 bg-primary/5 p-4">
                  <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary">
                    <MessageSquareText className="h-4 w-4" />
                    Surec Bilgisi
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">{nextStepText(application)}</p>
                </div>

                {formEntries.length > 0 ? (
                  <details className="mt-5 rounded-2xl border border-border/50 bg-muted/10 p-4">
                    <summary className="cursor-pointer text-sm font-bold text-foreground">Gonderilen form cevaplari</summary>
                    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                      {formEntries.map((entry) => (
                        <div key={entry.id} className="rounded-xl border border-border/50 bg-background/70 p-3">
                          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{entry.label}</div>
                          {entry.file ? (
                            <div className="mt-2 text-sm font-semibold text-foreground">{entry.file.original_name || "Dosya"}</div>
                          ) : (
                            <div className="mt-2 break-words text-sm text-muted-foreground">{formatEntryValue(entry.value)}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </details>
                ) : null}
              </motion.div>
            );
          })}
        </div>
      )}

      <div className="flex items-start gap-4 rounded-2xl border border-primary/10 bg-primary/5 p-6">
        <AlertCircle className="h-6 w-6 shrink-0 text-primary" />
        <p className="text-sm leading-relaxed text-muted-foreground">
          <span className="font-bold text-primary">Not:</span> Basvurunuz yedek listede ise asil listeden feragat edenler oldugunda sistem tarafindan otomatik olarak davet mesaji alirsiniz.
        </p>
      </div>
    </div>
  );
}
