"use client";

import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Calendar, ChevronLeft, ChevronRight, Loader2, Search, User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PublicBadge, PublicCard, PublicCounter, PublicHeroSection } from "@/components/public";
import api from "@/lib/api/axios";
import { defaultSiteSettings, type SiteSettingsResponse } from "@/lib/site-config";

type Blog = { id: number; title: string; slug: string; summary: string; cover_image: string | null; published_at: string };
type Paginated<T> = { data: T[]; current_page: number; last_page: number; total: number };

const blogFallbackImages = [
  "/aigocy/images/blog/blog-1.jpg",
  "/aigocy/images/blog/blog-2.jpg",
  "/aigocy/images/blog/blog-3.jpg",
  "/aigocy/images/blog/blog-4.jpg",
  "/aigocy/images/blog/blog-5.jpg",
  "/aigocy/images/blog/blog-6.jpg",
];

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Tarih yok";
  return date.toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" });
}

export default function BlogPage() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [copy, setCopy] = useState(defaultSiteSettings.blog_page);

  useEffect(() => {
    const fetchCopy = async () => {
      try {
        const response = await api.get<SiteSettingsResponse>("/site-config");
        setCopy(response.data.settings?.blog_page ?? defaultSiteSettings.blog_page);
      } catch (error) {
        console.error("Blog sayfa metinleri yüklenemedi", error);
      }
    };
    void fetchCopy();
  }, []);

  useEffect(() => {
    const fetchBlogs = async () => {
      setLoading(true);
      try {
        const response = await api.get<{ blogs: Paginated<Blog> }>("/blogs", {
          params: { page, per_page: 12, search: searchTerm.trim() || undefined },
        });
        setBlogs(response.data.blogs.data ?? []);
        setLastPage(response.data.blogs.last_page ?? 1);
        setTotal(response.data.blogs.total ?? 0);
      } catch (error) {
        console.error("Bloglar çekilemedi", error);
        setBlogs([]);
        setLastPage(1);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    };
    const timer = window.setTimeout(() => void fetchBlogs(), 250);
    return () => window.clearTimeout(timer);
  }, [page, searchTerm]);

  return (
    <main className="kdm-public-shell relative min-h-screen overflow-hidden bg-[#edecec] pb-20 sm:pb-28">
      <PublicHeroSection
        align="left"
        badge={<PublicBadge><BookOpen className="h-3.5 w-3.5" />{copy.badge_label}</PublicBadge>}
        title={<h1 className="kdm-public-heading-title max-w-4xl text-balance" style={{ letterSpacing: '-0.02em' }}>{copy.title}</h1>}
        description={<p className="mt-7 max-w-2xl text-base leading-8 text-[#3f4653] sm:text-lg">{copy.description}</p>}
        aside={
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="lg:justify-self-end">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="kdm-public-stat-card"><div className="text-3xl font-black text-[#09090b]"><PublicCounter value={total} /></div><div className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#71717a]">Toplam</div></div>
              <div className="kdm-public-stat-card"><div className="text-3xl font-black text-[#fd3a25]"><PublicCounter value={blogs.length} /></div><div className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#71717a]">Gösterilen</div></div>
              <div className="kdm-public-stat-card col-span-2 sm:col-span-1"><div className="text-3xl font-black text-[#09090b]">{page}/{lastPage}</div><div className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#71717a]">Sayfa</div></div>
            </div>
          </motion.div>
        }
        bottom={
          <div className="kdm-public-surface rounded-[2rem] border bg-white/80 p-4 shadow-[0_18px_60px_rgba(9,9,11,0.08)] backdrop-blur-xl sm:p-5">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#a1a1aa]" />
              <input value={searchTerm} onChange={(event) => { setSearchTerm(event.target.value); setPage(1); }} placeholder={copy.search_placeholder} className="kdm-public-input pl-12" />
            </label>

          </div>
        }
      />

      <section className="container mx-auto px-4 py-14 sm:px-6 lg:py-20">
        {loading ? (
          <div className="flex justify-center py-20"><div className="flex flex-col items-center gap-4 rounded-3xl border border-slate-200 bg-white/80 px-8 py-7 shadow-xl shadow-slate-900/5 backdrop-blur"><Loader2 className="h-10 w-10 animate-spin text-orange-600" /><span className="text-sm font-bold text-slate-600">Blog yazıları yükleniyor...</span></div></div>
        ) : blogs.length === 0 ? (
          <PublicCard className="py-16 text-center"><h2 className="text-2xl font-black text-slate-950">Yazı bulunamadı</h2><p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-600">Henüz yayına alınmış blog yazısı bulunmuyor.</p></PublicCard>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {blogs.map((blog, index) => (
              <motion.article key={blog.id} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: Math.min(index * 0.04, 0.2) }} className="group h-full">
                <PublicCard interactive className="flex h-full flex-col overflow-hidden p-4 sm:p-5">
                  <Link href={`/blog/${blog.slug}`} className="kdm-public-media-frame relative mb-5 block aspect-[16/10] overflow-hidden rounded-[1.35rem] bg-[#e7e7e4]">
                    <Image src={blog.cover_image || blogFallbackImages[index % blogFallbackImages.length]} alt={blog.title} fill unoptimized={Boolean(blog.cover_image)} className="object-cover transition duration-700 group-hover:scale-105" sizes="(min-width: 1280px) 380px, (min-width: 768px) 50vw, 100vw" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                  </Link>
                  <div className="flex flex-1 flex-col">
                    <div className="mb-3 flex flex-wrap gap-3 text-xs font-bold text-slate-500"><span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5 text-[#fd3a25]" />{formatDate(blog.published_at)}</span><span className="inline-flex items-center gap-1"><User className="h-3.5 w-3.5 text-[#fd3a25]" />KADEME</span></div>
                    <h2 className="text-2xl font-semibold leading-tight text-slate-950 transition-colors duration-300 group-hover:text-[#fd3a25]" style={{ letterSpacing: '-0.01em' }}>{blog.title}</h2>
                    <p className="mt-4 line-clamp-3 text-sm leading-7 text-slate-600">{blog.summary}</p>
                    <Link href={`/blog/${blog.slug}`} className="mt-auto flex items-center gap-2 pt-6 text-sm font-black text-[#fd3a25]">Devamını Oku <ArrowRight className="h-4 w-4" /></Link>
                  </div>
                </PublicCard>
              </motion.article>
            ))}
          </div>
        )}

        {lastPage > 1 ? <div className="mt-10 flex items-center justify-center gap-3"><button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1} className="kdm-public-page-button"><ChevronLeft className="h-4 w-4" /></button><span className="text-sm font-black text-slate-600">{page} / {lastPage}</span><button type="button" onClick={() => setPage((value) => Math.min(lastPage, value + 1))} disabled={page === lastPage} className="kdm-public-page-button"><ChevronRight className="h-4 w-4" /></button></div> : null}
      </section>
    </main>
  );
}
