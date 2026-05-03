"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, Search } from "lucide-react";
import api from "@/lib/api/axios";

interface Project {
  id: number;
  name: string;
  slug: string;
  type: string;
  short_description: string;
  cover_image: string | null;
  status: string;
  is_application_open: boolean;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      try {
        const response = await api.get<{ projects: Project[] }>("/projects", {
          params: { search: searchTerm.trim() || undefined },
        });
        setProjects(response.data.projects ?? []);
      } catch (error) {
        console.error("Projeler yuklenemedi", error);
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };

    const timer = window.setTimeout(() => {
      void fetchProjects();
    }, 250);

    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  return (
    <div className="relative min-h-[calc(100vh-80px)] overflow-hidden bg-background pt-12 pb-24">
      <div className="absolute right-0 top-0 -z-10 h-[600px] w-[600px] rounded-full bg-primary/10 blur-[150px]" />
      <div className="absolute left-[-120px] top-[180px] -z-10 h-[420px] w-[420px] rounded-full bg-accent/10 blur-[140px]" />

      <div className="container mx-auto px-6">
        <div className="mb-16 text-center md:text-left">
          <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-4 text-4xl font-extrabold tracking-tight md:text-5xl">
            Projelerimiz
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.1 }} className="max-w-2xl text-lg text-muted-foreground">
            KADEME altindaki gelisim, mentorluk, diplomasi ve destek odakli proje akislari burada listelenir.
          </motion.p>
        </div>

        <div className="mb-10 max-w-2xl">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Proje ara..."
              className="w-full rounded-2xl border border-border bg-input py-4 pl-12 pr-6 outline-none transition-all duration-300 focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : projects.length === 0 ? (
          <div className="glass-panel rounded-3xl p-16 text-center text-muted-foreground">
            Su an listelenecek proje bulunmuyor.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="glass-panel group flex h-full flex-col overflow-hidden rounded-3xl border border-border/60 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-slate-900/10"
              >
                <div className="relative h-48 overflow-hidden bg-muted">
                  {project.cover_image ? (
                    <Image
                      src={project.cover_image}
                      alt={project.name}
                      fill
                      unoptimized
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                      <span className="text-4xl font-black text-foreground/20">{project.type}</span>
                    </div>
                  )}

                  <div className="absolute right-4 top-4 rounded-full bg-slate-900/80 px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-50 backdrop-blur">
                    {project.is_application_open ? "Basvuru Acik" : "Basvuru Kapali"}
                  </div>
                </div>

                <div className="flex flex-grow flex-col p-6">
                  <h3 className="mb-2 text-2xl font-bold transition-colors group-hover:text-primary">{project.name}</h3>
                  <p className="mb-6 line-clamp-3 text-sm text-muted-foreground">{project.short_description || "Bu proje icin ozet bilgi girilmemis."}</p>

                  <div className="mt-auto flex items-center justify-between border-t border-border pt-4">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{project.type || "Proje"}</span>
                    <Link href={`/projects/${project.slug}`} className="inline-flex items-center gap-1 text-sm font-semibold text-primary transition-all duration-300 hover:gap-2">
                      Detaylari Gor
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
