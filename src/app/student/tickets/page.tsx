"use client";

import { FormEvent, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Download, LifeBuoy, Loader2, MessageSquare, Plus, Send, Upload } from "lucide-react";
import api from "@/lib/api/axios";

interface Project {
  id: number;
  name: string;
}

interface Ticket {
  id: number;
  subject: string;
  message: string;
  category: string;
  status: string;
  project_id?: number | null;
  created_at: string;
  replies?: TicketReply[];
}

interface TicketReply {
  id: number;
  message: string;
  created_at: string;
  attachment_path?: string | null;
  attachment_download_url?: string | null;
  user?: {
    name: string;
    surname: string;
    role: string;
  } | null;
}

interface TicketFormState {
  subject: string;
  category: string;
  project_id: string;
  message: string;
}

const initialForm: TicketFormState = {
  subject: "",
  category: "general",
  project_id: "",
  message: "",
};

export default function StudentTicketsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [replyAttachment, setReplyAttachment] = useState<File | null>(null);
  const [form, setForm] = useState<TicketFormState>(initialForm);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [ticketResponse, projectResponse] = await Promise.all([
        api.get<{ tickets: Ticket[] }>("/tickets"),
        api.get<{ projects: Project[] }>("/dashboard/projects"),
      ]);

      setTickets(ticketResponse.data.tickets ?? []);
      setProjects(projectResponse.data.projects ?? []);
    } catch (error) {
      console.error("Destek talepleri yuklenemedi", error);
      setErrorMessage("Destek talepleri yuklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData();
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  const handleCreateTicket = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      await api.post("/tickets", {
        subject: form.subject,
        category: form.category,
        project_id: form.project_id ? Number(form.project_id) : null,
        message: form.message,
      });

      setForm(initialForm);
      setMessage("Destek talebiniz basariyla olusturuldu.");
      await loadData();
    } catch (error) {
      console.error("Destek talebi olusturulamadi", error);
      setErrorMessage("Destek talebi olusturulamadi. Lutfen zorunlu alanlari kontrol edin.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (ticketId: number) => {
    if (!replyMessage.trim()) return;

    setReplyingTo(ticketId);
    setMessage(null);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("message", replyMessage);
      if (replyAttachment) {
        formData.append("attachment", replyAttachment);
      }

      await api.post(`/tickets/${ticketId}/reply`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setReplyMessage("");
      setReplyAttachment(null);
      setMessage("Takip mesaji eklendi.");
      await loadData();
    } catch (error) {
      console.error("Takip mesaji gonderilemedi", error);
      setErrorMessage("Takip mesaji gonderilemedi.");
    } finally {
      setReplyingTo(null);
    }
  };

  const handleDownloadReplyAttachment = async (reply: TicketReply) => {
    if (!reply.attachment_download_url) return;

    try {
      const response = await api.get(reply.attachment_download_url, { responseType: "blob" });
      const contentType = String(response.headers["content-type"] ?? "");

      if (contentType.includes("application/json")) {
        const payload = JSON.parse(await response.data.text()) as { download_url?: string; message?: string };
        if (payload.download_url) {
          window.open(payload.download_url, "_blank", "noopener,noreferrer");
          return;
        }
        throw new Error(payload.message ?? "Ek dosya indirilemedi.");
      }

      const blobUrl = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `destek_ek_${reply.id}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Ek dosya indirilemedi", error);
      setErrorMessage("Ek dosya indirilemedi.");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-primary">
          <LifeBuoy className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Destek Taleplerim</h1>
          <p className="text-sm text-muted-foreground">Koordinatorlugunuze yardim, belge veya destek talebi iletebilir; mevcut taleplerinizi takip edebilirsiniz.</p>
        </div>
      </div>

      <form onSubmit={(event) => void handleCreateTicket(event)} className="glass-panel rounded-3xl p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Plus className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Yeni Talep Olustur</h2>
            <p className="text-sm text-muted-foreground">Bu form dogrudan `/tickets` endpointine baglidir.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <input
            type="text"
            placeholder="Konu"
            value={form.subject}
            onChange={(event) => setForm((prev) => ({ ...prev, subject: event.target.value }))}
            className="rounded-xl border border-border bg-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
            required
          />
          <select
            value={form.category}
            onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
            className="rounded-xl border border-border bg-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
            required
          >
            <option value="general">Genel</option>
            <option value="resmi_evrak">Resmi Evrak</option>
            <option value="program">Program</option>
            <option value="teknik">Teknik</option>
            <option value="diger">Diger</option>
          </select>
          <select
            value={form.project_id}
            onChange={(event) => setForm((prev) => ({ ...prev, project_id: event.target.value }))}
            className="rounded-xl border border-border bg-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Ilgili proje secin (opsiyonel)</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <div className="rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
            Dosya ekleme backend routeunda yer almadigi icin bu turda metin tabanli talep ve takip mesaji akisi kuruldu.
          </div>
        </div>

        <textarea
          rows={5}
          value={form.message}
          onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
          placeholder="Talebinizin detayini yazin"
          className="mt-4 w-full rounded-xl border border-border bg-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
          required
        />

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Talebi Gonder
        </button>
      </form>

      {message && <div className="rounded-2xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-400">{message}</div>}
      {errorMessage && <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{errorMessage}</div>}

      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="glass-panel rounded-3xl p-16 text-center text-muted-foreground">Henuz olusturulmus destek talebiniz bulunmuyor.</div>
        ) : (
          tickets.map((ticket, index) => (
            <motion.div
              key={ticket.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className="glass-panel rounded-3xl p-6"
            >
              <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-lg font-bold">{ticket.subject}</h3>
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">{ticket.category}</span>
                    <span className="rounded-full bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{ticket.status}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{ticket.message}</p>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">{new Date(ticket.created_at).toLocaleString("tr-TR")}</p>
                  {ticket.replies?.length ? (
                    <div className="mt-4 space-y-2 border-l-2 border-border pl-4">
                      {ticket.replies.map((reply) => (
                        <div key={reply.id} className="rounded-xl bg-muted/40 p-3">
                          <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            {reply.user ? `${reply.user.name} ${reply.user.surname}` : "Kullanici"} / {new Date(reply.created_at).toLocaleString("tr-TR")}
                          </div>
                          <div className="text-sm text-muted-foreground">{reply.message}</div>
                          {reply.attachment_download_url ? (
                            <button
                              type="button"
                              onClick={() => void handleDownloadReplyAttachment(reply)}
                              className="mt-2 inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700"
                            >
                              <Download className="h-3.5 w-3.5" />
                              Ek Dosya
                            </button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="w-full max-w-md space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    <MessageSquare className="h-4 w-4" />
                    Takip Mesaji
                  </div>
                  <textarea
                    rows={3}
                    value={replyingTo === ticket.id ? replyMessage : ""}
                    onChange={(event) => {
                      setReplyingTo(ticket.id);
                      setReplyMessage(event.target.value);
                    }}
                    placeholder="Talebinize ek not yazin"
                    className="w-full rounded-xl border border-border bg-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                  />
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border bg-input px-4 py-3 text-sm text-muted-foreground">
                    <Upload className="h-4 w-4" />
                    <span className="truncate">{replyingTo === ticket.id && replyAttachment ? replyAttachment.name : "Ek dosya sec"}</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(event) => {
                        setReplyingTo(ticket.id);
                        setReplyAttachment(event.target.files?.[0] ?? null);
                      }}
                    />
                  </label>
                  <button
                    onClick={() => void handleReply(ticket.id)}
                    disabled={replyingTo === ticket.id && !replyMessage.trim()}
                    className="flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {replyingTo === ticket.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Takip Mesaji Gonder
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
