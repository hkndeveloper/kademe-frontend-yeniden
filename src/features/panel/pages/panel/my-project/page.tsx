"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Briefcase, CalendarDays, FilePenLine, Loader2, Settings2, Users } from "lucide-react";
import api from "@/lib/api/axios";
import { ExportButtons } from "@/components/shared/ExportButtons";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { usePermissions } from "@/hooks/usePermissions";

interface PanelProject {
  id: number;
  name: string;
  slug?: string;
  type?: string | null;
  status?: string | null;
  short_description?: string | null;
  description?: string | null;
  application_open?: boolean;
  next_application_date?: string | null;
  active_period?: {
    id: number;
    name: string;
    start_date?: string | null;
    end_date?: string | null;
  } | null;
  participant_summary?: {
    total: number;
    active: number;
    graduates: number;
  } | null;
}

interface PanelProjectsResponse {
  scope: string;
  message?: string;
  projects: PanelProject[];
}

export default function PanelMyProjectPage() {
  const { hasPermission, canAccessProject } = usePermissions();
  const [projects, setProjects] = useState<PanelProject[]>([]);
  const [scope, setScope] = useState<string>("assignment");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const response = await api.get<PanelProjectsResponse>("/panel/my-projects");
        setProjects(response.data.projects ?? []);
        setScope(response.data.scope ?? "assignment");
        setInfoMessage(response.data.message ?? null);
      } catch (error) {
        console.error("Panel proje kapsami yuklenemedi", error);
        setErrorMessage("Proje kapsami yuklenemedi.");
      } finally {
        setLoading(false);
      }
    };

    void loadProjects();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-500">
            <Briefcase className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900">Projem</h1>
            <p className="mt-1 text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Yetkili proje kapsami backend verisinden geliyor
            </p>
          </div>
        </div>
        <PermissionGate permission="projects.export">
          <ExportButtons endpoint="/panel/my-projects/export" filename="personel_projeleri" buttonLabel="Projeleri Disa Aktar" />
        </PermissionGate>
      </div>

      <PermissionGate
        permission="projects.view"
        fallback={
        <div className="glass-panel rounded-3xl p-10 text-center text-sm text-muted-foreground">
          Bu modulu goruntulemek icin yetkiniz bulunmuyor.
        </div>
        }
      >
      {
        <>

      <div className="rounded-3xl border border-amber-500/20 bg-amber-500/5 p-6 text-sm text-muted-foreground">
        {scope === "all_active_for_media_unit"
          ? "Medya birimi oldugunuz icin sistem aktif projelerin tam kapsam listesini gosteriyor."
          : "Bu ekran personelin atandigi talep ve destek kayitlarindaki proje baglarini kullanarak gorev kapsamini olusturuyor."}
      </div>

      {infoMessage && (
        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-300">{infoMessage}</div>
      )}

      {errorMessage && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{errorMessage}</div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {projects.length === 0 ? (
          <div className="glass-panel col-span-full rounded-3xl p-12 text-center text-muted-foreground">
            Henuz size bagli proje kapsami bulunmuyor.
          </div>
        ) : (
          projects.map((project) => (
            <div key={project.id} className="glass-panel rounded-3xl p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-bold text-slate-900">{project.name}</h2>
                    {project.type && (
                      <span className="rounded-full bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        {project.type}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {project.short_description || project.description || "Bu proje icin ozet aciklama girilmemis."}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${
                    project.application_open
                      ? "bg-green-500/10 text-green-400"
                      : "bg-white/5 text-muted-foreground"
                  }`}
                >
                  {project.application_open ? "Basvuru acik" : "Basvuru kapali"}
                </span>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-2xl bg-white/5 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Aktif donem</p>
                  <p className="mt-2 text-sm font-bold text-slate-900">{project.active_period?.name || "-"}</p>
                </div>
                <div className="rounded-2xl bg-white/5 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Aktif ogrenci</p>
                  <p className="mt-2 text-sm font-bold text-slate-900">{project.participant_summary?.active ?? 0}</p>
                </div>
                <div className="rounded-2xl bg-white/5 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Mezun</p>
                  <p className="mt-2 text-sm font-bold text-slate-900">{project.participant_summary?.graduates ?? 0}</p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-amber-400" />
                  <span>
                    {project.active_period?.start_date || "-"} / {project.active_period?.end_date || "-"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-amber-400" />
                  <span>Toplam katilimci: {project.participant_summary?.total ?? 0}</span>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-5">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">
                  Sonraki basvuru tarihi: {project.next_application_date || "Belirtilmedi"}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {hasPermission("projects.content.update") && canAccessProject("projects.content.update", project.id) ? (
                    <Link
                      href={`/panel/projects/${project.id}/content`}
                      className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-bold text-accent-foreground transition hover:opacity-90"
                    >
                      <FilePenLine className="h-4 w-4" />
                      Icerigi Duzenle
                    </Link>
                  ) : null}
                  {hasPermission("projects.application_form.update") && canAccessProject("projects.application_form.update", project.id) ? (
                    <Link
                      href={`/panel/periods/form-builder?project_id=${project.id}`}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-slate-900 transition hover:bg-white/10"
                    >
                      <Settings2 className="h-4 w-4" />
                      Basvuru Formu
                    </Link>
                  ) : null}
                  {project.slug ? (
                    <Link
                      href={`/projects/${project.slug}`}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-slate-900 transition hover:bg-white/10"
                    >
                      Public proje sayfasi
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  ) : null}
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
