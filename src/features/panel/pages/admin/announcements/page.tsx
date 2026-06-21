"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, CheckCircle2, Download, FileText, Loader2, Mail, MessageSquare, Send, Users, X } from "lucide-react";
import api from "@/lib/api/axios";
import { ExportButtons } from "@/components/shared/ExportButtons";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { defaultPeriodIdForProject, periodsForProject, type PeriodOption } from "@/components/shared/ProjectPeriodFilters";
import { useAuth } from "@/store/useAuth";
import { usePermissions } from "@/hooks/usePermissions";

interface Project {
  id: number;
  name: string;
  periods?: PeriodOption[];
  active_period?: PeriodOption | null;
}

interface Announcement {
  id: number;
  title: string;
  content: string;
  category: string | null;
  target_roles: string[] | null;
  target_units: string[] | null;
  project?: { id: number; name: string } | null;
  period?: PeriodOption | null;
  creator?: { id: number; name: string; surname: string } | null;
  published_at: string;
}

interface CommunicationLog {
  id: number;
  type: "email" | "sms";
  recipients_count: number;
  subject?: string | null;
  attachment_path?: string | null;
  attachment_download_url?: string | null;
  status: string;
  created_at: string;
  project?: { id: number; name: string } | null;
  sender?: { id: number; name: string; surname: string } | null;
}

interface PaginatedLogs {
  data: CommunicationLog[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

const roleLabels: Record<string, string> = {
  super_admin: "Admin",
  coordinator: "Koordinator",
  staff: "Personel",
  student: "Ogrenci",
  alumni: "Mezun",
};

const targetUnitLabels: Record<string, string> = {
  media: "Medya / Tasarim",
  operations: "Operasyon",
  program: "Program / Proje",
  finance: "Finans",
  official_affairs: "Resmi Evrak",
};

const targetUnitAliases: Record<string, string[]> = {
  media: ["media", "medya", "icerik", "content", "tasarim", "design"],
  operations: ["operations", "operasyon", "lojistik", "logistics"],
  program: ["program", "proje", "project", "egitim", "education"],
  finance: ["finance", "finans", "mali", "muhasebe"],
  official_affairs: ["official_affairs", "official affairs", "resmi", "evrak", "idari"],
};

const normalizeUnit = (value?: string | null) =>
  (value ?? "")
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .trim();

export default function AdminAnnouncementsPage() {
  const { hasPermission } = useAuth();
  const user = useAuth((state) => state.user);
  const { canAccessProject, hasGlobalScope } = usePermissions();
  const [activeTab, setActiveTab] = useState<"list" | "new">("list");
  const [projects, setProjects] = useState<Project[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [communicationLogs, setCommunicationLogs] = useState<CommunicationLog[]>([]);
  const [logPage, setLogPage] = useState(1);
  const [logLastPage, setLogLastPage] = useState(1);
  const [logTotal, setLogTotal] = useState(0);
  const [logLoading, setLogLoading] = useState(false);
  const [logFilters, setLogFilters] = useState({
    search: "",
    type: "",
    status: "",
    project_id: "",
    date_from: "",
    date_to: "",
  });
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("Genel");
  const [filterProjectId, setFilterProjectId] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("project_id") ?? "";
  });
  const [filterPeriodId, setFilterPeriodId] = useState(() => {
    if (typeof window === "undefined") return "all";
    return new URLSearchParams(window.location.search).get("period_id") ?? "all";
  });
  const [projectId, setProjectId] = useState("");
  const [periodId, setPeriodId] = useState("");
  const [targetRoles, setTargetRoles] = useState<string[]>([]);
  const [targetUnits, setTargetUnits] = useState<string[]>([]);
  const [sendSms, setSendSms] = useState(false);
  const [sendEmail, setSendEmail] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const canViewAnnouncements = hasPermission("announcements.view");
  const canCreateAnnouncements = hasPermission("announcements.create");
  const canDeleteAnnouncements = hasPermission("announcements.delete");
  const canSendSms = hasPermission("announcements.send_sms");
  const canSendEmail = hasPermission("announcements.send_email");
  const filterProject = useMemo(
    () => projects.find((project) => String(project.id) === filterProjectId),
    [filterProjectId, projects]
  );
  const formProject = useMemo(
    () => projects.find((project) => String(project.id) === projectId),
    [projectId, projects]
  );
  const filterPeriods = useMemo(() => periodsForProject(filterProject), [filterProject]);
  const formPeriods = useMemo(() => periodsForProject(formProject), [formProject]);
  const availableTargetUnits = useMemo(() => {
    const units = Object.keys(targetUnitLabels);
    if (hasGlobalScope("announcements.create")) return units;

    const manageableUnit = normalizeUnit(user?.authorization_context?.manageable_unit ?? user?.department);
    if (!manageableUnit) return [];

    return units.filter((unit) =>
      (targetUnitAliases[unit] ?? [unit]).some((alias) => {
        const normalizedAlias = normalizeUnit(alias);
        return manageableUnit.includes(normalizedAlias) || normalizedAlias.includes(manageableUnit);
      })
    );
  }, [hasGlobalScope, user?.authorization_context?.manageable_unit, user?.department]);

  const loadAnnouncements = useCallback(async () => {
    setListLoading(true);
    setErrorMessage("");
    try {
      const res = await api.get("/panel/announcements", {
        params: {
          project_id: filterProjectId || undefined,
          period_id: filterPeriodId !== "all" ? filterPeriodId : undefined,
        },
      });
      const items = Array.isArray(res.data?.announcements?.data) ? res.data.announcements.data : [];
      setAnnouncements(items);
    } catch (error) {
      console.error("Duyurular yuklenemedi", error);
      setErrorMessage("Duyurular yuklenirken bir hata olustu.");
    } finally {
      setListLoading(false);
    }
  }, [filterPeriodId, filterProjectId]);

  const loadCommunicationLogs = useCallback(async (page = 1) => {
    if (!canViewAnnouncements) return;

    setLogLoading(true);
    try {
      const res = await api.get<{ logs: PaginatedLogs }>("/panel/announcements/communication-logs", {
        params: {
          page,
          per_page: 12,
          search: logFilters.search || undefined,
          type: logFilters.type || undefined,
          status: logFilters.status || undefined,
          project_id: logFilters.project_id || undefined,
          date_from: logFilters.date_from || undefined,
          date_to: logFilters.date_to || undefined,
        },
      });
      const logs = res.data.logs;
      setCommunicationLogs(logs?.data ?? []);
      setLogPage(logs?.current_page ?? 1);
      setLogLastPage(logs?.last_page ?? 1);
      setLogTotal(logs?.total ?? 0);
    } catch (error) {
      console.error("Gonderim loglari yuklenemedi", error);
      setCommunicationLogs([]);
    } finally {
      setLogLoading(false);
    }
  }, [canViewAnnouncements, logFilters]);

  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      setErrorMessage("");
      try {
        const [projectRes] = await Promise.all([
          hasPermission("announcements.view")
            ? api.get<{ projects: Project[] }>("/panel/projects/manageable", { params: { permission: "announcements.view" } })
            : Promise.resolve({ data: { projects: [] as Project[] } }),
          loadAnnouncements(),
          loadCommunicationLogs(1),
        ]);
        const raw = projectRes.data.projects ?? [];
        setProjects(
          raw.filter((p) => canAccessProject("announcements.create", p.id) || canAccessProject("announcements.view", p.id))
        );
      } catch (error) {
        console.error("Veriler yuklenemedi", error);
        setErrorMessage("Sayfa verileri yuklenirken bir hata olustu.");
      } finally {
        setLoading(false);
      }
    };

    void initData();
  }, [loadAnnouncements, loadCommunicationLogs, hasPermission, canAccessProject]);

  const canDeleteAnnouncement = (announcement: Announcement): boolean => {
    if (!canDeleteAnnouncements) return false;
    if (announcement.project?.id) return canAccessProject("announcements.delete", announcement.project.id);
    return hasGlobalScope("announcements.delete") || announcement.creator?.id === user?.id;
  };

  const resetForm = () => {
    setTitle("");
    setContent("");
    setCategory("Genel");
    setProjectId("");
    setPeriodId("");
    setTargetRoles([]);
    setTargetUnits([]);
    setSendSms(false);
    setSendEmail(false);
    setFile(null);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Duyuruyu silmek istediginize emin misiniz?")) return;

    setErrorMessage("");
    setSuccessMessage("");
    try {
      await api.delete(`/panel/announcements/${id}`);
      setSuccessMessage("Duyuru silindi.");
      await loadAnnouncements();
    } catch (error) {
      console.error("Duyuru silinemedi", error);
      setErrorMessage("Duyuru silinirken bir hata olustu.");
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      setErrorMessage("Baslik ve icerik zorunludur.");
      return;
    }

    if (!canCreateAnnouncements) {
      setErrorMessage("Duyuru olusturma yetkiniz yok.");
      return;
    }

    const projectIdNum = projectId ? parseInt(projectId, 10) : NaN;
    if (projectId && (Number.isNaN(projectIdNum) || !canAccessProject("announcements.create", projectIdNum))) {
      setErrorMessage("Secilen proje icin duyuru olusturma yetkiniz yok.");
      return;
    }

    setSubmitting(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("content", content.trim());
      if (category.trim()) formData.append("category", category.trim());
      if (projectId) formData.append("project_id", projectId);
      if (periodId) formData.append("period_id", periodId);
      targetRoles.forEach((role, index) => formData.append(`target_roles[${index}]`, role));
      targetUnits
        .filter((unit) => availableTargetUnits.includes(unit))
        .forEach((unit, index) => formData.append(`target_units[${index}]`, unit));
      formData.append("send_sms", sendSms ? "1" : "0");
      formData.append("send_email", sendEmail ? "1" : "0");
      if (file && sendEmail) {
        formData.append("email_attachment", file);
      }

      const response = await api.post<{
        message: string;
        target_count: number;
        email_sent_to?: number;
        sms_sent_to?: number;
      }>("/panel/announcements", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      resetForm();
      setActiveTab("list");
      const emailSentTo = Number(response.data.email_sent_to ?? 0);
      const smsSentTo = Number(response.data.sms_sent_to ?? 0);
      const targetCount = Number(response.data.target_count ?? 0);
      setSuccessMessage(
        `${response.data.message} (hedef: ${targetCount}, e-posta: ${emailSentTo}, sms: ${smsSentTo})`
      );
      await loadAnnouncements();
      await loadCommunicationLogs();
    } catch (error) {
      console.error("Duyuru gonderilemedi", error);
      setErrorMessage("Duyuru gonderilirken bir hata olustu.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleRole = (role: string) => {
    setTargetRoles((prev) => (prev.includes(role) ? prev.filter((item) => item !== role) : [...prev, role]));
  };

  const toggleTargetUnit = (unit: string) => {
    setTargetUnits((prev) => (prev.includes(unit) ? prev.filter((item) => item !== unit) : [...prev, unit]));
  };

  const handleDownloadAttachment = async (log: CommunicationLog) => {
    if (!log.attachment_download_url) return;

    try {
      const response = await api.get(log.attachment_download_url, { responseType: "blob" });
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
      link.download = `duyuru_eki_${log.id}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Ek dosya indirilemedi", error);
      setErrorMessage("Ek dosya indirilemedi.");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-400">
            <Bell className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Duyuru ve Iletisim</h1>
            <p className="mt-1 text-sm font-bold uppercase tracking-widest text-muted-foreground">
              E-posta, SMS ve sistem duyurulari
            </p>
          </div>
        </div>
        <PermissionGate permission="announcements.export">
          <ExportButtons
            endpoint="/panel/announcements/export"
            filename="duyurular"
            params={{
              project_id: filterProjectId || undefined,
              period_id: filterPeriodId !== "all" ? filterPeriodId : undefined,
            }}
            buttonLabel="Duyurulari Disa Aktar"
          />
        </PermissionGate>
      </div>

      {(successMessage || errorMessage) && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            errorMessage
              ? "border-red-500/20 bg-red-500/10 text-red-200"
              : "border-green-500/20 bg-green-500/10 text-green-200"
          }`}
        >
          {errorMessage || successMessage}
        </div>
      )}

      <PermissionGate permissions={["announcements.view", "announcements.create"]} require="any">
        <div className="flex space-x-1 rounded-2xl bg-black/40 p-1 md:w-max">
          <PermissionGate permission="announcements.view">
            <button
              onClick={() => setActiveTab("list")}
              className={`flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold transition-all ${
                activeTab === "list"
                  ? "bg-indigo-600 text-white shadow-lg"
                  : "text-muted-foreground hover:bg-white/5 hover:text-slate-900"
              }`}
            >
              <FileText className="h-4 w-4" />
              Duyuru Gecmisi
            </button>
          </PermissionGate>
          <PermissionGate permission="announcements.create">
            <button
              onClick={() => setActiveTab("new")}
              className={`flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold transition-all ${
                activeTab === "new"
                  ? "bg-indigo-600 text-white shadow-lg"
                  : "text-muted-foreground hover:bg-white/5 hover:text-slate-900"
              }`}
            >
              <Send className="h-4 w-4" />
              Yeni Gonderim
            </button>
          </PermissionGate>
        </div>
      </PermissionGate>

      <PermissionGate
        permissions={["announcements.view", "announcements.create"]}
        require="any"
        fallback={
        <div className="glass-panel rounded-3xl p-10 text-center text-sm text-muted-foreground">
          Bu modulu goruntulemek icin yetkiniz bulunmuyor.
        </div>
        }
      >
      {activeTab === "list" && canViewAnnouncements ? (
        <div className="space-y-6">
        <div className="glass-panel rounded-3xl p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Proje
              </span>
              <select
                value={filterProjectId}
                onChange={(e) => {
                  const value = e.target.value;
                  const project = projects.find((item) => String(item.id) === value);
                  setFilterProjectId(value);
                  setFilterPeriodId(value ? defaultPeriodIdForProject(project) || "all" : "all");
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">Tum projeler</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Donem
              </span>
              <select
                value={filterPeriodId}
                onChange={(e) => setFilterPeriodId(e.target.value)}
                disabled={!filterProjectId || filterPeriods.length === 0}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="all">{filterProjectId ? "Tum donemler" : "Proje secince donem filtrelenir"}</option>
                {filterPeriods.map((period) => (
                  <option key={period.id} value={period.id}>
                    {period.name}
                    {period.status === "active" ? " (aktif)" : period.status === "completed" ? " (tamamlandi)" : ""}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => void loadAnnouncements()}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-slate-700 transition hover:border-indigo-200 hover:text-indigo-700"
            >
              Yenile
            </button>
          </div>
        </div>
        <div className="glass-panel overflow-hidden rounded-3xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-muted-foreground">
              <thead className="border-b border-white/5 bg-white/5 text-xs font-bold uppercase tracking-widest text-slate-900">
                <tr>
                  <th className="px-6 py-4">Tarih</th>
                  <th className="px-6 py-4">Baslik</th>
                  <th className="px-6 py-4">Kategori / Proje</th>
                  <th className="px-6 py-4">Hedef Kitle</th>
                  <th className="px-6 py-4">Olusturan</th>
                  <th className="px-6 py-4 text-right">Islem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {listLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-400" />
                    </td>
                  </tr>
                ) : announcements.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                      Duyuru bulunamadi.
                    </td>
                  </tr>
                ) : (
                  announcements.map((announcement) => (
                    <tr key={announcement.id} className="transition-colors hover:bg-white/5">
                      <td className="px-6 py-4">{new Date(announcement.published_at).toLocaleDateString("tr-TR")}</td>
                      <td className="px-6 py-4">
                        <div className="line-clamp-1 font-bold text-slate-900">{announcement.title}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-slate-900">{announcement.category || "-"}</span>
                        <div className="text-[10px] uppercase text-indigo-400">
                          {announcement.project?.name || "Tumu"}
                        </div>
                        {announcement.period?.name ? (
                          <div className="mt-0.5 text-[10px] uppercase text-amber-500">
                            {announcement.period.name}
                            {announcement.period.status === "completed" ? " / arsiv" : ""}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {announcement.target_roles?.length || announcement.target_units?.length ? (
                            <>
                            {announcement.target_roles?.map((role) => (
                              <span
                                key={role}
                                className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase text-slate-900"
                              >
                                {roleLabels[role] || role}
                              </span>
                            ))}
                            {announcement.target_units?.map((unit) => (
                              <span
                                key={unit}
                                className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] uppercase text-indigo-700"
                              >
                                {targetUnitLabels[unit] || unit}
                              </span>
                            ))}
                            </>
                          ) : (
                            <span className="text-[10px]">Tumu</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {announcement.creator
                          ? `${announcement.creator.name} ${announcement.creator.surname}`
                          : "-"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {canDeleteAnnouncement(announcement) && (
                          <button
                            type="button"
                            onClick={() => handleDelete(announcement.id)}
                            className="inline-flex items-center justify-center rounded-lg bg-white/5 p-2 text-gray-400 transition-colors hover:bg-red-600 hover:text-white"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="glass-panel rounded-3xl p-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Gonderim Ekleri</h2>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Filtrelenebilir e-posta/SMS loglari</p>
            </div>
            <div className="flex items-center gap-2">
              <ExportButtons
                endpoint="/panel/announcements/communication-logs/export"
                filename="iletisim_loglari"
                params={{
                  search: logFilters.search || undefined,
                  type: logFilters.type || undefined,
                  status: logFilters.status || undefined,
                  project_id: logFilters.project_id || undefined,
                  date_from: logFilters.date_from || undefined,
                  date_to: logFilters.date_to || undefined,
                }}
                buttonLabel="Loglari Disa Aktar"
              />
              <button type="button" onClick={() => void loadCommunicationLogs(1)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700">
                Yenile
              </button>
            </div>
          </div>
          <div className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-6">
            <input
              value={logFilters.search}
              onChange={(e) => setLogFilters((prev) => ({ ...prev, search: e.target.value }))}
              placeholder="Konu / icerik ara"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 md:col-span-2"
            />
            <select
              value={logFilters.type}
              onChange={(e) => setLogFilters((prev) => ({ ...prev, type: e.target.value }))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900"
            >
              <option value="">Kanal: Tumu</option>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
            </select>
            <input
              value={logFilters.status}
              onChange={(e) => setLogFilters((prev) => ({ ...prev, status: e.target.value }))}
              placeholder="Durum (sent/failed/queued)"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900"
            />
            <select
              value={logFilters.project_id}
              onChange={(e) => setLogFilters((prev) => ({ ...prev, project_id: e.target.value }))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900"
            >
              <option value="">Proje: Tumu</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void loadCommunicationLogs(1)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"
              >
                Uygula
              </button>
              <button
                type="button"
                onClick={() => {
                  setLogFilters({
                    search: "",
                    type: "",
                    status: "",
                    project_id: "",
                    date_from: "",
                    date_to: "",
                  });
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"
              >
                Temizle
              </button>
            </div>
            <input
              type="date"
              value={logFilters.date_from}
              onChange={(e) => setLogFilters((prev) => ({ ...prev, date_from: e.target.value }))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900"
            />
            <input
              type="date"
              value={logFilters.date_to}
              onChange={(e) => setLogFilters((prev) => ({ ...prev, date_to: e.target.value }))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900"
            />
          </div>
          {logLoading ? (
            <div className="flex min-h-24 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
            </div>
          ) : communicationLogs.length === 0 ? (
            <div className="text-sm text-muted-foreground">Gonderim kaydi bulunamadi.</div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Toplam {logTotal} kayit
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {communicationLogs.map((log) => (
                <div key={log.id} className="rounded-2xl border border-white/5 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-slate-900">{log.subject || log.type.toUpperCase()}</div>
                      <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        {log.type} / {log.recipients_count} kisi / {new Date(log.created_at).toLocaleString("tr-TR")}
                      </div>
                      {log.project?.name ? <div className="mt-1 text-xs text-indigo-400">{log.project.name}</div> : null}
                    </div>
                    {log.attachment_download_url ? (
                      <button
                        type="button"
                        onClick={() => void handleDownloadAttachment(log)}
                        className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-indigo-600/20 px-3 py-2 text-xs font-bold text-indigo-300 transition-colors hover:bg-indigo-600 hover:text-white"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Ek
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
              </div>
              {logLastPage > 1 ? (
                <div className="flex items-center justify-between border-t border-white/5 pt-3">
                  <button
                    type="button"
                    disabled={logPage <= 1}
                    onClick={() => void loadCommunicationLogs(Math.max(1, logPage - 1))}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 disabled:opacity-50"
                  >
                    Onceki
                  </button>
                  <span className="text-xs font-bold text-muted-foreground">
                    {logPage} / {logLastPage}
                  </span>
                  <button
                    type="button"
                    disabled={logPage >= logLastPage}
                    onClick={() => void loadCommunicationLogs(logPage + 1)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 disabled:opacity-50"
                  >
                    Sonraki
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>
        </div>
      ) : null}

      {activeTab === "new" && canCreateAnnouncements && (
        <form onSubmit={handleSubmit} className="glass-panel rounded-3xl p-8 space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Duyuru Basligi
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500"
                placeholder="Orn: Yeni donem basvurulari basladi"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Kategori</label>
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Duyuru Icerigi</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              className="min-h-[150px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500"
              placeholder="Mesajinizi buraya yazin..."
            />
          </div>

          <div className="grid grid-cols-1 gap-8 border-t border-white/5 pt-6 md:grid-cols-2">
            <div className="space-y-4">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Users className="h-4 w-4 text-indigo-400" />
                Hedef Kitle
              </h3>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Proje Bazli Gonderim
                </label>
                <select
                  value={projectId}
                  onChange={(e) => {
                    const value = e.target.value;
                    const project = projects.find((item) => String(item.id) === value);
                    setProjectId(value);
                    setPeriodId(value ? defaultPeriodIdForProject(project) : "");
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500"
                >
                  <option value="">Tum Projeler</option>
                  {projects.filter((project) => canAccessProject("announcements.create", project.id)).map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Donem
                </label>
                <select
                  value={periodId}
                  onChange={(e) => setPeriodId(e.target.value)}
                  disabled={!projectId || formPeriods.length === 0}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="">{projectId ? "Donem secmeden gonder" : "Proje secince donem secilebilir"}</option>
                  {formPeriods.map((period) => (
                    <option key={period.id} value={period.id}>
                      {period.name}
                      {period.status === "active" ? " (aktif)" : period.status === "completed" ? " (tamamlandi)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Rol Bazli Secim
                </label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(roleLabels).map(([role, label]) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => toggleRole(role)}
                      className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition-all ${
                        targetRoles.includes(role)
                          ? "border-indigo-500 bg-indigo-500/20 text-white"
                          : "border-slate-200 bg-white text-muted-foreground hover:bg-white/5"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Birim Bazli Secim
                </label>
                {availableTargetUnits.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {availableTargetUnits.map((unit) => (
                      <button
                        key={unit}
                        type="button"
                        onClick={() => toggleTargetUnit(unit)}
                        className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition-all ${
                          targetUnits.includes(unit)
                            ? "border-indigo-500 bg-indigo-500/20 text-white"
                            : "border-slate-200 bg-white text-muted-foreground hover:bg-white/5"
                        }`}
                      >
                        {targetUnitLabels[unit] || unit}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-2 text-xs text-muted-foreground">
                    Birim hedefi icin global yetki veya tanimli personel birimi gerekir.
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Send className="h-4 w-4 text-indigo-400" />
                Gonderim Kanallari
              </h3>

              {canSendEmail && (
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/5 bg-white/5 p-4 transition-colors hover:bg-white/10">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-slate-900">E-posta Gonder</div>
                    <div className="text-xs text-muted-foreground">Kayitli e-posta adreslerine</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={sendEmail}
                    onChange={(e) => setSendEmail(e.target.checked)}
                    className="h-5 w-5 rounded border-gray-600 bg-black/40 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-gray-900"
                  />
                </label>
              )}

              {canSendEmail && sendEmail && (
                <div className="space-y-2 pl-14">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    E-posta Eki
                  </label>
                  <input
                    type="file"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="block w-full text-xs text-slate-400 file:mr-4 file:rounded-full file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-indigo-700"
                  />
                </div>
              )}

              {canSendSms && (
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/5 bg-white/5 p-4 transition-colors hover:bg-white/10">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-slate-900">SMS Gonder</div>
                    <div className="text-xs text-muted-foreground">Telefon numarasi olan kullanicilara</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={sendSms}
                    onChange={(e) => setSendSms(e.target.checked)}
                    className="h-5 w-5 rounded border-gray-600 bg-black/40 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-gray-900"
                  />
                </label>
              )}
            </div>
          </div>

          <div className="flex justify-end border-t border-white/5 pt-6">
            <button
              type="submit"
              disabled={submitting || !title.trim() || !content.trim()}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-8 py-3 text-sm font-bold uppercase tracking-widest text-white shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : successMessage ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <Send className="h-5 w-5" />
              )}
              {submitting ? "Isleniyor..." : "Duyuruyu Yayinla ve Gonder"}
            </button>
          </div>
        </form>
      )}
      </PermissionGate>
    </div>
  );
}
