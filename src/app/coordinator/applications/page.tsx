"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ClipboardCheck, Check, X, User, Calendar, Loader2, Search, Clock, ListFilter, MessageSquareText } from "lucide-react";
import api from "@/lib/api/axios";
import { ExportButtons } from "@/components/shared/ExportButtons";
import { PermissionGate } from "@/components/shared/PermissionGate";

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
}

interface ApplicationPagination {
  data?: ApplicationApiItem[];
}

type ActionStatus = "accepted" | "rejected" | "waitlisted" | "interview_planned" | "interview_passed" | "interview_failed";

const statusOptions = [
  { value: "all", label: "Tum durumlar" },
  { value: "pending", label: "Bekleyen" },
  { value: "accepted", label: "Kabul Edilen" },
  { value: "waitlisted", label: "Yedek" },
  { value: "interview_planned", label: "Mulakat Planlandi" },
  { value: "interview_passed", label: "Mulakat Gecti" },
  { value: "interview_failed", label: "Mulakat Olumsuz" },
  { value: "rejected", label: "Reddedilen" },
];

const quickActions: Array<{ label: string; status: ActionStatus; tone: string }> = [
  { label: "Kabul Et", status: "accepted", tone: "bg-green-500 text-white shadow-lg shadow-green-500/20" },
  { label: "Yedege Al", status: "waitlisted", tone: "border border-blue-500/30 text-blue-400 hover:bg-blue-500/10" },
  { label: "Mulakat Planla", status: "interview_planned", tone: "border border-amber-500/30 text-amber-400 hover:bg-amber-500/10" },
  { label: "Reddet", status: "rejected", tone: "border border-destructive/30 text-destructive hover:bg-destructive/10" },
];

export default function CoordinatorApplicationsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [evaluationNote, setEvaluationNote] = useState<Record<number, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadApplications = async () => {
      try {
        const projectResponse = await api.get<{ projects: Project[] }>("/projects");
        const projectItems = projectResponse.data.projects ?? [];
        setProjects(projectItems);

        const applicationResponses = await Promise.all(
          projectItems.map(async (project) => {
            const response = await api.get<{ applications: ApplicationPagination }>("/admin/applications", {
              params: {
                project_id: project.id,
              },
            });

            return (response.data.applications?.data ?? []).map((item) => ({
              ...item,
              projectId: project.id,
              projectName: project.name,
            }));
          })
        );

        setApplications(applicationResponses.flat());
      } catch (error) {
        console.error("Basvurular yuklenemedi", error);
        setErrorMessage("Basvuru listesi yuklenemedi. Proje bazli admin route baglantisini kontrol edin.");
      } finally {
        setLoading(false);
      }
    };

    void loadApplications();
  }, []);

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
      await api.put(`/admin/applications/${id}/status`, {
        status,
        evaluation_note: note || null,
        rejection_reason: status === "rejected" ? note || "Koordinator degerlendirmesi sonucunda reddedildi." : null,
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

      setMessage("Basvuru durumu guncellendi.");
    } catch (error) {
      console.error("Basvuru durumu guncellenemedi", error);
      setErrorMessage("Basvuru durumu guncellenemedi.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <PermissionGate
      permission="applications.view"
      fallback={
        <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 px-6 py-8 text-center text-sm text-amber-100">
          Basvurulari goruntuleme yetkiniz bulunmuyor.
        </div>
      }
    >
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/20 text-accent">
            <ClipboardCheck className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Basvuru Onaylari</h1>
            <p className="text-sm text-muted-foreground">Projeler bazinda tum basvurulari listeleyin; kabul, yedek, mulakat ve ret akislarini yonetin.</p>
          </div>
        </div>
        <PermissionGate
          permission="applications.export"
          fallback={<span className="text-sm text-muted-foreground">Disa aktarma yetkiniz yok.</span>}
        >
        <ExportButtons
          endpoint="/admin/applications/export"
          filename="koordinator_basvurular"
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
            placeholder="Ogrenci, e-posta veya proje ara..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full rounded-xl border border-border bg-input py-2.5 pr-4 pl-10 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
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
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="rounded-xl border border-border bg-input px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {message && <div className="rounded-2xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-400">{message}</div>}
      {errorMessage && <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{errorMessage}</div>}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      ) : filteredApplications.length === 0 ? (
        <div className="glass-panel rounded-3xl p-20 text-center text-muted-foreground">Secili filtrelerde basvuru bulunmuyor.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredApplications.map((application, index) => (
            <motion.div
              key={application.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className="glass-panel rounded-3xl p-6"
            >
              <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                <div className="flex items-start gap-5">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-accent">
                    <User className="h-7 w-7" />
                  </div>
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-xl font-bold">
                        {application.user.name} {application.user.surname}
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
                        <span className="rounded-full bg-accent/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-accent">
                          {application.projectName}
                        </span>
                        {application.period?.name && (
                          <span className="rounded-full bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{application.period.name}</span>
                        )}
                        <span className="rounded-full bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{application.status}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <div>{application.user.email}</div>
                      {application.user.phone && <div>{application.user.phone}</div>}
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(application.created_at).toLocaleDateString("tr-TR")}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid w-full gap-3 xl:max-w-xl">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    <MessageSquareText className="h-4 w-4" />
                    Degerlendirme Notu
                  </div>
                  <textarea
                    rows={3}
                    value={evaluationNote[application.id] ?? application.evaluation_note ?? ""}
                    onChange={(event) =>
                      setEvaluationNote((prev) => ({
                        ...prev,
                        [application.id]: event.target.value,
                      }))
                    }
                    placeholder="Mulakat notu, yedek gerekcesi veya ret aciklamasi"
                    className="w-full rounded-xl border border-border bg-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-accent"
                  />

                  <div className="flex flex-wrap gap-3">
                    {quickActions.map((action) => (
                      <button
                        key={action.status}
                        onClick={() => void handleStatusChange(application.id, action.status)}
                        disabled={actionLoading === application.id}
                        className={`rounded-xl px-4 py-2.5 text-sm font-bold transition-all disabled:cursor-not-allowed disabled:opacity-60 ${action.tone}`}
                      >
                        {actionLoading === application.id ? <Loader2 className="h-4 w-4 animate-spin" /> : action.label}
                      </button>
                    ))}

                    {application.status === "interview_planned" && (
                      <>
                        <button
                          onClick={() => void handleStatusChange(application.id, "interview_passed")}
                          disabled={actionLoading === application.id}
                          className="rounded-xl border border-green-500/30 px-4 py-2.5 text-sm font-bold text-green-400 transition-all hover:bg-green-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {actionLoading === application.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => void handleStatusChange(application.id, "interview_failed")}
                          disabled={actionLoading === application.id}
                          className="rounded-xl border border-destructive/30 px-4 py-2.5 text-sm font-bold text-destructive transition-all hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {actionLoading === application.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                        </button>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <ListFilter className="h-4 w-4" />
                    Backend bu ekranda detay profil endpointi donmedigi icin profil gor butonu yerine proje bazli filtre ve durum akisi kullaniliyor.
                  </div>
                  {application.rejection_reason && (
                    <div className="flex items-center gap-2 text-xs text-amber-300">
                      <Clock className="h-4 w-4" />
                      Son ret notu: {application.rejection_reason}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
    </PermissionGate>
  );
}
