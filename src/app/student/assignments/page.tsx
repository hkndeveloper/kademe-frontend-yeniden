"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Calendar, CheckCircle2, Download, FileCheck, Loader2, Send, Upload, XCircle } from "lucide-react";
import api from "@/lib/api/axios";
import { downloadBlobResponse } from "@/lib/download";


interface AssignmentAttachment {
  id: number;
  original_name?: string | null;
  file_type?: string | null;
  download_url?: string | null;
}
interface AssignmentSubmission {
  id: number;
  status?: string;
  description?: string;
  file_path?: string | null;
  download_url?: string | null;
}

interface AssignmentFormState {
  title: string;
  description: string;
  file_path: string;
  file: File | null;
}

interface Assignment {
  id: number;
  title: string;
  description?: string | null;
  due_date?: string | null;
  submissions?: AssignmentSubmission[];
  attachments?: AssignmentAttachment[];
}

export default function StudentAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeAssignmentId, setActiveAssignmentId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [form, setForm] = useState<Record<number, AssignmentFormState>>({});

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        const response = await api.get<{ assignments: Assignment[] }>("/assignments");
        setAssignments(response.data.assignments ?? []);
      } catch (error) {
        console.error("Odevler cekilemedi", error);
      } finally {
        setLoading(false);
      }
    };

    void fetchAssignments();
  }, []);

  const emptyForm = (current?: AssignmentFormState): AssignmentFormState => ({
    title: current?.title || "",
    description: current?.description || "",
    file_path: current?.file_path || "",
    file: current?.file || null,
  });

  const updateForm = (assignmentId: number, field: keyof AssignmentFormState, value: string | File | null) => {
    setForm((prev) => ({
      ...prev,
      [assignmentId]: {
        ...emptyForm(prev[assignmentId]),
        [field]: value,
      },
    }));
  };

  const handleSubmit = async (assignmentId: number) => {
    const payload = form[assignmentId];
    if (!payload?.description) return;

    const formData = new FormData();
    formData.append("title", payload.title);
    formData.append("description", payload.description);
    if (payload.file) formData.append("file", payload.file);

    setSubmitting(assignmentId);
    try {
      await api.post(`/assignments/${assignmentId}/submit`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const refreshed = await api.get<{ assignments: Assignment[] }>("/assignments");
      setAssignments(refreshed.data.assignments ?? []);
      setActiveAssignmentId(null);
    } catch (error) {
      console.error("Odev teslimi basarisiz", error);
    } finally {
      setSubmitting(null);
    }
  };

  const handleDownload = async (submission: AssignmentSubmission) => {
    if (!submission.download_url) return;

    try {
      const response = await api.get(submission.download_url, { responseType: "blob" });
      await downloadBlobResponse(response.data, response.headers, `odev_teslimi_${submission.id}`);
    } catch (error) {
      console.error("Teslim dosyasi indirilemedi", error);
    }
  };

  const handleDownloadAttachment = async (attachment: AssignmentAttachment) => {
    if (!attachment.download_url) return;

    try {
      const response = await api.get(attachment.download_url, { responseType: "blob" });
      await downloadBlobResponse(response.data, response.headers, attachment.original_name || `odev_eki_${attachment.id}`);
    } catch (error) {
      console.error("Odev eki indirilemedi", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  const submittedCount = assignments.filter((assignment) => (assignment.submissions?.length ?? 0) > 0).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-primary">
            <FileCheck className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900">Odevlerim</h1>
            <p className="mt-1 text-sm font-bold uppercase tracking-widest text-muted-foreground">Aktif proje donemi teslimleri</p>
          </div>
        </div>

        <div className="grid w-full grid-cols-3 gap-3 lg:max-w-md">
          <SummaryPill label="Toplam" value={assignments.length} />
          <SummaryPill label="Teslim" value={submittedCount} />
          <SummaryPill label="Bekleyen" value={assignments.length - submittedCount} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {assignments.length === 0 ? (
          <div className="glass-panel rounded-3xl border border-dashed border-border p-20 text-center text-muted-foreground">
            <FileCheck className="mx-auto mb-4 h-12 w-12 text-primary/30" />
            Henuz atanmis bir odev gorunmuyor.
          </div>
        ) : (
          assignments.map((assignment, index) => {
            const submitted = (assignment.submissions?.length ?? 0) > 0;

            return (
              <motion.div
                key={assignment.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="glass-panel overflow-hidden rounded-3xl p-0"
              >
                <div className="grid gap-0 lg:grid-cols-[1fr,220px]">
                  <div className="space-y-5 p-6 md:p-7">
                    <div className="flex flex-wrap items-start gap-3">
                      <h3 className="min-w-0 flex-1 text-xl font-black text-slate-900">{assignment.title}</h3>
                      <div className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-bold uppercase ${submitted ? "bg-green-500/10 text-green-600" : "bg-blue-500/10 text-blue-700"}`}>
                        {submitted ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        {submitted ? "Teslim Edildi" : "Bekliyor"}
                      </div>
                    </div>

                    <p className="max-w-3xl whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{assignment.description || "Aciklama girilmemis."}</p>

                    {assignment.attachments?.length ? (
                      <div className="flex flex-wrap gap-2">
                        {assignment.attachments.map((attachment) => (
                          <button
                            key={attachment.id}
                            type="button"
                            onClick={() => void handleDownloadAttachment(attachment)}
                            className="inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary/15"
                          >
                            <Download className="h-4 w-4" />
                            {attachment.original_name || "Odev Ekini Indir"}
                          </button>
                        ))}
                      </div>
                    ) : null}

                    <div className="grid gap-3 sm:grid-cols-2">
                      <InfoBox label="Son Tarih">
                        <Calendar className="h-4 w-4" />
                        {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString("tr-TR") : "Belirtilmedi"}
                      </InfoBox>
                      <InfoBox label="Teslim Sayisi">{assignment.submissions?.length ?? 0}</InfoBox>
                    </div>

                    {assignment.submissions?.[0]?.download_url ? (
                      <button
                        type="button"
                        onClick={() => void handleDownload(assignment.submissions![0])}
                        className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-100"
                      >
                        <Download className="h-4 w-4" />
                        Teslim Dosyasini Indir
                      </button>
                    ) : null}
                  </div>

                  <div className="flex flex-col justify-between border-t border-border bg-background/50 p-6 lg:border-l lg:border-t-0">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Aksiyon</p>
                      <p className="mt-2 text-sm text-muted-foreground">{submitted ? "Gerekirse mevcut teslimini guncelleyebilirsin." : "Teslim aciklamasi ve dosya ekleyerek gonderebilirsin."}</p>
                    </div>
                    <button
                      onClick={() => setActiveAssignmentId(activeAssignmentId === assignment.id ? null : assignment.id)}
                      className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
                    >
                      <Upload className="h-4 w-4" />
                      {submitted ? "Teslimi Guncelle" : "Odev Teslim Et"}
                    </button>
                  </div>
                </div>

                {activeAssignmentId === assignment.id && (
                  <div className="space-y-4 border-t border-border bg-background/40 p-6 md:p-7">
                    <input
                      type="text"
                      placeholder="Teslim basligi (opsiyonel)"
                      value={form[assignment.id]?.title || ""}
                      onChange={(e) => updateForm(assignment.id, "title", e.target.value)}
                      className="w-full rounded-xl border border-border bg-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                    />
                    <textarea
                      rows={4}
                      placeholder="Teslim aciklamasi"
                      value={form[assignment.id]?.description || ""}
                      onChange={(e) => updateForm(assignment.id, "description", e.target.value)}
                      className="w-full rounded-xl border border-border bg-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                    />
                    <input
                      type="file"
                      onChange={(e) => updateForm(assignment.id, "file", e.target.files?.[0] ?? null)}
                      className="w-full rounded-xl border border-border bg-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button
                      onClick={() => void handleSubmit(assignment.id)}
                      disabled={submitting === assignment.id || !(form[assignment.id]?.description || "").trim()}
                      className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {submitting === assignment.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Gonder
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}

function SummaryPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-background/70 p-3">
      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-black text-slate-900">{value}</p>
    </div>
  );
}

function InfoBox({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-background/60 p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-center gap-2 text-sm font-bold text-slate-900">{children}</div>
    </div>
  );
}
