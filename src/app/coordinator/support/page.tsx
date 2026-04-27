"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { LifeBuoy, Loader2, Search, Send, ShieldCheck } from "lucide-react";
import api from "@/lib/api/axios";
import { ExportButtons } from "@/components/shared/ExportButtons";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { useAuth } from "@/store/useAuth";

interface Project {
  id: number;
  name: string;
}

interface Reply {
  id: number;
  message: string;
  created_at?: string;
  user?: { name: string; surname: string; role: string } | null;
}

interface Ticket {
  id: number;
  subject: string;
  message: string;
  category: string;
  status: string;
  project_id?: number | null;
  created_at: string;
  project?: { id: number; name: string } | null;
  user?: { name: string; surname: string; email: string; role: string } | null;
  assignee?: { name: string; surname: string; role: string } | null;
  replies?: Reply[];
}

interface TicketListResponse {
  tickets: {
    data: Ticket[];
  };
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

export default function CoordinatorSupportPage() {
  const { hasPermission } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [form, setForm] = useState<TicketFormState>(initialForm);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const canReplySupport = hasPermission("support.reply");
  const canCloseSupport = hasPermission("support.close");

  const loadData = useCallback(async () => {
    try {
      const [ticketResponse, projectResponse] = await Promise.all([
        api.get<TicketListResponse>("/admin/support/tickets", {
          params: {
            search: search || undefined,
            status: statusFilter === "all" ? undefined : statusFilter,
            project_id: projectFilter === "all" ? undefined : Number(projectFilter),
          },
        }),
        api.get<{ projects: Project[] }>("/admin/projects/manageable"),
      ]);

      setTickets(ticketResponse.data.tickets?.data ?? []);
      setProjects(projectResponse.data.projects ?? []);
    } catch (error) {
      console.error("Koordinator destek verileri yuklenemedi", error);
      setErrorMessage("Destek kayitlari yuklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [projectFilter, search, statusFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadData]);

  const summary = useMemo(() => {
    return {
      total: tickets.length,
      open: tickets.filter((ticket) => ticket.status === "open").length,
      inProgress: tickets.filter((ticket) => ticket.status === "in_progress").length,
      closed: tickets.filter((ticket) => ticket.status === "closed").length,
    };
  }, [tickets]);

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
      setMessage("Destek kaydi olusturuldu.");
      await loadData();
    } catch (error) {
      console.error("Koordinator destek kaydi olusturulamadi", error);
      setErrorMessage("Destek kaydi olusturulamadi.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (ticketId: number) => {
    if (!replyMessage.trim()) {
      return;
    }

    setReplyingTo(ticketId);
    setMessage(null);
    setErrorMessage(null);

    try {
      await api.post(`/tickets/${ticketId}/reply`, { message: replyMessage });
      setReplyMessage("");
      setMessage("Takip mesaji eklendi.");
      await loadData();
    } catch (error) {
      console.error("Koordinator takip mesaji gonderilemedi", error);
      setErrorMessage("Takip mesaji gonderilemedi.");
    } finally {
      setReplyingTo(null);
    }
  };

  const handleClose = async (ticketId: number) => {
    try {
      await api.put(`/admin/support/tickets/${ticketId}/close`);
      setMessage("Destek kaydi kapatildi.");
      await loadData();
    } catch (error) {
      console.error("Destek kaydi kapatilamadi", error);
      setErrorMessage("Destek kaydi kapatilamadi.");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/20 text-accent">
            <LifeBuoy className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900">Destek</h1>
            <p className="mt-1 text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Kendi proje havuzundaki destek taleplerini gor, cevapla ve kapat
            </p>
          </div>
        </div>
        <PermissionGate permission="support.export">
          <ExportButtons
            endpoint="/admin/support/tickets/export"
            filename="koordinator_destek"
            params={{
              search: search || undefined,
              status: statusFilter !== "all" ? statusFilter : undefined,
              project_id: projectFilter !== "all" ? projectFilter : undefined,
            }}
            buttonLabel="Destek Kayitlarini Disa Aktar"
          />
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
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <div className="glass-panel rounded-3xl p-6">
          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Toplam</div>
          <div className="mt-2 text-3xl font-black text-slate-900">{summary.total}</div>
        </div>
        <div className="glass-panel rounded-3xl p-6">
          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Acik</div>
          <div className="mt-2 text-3xl font-black text-slate-900">{summary.open}</div>
        </div>
        <div className="glass-panel rounded-3xl p-6">
          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Islemde</div>
          <div className="mt-2 text-3xl font-black text-slate-900">{summary.inProgress}</div>
        </div>
        <div className="glass-panel rounded-3xl p-6">
          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Kapatildi</div>
          <div className="mt-2 text-3xl font-black text-slate-900">{summary.closed}</div>
        </div>
      </div>

      <form onSubmit={(event) => void handleCreateTicket(event)} className="glass-panel rounded-3xl p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Yeni Destek Kaydi</h2>
            <p className="text-sm text-muted-foreground">Koordinatorluk icinden yeni destek veya operasyon kaydi olustur.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <input
            type="text"
            placeholder="Konu"
            value={form.subject}
            onChange={(event) => setForm((prev) => ({ ...prev, subject: event.target.value }))}
            className="rounded-xl border border-border bg-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-accent"
            required
          />
          <select
            value={form.category}
            onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
            className="rounded-xl border border-border bg-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-accent"
            required
          >
            <option value="general">Genel</option>
            <option value="program">Program</option>
            <option value="ogrenci">Ogrenci</option>
            <option value="evrak">Evrak</option>
            <option value="career">Kariyer</option>
            <option value="other">Diger</option>
          </select>
          <select
            value={form.project_id}
            onChange={(event) => setForm((prev) => ({ ...prev, project_id: event.target.value }))}
            className="rounded-xl border border-border bg-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="">Ilgili proje secin (opsiyonel)</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

        <textarea
          rows={5}
          value={form.message}
          onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
          placeholder="Detaylari yazin"
          className="mt-4 w-full rounded-xl border border-border bg-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-accent"
          required
        />

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-bold text-accent-foreground disabled:opacity-60"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Kaydi Gonder
        </button>
      </form>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr,220px,220px]">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Konu, mesaj veya kisi ara..."
            className="w-full rounded-xl border border-border bg-input py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="rounded-xl border border-border bg-input px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        >
          <option value="all">Tum durumlar</option>
          <option value="open">Acik</option>
          <option value="in_progress">Islemde</option>
          <option value="closed">Kapatildi</option>
        </select>
        <select
          value={projectFilter}
          onChange={(event) => setProjectFilter(event.target.value)}
          className="rounded-xl border border-border bg-input px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        >
          <option value="all">Tum projeler</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>

      {message && <div className="rounded-2xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-400">{message}</div>}
      {errorMessage && <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{errorMessage}</div>}

      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="glass-panel rounded-3xl p-16 text-center text-muted-foreground">Bu kapsamda destek kaydi bulunmuyor.</div>
        ) : (
          tickets.map((ticket) => (
            <div key={ticket.id} className="glass-panel rounded-3xl p-6">
              <div className="flex flex-col gap-5">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-lg font-bold text-slate-900">{ticket.subject}</h3>
                    <span className="rounded-full bg-accent/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-accent">{ticket.category}</span>
                    <span className="rounded-full bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{ticket.status}</span>
                    {ticket.project?.name ? (
                      <span className="rounded-full bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        {ticket.project.name}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground">{ticket.message}</p>
                  <div className="flex flex-wrap gap-4 text-xs uppercase tracking-widest text-muted-foreground">
                    <span>{new Date(ticket.created_at).toLocaleString("tr-TR")}</span>
                    {ticket.user ? <span>Talep sahibi: {ticket.user.name} {ticket.user.surname}</span> : null}
                    {ticket.assignee ? <span>Atanan: {ticket.assignee.name} {ticket.assignee.surname}</span> : null}
                  </div>
                </div>

                {ticket.replies?.length ? (
                  <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
                    <div className="mb-3 text-xs font-bold uppercase tracking-widest text-accent">Son Yanitlar</div>
                    <div className="space-y-3">
                      {ticket.replies.slice(-3).map((reply) => (
                        <div key={reply.id} className="rounded-xl bg-black/10 p-3 text-sm text-muted-foreground">
                          <div className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-900">
                            {reply.user ? `${reply.user.name} ${reply.user.surname}` : "Kullanici"}
                          </div>
                          <div>{reply.message}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr,auto,auto]">
                  <textarea
                    rows={3}
                    value={replyingTo === ticket.id ? replyMessage : ""}
                    onChange={(event) => {
                      setReplyingTo(ticket.id);
                      setReplyMessage(event.target.value);
                    }}
                    placeholder="Talebe ek not yazin"
                    className="w-full rounded-xl border border-border bg-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-accent"
                  />
                  {canReplySupport && (
                    <button
                      onClick={() => void handleReply(ticket.id)}
                      disabled={replyingTo === ticket.id && !replyMessage.trim()}
                      className="flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-semibold transition-colors hover:bg-muted disabled:opacity-60"
                    >
                      {replyingTo === ticket.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Yanitla
                    </button>
                  )}
                  {canCloseSupport && (
                    <button
                      onClick={() => void handleClose(ticket.id)}
                      disabled={ticket.status === "closed"}
                      className="rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm font-semibold text-green-300 disabled:opacity-50"
                    >
                      Kaydi Kapat
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
