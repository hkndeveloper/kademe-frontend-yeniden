"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Loader2, MapPin, Search } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api/axios";
import { defaultSiteSettings, SiteSettingsPayload, SiteSettingsResponse } from "@/lib/site-config";

interface Project {
  id: number;
  name: string;
  slug: string;
}

interface Program {
  id: number;
  title: string;
  location?: string | null;
  start_at: string;
  status: string;
  project_id?: number;
  project?: {
    id: number;
    name: string;
    slug: string;
  };
}

interface Paginated<T> {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
}

export default function ActivitiesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProject, setSelectedProject] = useState("all");
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [siteSettings, setSiteSettings] = useState<SiteSettingsPayload | null>(null);

  useEffect(() => {
    const loadStaticData = async () => {
      try {
        const [projectsResponse, configResponse] = await Promise.all([
          api.get<{ projects: Project[] }>("/projects").catch(() => ({ data: { projects: [] as Project[] } })),
          api.get<SiteSettingsResponse>("/site-config"),
        ]);

        setProjects(projectsResponse.data.projects ?? []);
        setSiteSettings(configResponse.data.settings ?? null);
      } catch (error) {
        console.error("Faaliyet statik verileri cekilemedi", error);
      }
    };

    void loadStaticData();
  }, []);

  useEffect(() => {
    const loadPrograms = async () => {
      setLoading(true);
      try {
        const response = await api.get<{ programs: Paginated<Program> }>("/activities", {
          params: {
            page,
            per_page: 12,
            search: searchTerm.trim() || undefined,
            project_id: selectedProject === "all" ? undefined : selectedProject,
          },
        });

        const payload = response.data.programs;
        setPrograms(payload.data ?? []);
        setLastPage(payload.last_page ?? 1);
        setTotal(payload.total ?? 0);
      } catch (error) {
        console.error("Faaliyet verileri cekilemedi", error);
        setPrograms([]);
        setLastPage(1);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    };

    const timer = window.setTimeout(() => {
      void loadPrograms();
    }, 250);

    return () => window.clearTimeout(timer);
  }, [page, searchTerm, selectedProject]);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setPage(1);
  };

  const handleProjectChange = (value: string) => {
    setSelectedProject(value);
    setPage(1);
  };

  const pageSettings = siteSettings ?? defaultSiteSettings;

  return (
    <div className="min-h-screen bg-background pb-24">
      <section className="relative overflow-hidden border-b border-border/40 py-14 sm:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,oklch(0.74_0.18_45/0.13),transparent_42%),radial-gradient(circle_at_80%_80%,oklch(0.56_0.12_255/0.1),transparent_45%)]" />
        <div className="container relative z-10 mx-auto px-4 text-center sm:px-6">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-4 text-3xl font-black sm:mb-6 sm:text-4xl md:text-6xl">
            {pageSettings.homepage.activities_title}
          </motion.h1>
          <p className="mx-auto max-w-2xl text-base text-muted-foreground sm:text-lg">{pageSettings.homepage.activities_description}</p>
        </div>
      </section>

      <div className="container mx-auto mt-10 px-4 sm:mt-16 sm:px-6">
        <div className="mb-8 flex flex-col gap-3 md:mb-12 md:flex-row md:gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Faaliyet ara..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full rounded-2xl border border-border bg-input py-3.5 pl-12 pr-6 outline-none transition-all duration-300 focus:ring-2 focus:ring-primary focus:shadow-md sm:py-4"
            />
          </div>
          <select
            value={selectedProject}
            onChange={(e) => handleProjectChange(e.target.value)}
            className="rounded-2xl border border-border bg-input px-5 py-3.5 text-sm font-bold outline-none transition-all duration-300 focus:ring-2 focus:ring-primary focus:shadow-md sm:px-6 sm:py-4"
          >
            <option value="all">Tum Projeler</option>
            {projects.map((project) => (
              <option key={project.id} value={String(project.id)}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : programs.length === 0 ? (
          <div className="glass-panel rounded-3xl p-8 text-center sm:p-16">
            <h3 className="mb-3 text-xl font-bold text-foreground sm:text-2xl">Gosterilecek faaliyet bulunamadi</h3>
            <p className="mx-auto max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Henuz yayinlanmis bir faaliyet bulunmuyor veya mevcut filtreye uygun program kaydi yok.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {programs.map((program) => (
              <Link key={program.id} href={`/activities/${program.id}`}>
              <motion.div
                key={program.id}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="glass-panel group rounded-2xl border border-border/70 p-5 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-slate-900/10 sm:rounded-3xl md:p-8"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex flex-1 items-start gap-4 sm:items-center sm:gap-6">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-xl font-black text-primary sm:h-16 sm:w-16 sm:text-2xl">
                      {(program.project?.name || "P")[0]}
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                        {program.project?.name || "Program"}
                      </span>
                      <h3 className="text-xl font-bold text-foreground transition-colors duration-300 group-hover:text-primary sm:text-2xl">{program.title}</h3>
                      <div className="mt-2 flex flex-col gap-2 text-sm font-medium text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-6">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {new Date(program.start_at).toLocaleDateString("tr-TR")}
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {program.location || "Konum bilgisi yok"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="w-fit rounded-xl border border-border bg-muted/40 px-4 py-3 text-xs font-bold uppercase tracking-widest text-muted-foreground md:ml-4">
                    {program.status}
                  </div>
                </div>
              </motion.div>
              </Link>
            ))}
          </div>
        )}

        {!loading && total > 0 ? (
          <div className="mt-10 flex flex-col items-center justify-between gap-4 rounded-2xl border border-border bg-card/60 p-4 text-sm text-muted-foreground sm:flex-row">
            <span>{total.toLocaleString("tr-TR")} faaliyet icinden {programs.length} kayit gosteriliyor.</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(current - 1, 1))}
                disabled={page <= 1}
                className="rounded-xl border border-border px-4 py-2 font-bold disabled:cursor-not-allowed disabled:opacity-50"
              >
                Onceki
              </button>
              <span className="px-3 font-bold text-foreground">{page} / {lastPage}</span>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(current + 1, lastPage))}
                disabled={page >= lastPage}
                className="rounded-xl border border-border px-4 py-2 font-bold disabled:cursor-not-allowed disabled:opacity-50"
              >
                Sonraki
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
