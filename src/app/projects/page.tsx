"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Layers3, Loader2, Search, Sparkles } from "lucide-react";
import { PublicBadge, PublicButton, PublicCard, PublicCounter, PublicIconBadge } from "@/components/public";
import { PublicBreadcrumbs } from "@/components/shared/PublicBreadcrumbs";
import api from "@/lib/api/axios";
import { cn } from "@/lib/utils";

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

const projectShowcaseImages = [
  "/aigocy/images/section/featured-works-1.jpg",
  "/aigocy/images/section/featured-works-2.jpg",
  "/aigocy/images/section/featured-works-3.jpg",
  "/aigocy/images/section/featured-works-4.jpg",
];

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "open">("all");

  const sortedProjects = useMemo(() => {
    const list = [...projects];
    list.sort((a, b) => {
      if (a.is_application_open !== b.is_application_open) {
        return a.is_application_open ? -1 : 1;
      }
      return a.name.localeCompare(b.name, "tr");
    });
    return list;
  }, [projects]);

  const visibleProjects = useMemo(() => {
    if (filterMode === "open") {
      return sortedProjects.filter((project) => project.is_application_open);
    }
    return sortedProjects;
  }, [sortedProjects, filterMode]);

  const openProjectCount = useMemo(() => projects.filter((project) => project.is_application_open).length, [projects]);

  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      try {
        const response = await api.get<{ projects: Project[] }>("/projects", {
          params: { search: searchTerm.trim() || undefined },
        });
        setProjects(response.data.projects ?? []);
      } catch (error) {
        console.error("Projeler yüklenemedi", error);
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
    <main className="kdm-public-shell relative overflow-hidden bg-[#edecec] pb-20">
      <section className="relative isolate min-h-[72vh] overflow-hidden px-4 pb-16 pt-36 sm:px-5 sm:pt-40 lg:pt-44">
        <div className="absolute inset-4 top-4 overflow-hidden rounded-[2rem] bg-[#e5e5e3] sm:rounded-[2.5rem]">
          <div className="absolute inset-0 bg-[url('/aigocy/images/section/hero-1.jpg')] bg-cover bg-center opacity-45" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_35%,rgba(255,255,255,0.86),transparent_32rem),radial-gradient(circle_at_82%_20%,rgba(255,255,255,0.62),transparent_28rem),linear-gradient(180deg,rgba(237,236,236,0.22),rgba(237,236,236,0.74))]" />
        </div>

        <div className="container relative z-10 mx-auto px-4 sm:px-6">
          <PublicBreadcrumbs className="mb-12" items={[{ label: "Ana Sayfa", href: "/" }, { label: "Projeler" }]} />

          <div className="mx-auto max-w-5xl text-center">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
              <PublicBadge className="mb-6 bg-white/76 shadow-[0_6px_12px_rgba(9,9,11,0.16)] backdrop-blur-xl">
                <Sparkles className="h-3.5 w-3.5" />
                KADEME Proje Ekosistemi
              </PublicBadge>
              <h1 className="text-balance text-5xl font-semibold leading-[1.05] tracking-normal text-[#2f3337] sm:text-6xl lg:text-7xl xl:text-[6rem]">
                Projelerimizi
                <br />
                keşfedin
              </h1>
              <p className="mx-auto mt-7 max-w-3xl text-lg leading-8 text-[#292c2e]">
                KADEME altındaki gelişim, mentorluk, diplomasi ve destek odaklı proje akışları burada listelenir.
              </p>
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.08 }} className="mx-auto mt-12 grid max-w-3xl grid-cols-3 gap-3">
            <div className="kdm-public-stat-card">
              <div className="text-3xl font-black text-[#292c2e]"><PublicCounter value={projects.length} /></div>
              <div className="mt-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Proje</div>
            </div>
            <div className="kdm-public-stat-card">
              <div className="text-3xl font-black text-[#fd3a25]"><PublicCounter value={openProjectCount} /></div>
              <div className="mt-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Başvurusu Açık</div>
            </div>
            <div className="kdm-public-stat-card">
              <div className="text-3xl font-black text-[#292c2e]"><PublicCounter value={visibleProjects.length} /></div>
              <div className="mt-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Gösterilen</div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="container relative z-10 mx-auto -mt-8 px-4 sm:px-6">
        <div className="kdm-public-surface rounded-[1.75rem] border border-white/70 bg-white/80 p-4 shadow-[0_22px_70px_rgba(9,9,11,0.12),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-2xl sm:p-5 lg:p-6">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Proje adı, türü veya anahtar kelime ara..."
                className="kdm-public-input pl-[3.25rem]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-full border border-black/10 bg-[#f4f4f5] p-1">
              <button
                type="button"
                onClick={() => setFilterMode("all")}
                className={cn(
                  "kdm-public-button-micro h-12 rounded-full px-5 text-sm font-semibold transition",
                  filterMode === "all" ? "kdm-public-btn-dark text-white" : "text-zinc-600 hover:bg-white hover:text-[#09090b]",
                )}
              >
                Tümü
              </button>
              <button
                type="button"
                onClick={() => setFilterMode("open")}
                className={cn(
                  "kdm-public-button-micro h-12 rounded-full px-5 text-sm font-semibold transition",
                  filterMode === "open" ? "kdm-public-btn-brand text-white" : "text-zinc-600 hover:bg-white hover:text-[#09090b]",
                )}
              >
                Başvurusu Açık
              </button>
            </div>
          </div>

        </div>

        <div className="mt-14">
          <div className="mb-8 text-center">
            <span className="kdm-public-tag">Proje Vitrini</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-32">
              <div className="flex flex-col items-center gap-4 rounded-[1.75rem] border border-white/70 bg-white/80 px-8 py-7 shadow-xl shadow-slate-900/5 backdrop-blur">
                <Loader2 className="h-10 w-10 animate-spin text-[#fd3a25]" />
                <span className="text-sm font-bold text-zinc-600">Projeler yükleniyor...</span>
              </div>
            </div>
          ) : visibleProjects.length === 0 ? (
            <PublicCard className="py-16 text-center">
              <PublicIconBadge className="mx-auto mb-5 bg-[#09090b]">
                <Search className="h-6 w-6" />
              </PublicIconBadge>
              <h2 className="text-2xl font-black text-[#09090b]">Proje bulunamadı</h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-zinc-600">
                {projects.length === 0
                  ? "Şu an listelenecek proje bulunmuyor."
                  : "Seçilen filtreye uygun proje bulunmuyor. Farklı bir filtre veya arama deneyin."}
              </p>
              {searchTerm || filterMode !== "all" ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setFilterMode("all");
                  }}
                  className="kdm-public-btn-shine kdm-public-btn-dark mt-6 rounded-full px-6 py-3 text-sm font-semibold text-white"
                >
                  Filtreleri temizle
                </button>
              ) : null}
            </PublicCard>
          ) : (
            <div className="grid gap-8">
              {visibleProjects.map((project, index) => {
                const imageSrc = project.cover_image || projectShowcaseImages[index % projectShowcaseImages.length];
                return (
                  <motion.article
                    key={project.id}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: Math.min(index * 0.05, 0.25) }}
                    className="group kdm-public-project-card overflow-hidden rounded-[1.75rem] border border-black/10 bg-white shadow-[0_18px_60px_rgba(9,9,11,0.1)] transition duration-500 hover:-translate-y-1 hover:shadow-[0_30px_90px_rgba(9,9,11,0.16)]"
                  >
                    <div className="grid gap-0 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
                      <Link href={`/projects/${project.slug}`} className="kdm-public-media-frame relative block min-h-[18rem] overflow-hidden bg-[#09090b] kdm-public-dark-gradient sm:min-h-[24rem] lg:min-h-[28rem]">
                        <Image src={imageSrc} alt={project.name} fill unoptimized className="object-cover transition duration-700 group-hover:scale-105" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#09090b]/58 via-transparent to-transparent" />
                        <span className="absolute left-5 top-5 rounded-full bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#09090b] shadow-sm">
                          {project.is_application_open ? "Başvurusu Açık" : "Proje"}
                        </span>
                        <span className="absolute bottom-5 right-5 inline-flex items-center gap-2 rounded-full bg-[#09090b] bg-[linear-gradient(135deg,#202020_0%,#09090B_58%,#2B1714_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_42px_rgba(9,9,11,0.24)] transition group-hover:bg-[#fd3a25]">
                          Detay
                          <ArrowRight className="h-4 w-4" />
                        </span>
                      </Link>

                      <div className="flex min-h-full flex-col justify-between p-6 sm:p-8 lg:p-10">
                        <div>
                          <div className="mb-6 flex flex-wrap items-center gap-3">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em]",
                                project.is_application_open ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-600",
                              )}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {project.is_application_open ? "Başvurusu Açık" : "Başvuru Kapalı"}
                            </span>
                            <span className="rounded-full bg-[#f4f4f5] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-zinc-600">{project.type || "Proje"}</span>
                          </div>

                          <h2 className="max-w-2xl text-3xl font-semibold leading-tight text-[#292c2e] sm:text-4xl lg:text-5xl">{project.name}</h2>
                          <div className="mt-8 grid gap-5 md:grid-cols-3">
                            <div className="md:col-span-2">
                              <div className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">Açıklama</div>
                              <p className="line-clamp-4 text-sm font-semibold leading-7 text-[#52525b]">{project.short_description || "Bu proje için özet bilgi girilmemiş."}</p>
                            </div>
                            <div>
                              <div className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">Başvuru</div>
                              <p className="text-sm font-semibold leading-7 text-[#52525b]">{project.is_application_open ? "Başvuruya açık" : "Takipte kalın"}</p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-black/10 pt-5">
                          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
                            <Layers3 className="h-4 w-4 text-[#fd3a25]" />
                            KADEME Projesi
                          </div>
                          <PublicButton href={`/projects/${project.slug}`} variant="secondary" size="sm" icon={<ArrowRight className="h-4 w-4" />}>
                            Detayları Gör
                          </PublicButton>
                        </div>
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}


