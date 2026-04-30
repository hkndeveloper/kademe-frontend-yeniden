"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Bell,
  CalendarDays,
  CreditCard,
  Loader2,
  Megaphone,
  Send,
  Users,
} from "lucide-react";
import api from "@/lib/api/axios";
import { usePermissions } from "@/hooks/usePermissions";

interface Project {
  id: number;
  name: string;
}

interface Program {
  id: number;
  title: string;
  start_at: string;
  status?: string;
  location?: string | null;
  project?: {
    id: number;
    name: string;
  };
}

interface ApplicationListResponse {
  applications?: {
    data?: Array<{ id: number }>;
    total?: number;
  };
}

interface FinancialTransaction {
  id: number;
  amount: number;
  status: string;
}

interface CoordinatorFinancialResponse {
  transactions?: {
    data?: FinancialTransaction[];
  };
  total_amount?: number;
}

interface ProjectSummary {
  projectId: number;
  projectName: string;
  activeStudents: number;
  pendingApplications: number;
  monthlyPrograms: number;
}

export default function CoordinatorDashboardPage() {
  const { hasPermission, canAccessProject } = usePermissions();
  const canCreateAnnouncements = hasPermission("announcements.create");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectSummaries, setProjectSummaries] = useState<ProjectSummary[]>([]);
  const [upcomingPrograms, setUpcomingPrograms] = useState<Program[]>([]);
  const [totalExpense, setTotalExpense] = useState(0);
  const [announcementForm, setAnnouncementForm] = useState({
    title: "",
    content: "",
    category: "general",
    project_id: "",
    send_sms: false,
    send_email: true,
  });

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      setErrorMessage("");

      try {
        const projectPermissionForDashboard = hasPermission("projects.view")
          ? "projects.view"
          : hasPermission("programs.view")
          ? "programs.view"
          : hasPermission("applications.view")
          ? "applications.view"
          : hasPermission("announcements.create")
          ? "announcements.create"
          : null;

        const [manageableProjectsResponse, financialsResponse] = await Promise.all([
          projectPermissionForDashboard
            ? api.get<{ projects?: Project[] }>("/panel/projects/manageable", {
                params: { permission: projectPermissionForDashboard },
              })
            : Promise.resolve({ data: { projects: [] as Project[] } }),
          hasPermission("financial.view")
            ? api.get<CoordinatorFinancialResponse>("/panel/coordinator/financials")
            : Promise.resolve({ data: { total_amount: 0, transactions: { data: [] } } }),
        ]);

        const manageableProjects = manageableProjectsResponse.data.projects ?? [];
        setProjects(manageableProjects);
        setTotalExpense(Number(financialsResponse.data.total_amount ?? 0));

        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).getTime();

        const projectResults = await Promise.all(
          manageableProjects.map(async (project) => {
            const canViewProgramsForProject =
              hasPermission("programs.view") && canAccessProject("programs.view", project.id);
            const canViewApplicationsForProject =
              hasPermission("applications.view") && canAccessProject("applications.view", project.id);

            const [programsResponse, pendingAppsResponse, acceptedAppsResponse] = await Promise.all([
              canViewProgramsForProject
                ? api.get<{ programs?: Program[] }>("/panel/programs", {
                    params: { project_id: project.id },
                  })
                : Promise.resolve({ data: { programs: [] as Program[] } }),
              canViewApplicationsForProject
                ? api.get<ApplicationListResponse>("/panel/applications", {
                    params: { project_id: project.id, status: "pending" },
                  })
                : Promise.resolve({ data: { applications: { total: 0, data: [] } } }),
              canViewApplicationsForProject
                ? api.get<ApplicationListResponse>("/panel/applications", {
                    params: { project_id: project.id, status: "accepted" },
                  })
                : Promise.resolve({ data: { applications: { total: 0, data: [] } } }),
            ]);

            const programs = programsResponse.data.programs ?? [];
            const pendingApplications = pendingAppsResponse.data.applications?.total
              ?? pendingAppsResponse.data.applications?.data?.length
              ?? 0;
            const activeStudents = acceptedAppsResponse.data.applications?.total
              ?? acceptedAppsResponse.data.applications?.data?.length
              ?? 0;
            const monthlyPrograms = programs.filter((program) => {
              const start = new Date(program.start_at).getTime();
              return start >= monthStart && start <= monthEnd;
            }).length;

            return {
              summary: {
                projectId: project.id,
                projectName: project.name,
                activeStudents,
                pendingApplications,
                monthlyPrograms,
              },
              upcoming: programs
                .filter((program) => new Date(program.start_at).getTime() >= now.getTime())
                .map((program) => ({
                  ...program,
                  project: { id: project.id, name: project.name },
                })),
            };
          })
        );

        setProjectSummaries(projectResults.map((result) => result.summary));
        setUpcomingPrograms(
          projectResults
            .flatMap((result) => result.upcoming)
            .sort((left, right) => new Date(left.start_at).getTime() - new Date(right.start_at).getTime())
            .slice(0, 6)
        );
      } catch (error) {
        console.error("Coordinator dashboard data could not be loaded", error);
        setErrorMessage("Panel verileri yuklenemedi. Lutfen tekrar deneyin.");
      } finally {
        setLoading(false);
      }
    };

    void loadDashboard();
  }, [hasPermission]);

  const totals = useMemo(() => {
    return projectSummaries.reduce(
      (accumulator, item) => ({
        activeStudents: accumulator.activeStudents + item.activeStudents,
        pendingApplications: accumulator.pendingApplications + item.pendingApplications,
        monthlyPrograms: accumulator.monthlyPrograms + item.monthlyPrograms,
      }),
      { activeStudents: 0, pendingApplications: 0, monthlyPrograms: 0 }
    );
  }, [projectSummaries]);

  const handleAnnouncementSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canCreateAnnouncements) {
      setErrorMessage("Hizli duyuru icin yetkiniz yok.");
      return;
    }

    const pid = announcementForm.project_id ? Number(announcementForm.project_id) : null;
    if (pid != null && (Number.isNaN(pid) || !canAccessProject("announcements.create", pid))) {
      setErrorMessage("Secilen proje icin duyuru olusturamazsiniz.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await api.post("/panel/announcements", {
        title: announcementForm.title,
        content: announcementForm.content,
        category: announcementForm.category,
        project_id: pid,
        send_sms: announcementForm.send_sms,
        send_email: announcementForm.send_email,
      });

      setSuccessMessage("Hizli duyuru basariyla kaydedildi.");
      setAnnouncementForm({
        title: "",
        content: "",
        category: "general",
        project_id: "",
        send_sms: false,
        send_email: true,
      });
    } catch (error) {
      console.error("Announcement could not be created", error);
      setErrorMessage("Duyuru gonderilemedi. Formu kontrol edip tekrar deneyin.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Koordinator Dashboard</h1>
          <p className="mt-1 text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Proje bazli ozetler, yaklasan programlar ve hizli duyuru alani
          </p>
        </div>
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

      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            <div className="glass-panel rounded-3xl p-6">
              <div className="mb-3 flex items-center gap-2 text-indigo-300">
                <Users className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-widest">Aktif Ogrenci</span>
              </div>
              <div className="text-3xl font-black text-slate-900">{totals.activeStudents}</div>
            </div>

            <div className="glass-panel rounded-3xl p-6">
              <div className="mb-3 flex items-center gap-2 text-indigo-300">
                <CalendarDays className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-widest">Bu Ay Program</span>
              </div>
              <div className="text-3xl font-black text-slate-900">{totals.monthlyPrograms}</div>
            </div>

            <div className="glass-panel rounded-3xl p-6">
              <div className="mb-3 flex items-center gap-2 text-indigo-300">
                <CreditCard className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-widest">Guncel Harcama</span>
              </div>
              <div className="text-3xl font-black text-slate-900">
                {totalExpense.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL
              </div>
            </div>

            <div className="glass-panel rounded-3xl p-6">
              <div className="mb-3 flex items-center gap-2 text-indigo-300">
                <Bell className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-widest">Bekleyen Basvuru</span>
              </div>
              <div className="text-3xl font-black text-slate-900">{totals.pendingApplications}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="glass-panel rounded-3xl p-6">
              <div className="mb-5 flex items-center gap-2 text-indigo-300">
                <Users className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-widest">Proje Ozetleri</span>
              </div>

              {projectSummaries.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-6 text-sm text-muted-foreground">
                  Size atanmis proje bulunamadi.
                </div>
              ) : (
                <div className="space-y-4">
                  {projectSummaries.map((summary) => (
                    <div
                      key={summary.projectId}
                      className="rounded-2xl border border-white/10 bg-black/20 p-5"
                    >
                      <div className="text-lg font-bold text-slate-900">{summary.projectName}</div>
                      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                        <div className="rounded-xl bg-white/5 p-3">
                          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            Aktif Ogrenci
                          </div>
                          <div className="mt-2 text-2xl font-black text-slate-900">{summary.activeStudents}</div>
                        </div>
                        <div className="rounded-xl bg-white/5 p-3">
                          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            Bekleyen Basvuru
                          </div>
                          <div className="mt-2 text-2xl font-black text-slate-900">{summary.pendingApplications}</div>
                        </div>
                        <div className="rounded-xl bg-white/5 p-3">
                          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            Bu Ay Program
                          </div>
                          <div className="mt-2 text-2xl font-black text-slate-900">{summary.monthlyPrograms}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <form onSubmit={handleAnnouncementSubmit} className="glass-panel rounded-3xl p-6">
              <div className="mb-5 flex items-center gap-2 text-indigo-300">
                <Megaphone className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-widest">Hizli Duyuru</span>
              </div>

              {!canCreateAnnouncements ? (
                <p className="text-sm text-muted-foreground">Bu alan icin duyuru olusturma yetkiniz bulunmuyor.</p>
              ) : null}

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Baslik
                  </label>
                  <input
                    value={announcementForm.title}
                    onChange={(event) =>
                      setAnnouncementForm((current) => ({ ...current, title: event.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500"
                    placeholder="Duyuru basligi"
                    required
                    disabled={!canCreateAnnouncements}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Icerik
                  </label>
                  <textarea
                    value={announcementForm.content}
                    onChange={(event) =>
                      setAnnouncementForm((current) => ({ ...current, content: event.target.value }))
                    }
                    className="h-32 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500"
                    placeholder="Duyuru metni"
                    required
                    disabled={!canCreateAnnouncements}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      Kategori
                    </label>
                    <select
                      value={announcementForm.category}
                      onChange={(event) =>
                        setAnnouncementForm((current) => ({ ...current, category: event.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500"
                      disabled={!canCreateAnnouncements}
                    >
                      <option value="general">Genel</option>
                      <option value="project">Proje</option>
                      <option value="event">Etkinlik</option>
                      <option value="urgent">Acil</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      Proje
                    </label>
                    <select
                      value={announcementForm.project_id}
                      onChange={(event) =>
                        setAnnouncementForm((current) => ({ ...current, project_id: event.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500"
                      disabled={!canCreateAnnouncements}
                    >
                      <option value="">Tum yetkili projeler</option>
                      {projects
                        .filter((project) => canAccessProject("announcements.create", project.id))
                        .map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-900">
                    <input
                      type="checkbox"
                      checked={announcementForm.send_sms}
                      onChange={(event) =>
                        setAnnouncementForm((current) => ({ ...current, send_sms: event.target.checked }))
                      }
                      disabled={!canCreateAnnouncements}
                    />
                    SMS gonder
                  </label>
                  <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-900">
                    <input
                      type="checkbox"
                      checked={announcementForm.send_email}
                      onChange={(event) =>
                        setAnnouncementForm((current) => ({ ...current, send_email: event.target.checked }))
                      }
                      disabled={!canCreateAnnouncements}
                    />
                    E-posta gonder
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={submitting || !canCreateAnnouncements}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold uppercase tracking-widest text-white transition hover:bg-indigo-700 disabled:opacity-60"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Duyuru Kaydet
                </button>
              </div>
            </form>
          </div>

          <div className="glass-panel rounded-3xl p-6">
            <div className="mb-5 flex items-center gap-2 text-indigo-300">
              <CalendarDays className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-widest">Yaklasan Programlar</span>
            </div>

            {upcomingPrograms.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-6 text-sm text-muted-foreground">
                Onumuzdeki donem icin planlanmis program bulunmuyor.
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingPrograms.map((program) => (
                  <div key={program.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="text-sm font-bold text-slate-900">{program.title}</div>
                        <div className="mt-1 text-xs uppercase tracking-widest text-indigo-300">
                          {program.project?.name ?? "Proje"}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(program.start_at).toLocaleString("tr-TR")}
                        {program.location ? ` - ${program.location}` : ""}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4 text-sm text-indigo-100">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <p>
                Bu ekran artik koordinatorun erisebildigi proje, basvuru, program ve finans verilerini
                dogrudan backend uzerinden topluyor. Sahte toplamlar veya gecici form aksiyonlari
                kullanilmiyor.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
