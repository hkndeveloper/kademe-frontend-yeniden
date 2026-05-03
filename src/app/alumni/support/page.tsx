"use client";

import { FormEvent, useEffect, useState } from "react";
import { HeartHandshake, LifeBuoy, Loader2, MessageCircle, Send } from "lucide-react";
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
  created_at: string;
}

interface VolunteerApplication {
  id: number;
  status: string;
  created_at: string;
  opportunity?: {
    id: number;
    title: string;
    project?: {
      id: number;
      name: string;
      slug?: string;
    } | null;
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

export default function AlumniSupportPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [applications, setApplications] = useState<VolunteerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [form, setForm] = useState<TicketFormState>(initialForm);

  const loadData = async () => {
    try {
      const [ticketResponse, projectResponse, volunteerResponse] = await Promise.all([
        api.get<{ tickets: Ticket[] }>("/tickets"),
        api.get<{ projects: Project[] }>("/dashboard/projects"),
        api.get<{ my_applications: VolunteerApplication[] }>("/volunteer/opportunities"),
      ]);

      setTickets(ticketResponse.data.tickets ?? []);
      setProjects(projectResponse.data.projects ?? []);
      setApplications(volunteerResponse.data.my_applications ?? []);
    } catch (error) {
      console.error("Alumni destek verileri yuklenemedi", error);
      setErrorMessage("Destek ve gonulluluk verileri yuklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timer);
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
      setMessage("Destek talebi olusturuldu.");
      await loadData();
    } catch (error) {
      console.error("Alumni destek talebi olusturulamadi", error);
      setErrorMessage("Destek talebi olusturulamadi.");
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
      await api.post(`/tickets/${ticketId}/reply`, { message: replyMessage });
      setReplyMessage("");
      setMessage("Takip mesaji eklendi.");
      await loadData();
    } catch (error) {
      console.error("Alumni takip mesaji gonderilemedi", error);
      setErrorMessage("Takip mesaji gonderilemedi.");
    } finally {
      setReplyingTo(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-600/20 text-purple-400">
          <LifeBuoy className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-900">Destek ve Gonulluluk</h1>
          <p className="mt-1 text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Mezun destek talepleri ve gonulluluk basvurulari artik gercek backend akislariyla bagli
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="glass-panel rounded-3xl border-purple-500/20 bg-purple-500/5 p-8">
          <div className="mb-4 flex items-center gap-3">
            <HeartHandshake className="h-5 w-5 text-purple-400" />
            <h2 className="text-lg font-bold text-slate-900">Gonulluluk Ozeti</h2>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
            </div>
          ) : applications.length === 0 ? (
            <p className="text-sm leading-relaxed text-muted-foreground">
              Henuz acik gonulluluk ilanlarina yaptiginiz bir basvuru bulunmuyor. Gonulluluk ekranindan aktif ilanlara
              basvuru yapabilirsiniz.
            </p>
          ) : (
            <div className="space-y-4">
              {applications.slice(0, 3).map((application) => (
                <div key={application.id} className="rounded-2xl bg-white/5 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">{application.opportunity?.title || "Gonulluluk ilani"}</h3>
                    <span className="rounded-full bg-purple-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-purple-300">
                      {application.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{application.opportunity?.project?.name || "Genel gonulluluk kapsamı"}</p>
                  <p className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">
                    {new Date(application.created_at).toLocaleString("tr-TR")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <form onSubmit={(event) => void handleCreateTicket(event)} className="glass-panel rounded-3xl p-8">
          <div className="mb-6 flex items-center gap-3">
            <MessageCircle className="h-5 w-5 text-purple-400" />
            <h2 className="text-lg font-bold text-slate-900">Yeni Destek Talebi</h2>
          </div>

          <div className="space-y-4">
            <input
              type="text"
              placeholder="Konu"
              value={form.subject}
              onChange={(event) => setForm((prev) => ({ ...prev, subject: event.target.value }))}
              className="w-full rounded-xl border border-border bg-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
            <select
              value={form.category}
              onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
              className="w-full rounded-xl border border-border bg-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-500"
              required
            >
              <option value="general">Genel</option>
              <option value="certificate">Sertifika</option>
              <option value="career">Kariyer</option>
              <option value="volunteer">Gonulluluk</option>
              <option value="other">Diger</option>
            </select>
            <select
              value={form.project_id}
              onChange={(event) => setForm((prev) => ({ ...prev, project_id: event.target.value }))}
              className="w-full rounded-xl border border-border bg-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Ilgili proje secin (opsiyonel)</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <textarea
              rows={5}
              value={form.message}
              onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
              placeholder="Talebinizin detayini yazin"
              className="w-full rounded-xl border border-border bg-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-500"
              required
            />

            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Talebi Gonder
            </button>
          </div>
        </form>
      </div>

      {message && <div className="rounded-2xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-400">{message}</div>}
      {errorMessage && <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{errorMessage}</div>}

      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="glass-panel rounded-3xl p-16 text-center text-muted-foreground">Henuz destek kaydi bulunmuyor.</div>
        ) : (
          tickets.map((ticket) => (
            <div key={ticket.id} className="glass-panel rounded-3xl p-6">
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr,420px]">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-lg font-bold text-slate-900">{ticket.subject}</h3>
                    <span className="rounded-full bg-purple-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-purple-300">
                      {ticket.category}
                    </span>
                    <span className="rounded-full bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      {ticket.status}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{ticket.message}</p>
                  <p className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">{new Date(ticket.created_at).toLocaleString("tr-TR")}</p>
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Takip Mesaji
                  </label>
                  <textarea
                    rows={3}
                    value={replyingTo === ticket.id ? replyMessage : ""}
                    onChange={(event) => {
                      setReplyingTo(ticket.id);
                      setReplyMessage(event.target.value);
                    }}
                    placeholder="Talebinize ek not yazin"
                    className="w-full rounded-xl border border-border bg-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => void handleReply(ticket.id)}
                    disabled={replyingTo === ticket.id && !replyMessage.trim()}
                    className="flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {replyingTo === ticket.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Takip Mesaji Gonder
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
