"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Download,
  Filter,
  LifeBuoy,
  Loader2,
  Search,
  Send,
  Upload,
  UserPlus,
  Pencil,
  RotateCcw,
  Save,
  Plus,
  X,
} from "lucide-react";
import api from "@/lib/api/axios";
import { ExportButtons } from "@/components/shared/ExportButtons";
import { defaultPeriodIdForProject, periodHasWriteCapability, periodOptionById, PeriodArchiveModeNotice, periodsForProject, type PeriodOption } from "@/components/shared/ProjectPeriodFilters";
import { usePermissions } from "@/hooks/usePermissions";
import { optionalPanelRequest, panelLoadErrorMessage } from "@/lib/panel-load-state";

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
  };
}

interface Ticket {
  id: number;
  subject: string;
  message: string;
  category: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  created_at: string;
  attachment_path?: string | null;
  attachment_download_url?: string | null;
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
  assigned_unit?: { id: number; name: string; code: string; kind: "project" | "service" } | null;
  assigned_unit_id?: number | null;
  can_update?: boolean;
  can_reopen?: boolean;
  can_assign?: boolean;
  can_reply?: boolean;
  can_close?: boolean;
  project?: { id: number; name?: string } | null;
  period?: PeriodOption | null;
  replies?: TicketReply[];
}

interface Project {
  id: number;
  name: string;
  periods?: PeriodOption[];
  active_period?: PeriodOption | null;
}

interface StaffUser {
  id: number;
  name: string;
  surname: string;
  role: string;
}

interface AssignmentUnit {
  id: number;
  code: string;
  name: string;
  kind: "project" | "service";
  project_id?: number | null;
  members: Array<{
    user_id: number;
    membership_id: number;
    name: string;
    surname: string;
    role: string;
    position: "coordinator" | "staff";
  }>;
}

const statusLabels: Record<Ticket["status"], string> = {
  open: "Acik",
  in_progress: "Islemde",
  resolved: "Cozuldu",
  closed: "Kapali",
};

const statusClasses: Record<Ticket["status"], string> = {
  open: "panel-chip-info",
  in_progress: "panel-chip-info",
  resolved: "panel-chip-success",
  closed: "panel-chip-danger",
};

export default function AdminSupportPage() {
  const { hasPermission, hasScopedPermission, canAccessProject } = usePermissions();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [assignmentUnits, setAssignmentUnits] = useState<AssignmentUnit[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [createProjects, setCreateProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [filterProjectId, setFilterProjectId] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("project_id") ?? "";
  });
  const [filterPeriodId, setFilterPeriodId] = useState(() => {
    if (typeof window === "undefined") return "all";
    return new URLSearchParams(window.location.search).get("period_id") ?? "all";
  });
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [messageByTicket, setMessageByTicket] = useState<Record<number, string>>({});
  const [attachmentByTicket, setAttachmentByTicket] = useState<Record<number, File | null>>({});
  const [assigneeByTicket, setAssigneeByTicket] = useState<Record<number, string>>({});
  const [assignedUnitByTicket, setAssignedUnitByTicket] = useState<Record<number, string>>({});
  const [editingTicketId, setEditingTicketId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ subject: "", category: "", message: "" });
  const [createOpen, setCreateOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState({ subject: "", category: "general", message: "", project_id: "", period_id: "" });
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const filterProject = useMemo(
    () => projects.find((project) => String(project.id) === filterProjectId),
    [filterProjectId, projects]
  );
  const filterPeriods = useMemo(() => periodsForProject(filterProject), [filterProject]);
  const canCreateSupport = hasScopedPermission("support.create");
  const canViewSupport = hasScopedPermission("support.view");
  const createProject = useMemo(
    () => createProjects.find((project) => String(project.id) === createForm.project_id),
    [createForm.project_id, createProjects],
  );
  const createPeriods = useMemo(() => periodsForProject(createProject), [createProject]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const ticketPromise = canViewSupport
        ? api.get("/panel/support/tickets", {
            params: {
              status: statusFilter || undefined,
              category: categoryFilter || undefined,
              project_id: filterProjectId || undefined,
              period_id: filterPeriodId !== "all" ? filterPeriodId : undefined,
              search: search || undefined,
            },
          })
        : Promise.resolve({ data: { tickets: { data: [] as Ticket[] }, assignment_units: [] as AssignmentUnit[] } });
      const projectPromise = canViewSupport
        ? optionalPanelRequest(
            api.get<{ projects: Project[] }>("/panel/projects/manageable", {
              params: { permission: "support.view" },
            }),
            { data: { projects: [] as Project[] } },
            "Destek proje filtresi",
          )
        : Promise.resolve({ data: { projects: [] as Project[] } });
      const createProjectPromise = canCreateSupport
        ? optionalPanelRequest(
            api.get<{ projects: Project[] }>("/panel/projects/manageable", {
              params: { permission: "support.create" },
            }),
            { data: { projects: [] as Project[] } },
            "Destek oluşturma proje listesi",
          )
        : Promise.resolve({ data: { projects: [] as Project[] } });
      const staffPromise = canViewSupport && hasPermission("users.view")
        ? optionalPanelRequest(
            api.get("/panel/users"),
            { data: { users: [] as StaffUser[] } },
            "Destek atanabilir kişi listesi",
          )
        : canViewSupport && hasScopedPermission("support.assign")
          ? optionalPanelRequest(
              api.get<{ users: StaffUser[] }>("/panel/support/assignable-users"),
              { data: { users: [] as StaffUser[] } },
              "Destek atanabilir kişi listesi",
            )
          : Promise.resolve({ data: { users: [] as StaffUser[] } });

      const [ticketResponse, projectResponse, createProjectResponse, staffResponse] = await Promise.all([ticketPromise, projectPromise, createProjectPromise, staffPromise]);

      setTickets(ticketResponse.data.tickets?.data ?? []);
      setAssignmentUnits(ticketResponse.data.assignment_units ?? []);
      setProjects(projectResponse.data.projects ?? []);
      setCreateProjects(createProjectResponse.data.projects ?? []);
      const staffPayload = staffResponse.data.users;
      setStaff(
        Array.isArray(staffPayload)
          ? staffPayload
          : (staffPayload as { data?: StaffUser[] })?.data ?? []
      );
    } catch (error) {
      console.error("Support data could not be loaded", error);
      setErrorMessage(panelLoadErrorMessage(error, "Destek kayıtları"));
    } finally {
      setLoading(false);
    }
  }, [canCreateSupport, canViewSupport, categoryFilter, filterPeriodId, filterProjectId, hasPermission, hasScopedPermission, search, statusFilter]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadData]);

  const canActOnTicket = (permission: string, ticket: Ticket) => {
    const recordCapability: Record<string, boolean | undefined> = {
      "support.assign": ticket.can_assign,
      "support.reply": ticket.can_reply,
      "support.close": ticket.can_close,
      "support.update": ticket.can_update,
      "support.reopen": ticket.can_reopen,
    };

    if (recordCapability[permission] !== undefined) {
      return Boolean(recordCapability[permission]);
    }

    return hasPermission(permission) && (!ticket.project?.id || canAccessProject(permission, ticket.project.id));
  };

  const handleCreateSupport = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canCreateSupport) return;

    setCreateSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      await api.post("/panel/support/tickets", {
        subject: createForm.subject,
        category: createForm.category,
        message: createForm.message,
        project_id: createForm.project_id ? Number(createForm.project_id) : null,
        period_id: createForm.period_id ? Number(createForm.period_id) : null,
      });
      setCreateForm({ subject: "", category: "general", message: "", project_id: "", period_id: "" });
      setCreateOpen(false);
      setSuccessMessage("Destek kaydı oluşturuldu.");
      await loadData();
    } catch (error) {
      console.error("Support ticket could not be created", error);
      setErrorMessage("Destek kaydı oluşturulamadı. Alanları ve proje kapsamını kontrol edin.");
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleReply = async (ticketId: number) => {
    const message = messageByTicket[ticketId]?.trim();
    if (!message) return;

    setActionLoading(ticketId);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const formData = new FormData();
      formData.append("message", message);
      if (attachmentByTicket[ticketId]) {
        formData.append("attachment", attachmentByTicket[ticketId] as File);
      }

      await api.post(`/panel/support/tickets/${ticketId}/reply`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMessageByTicket((current) => ({ ...current, [ticketId]: "" }));
      setAttachmentByTicket((current) => ({ ...current, [ticketId]: null }));
      setSuccessMessage("Yanit basariyla gonderildi.");
      await loadData();
    } catch (error) {
      console.error("Reply could not be sent", error);
      setErrorMessage("Yanit gonderilemedi.");
    } finally {
      setActionLoading(null);
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

  const handleDownloadTicketAttachment = async (ticket: Ticket) => {
    if (!ticket.attachment_download_url) return;

    try {
      const response = await api.get(ticket.attachment_download_url, { responseType: "blob" });
      const contentType = String(response.headers["content-type"] ?? "");

      if (contentType.includes("application/json")) {
        const payload = JSON.parse(await response.data.text()) as { download_url?: string; message?: string };
        if (payload.download_url) {
          window.open(payload.download_url, "_blank", "noopener,noreferrer");
          return;
        }
        throw new Error(payload.message ?? "Talep eki indirilemedi.");
      }

      const blobUrl = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `destek_talebi_ek_${ticket.id}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Talep eki indirilemedi", error);
      setErrorMessage("Talep eki indirilemedi.");
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
        assigned_unit_id: assignedUnitByTicket[ticketId] ? Number(assignedUnitByTicket[ticketId]) : null,
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

  const handleReopen = async (ticketId: number) => {
    setActionLoading(ticketId);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      await api.put(`/panel/support/tickets/${ticketId}/reopen`);
      setSuccessMessage("Destek kaydi yeniden acildi.");
      await loadData();
    } catch (error) {
      console.error("Ticket could not be reopened", error);
      setErrorMessage("Destek kaydi yeniden acilamadi.");
    } finally {
      setActionLoading(null);
    }
  };

  const beginEdit = (ticket: Ticket) => {
    setEditingTicketId(ticket.id);
    setEditForm({ subject: ticket.subject, category: ticket.category, message: ticket.message });
  };

  const handleUpdate = async (ticketId: number) => {
    setActionLoading(ticketId);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      await api.patch(`/panel/support/tickets/${ticketId}`, editForm);
      setEditingTicketId(null);
      setSuccessMessage("Destek kaydi guncellendi.");
      await loadData();
    } catch (error) {
      console.error("Ticket could not be updated", error);
      setErrorMessage("Destek kaydi guncellenemedi.");
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
        <div className="flex flex-wrap gap-2">
          {canCreateSupport ? (
            <button type="button" onClick={() => setCreateOpen((current) => !current)} className="panel-button panel-button-primary">
              {createOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {createOpen ? "Formu Kapat" : "Yeni Destek Kaydı"}
            </button>
          ) : null}
          {canViewSupport && hasScopedPermission("support.export") ? (
            <ExportButtons
              endpoint="/panel/support/tickets/export"
              filename="destek_kayitlari"
              params={{
                status: statusFilter || undefined,
                category: categoryFilter || undefined,
                project_id: filterProjectId || undefined,
                period_id: filterPeriodId !== "all" ? filterPeriodId : undefined,
                search: search || undefined,
              }}
              buttonLabel="Kayitlari Disa Aktar"
            />
          ) : null}
        </div>
      </div>

      {createOpen && canCreateSupport ? (
        <form onSubmit={(event) => void handleCreateSupport(event)} className="panel-section-card space-y-5">
          <div>
            <h2 className="text-lg font-black text-slate-900">Yeni Destek Kaydı</h2>
            <p className="mt-1 text-sm text-slate-500">Kendi biriminiz adına teknik veya genel destek kaydı oluşturun. Proje seçimi isteğe bağlıdır.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="panel-field">
              <span className="panel-label">Konu</span>
              <input value={createForm.subject} onChange={(event) => setCreateForm((current) => ({ ...current, subject: event.target.value }))} className="panel-control" required maxLength={255} />
            </label>
            <label className="panel-field">
              <span className="panel-label">Kategori</span>
              <select value={createForm.category} onChange={(event) => setCreateForm((current) => ({ ...current, category: event.target.value }))} className="panel-control">
                <option value="general">Genel</option>
                <option value="technical">Teknik</option>
                <option value="access">Erişim / yetki</option>
              </select>
            </label>
            <label className="panel-field">
              <span className="panel-label">Proje (isteğe bağlı)</span>
              <select
                value={createForm.project_id}
                onChange={(event) => {
                  const project = createProjects.find((item) => String(item.id) === event.target.value);
                  setCreateForm((current) => ({
                    ...current,
                    project_id: event.target.value,
                    period_id: event.target.value ? defaultPeriodIdForProject(project) : "",
                  }));
                }}
                className="panel-control"
              >
                <option value="">Genel destek</option>
                {createProjects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
              </select>
            </label>
            <label className="panel-field">
              <span className="panel-label">Dönem (isteğe bağlı)</span>
              <select value={createForm.period_id} onChange={(event) => setCreateForm((current) => ({ ...current, period_id: event.target.value }))} disabled={!createForm.project_id} className="panel-control">
                <option value="">Dönem seçilmedi</option>
                {createPeriods.map((period) => <option key={period.id} value={period.id}>{period.name}</option>)}
              </select>
            </label>
          </div>
          <label className="panel-field">
            <span className="panel-label">Açıklama</span>
            <textarea value={createForm.message} onChange={(event) => setCreateForm((current) => ({ ...current, message: event.target.value }))} className="panel-control min-h-28" required />
          </label>
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={createSubmitting} className="panel-button panel-button-primary">
              {createSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Kaydı Oluştur
            </button>
            <button type="button" onClick={() => setCreateOpen(false)} className="panel-button">Vazgeç</button>
          </div>
        </form>
      ) : null}

      {(errorMessage || successMessage) && (
        <div
          className={`panel-notice ${
            errorMessage
              ? "panel-notice-error"
              : "panel-notice-success"
          }`}
        >
          {errorMessage || successMessage}
        </div>
      )}

      {canViewSupport ? <>
      <div className="panel-filter-card grid grid-cols-1 gap-3 lg:grid-cols-[1.2fr_0.9fr_0.9fr_0.8fr_0.8fr_auto] lg:items-end">
        <div className="relative flex-1">
          <Search className="panel-control-icon" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && void loadData()}
            className="panel-control pl-10"
            placeholder="Konu, mesaj, ad veya e-posta ara"
          />
        </div>

        <select
          value={filterProjectId}
          onChange={(event) => {
            const value = event.target.value;
            const project = projects.find((item) => String(item.id) === value);
            setFilterProjectId(value);
            setFilterPeriodId(value ? defaultPeriodIdForProject(project) || "all" : "all");
          }}
          className="panel-control"
        >
          <option value="">Tum projeler</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>

        <select
          value={filterPeriodId}
          onChange={(event) => setFilterPeriodId(event.target.value)}
          disabled={!filterProjectId || filterPeriods.length === 0}
          className="panel-control"
        >
          <option value="all">{filterProjectId ? "Tum donemler" : "Proje secince donem"}</option>
          {filterPeriods.map((period) => (
            <option key={period.id} value={period.id}>
              {period.name}
              {period.status === "active" ? " (aktif)" : period.status === "completed" ? " (tamamlandi)" : ""}
            </option>
          ))}
        </select>

        <select
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          className="panel-control"
        >
          <option value="">Tum kategoriler</option>
          <option value="general">Genel</option>
          <option value="technical">Teknik</option>
          <option value="project">Proje</option>
        </select>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="panel-control"
        >
          <option value="">Tum durumlar</option>
          <option value="open">Acik</option>
          <option value="in_progress">Islemde</option>
          <option value="resolved">Cozuldu</option>
          <option value="closed">Kapali</option>
        </select>

        <button
          onClick={() => void loadData()}
          className="panel-button panel-button-primary"
        >
          <Filter className="h-4 w-4" />
          Filtrele
        </button>
        <div className="lg:col-span-full"><PeriodArchiveModeNotice period={periodOptionById(projects, filterPeriodId)} /></div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="panel-empty-card py-16">
            Destek talebi bulunamadi.
          </div>
        ) : (
          tickets.map((ticket) => {
            const canResolveTicket = !ticket.period?.id || periodHasWriteCapability(periodOptionById(projects, ticket.period.id), "resolve_operations");
            return (
            <div key={ticket.id} className="panel-list-card">
              <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                <div className="flex-1 space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    {editingTicketId === ticket.id ? (
                      <input
                        value={editForm.subject}
                        onChange={(event) => setEditForm((current) => ({ ...current, subject: event.target.value }))}
                        className="panel-control max-w-xl"
                      />
                    ) : (
                      <h2 className="text-lg font-bold text-slate-900">{ticket.subject}</h2>
                    )}
                    <span className={`panel-chip ${statusClasses[ticket.status]}`}>
                      {statusLabels[ticket.status]}
                    </span>
                    <span className="panel-chip">
                      {ticket.category}
                    </span>
                    {ticket.can_update ? (
                      <button
                        type="button"
                        onClick={() => editingTicketId === ticket.id ? void handleUpdate(ticket.id) : beginEdit(ticket)}
                        disabled={actionLoading === ticket.id}
                        className="panel-card-action panel-card-action-primary py-1.5"
                      >
                        {editingTicketId === ticket.id ? <Save className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
                        {editingTicketId === ticket.id ? "Kaydet" : "Duzenle"}
                      </button>
                    ) : null}
                  </div>

                  <div className="text-xs text-muted-foreground">
                    <span className="font-bold text-indigo-700">
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
                        <span className="font-bold text-emerald-700">{ticket.project.name}</span>
                      </>
                    ) : null}
                    {ticket.period?.name ? (
                      <>
                        <span className="mx-2">•</span>
                        <span className="font-bold text-amber-700">{ticket.period.name}</span>
                      </>
                    ) : null}
                    {ticket.assigned_unit?.name ? (
                      <>
                        <span className="mx-2">•</span>
                        <span className="font-bold text-indigo-700">{ticket.assigned_unit.name}</span>
                      </>
                    ) : null}
                  </div>

                  {editingTicketId === ticket.id ? (
                    <div className="space-y-3">
                      <input
                        value={editForm.category}
                        onChange={(event) => setEditForm((current) => ({ ...current, category: event.target.value }))}
                        className="panel-control"
                        placeholder="Kategori"
                      />
                      <textarea
                        value={editForm.message}
                        onChange={(event) => setEditForm((current) => ({ ...current, message: event.target.value }))}
                        className="panel-textarea min-h-28"
                      />
                    </div>
                  ) : (
                    <div className="panel-card-muted">{ticket.message}</div>
                  )}

                  {ticket.attachment_download_url ? (
                    <button
                      type="button"
                      onClick={() => void handleDownloadTicketAttachment(ticket)}
                      className="panel-card-action panel-card-action-success py-1.5"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Talep Eki
                    </button>
                  ) : null}

                  {!!ticket.replies?.length && (
                    <div className="space-y-3 border-l-2 border-slate-200 pl-4">
                      <div className="text-xs font-bold uppercase tracking-widest text-indigo-700">Yanitlar</div>
                      {ticket.replies.map((reply) => (
                        <div key={reply.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <div className="mb-1 flex items-center justify-between text-[10px]">
                            <span className="font-bold text-indigo-700">
                              {reply.user ? `${reply.user.name} ${reply.user.surname}` : "Kullanici"}
                            </span>
                            <span className="text-muted-foreground">
                              {new Date(reply.created_at).toLocaleString("tr-TR")}
                            </span>
                          </div>
                          <div className="text-sm text-slate-600">{reply.message}</div>
                          {reply.attachment_download_url ? (
                            <button
                              type="button"
                              onClick={() => void handleDownloadReplyAttachment(reply)}
                              className="panel-card-action panel-card-action-success mt-2 py-1.5"
                            >
                              <Download className="h-3.5 w-3.5" />
                              Ek Dosya
                            </button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="panel-card-muted w-full space-y-4 xl:w-80">
                  <div>
                    <div className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      Gorevlendirme
                    </div>
                    <div className="space-y-2">
                      <select
                        value={assignedUnitByTicket[ticket.id] ?? String(ticket.assigned_unit_id ?? "")}
                        onChange={(event) => {
                          setAssignedUnitByTicket((current) => ({ ...current, [ticket.id]: event.target.value }));
                          setAssigneeByTicket((current) => ({ ...current, [ticket.id]: "" }));
                        }}
                        disabled={!canResolveTicket || ticket.status === "closed" || !canActOnTicket("support.assign", ticket)}
                        className="panel-control h-10 text-xs"
                      >
                        <option value="">Koordinatörlük sec</option>
                        {assignmentUnits.map((unit) => (
                          <option key={unit.id} value={unit.id}>{unit.name}</option>
                        ))}
                      </select>
                    <div className="flex gap-2">
                      <select
                        value={assigneeByTicket[ticket.id] ?? ""}
                        onChange={(event) =>
                          setAssigneeByTicket((current) => ({
                            ...current,
                            [ticket.id]: event.target.value,
                          }))
                        }
                        disabled={!canResolveTicket || ticket.status === "closed" || !canActOnTicket("support.assign", ticket)}
                        className="panel-control h-10 text-xs"
                      >
                        <option value="">
                          {ticket.assignee
                            ? `${ticket.assignee.name} ${ticket.assignee.surname}`
                            : "Personel sec"}
                        </option>
                        {(assignmentUnits.find((unit) => String(unit.id) === (assignedUnitByTicket[ticket.id] ?? String(ticket.assigned_unit_id ?? "")))?.members ?? staff).map((member) => (
                          <option key={"membership_id" in member ? member.membership_id : member.id} value={"user_id" in member ? member.user_id : member.id}>
                            {member.name} {member.surname}{"position" in member ? ` (${member.position === "coordinator" ? "Koordinatör" : "Personel"})` : ""}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => void handleAssign(ticket.id)}
                        disabled={
                          !assigneeByTicket[ticket.id] ||
                          actionLoading === ticket.id ||
                          !canResolveTicket ||
                          ticket.status === "closed" ||
                          !canActOnTicket("support.assign", ticket)
                        }
                        className="panel-button panel-button-primary px-3"
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
                      disabled={!canResolveTicket || ticket.status === "closed" || !canActOnTicket("support.reply", ticket)}
                      className="panel-textarea min-h-24 text-xs"
                      placeholder="Mesajinizi yazin"
                    />
                    <label className="panel-file-drop mt-2 flex cursor-pointer items-center justify-center gap-2 p-2.5 text-xs font-bold text-slate-700">
                      <Upload className="h-4 w-4 text-indigo-500" />
                      <span className="truncate">{attachmentByTicket[ticket.id]?.name ?? "Ek dosya sec"}</span>
                      <input
                        type="file"
                        className="hidden"
                        disabled={!canResolveTicket || ticket.status === "closed" || !canActOnTicket("support.reply", ticket)}
                        onChange={(event) =>
                          setAttachmentByTicket((current) => ({
                            ...current,
                            [ticket.id]: event.target.files?.[0] ?? null,
                          }))
                        }
                      />
                    </label>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void handleReply(ticket.id)}
                      disabled={
                        !messageByTicket[ticket.id]?.trim() ||
                        actionLoading === ticket.id ||
                        !canResolveTicket ||
                        ticket.status === "closed" ||
                        !canActOnTicket("support.reply", ticket)
                      }
                      className="panel-card-action panel-card-action-primary flex-1"
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
                        disabled={actionLoading === ticket.id || !canResolveTicket || !canActOnTicket("support.close", ticket)}
                        className="panel-card-action panel-card-action-danger px-4"
                        title="Talebi kapat"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                    )}
                    {ticket.status === "closed" && ticket.can_reopen ? (
                      <button
                        type="button"
                        onClick={() => void handleReopen(ticket.id)}
                        disabled={actionLoading === ticket.id || !canResolveTicket}
                        className="panel-card-action panel-card-action-primary px-4"
                        title="Destek kaydini yeniden ac"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Yeniden ac
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
            );
          })
        )}
      </div>
      </> : canCreateSupport ? (
        <div className="panel-empty-card py-10">
          Bu birimde destek kayıtlarını yönetme yetkisi yoktur. Yukarıdaki formdan yeni bir destek kaydı oluşturabilirsiniz.
        </div>
      ) : null}
    </div>
  );
}
