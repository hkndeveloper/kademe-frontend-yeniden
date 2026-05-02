"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ClipboardCheck, Check, X, User, Calendar, Loader2, Search, Clock, MessageSquareText } from "lucide-react";
import api from "@/lib/api/axios";
import { ExportButtons } from "@/components/shared/ExportButtons";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { usePermissions } from "@/hooks/usePermissions";

interface Project {
  id: number;
  name: string;
}

interface Application {
  id: number;
  user: {
    name: string;
    surname: string;
    email: string;
    phone?: string | null;
  };
  period?: {
    name: string;
  } | null;
  projectId: number;
  projectName: string;
  status: string;
  created_at: string;
  evaluation_note?: string | null;
  rejection_reason?: string | null;
}

interface ApplicationApiItem {
  id: number;
  user: {
    name: string;
    surname: string;
    email: string;
    phone?: string | null;
  };
  period?: {
    name: string;
  } | null;
  status: string;
  created_at: string;
  evaluation_note?: string | null;
  rejection_reason?: string | null;
  project?: {
    id: number;
    name: string;
  } | null;
}

interface ApplicationPagination {
  data?: ApplicationApiItem[];
}

type ActionStatus = "accepted" | "rejected" | "waitlisted" | "interview_planned" | "interview_passed" | "interview_failed";

const statusOptions = [
  { value: "all", label: "Tüm durumlar" },
  { value: "pending", label: "Bekleyen" },
  { value: "accepted", label: "Kabul Edilen" },
  { value: "waitlisted", label: "Yedek" },
  { value: "interview_planned", label: "Mülakat Planlandı" },
  { value: "interview_passed", label: "Mülakat Geçti" },
  { value: "interview_failed", label: "Mülakat Olumsuz" },
  { value: "rejected", label: "Reddedilen" },
];

const quickActions: Array<{ label: string; status: ActionStatus; tone: string }> = [
  { label: "Kabul Et", status: "accepted", tone: "bg-green-500 text-white shadow-lg shadow-green-500/20" },
  { label: "Yedeğe Al", status: "waitlisted", tone: "border border-blue-500/30 text-blue-400 hover:bg-blue-500/10" },
  { label: "Mülakat Planla", status: "interview_planned", tone: "border border-amber-500/30 text-amber-400 hover:bg-amber-500/10" },
  { label: "Reddet", status: "rejected", tone: "border border-destructive/30 text-destructive hover:bg-destructive/10" },
];

function applicationActionPermission(status: ActionStatus): string {
  return status === "waitlisted" ? "applications.waitlist.manage" : "applications.update_status";
}

export default function AdminApplicationsPage() {
  const { canAccessProject, hasPermission } = usePermissions();
  const [projects, setProjects] = useState<Project[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [projectFilter, setProjectFilter] = useState(() => {
    if (typeof window === "undefined") return "all";
    return new URLSearchParams(window.location.search).get("project_id") ?? "all";
  });
  const [statusFilter, setStatusFilter] = useState("pending");
  const [evaluationNote, setEvaluationNote] = useState<Record<number, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchAllApplications = async () => {
      try {
        const initialProjectId = new URLSearchParams(window.location.search).get("project_id") ?? "all";
        const projectResponse = hasPermission("applications.view")
          ? await api.get<{ projects: Project[] }>("/panel/projects/manageable", {
              params: { permission: "applications.view" },
            })
          : { data: { projects: [] as Project[] } };
        const projectItems = (projectResponse.data.projects ?? []).filter((p) =>
          canAccessProject("applications.view", p.id)
        );
        setProjects(projectItems);

        const response = await api.get<{ applications: ApplicationPagination }>("/panel/applications", {
          params: {
            project_id: initialProjectId !== "all" ? initialProjectId : undefined,
          },
        });

        setApplications(
          (response.data.applications?.data ?? []).map((item) => ({
            ...item,
            projectId: item.project?.id ?? 0,
            projectName: item.project?.name ?? "-",
          }))
        );
      } catch (error) {
        console.error("Başvurular yüklenemedi", error);
        setErrorMessage("Başvuru listesi yüklenemedi. Sistemsel bir hata oluştu.");
      } finally {
        setLoading(false);
      }
    };

    void fetchAllApplications();
  }, [hasPermission, canAccessProject]);

  const filteredApplications = useMemo(() => {
    return applications.filter((application) => {
      const matchesProject = projectFilter === "all" || application.projectId === Number(projectFilter);
      const matchesStatus = statusFilter === "all" || application.status === statusFilter;
      const matchesSearch = `${application.user.name} ${application.user.surname} ${application.user.email} ${application.projectName}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      return matchesProject && matchesStatus && matchesSearch;
    });
  }, [applications, projectFilter, searchTerm, statusFilter]);

  const handleStatusChange = async (id: number, status: ActionStatus) => {
    const note = evaluationNote[id]?.trim();
    setActionLoading(id);
    setMessage(null);
    setErrorMessage(null);

    try {
      await api.put(`/panel/applications/${id}/status`, {
        status,
        evaluation_note: note || null,
        rejection_reason: status === "rejected" ? note || "Yönetim değerlendirmesi sonucunda reddedildi." : null,
      });

      setApplications((prev) =>
        prev.map((application) =>
          application.id === id
            ? {
                ...application,
                status,
                evaluation_note: note || application.evaluation_note,
                rejection_reason: status === "rejected" ? note || application.rejection_reason : application.rejection_reason,
              }
            : application
        )
      );

      setMessage("Başvuru durumu başarıyla güncellendi.");
    } catch (error) {
      console.error("Başvuru durumu güncellenemedi", error);
      setErrorMessage("Başvuru durumu güncellenirken hata oluştu.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-400">
            <ClipboardCheck className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900">BAŞVURU YÖNETİMİ</h1>
            <p className="mt-1 text-sm font-bold uppercase tracking-widest text-muted-foreground">Tüm Projeler • Değerlendirme Paneli</p>
          </div>
        </div>
        <PermissionGate permission="applications.export">
          <ExportButtons
            endpoint="/panel/applications/export"
            filename="kademe_basvurular"
            params={{
              project_id: projectFilter !== "all" ? projectFilter : undefined,
              status: statusFilter !== "all" ? statusFilter : undefined,
              search: searchTerm || undefined,
            }}
          />
        </PermissionGate>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr,220px,220px]">
        <div className="relative">
          <Search className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Öğrenci, e-posta veya proje ara..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pr-4 pl-10 text-sm outline-none transition-all focus:border-indigo-500 focus:bg-white/10"
          />
        </div>
        <select
          value={projectFilter}
          onChange={(event) => setProjectFilter(event.target.value)}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none transition-all focus:border-indigo-500"
        >
          <option value="all">Tüm Projeler</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none transition-all focus:border-indigo-500"
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {message && <div className="rounded-2xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm font-bold text-green-400">{message}</div>}
      {errorMessage && <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-400">{errorMessage}</div>}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
        </div>
      ) : filteredApplications.length === 0 ? (
        <div className="glass-panel rounded-3xl border border-dashed border-white/10 p-20 text-center font-bold text-muted-foreground">
          Seçili filtrelerde başvuru bulunmuyor.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredApplications.map((application, index) => (
            <motion.div
              key={application.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className="glass-panel rounded-3xl border border-white/5 bg-white/5 p-6 hover:bg-white/10"
            >
              <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                <div className="flex items-start gap-5">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-400">
                    <User className="h-7 w-7" />
                  </div>
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">
                        {application.user.name} {application.user.surname}
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
                        <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-indigo-400">
                          {application.projectName}
                        </span>
                        {application.period?.name && (
                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{application.period.name}</span>
                        )}
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{application.status}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <div>{application.user.email}</div>
                      {application.user.phone && <div>{application.user.phone}</div>}
                      <div className="flex items-center gap-1 font-bold">
                        <Calendar className="h-4 w-4" />
                        {new Date(application.created_at).toLocaleDateString("tr-TR")}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid w-full gap-3 xl:max-w-xl">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    <MessageSquareText className="h-4 w-4" />
                    Değerlendirme Notu
                  </div>
                  <textarea
                    rows={2}
                    value={evaluationNote[application.id] ?? application.evaluation_note ?? ""}
                    onChange={(event) =>
                      setEvaluationNote((prev) => ({
                        ...prev,
                        [application.id]: event.target.value,
                      }))
                    }
                    placeholder="Mülakat notu, yedek gerekçesi veya ret açıklaması yazın..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-indigo-500 focus:bg-white/5"
                  />

                  <div className="flex flex-wrap gap-3">
                    {quickActions
                      .filter((action) =>
                        canAccessProject(applicationActionPermission(action.status), application.projectId)
                      )
                      .map((action) => (
                        <button
                          key={action.status}
                          type="button"
                          onClick={() => void handleStatusChange(application.id, action.status)}
                          disabled={actionLoading === application.id}
                          className={`rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-all disabled:cursor-not-allowed disabled:opacity-60 ${action.tone}`}
                        >
                          {actionLoading === application.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            action.label
                          )}
                        </button>
                      ))}

                    {application.status === "interview_planned" &&
                      canAccessProject("applications.update_status", application.projectId) && (
                      <>
                        <button
                          type="button"
                          onClick={() => void handleStatusChange(application.id, "interview_passed")}
                          disabled={actionLoading === application.id}
                          className="rounded-xl border border-green-500/30 px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-green-400 transition-all hover:bg-green-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {actionLoading === application.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <span className="flex items-center gap-1">
                              <Check className="h-4 w-4" /> BAŞARILI
                            </span>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleStatusChange(application.id, "interview_failed")}
                          disabled={actionLoading === application.id}
                          className="rounded-xl border border-destructive/30 px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-destructive transition-all hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {actionLoading === application.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <span className="flex items-center gap-1">
                              <X className="h-4 w-4" /> OLUMSUZ
                            </span>
                          )}
                        </button>
                      </>
                    )}
                  </div>

                  {application.rejection_reason && (
                    <div className="mt-2 flex items-center gap-2 text-xs font-bold text-amber-500">
                      <Clock className="h-4 w-4" />
                      Son ret/değerlendirme notu: {application.rejection_reason}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
