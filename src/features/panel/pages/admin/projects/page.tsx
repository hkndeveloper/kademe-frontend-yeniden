"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FilePenLine,
  Layers,
  Loader2,
  PencilLine,
  Search,
  Users,
  XCircle,
} from "lucide-react";
import api from "@/lib/api/axios";
import { ExportButtons } from "@/components/shared/ExportButtons";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { usePermissions } from "@/hooks/usePermissions";
import { panelStatusChipClass } from "@/lib/status-style";
import { invalidatePublicProjectCaches } from "@/lib/public-api-cache";

interface ActivePeriod {
  id: number;
  name: string;
}

interface Project {
  id: number;
  name: string;
  type?: string;
  slug?: string;
  status: string;
  is_public: boolean;
  is_application_open?: boolean;
  quota?: number | null;
  active_period?: ActivePeriod | null;
  active_students?: Array<unknown>;
  alumni?: Array<unknown>;
  participant_summary?: {
    total: number;
    active: number;
    active_all_periods?: number;
    graduates: number;
  };
}

export default function AdminProjectsPage() {
  const { hasPermission, hasScopedPermission, canAccessProject } = usePermissions();
  const hasStructuralProjectView = hasScopedPermission("projects.view");
  const isMediaContentMode = !hasStructuralProjectView && [
    "projects.public_content.view",
    "projects.public_content.update",
    "projects.gallery.update",
  ].some(hasScopedPermission);
  const listingPermission = hasStructuralProjectView
    ? "projects.view"
    : hasScopedPermission("projects.public_content.view")
      ? "projects.public_content.view"
      : hasScopedPermission("projects.public_content.update")
        ? "projects.public_content.update"
        : "projects.gallery.update";
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "passive">("all");
  const [visibilitySavingId, setVisibilitySavingId] = useState<number | null>(null);
  const [visibilityError, setVisibilityError] = useState("");

  const togglePublicVisibility = async (project: Project) => {
    setVisibilitySavingId(project.id);
    setVisibilityError("");
    try {
      const response = await api.patch<{ project: { is_public: boolean } }>(`/panel/projects/${project.id}/visibility`, {
        is_public: !project.is_public,
      });
      invalidatePublicProjectCaches();
      setProjects((current) => current.map((item) => item.id === project.id
        ? { ...item, is_public: response.data.project.is_public }
        : item));
    } catch {
      setVisibilityError(`${project.name} için kamusal görünürlük değiştirilemedi.`);
    } finally {
      setVisibilitySavingId(null);
    }
  };

  const hrefWithActivePeriod = (href: string, project: Project) => {
    if (!project.active_period?.id) return href;
    const [path, query = ""] = href.split("?");
    const params = new URLSearchParams(query);
    params.set("period_id", String(project.active_period.id));
    const nextQuery = params.toString();
    return nextQuery ? `${path}?${nextQuery}` : path;
  };

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const response = await api.get<{ projects: Project[] }>("/panel/projects/manageable", {
          params: { permission: listingPermission },
        });
        setProjects(response.data.projects ?? []);
      } catch (error) {
        console.error("Admin projeleri yuklenemedi", error);
      } finally {
        setLoading(false);
      }
    };

    void loadProjects();
  }, [listingPermission]);

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesSearch = `${project.name} ${project.type ?? ""} ${project.slug ?? ""}`.toLowerCase().includes(search.toLowerCase());
      const normalizedStatus = project.status === "active" ? "active" : "passive";
      const matchesStatus = statusFilter === "all" || normalizedStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [projects, search, statusFilter]);

  const openApplications = projects.filter((project) => project.is_application_open).length;
  const activeProjects = projects.filter((project) => project.status === "active").length;
  const activeStudentCount = (project: Project) => project.participant_summary?.active ?? project.active_students?.length ?? 0;
  const alumniCount = (project: Project) => project.participant_summary?.graduates ?? project.alumni?.length ?? 0;

  const totalActiveStudents = projects.reduce((total, project) => total + activeStudentCount(project), 0);
  const totalAlumni = projects.reduce((total, project) => total + alumniCount(project), 0);

  return (
    <div className="space-y-6 pb-8">
      {visibilityError ? <div className="panel-notice panel-notice-error">{visibilityError}</div> : null}
      <header className="panel-section-card overflow-hidden p-0">
        <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:justify-between lg:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-md shadow-slate-950/20">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  {isMediaContentMode ? "Proje İçerikleri" : "Proje Yönetimi"}
                </h1>
                <span className="panel-chip panel-chip-info">
                  {isMediaContentMode ? "Medya görünümü" : "Proje çekirdeği"}
                </span>
              </div>
              <p className="mt-1 max-w-3xl text-sm text-slate-600">
                {isMediaContentMode
                  ? "Sorumluluk kapsamındaki projelerin kamusal metin, kapak ve galeri alanlarını yönetin. Yapısal proje bilgileri bu görünümde değiştirilmez."
                  : "Yetkiniz dahilindeki projeleri, aktif dönemlerini, başvuru durumunu ve operasyon kısayollarını tek yerden takip edin."}
              </p>
            </div>
          </div>
          <PermissionGate permission="projects.export">
            <ExportButtons endpoint="/panel/projects/export" filename="projeler" buttonLabel="Projeleri Disa Aktar" />
          </PermissionGate>
        </div>
        <div className={`grid border-t border-slate-200 bg-slate-50/70 sm:grid-cols-2 ${hasStructuralProjectView ? "xl:grid-cols-5" : "xl:grid-cols-2"}`}>
          {[
            { label: "Yetkili proje", value: projects.length, icon: Layers },
            { label: "Aktif proje", value: activeProjects, icon: CheckCircle2 },
            ...(hasStructuralProjectView ? [
              { label: "Basvurusu acik", value: openApplications, icon: ClipboardList },
              { label: "Aktif ogrenci", value: totalActiveStudents, icon: Users },
              { label: "Mezun", value: totalAlumni, icon: Users },
            ] : []),
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="border-b border-slate-200 px-5 py-4 sm:border-r xl:border-b-0">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <Icon className="h-4 w-4" />
                  {item.label}
                </div>
                <div className="mt-2 text-2xl font-black text-slate-900">{item.value.toLocaleString("tr-TR")}</div>
              </div>
            );
          })}
        </div>
      </header>

      <div className="panel-filter-card">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={hasStructuralProjectView ? "Proje adi, turu veya slug ile ara" : "Proje adi ile ara"}
              className="panel-control h-12 pl-11"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {(["all", "active", "passive"] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setStatusFilter(filter)}
                className={`panel-tab h-12 ${
                  statusFilter === filter
                    ? "panel-tab-active"
                    : ""
                }`}
              >
                {filter === "all" ? "Tum durumlar" : filter === "active" ? "Aktif" : "Pasif"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="panel-empty-card p-16">
          Bu filtreye uygun proje bulunamadi.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredProjects.map((project) => (
            <article
              key={project.id}
              className="group panel-list-card flex min-h-[360px] flex-col"
            >
              <div className="mb-5 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
                    <Layers className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-black text-slate-900">{project.name}</h3>
                    {project.type ? <p className="mt-1 truncate text-xs font-bold uppercase tracking-wide text-slate-500">{project.type}</p> : null}
                  </div>
                </div>
                <span
                  className={`panel-chip shrink-0 ${panelStatusChipClass(project.status)}`}
                >
                  {project.status === "active" ? "Aktif" : project.status}
                </span>
              </div>

              <div className="space-y-3">
                <div className={`text-xs font-bold ${project.is_public && project.status === "active" ? "text-emerald-700" : "text-slate-500"}`}>
                  {project.is_public && project.status === "active" ? "Kamusal alanda yayında" : "Kamusal alanda gizli"}
                </div>
                <div className="panel-card-muted p-4">
                  <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    <Calendar className="h-3 w-3" />
                    Aktif Donem
                  </div>
                  <span className="text-sm font-bold text-slate-900">{project.active_period?.name || "Aktif donem yok"}</span>
                </div>

                {hasStructuralProjectView ? <div className="grid grid-cols-2 gap-3">
                  <div className="panel-card-muted bg-white p-4">
                    <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      <Users className="h-3 w-3" />
                      Aktif Ogrenci
                    </div>
                    <span className="text-xl font-black text-slate-900">{activeStudentCount(project)}</span>
                  </div>
                  <div className="panel-card-muted bg-white p-4">
                    <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      <Users className="h-3 w-3" />
                      Mezun
                    </div>
                    <span className="text-xl font-black text-slate-900">{alumniCount(project)}</span>
                  </div>
                </div> : null}
                {hasStructuralProjectView ? <div className="panel-card-muted flex items-center justify-between bg-white px-4 py-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                    {project.is_application_open ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        Basvuru acik
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 text-red-500" />
                        Basvuru kapali
                      </>
                    )}
                  </div>
                  {typeof project.quota === "number" ? (
                    <span className="text-xs font-bold text-slate-500">Kontenjan {project.quota}</span>
                  ) : null}
                </div> : (
                  <div className="panel-card-muted bg-white px-4 py-3 text-sm text-slate-600">
                    Kamusal proje metni, kapak ve galeri alanlari bu ekrandan yonetilir.
                  </div>
                )}
              </div>

              <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                {hasPermission("projects.content.update") && canAccessProject("projects.content.update", project.id) ? (
                  <button
                    type="button"
                    onClick={() => void togglePublicVisibility(project)}
                    disabled={visibilitySavingId === project.id || project.status !== "active"}
                    className="panel-card-action panel-card-action-info"
                    title="Kamusal proje sayfasını ve bu projeye ait kamusal etkinlikleri birlikte açar veya kapatır"
                  >
                    {visibilitySavingId === project.id ? "Kaydediliyor..." : project.status !== "active" ? "Proje Pasif" : project.is_public ? "Kamudan Gizle" : "Kamuda Yayınla"}
                  </button>
                ) : null}
                {hasStructuralProjectView ? <Link
                  href={hrefWithActivePeriod(`/panel/projects/${project.id}`, project)}
                  className="panel-card-action panel-card-action-primary flex-1"
                >
                    Detay
                    <ChevronRight className="h-4 w-4" />
                </Link> : null}
                {(hasPermission("applications.intake.view") && canAccessProject("applications.intake.view", project.id)) ||
                (hasPermission("applications.intake.manage") && canAccessProject("applications.intake.manage", project.id)) ? (
                  <Link
                    href={hrefWithActivePeriod(`/panel/projects/${project.id}/applications`, project)}
                    className="panel-card-action panel-card-action-info"
                  >
                    <CalendarClock className="h-4 w-4" />
                    Basvuru
                  </Link>
                ) : null}
                <PermissionGate permission="projects.application_form.update" requireProjectAccess={{ permission: "projects.application_form.update", projectId: project.id }}>
                  <Link
                    href={hrefWithActivePeriod(`/panel/periods/form-builder?project_id=${project.id}`, project)}
                    className="panel-card-action panel-card-action-info"
                  >
                    <FilePenLine className="h-4 w-4" />
                    Form
                  </Link>
                </PermissionGate>
                {[
                  "projects.content.update",
                  "projects.public_content.view",
                  "projects.public_content.update",
                  "projects.gallery.update",
                ].some((permission) => hasPermission(permission) && canAccessProject(permission, project.id)) ? (
                  <Link
                    href={hrefWithActivePeriod(`/panel/projects/${project.id}/content`, project)}
                    className="panel-card-action panel-card-action-info"
                  >
                    <PencilLine className="h-4 w-4" />
                    Icerik
                  </Link>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
