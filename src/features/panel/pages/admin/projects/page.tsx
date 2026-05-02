"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Calendar, CheckCircle2, Layers, Loader2, PencilLine, Search, Users, XCircle } from "lucide-react";
import api from "@/lib/api/axios";
import { ExportButtons } from "@/components/shared/ExportButtons";
import { PermissionGate } from "@/components/shared/PermissionGate";

interface ActivePeriod {
  id: number;
  name: string;
}

interface Project {
  id: number;
  name: string;
  type: string;
  slug: string;
  status: string;
  is_application_open: boolean;
  quota?: number | null;
  active_period?: ActivePeriod | null;
  active_students?: Array<unknown>;
  alumni?: Array<unknown>;
}

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "passive">("all");

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const response = await api.get<{ projects: Project[] }>("/panel/projects/manageable");
        setProjects(response.data.projects ?? []);
      } catch (error) {
        console.error("Admin projeleri yuklenemedi", error);
      } finally {
        setLoading(false);
      }
    };

    void loadProjects();
  }, []);

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesSearch = `${project.name} ${project.type} ${project.slug}`.toLowerCase().includes(search.toLowerCase());
      const normalizedStatus = project.status === "active" ? "active" : "passive";
      const matchesStatus = statusFilter === "all" || normalizedStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [projects, search, statusFilter]);

  const openApplications = projects.filter((project) => project.is_application_open).length;
  const activeProjects = projects.filter((project) => project.status === "active").length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-400">
            <Layers className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Proje Yonetimi</h1>
            <p className="text-sm text-muted-foreground">Yonetebildiginiz projeleri, aktif donemlerini ve public vitrin durumunu buradan takip edin.</p>
          </div>
        </div>
        <PermissionGate permission="projects.export">
          <ExportButtons endpoint="/panel/projects/export" filename="projeler" buttonLabel="Projeleri Disa Aktar" />
        </PermissionGate>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <div className="glass-panel rounded-3xl p-6">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Toplam Yonetilebilir Proje</div>
          <div className="mt-3 text-3xl font-black text-slate-900">{projects.length}</div>
        </div>
        <div className="glass-panel rounded-3xl p-6">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Aktif Projeler</div>
          <div className="mt-3 text-3xl font-black text-slate-900">{activeProjects}</div>
        </div>
        <div className="glass-panel rounded-3xl p-6">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Basvurusu Acik Projeler</div>
          <div className="mt-3 text-3xl font-black text-slate-900">{openApplications}</div>
        </div>
      </div>

      <div className="glass-panel rounded-3xl p-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Proje adi, turu veya slug ile ara"
              className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none placeholder:text-muted-foreground focus:border-indigo-500/40"
            />
          </label>
          <div className="flex gap-2">
            {(["all", "active", "passive"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`rounded-2xl px-4 py-3 text-xs font-bold uppercase tracking-widest transition-colors ${
                  statusFilter === filter ? "bg-indigo-600 text-white" : "border border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10"
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
        <div className="glass-panel rounded-3xl p-16 text-center text-muted-foreground">Bu filtreye uygun proje bulunamadi.</div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredProjects.map((project) => (
            <div key={project.id} className="glass-panel rounded-3xl border-white/10 p-6">
              <div className="mb-6 flex items-start justify-between gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-indigo-400">
                  <Layers className="h-6 w-6" />
                </div>
                <div className={`rounded-md px-2 py-1 text-[10px] font-black uppercase tracking-tighter ${project.status === "active" ? "bg-green-500/20 text-green-500" : "bg-white/10 text-muted-foreground"}`}>
                  {project.status}
                </div>
              </div>

              <h3 className="mb-2 text-xl font-bold text-slate-900">{project.name}</h3>
              <p className="mb-6 text-xs font-black uppercase tracking-widest text-muted-foreground">{project.type}</p>

              <div className="space-y-3">
                <div className="rounded-2xl bg-white/5 p-4">
                  <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    Aktif Donem
                  </div>
                  <span className="text-sm font-bold text-slate-900">{project.active_period?.name || "Aktif donem yok"}</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-white/5 p-4">
                    <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase text-muted-foreground">
                      <Users className="h-3 w-3" />
                      Aktif Ogrenci
                    </div>
                    <span className="text-sm font-bold text-slate-900">{project.active_students?.length ?? 0}</span>
                  </div>
                  <div className="rounded-2xl bg-white/5 p-4">
                    <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase text-muted-foreground">
                      <Users className="h-3 w-3" />
                      Mezun
                    </div>
                    <span className="text-sm font-bold text-slate-900">{project.alumni?.length ?? 0}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between gap-2 border-t border-white/5 pt-4">
                {project.is_application_open ? (
                  <div className="flex items-center gap-1 text-[10px] font-bold text-green-500">
                    <CheckCircle2 className="h-3 w-3" />
                    BASVURU ACIK
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-[10px] font-bold text-red-500">
                    <XCircle className="h-3 w-3" />
                    BASVURU KAPALI
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Link href={`/panel/projects/${project.id}`} className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-900 transition-colors hover:bg-white/10">
                    Detay
                  </Link>
                  <PermissionGate permission="projects.application_form.update" requireProjectAccess={{ permission: "projects.application_form.update", projectId: project.id }}>
                    <Link
                      href={`/panel/periods/form-builder?project_id=${project.id}`}
                      className="inline-flex items-center gap-1 rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-indigo-300 transition-colors hover:bg-indigo-500/20 hover:text-indigo-200"
                    >
                      Form
                    </Link>
                  </PermissionGate>
                  <PermissionGate permission="projects.content.update" requireProjectAccess={{ permission: "projects.content.update", projectId: project.id }}>
                    <Link href={`/panel/projects/${project.id}/content`} className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-indigo-600/20 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-indigo-300 transition-colors hover:bg-indigo-600/40 hover:text-white">
                      <PencilLine className="h-3 w-3" />
                      Duzenle
                    </Link>
                  </PermissionGate>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
