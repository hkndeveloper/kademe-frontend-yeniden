"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, CheckCircle2, Download, FileCheck, Loader2, Send, Upload, XCircle } from "lucide-react";
import api from "@/lib/api/axios";

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
}

export default function AlumniAssignmentsPage() {
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
        console.error("Ödevler çekilemedi", error);
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
      console.error("Ödev teslimi başarısız", error);
    } finally {
      setSubmitting(null);
    }
  };

  const handleDownload = async (submission: AssignmentSubmission) => {
    if (!submission.download_url) return;

    try {
      const response = await api.get(submission.download_url, { responseType: "blob" });
      const contentType = String(response.headers["content-type"] ?? "");

      if (contentType.includes("application/json")) {
        const payload = JSON.parse(await response.data.text()) as { download_url?: string; message?: string };
        if (payload.download_url) {
          window.open(payload.download_url, "_blank", "noopener,noreferrer");
          return;
        }
        throw new Error(payload.message ?? "Teslim dosyasi indirilemedi.");
      }

      const blobUrl = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `odev_teslimi_${submission.id}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Teslim dosyasi indirilemedi", error);
    }
  };

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
          <FileCheck className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Ödevlerim & Görevlerim</h1>
          <p className="text-sm text-muted-foreground">Mezuniyet sonrası projeler veya geriye dönük teslimleriniz.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {assignments.length === 0 ? (
          <div className="glass-panel rounded-3xl p-20 text-center text-muted-foreground">Henüz atanmış bir ödev veya görev görünmüyor.</div>
        ) : (
          assignments.map((assignment, index) => {
            const submitted = (assignment.submissions?.length ?? 0) > 0;
            return (
              <motion.div
                key={assignment.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="glass-panel rounded-3xl p-6"
              >
                <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-bold text-slate-900">{assignment.title}</h3>
                      <div
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-bold uppercase ${
                          submitted ? "bg-green-500/10 text-green-500" : "bg-amber-500/10 text-amber-500"
                        }`}
                      >
                        {submitted ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        {submitted ? "Teslim Edildi" : "Bekliyor"}
                      </div>
                    </div>
                    <p className="max-w-3xl text-sm text-muted-foreground">{assignment.description || "Açıklama girilmemiş."}</p>
                    {assignment.due_date && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        Teslim tarihi: {new Date(assignment.due_date).toLocaleDateString("tr-TR")}
                      </div>
                    )}
                    {assignment.submissions?.[0]?.download_url ? (
                      <button
                        type="button"
                        onClick={() => void handleDownload(assignment.submissions![0])}
                        className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700"
                      >
                        <Download className="h-4 w-4" />
                        Teslim Dosyasini Indir
                      </button>
                    ) : null}
                  </div>

                  <button
                    onClick={() => setActiveAssignmentId(activeAssignmentId === assignment.id ? null : assignment.id)}
                    className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-slate-900 hover:opacity-90 transition"
                  >
                    <Upload className="h-4 w-4" />
                    {submitted ? "Teslimi Güncelle" : "Teslim Et"}
                  </button>
                </div>

                {activeAssignmentId === assignment.id && (
                  <div className="mt-6 space-y-4 border-t border-white/5 pt-6">
                    <input
                      type="text"
                      placeholder="Teslim başlığı (opsiyonel)"
                      value={form[assignment.id]?.title || ""}
                      onChange={(e) => updateForm(assignment.id, "title", e.target.value)}
                      className="w-full rounded-xl border border-border bg-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                    />
                    <textarea
                      rows={4}
                      placeholder="Teslim açıklaması"
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
                      className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {submitting === assignment.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Gönder
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
