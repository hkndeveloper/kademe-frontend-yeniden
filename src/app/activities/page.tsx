"use client";

import { motion } from "framer-motion";
import { ArrowRight, Calendar, ChevronLeft, ChevronRight, Loader2, MapPin, Search, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PublicBadge, PublicCard, PublicCounter, PublicGradientTitle, PublicHeroSection } from "@/components/public";
import api from "@/lib/api/axios";
import { defaultSiteSettings, SiteSettingsPayload, SiteSettingsResponse } from "@/lib/site-config";

type Project = { id: number; name: string; slug: string };
type Program = { id: number; title: string; location?: string | null; start_at: string; status: string; project_id?: number; project?: Project };
type Paginated<T> = { data: T[]; current_page: number; last_page: number; total: number };

const statusLabels: Record<string, string> = {
  scheduled: "Planlandı",
  active: "Devam Ediyor",
  completed: "Tamamlandı",
  cancelled: "İptal Edildi",
};

const activityImages = [
  "/aigocy/images/section/hero-1.jpg",
  "/aigocy/images/section/service-4.jpg",
  "/aigocy/images/section/quotes-1.jpg",
  "/aigocy/images/section/tes-1.jpg",
  "/aigocy/images/section/tes-2.jpg",
  "/aigocy/images/section/tes-3.jpg",
];

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Tarih bilgisi yok";
  return date.toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" });
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
        console.error("Faaliyet statik verileri çekilemedi", error);
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
        console.error("Faaliyet verileri çekilemedi", error);
        setPrograms([]);
        setLastPage(1);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    };
    const timer = window.setTimeout(() => void loadPrograms(), 250);
    return () => window.clearTimeout(timer);
  }, [page, searchTerm, selectedProject]);

  const pageSettings = siteSettings ?? defaultSiteSettings;

  return (
    <main className="kdm-public-shell relative min-h-screen overflow-hidden bg-[#edecec] pb-20 sm:pb-28">
      <PublicHeroSection
        badge={<PublicBadge><Sparkles className="h-3.5 w-3.5" /> KADEME Faaliyet Takvimi</PublicBadge>}
        title={<h1 className="kdm-public-heading-title max-w-5xl text-balance">{pageSettings.homepage.activities_title || "Faaliyetler"} <PublicGradientTitle>akışı</PublicGradientTitle></h1>}
        description={<p className="mt-7 max-w-2xl text-base leading-8 text-[#3f4653] sm:text-lg">{pageSettings.homepage.activities_description}</p>}
        aside={
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:justify-self-end">
            <div className="kdm-public-stat-card"><div className="text-3xl font-black text-slate-950"><PublicCounter value={total} /></div><div className="mt-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Toplam</div></div>
            <div className="kdm-public-stat-card"><div className="text-3xl font-black text-[#fd3a25]"><PublicCounter value={programs.length} /></div><div className="mt-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Gösterilen</div></div>
            <div className="kdm-public-stat-card col-span-2 sm:col-span-1"><div className="text-3xl font-black text-slate-950"><PublicCounter value={projects.length} /></div><div className="mt-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Proje</div></div>
          </motion.div>
        }
        bottom={
          <div className="kdm-public-surface rounded-[2rem] border border-white/80 bg-white/72 p-4 shadow-[0_18px_60px_rgba(9,9,11,0.08)] backdrop-blur sm:p-5 lg:p-6">
            <div className="grid gap-4 lg:grid-cols-[1fr_18rem] lg:items-center">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input value={searchTerm} onChange={(event) => { setSearchTerm(event.target.value); setPage(1); }} placeholder="Faaliyet adı, proje veya konum ara..." className="kdm-public-input pl-12" />
              </label>
              <select value={selectedProject} onChange={(event) => { setSelectedProject(event.target.value); setPage(1); }} className="kdm-public-select">
                <option value="all">Tüm Projeler</option>
                {projects.map((project) => <option key={project.id} value={String(project.id)}>{project.name}</option>)}
              </select>
            </div>

          </div>
        }
      />

      <section className="container mx-auto px-4 py-14 sm:px-6 lg:py-20">
        {loading ? (
          <div className="flex justify-center py-20"><div className="flex flex-col items-center gap-4 rounded-3xl border border-slate-200 bg-white/80 px-8 py-7 shadow-xl shadow-slate-900/5 backdrop-blur"><Loader2 className="h-10 w-10 animate-spin text-orange-600" /><span className="text-sm font-bold text-slate-600">Faaliyetler yükleniyor...</span></div></div>
        ) : programs.length === 0 ? (
          <PublicCard className="py-16 text-center"><h2 className="text-2xl font-black text-slate-950">Gösterilecek faaliyet bulunamadı</h2><p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-600">Henüz yayına alınmış faaliyet bulunmuyor veya mevcut filtreye uygun program kaydı yok.</p></PublicCard>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {programs.map((program, index) => (
              <motion.article key={program.id} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: Math.min(index * 0.04, 0.2) }} className="group h-full">
                <Link href={`/activities/${program.id}`}>
                  <PublicCard interactive className="flex h-full flex-col overflow-hidden p-4 sm:p-5">
                    <div className="kdm-public-media-frame relative mb-5 aspect-[16/10] overflow-hidden rounded-[1.35rem] bg-[#e7e7e4]">
                      <Image src={activityImages[index % activityImages.length]} alt={program.title} fill className="object-cover transition duration-700 group-hover:scale-105" sizes="(min-width: 1280px) 380px, (min-width: 768px) 50vw, 100vw" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                      <span className="absolute left-4 top-4 rounded-full bg-[#fd3a25] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-white">{statusLabels[program.status] ?? program.status}</span>
                    </div>
                    <div className="flex flex-1 flex-col">
                      <div className="mb-3 flex flex-wrap gap-2 text-xs font-bold text-slate-500"><span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5 text-[#fd3a25]" />{formatDate(program.start_at)}</span>{program.location ? <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-[#fd3a25]" />{program.location}</span> : null}</div>
                      <h2 className="text-2xl font-black leading-tight text-slate-950 transition group-hover:text-[#fd3a25]">{program.title}</h2>
                      <p className="mt-3 text-sm font-semibold text-slate-500">{program.project?.name ?? projects.find((p) => p.id === program.project_id)?.name ?? "KADEME"}</p>
                      <div className="mt-auto flex items-center gap-2 pt-6 text-sm font-black text-[#fd3a25]">Detayı İncele <ArrowRight className="h-4 w-4" /></div>
                    </div>
                  </PublicCard>
                </Link>
              </motion.article>
            ))}
          </div>
        )}

        {lastPage > 1 ? <div className="mt-10 flex items-center justify-center gap-3"><button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1} className="kdm-public-page-button"><ChevronLeft className="h-4 w-4" /></button><span className="text-sm font-black text-slate-600">{page} / {lastPage}</span><button type="button" onClick={() => setPage((value) => Math.min(lastPage, value + 1))} disabled={page === lastPage} className="kdm-public-page-button"><ChevronRight className="h-4 w-4" /></button></div> : null}
      </section>
    </main>
  );
}
