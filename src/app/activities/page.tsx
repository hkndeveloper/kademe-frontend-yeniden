"use client";

import { useEffect, useMemo, useState } from "react";
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

export default function ActivitiesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProject, setSelectedProject] = useState("all");
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettingsPayload>(defaultSiteSettings);

  useEffect(() => {
    const loadActivities = async () => {
      try {
        const [projectsResponse, programsResponse, configResponse] = await Promise.all([
          api.get<{ projects: Project[] }>("/projects").catch(() => ({ data: { projects: [] as Project[] } })),
          api.get<{ programs: Program[] }>("/activities").catch(() => ({ data: { programs: [] as Program[] } })),
          api.get<SiteSettingsResponse>("/site-config").catch(() => ({ data: { settings: defaultSiteSettings } })),
        ]);

        setProjects(projectsResponse.data.projects ?? []);
        setPrograms(programsResponse.data.programs ?? []);
        setSiteSettings(configResponse.data.settings ?? defaultSiteSettings);
      } catch (error) {
        console.error("Faaliyet verileri cekilemedi", error);
        setPrograms([]);
      } finally {
        setLoading(false);
      }
    };

    void loadActivities();
  }, []);

  const filteredPrograms = useMemo(() => {
    return programs.filter((program) => {
      const matchesSearch =
        program.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (program.project?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (program.location || "").toLowerCase().includes(searchTerm.toLowerCase());

      const projectId = String(program.project?.id ?? program.project_id ?? "");
      const matchesProject = selectedProject === "all" || projectId === selectedProject;

      return matchesSearch && matchesProject;
    });
  }, [programs, searchTerm, selectedProject]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <section className="relative overflow-hidden border-b border-border/40 py-24">
        <div className="absolute inset-0 bg-primary/5" />
        <div className="container relative z-10 mx-auto px-6 text-center">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 text-4xl font-black md:text-6xl">
            {siteSettings.homepage.activities_title}
          </motion.h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">{siteSettings.homepage.activities_description}</p>
        </div>
      </section>

      <div className="container mx-auto mt-16 px-6">
        <div className="mb-12 flex flex-col gap-4 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Faaliyet ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-2xl border border-border bg-input py-4 pl-12 pr-6 outline-none transition-all focus:ring-2 focus:ring-primary"
            />
          </div>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="rounded-2xl border border-border bg-input px-6 py-4 text-sm font-bold outline-none transition-all focus:ring-2 focus:ring-primary"
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
        ) : filteredPrograms.length === 0 ? (
          <div className="glass-panel rounded-3xl p-16 text-center">
            <h3 className="mb-3 text-2xl font-bold text-foreground">Gosterilecek faaliyet bulunamadi</h3>
            <p className="mx-auto max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Henuz yayinlanmis bir faaliyet bulunmuyor veya mevcut filtreye uygun program kaydi yok.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {filteredPrograms.map((program) => (
              <Link key={program.id} href={`/activities/${program.id}`}>
              <motion.div
                key={program.id}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="glass-panel rounded-3xl p-6 transition-transform hover:-translate-y-1 md:p-8"
              >
                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                  <div className="flex flex-1 items-center gap-6">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-2xl font-black text-primary">
                      {(program.project?.name || "P")[0]}
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                        {program.project?.name || "Program"}
                      </span>
                      <h3 className="text-2xl font-bold text-foreground">{program.title}</h3>
                      <div className="mt-2 flex flex-wrap gap-6 text-sm font-medium text-muted-foreground">
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

                  <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    {program.status}
                  </div>
                </div>
              </motion.div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
