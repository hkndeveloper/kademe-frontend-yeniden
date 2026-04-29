"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Filter,
  LifeBuoy,
  Loader2,
  Search,
  Send,
  UserPlus,
} from "lucide-react";
import api from "@/lib/api/axios";
import { ExportButtons } from "@/components/shared/ExportButtons";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { usePermissions } from "@/hooks/usePermissions";

interface TicketReply {
  id: number;
  message: string;
  created_at: string;
  user?: {
    name: string;
    surname: string;
    role: string;
  };
}

interface Ticket {
  id: number;
  subject: string;
  message: string;
  category: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  created_at: string;
  user?: {
    name: string;
    surname: string;
    email: string;
    role: string;
  };
  assignee?: {
    id: number;
    name: string;
    surname: string;
    role: string;
  };
  project?: { id: number; name?: string } | null;
  replies?: TicketReply[];
}

interface StaffUser {
  id: number;
  name: string;
  surname: string;
  role: string;
}

const statusLabels: Record<Ticket["status"], string> = {
  open: "Acik",
  in_progress: "Islemde",
  resolved: "Cozuldu",
  closed: "Kapali",
};

const statusClasses: Record<Ticket["status"], string> = {
  open: "bg-amber-500/10 text-amber-300",
  in_progress: "bg-blue-500/10 text-blue-300",
  resolved: "bg-emerald-500/10 text-emerald-300",
  closed: "bg-zinc-500/10 text-zinc-300",
};

export default function AdminSupportPage() {
  const { hasPermission, canAccessProject } = usePermissions();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [messageByTicket, setMessageByTicket] = useState<Record<number, string>>({});
  const [assigneeByTicket, setAssigneeByTicket] = useState<Record<number, string>>({});
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const ticketPromise = api.get("/panel/support/tickets", {
        params: {
          status: statusFilter || undefined,
          category: categoryFilter || undefined,
          search: search || undefined,
        },
      });
      const staffPromise = hasPermission("users.view")
        ? api.get("/panel/users")
        : hasPermission("support.assign")
          ? api.get<{ users: StaffUser[] }>("/panel/support/assignable-users")
          : Promise.resolve({ data: { users: [] as StaffUser[] } });

      const [ticketResponse, staffResponse] = await Promise.all([ticketPromise, staffPromise]);

      setTickets(ticketResponse.data.tickets?.data ?? []);
      const staffPayload = staffResponse.data.users;
      setStaff(
        Array.isArray(staffPayload)
          ? staffPayload
          : (staffPayload as { data?: StaffUser[] })?.data ?? []
      );
    } catch (error) {
      console.error("Support data could not be loaded", error);
      setErrorMessage("Destek kayitlari yuklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, hasPermission, search, statusFilter]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadData]);

  const canActOnTicket = (permission: string, ticket: Ticket) =>
    hasPermission(permission) && (!ticket.project?.id || canAccessProject(permission, ticket.project.id));

  const handleReply = async (ticketId: number) => {
    const message = messageByTicket[ticketId]?.trim();
    if (!message) return;

    setActionLoading(ticketId);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await api.post(`/tickets/${ticketId}/reply`, { message });
      setMessageByTicket((current) => ({ ...current, [ticketId]: "" }));
      setSuccessMessage("Yanit basariyla gonderildi.");
      await loadData();
    } catch (error) {
      console.error("Reply could not be sent", error);
      setErrorMessage("Yanit gonderilemedi.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleAssign = async (ticketId: number) => {
    const assignedTo = assigneeByTicket[ticketId];
    if (!assignedTo) return;

    setActionLoading(ticketId);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await api.put(`/panel/support/tickets/${ticketId}/assign`, {
        assigned_to: Number(assignedTo),
      });
      setSuccessMessage("Talep personele atandi.");
      await loadData();
    } catch (error) {
      console.error("Ticket could not be assigned", error);
      setErrorMessage("Atama yapilamadi.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleClose = async (ticketId: number) => {
    setActionLoading(ticketId);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await api.put(`/panel/support/tickets/${ticketId}/close`);
      setSuccessMessage("Talep kapatildi.");
      await loadData();
    } catch (error) {
      console.error("Ticket could not be closed", error);
      setErrorMessage("Talep kapatilamadi.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-400">
            <LifeBuoy className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Destek Merkezi</h1>
            <p className="mt-1 text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Kullanici ve ziyaretci taleplerinin merkezi yonetimi
            </p>
          </div>
        </div>
        <PermissionGate permission="support.export">
          <ExportButtons
            endpoint="/panel/support/tickets/export"
            filename="destek_kayitlari"
            params={{
              status: statusFilter || undefined,
              category: categoryFilter || undefined,
              search: search || undefined,
            }}
            buttonLabel="Kayitlari Disa Aktar"
          />
        </PermissionGate>
      </div>

      {(errorMessage || successMessage) && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            errorMessage
              ? "border-red-500/30 bg-red-500/10 text-red-200"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
          }`}
        >
          {errorMessage || successMessage}
        </div>
      )}

      <div className="glass-panel flex flex-col gap-4 rounded-3xl p-6 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && void loadData()}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none focus:border-indigo-500"
            placeholder="Konu, mesaj, ad veya e-posta ara"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500"
        >
          <option value="">Tum kategoriler</option>
          <option value="general">Genel</option>
          <option value="technical">Teknik</option>
          <option value="project">Proje</option>
        </select>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500"
        >
          <option value="">Tum durumlar</option>
          <option value="open">Acik</option>
          <option value="in_progress">Islemde</option>
          <option value="resolved">Cozuldu</option>
          <option value="closed">Kapali</option>
        </select>

        <button
          onClick={() => void loadData()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold uppercase tracking-widest text-white transition hover:bg-indigo-700"
        >
          <Filter className="h-4 w-4" />
          Filtrele
        </button>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="glass-panel rounded-3xl p-16 text-center text-muted-foreground">
            Destek talebi bulunamadi.
          </div>
        ) : (
          tickets.map((ticket) => (
            <div key={ticket.id} className="glass-panel rounded-3xl p-6">
              <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                <div className="flex-1 space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-lg font-bold text-slate-900">{ticket.subject}</h2>
                    <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${statusClasses[ticket.status]}`}>
                      {statusLabels[ticket.status]}
                    </span>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-900">
                      {ticket.category}
                    </span>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    <span className="font-bold text-indigo-300">
                      {ticket.user
                        ? `${ticket.user.name} ${ticket.user.surname}`
                        : "Ziyaretci"}
                    </span>
                    <span className="mx-2">•</span>
                    <span>{ticket.user?.email ?? "-"}</span>
                    <span className="mx-2">•</span>
                    <span>{new Date(ticket.created_at).toLocaleString("tr-TR")}</span>
                    {ticket.project?.name ? (
                      <>
                        <span className="mx-2">•</span>
                        <span className="font-bold text-emerald-300/90">{ticket.project.name}</span>
                      </>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border border-white/5 bg-black/30 p-4 text-sm text-gray-300">
                    {ticket.message}
                  </div>

                  {!!ticket.replies?.length && (
                    <div className="space-y-3 border-l-2 border-white/10 pl-4">
                      <div className="text-xs font-bold uppercase tracking-widest text-indigo-300">Yanitlar</div>
                      {ticket.replies.map((reply) => (
                        <div key={reply.id} className="rounded-xl bg-white/5 p-3">
                          <div className="mb-1 flex items-center justify-between text-[10px]">
                            <span className="font-bold text-indigo-300">
                              {reply.user ? `${reply.user.name} ${reply.user.surname}` : "Kullanici"}
                            </span>
                            <span className="text-muted-foreground">
                              {new Date(reply.created_at).toLocaleString("tr-TR")}
                            </span>
                          </div>
                          <div className="text-sm text-gray-300">{reply.message}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="w-full space-y-4 rounded-2xl border border-white/5 bg-white/5 p-4 xl:w-80">
                  <div>
                    <div className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      Gorevlendirme
                    </div>
                    <div className="flex gap-2">
                      <select
                        value={assigneeByTicket[ticket.id] ?? ""}
                        onChange={(event) =>
                          setAssigneeByTicket((current) => ({
                            ...current,
                            [ticket.id]: event.target.value,
                          }))
                        }
                        disabled={ticket.status === "closed" || !canActOnTicket("support.assign", ticket)}
                        className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 outline-none focus:border-indigo-500"
                      >
                        <option value="">
                          {ticket.assignee
                            ? `${ticket.assignee.name} ${ticket.assignee.surname}`
                            : "Personel sec"}
                        </option>
                        {staff.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.name} {member.surname}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => void handleAssign(ticket.id)}
                        disabled={
                          !assigneeByTicket[ticket.id] ||
                          actionLoading === ticket.id ||
                          ticket.status === "closed" ||
                          !canActOnTicket("support.assign", ticket)
                        }
                        className="rounded-xl bg-indigo-600 px-3 text-white transition hover:bg-indigo-700 disabled:opacity-50"
                        title="Ata"
                      >
                        {actionLoading === ticket.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <UserPlus className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      Yanitla
                    </div>
                    <textarea
                      rows={4}
                      value={messageByTicket[ticket.id] ?? ""}
                      onChange={(event) =>
                        setMessageByTicket((current) => ({
                          ...current,
                          [ticket.id]: event.target.value,
                        }))
                      }
                      disabled={ticket.status === "closed" || !canActOnTicket("support.reply", ticket)}
                      className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-900 outline-none focus:border-indigo-500"
                      placeholder="Mesajinizi yazin"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void handleReply(ticket.id)}
                      disabled={
                        !messageByTicket[ticket.id]?.trim() ||
                        actionLoading === ticket.id ||
                        ticket.status === "closed" ||
                        !canActOnTicket("support.reply", ticket)
                      }
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {actionLoading === ticket.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      Gonder
                    </button>

                    {ticket.status !== "closed" && (
                      <button
                        type="button"
                        onClick={() => void handleClose(ticket.id)}
                        disabled={actionLoading === ticket.id || !canActOnTicket("support.close", ticket)}
                        className="inline-flex items-center justify-center rounded-xl bg-red-500/15 px-4 text-red-300 transition hover:bg-red-500 hover:text-white disabled:opacity-50"
                        title="Talebi kapat"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
