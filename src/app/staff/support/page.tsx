"use client";

import { FormEvent, useEffect, useState } from "react";
import { LifeBuoy, Loader2, MessageSquare, Plus, Send } from "lucide-react";
import api from "@/lib/api/axios";
import { ExportButtons } from "@/components/shared/ExportButtons";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { useAuth } from "@/store/useAuth";

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

export default function StaffSupportPage() {
  const { hasPermission } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [form, setForm] = useState<TicketFormState>(initialForm);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const canReplySupport = hasPermission("support.reply");

  const loadData = async () => {
    try {
      const [ticketResponse, projectResponse] = await Promise.all([
        api.get<{ tickets: Ticket[] }>("/tickets"),
        api.get<{ projects: Project[] }>("/projects"),
      ]);

      setTickets(ticketResponse.data.tickets ?? []);
      setProjects(projectResponse.data.projects ?? []);
    } catch (error) {
      console.error("Staff destek verileri yuklenemedi", error);
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
      setMessage("Destek talebi olusturuldu.");
      await loadData();
    } catch (error) {
      console.error("Staff destek talebi olusturulamadi", error);
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
      console.error("Staff takip mesaji gonderilemedi", error);
      setErrorMessage("Takip mesaji gonderilemedi.");
    } finally {
      setReplyingTo(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-500">
          <LifeBuoy className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-900">Destek Merkezi</h1>
          <p className="mt-1 text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Staff rolu icin mevcut destek akislarinin tamamı `/tickets` uzerinden calisiyor
          </p>
        </div>
        </div>
        <PermissionGate permission="support.export">
          <ExportButtons endpoint="/tickets/export" filename="personel_destek_kayitlari" buttonLabel="Destek Kayitlarini Disa Aktar" />
        </PermissionGate>
      </div>

      <PermissionGate
        permission="support.view"
        fallback={
        <div className="glass-panel rounded-3xl p-10 text-center text-sm text-muted-foreground">
          Bu modulu goruntulemek icin yetkiniz bulunmuyor.
        </div>
        }
      >
      {
      <>
      <form onSubmit={(event) => void handleCreateTicket(event)} className="glass-panel rounded-3xl p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
            <Plus className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Yeni Destek Kaydi</h2>
            <p className="text-sm text-muted-foreground">Bu ekran sahte ticket kartlari yerine dogrudan backend ticket endpointini kullanir.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <input
            type="text"
            placeholder="Konu"
            value={form.subject}
            onChange={(event) => setForm((prev) => ({ ...prev, subject: event.target.value }))}
            className="rounded-xl border border-border bg-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-500"
            required
          />
          <select
            value={form.category}
            onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
            className="rounded-xl border border-border bg-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-500"
            required
          >
            <option value="general">Genel</option>
            <option value="technical">Teknik</option>
            <option value="evrak">Evrak</option>
            <option value="program">Program</option>
            <option value="diger">Diger</option>
          </select>
          <select
            value={form.project_id}
            onChange={(event) => setForm((prev) => ({ ...prev, project_id: event.target.value }))}
            className="rounded-xl border border-border bg-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="">Ilgili proje secin (opsiyonel)</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <div className="rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
            Dosya ekleme routeu gorunmedigi icin bu turda metin tabanli destek ve takip mesaji akisi kuruldu.
          </div>
        </div>

        <textarea
          rows={5}
          value={form.message}
          onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
          placeholder="Talebinizin detayini yazin"
          className="mt-4 w-full rounded-xl border border-border bg-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-500"
          required
        />

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
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
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="glass-panel rounded-3xl p-16 text-center text-muted-foreground">Henuz destek kaydi bulunmuyor.</div>
        ) : (
          tickets.map((ticket) => (
            <div key={ticket.id} className="glass-panel rounded-3xl p-6">
              <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-lg font-bold text-slate-900">{ticket.subject}</h3>
                    <span className="rounded-full bg-amber-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-500">{ticket.category}</span>
                    <span className="rounded-full bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{ticket.status}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{ticket.message}</p>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">{new Date(ticket.created_at).toLocaleString("tr-TR")}</p>
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
                    placeholder="Talebe ek not yazin"
                    className="w-full rounded-xl border border-border bg-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  {canReplySupport && (
                    <button
                      onClick={() => void handleReply(ticket.id)}
                      disabled={replyingTo === ticket.id && !replyMessage.trim()}
                      className="flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {replyingTo === ticket.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Takip Mesaji Gonder
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      </>
      }
      </PermissionGate>
    </div>
  );
}
