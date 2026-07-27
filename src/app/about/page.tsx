"use client";

import { motion } from "framer-motion";
import { ArrowRight, BookOpen, CalendarDays, Eye, HelpCircle, Loader2, Sparkles, Target } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PublicBadge, PublicButton, PublicCard, PublicCounter, PublicGradientTitle, PublicHeroSection, PublicIconBadge } from "@/components/public";
import api from "@/lib/api/axios";
import { defaultSiteSettings, SiteSettingsPayload, SiteSettingsResponse } from "@/lib/site-config";

type BlogSummary = { id: number; title: string; slug: string };
type FaqGroups = Record<string, Array<{ id: number; question: string }>>;

export default function AboutPage() {
  const [settings, setSettings] = useState<SiteSettingsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [blogCount, setBlogCount] = useState(0);
  const [faqCount, setFaqCount] = useState(0);
  const [featuredBlogs, setFeaturedBlogs] = useState<BlogSummary[]>([]);
  const [featuredFaqs, setFeaturedFaqs] = useState<Array<{ id: number; question: string; category: string }>>([]);

  useEffect(() => {
    const loadAbout = async () => {
      try {
        const [configResponse, blogResponse, faqResponse] = await Promise.all([
          api.get<SiteSettingsResponse>("/site-config"),
          api.get<{ blogs: BlogSummary[] | { data?: BlogSummary[] } }>("/blogs").catch(() => ({ data: { blogs: [] as BlogSummary[] } })),
          api.get<{ faqs: FaqGroups }>("/faqs").catch(() => ({ data: { faqs: {} as FaqGroups } })),
        ]);

        setSettings(configResponse.data.settings ?? null);
        const rawBlogs = blogResponse.data.blogs;
        const blogs = Array.isArray(rawBlogs) ? rawBlogs : rawBlogs?.data ?? [];
        const faqs = faqResponse.data.faqs ?? {};

        setBlogCount(blogs.length);
        setFaqCount(Object.values(faqs).reduce((sum, group) => sum + group.length, 0));
        setFeaturedBlogs(blogs.slice(0, 2));
        setFeaturedFaqs(Object.entries(faqs).flatMap(([category, items]) => items.map((item) => ({ ...item, category }))).slice(0, 3));
      } catch (error) {
        console.error("Hakkımızda verileri çekilemedi", error);
      } finally {
        setLoading(false);
      }
    };

    void loadAbout();
  }, []);

  const pageSettings = settings ?? defaultSiteSettings;
  const stats = useMemo(
    () => [
      { label: "Blog Yazısı", value: blogCount, tone: "text-slate-950" },
      { label: "SSS Maddesi", value: faqCount, tone: "text-[#fd3a25]" },
    ],
    [blogCount, faqCount],
  );

  if (loading) {
    return (
      <main className="kdm-public-shell flex min-h-[70vh] items-center justify-center bg-[#edecec] pt-24">
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-slate-200 bg-white/80 px-8 py-7 shadow-xl shadow-slate-900/5 backdrop-blur">
          <Loader2 className="h-10 w-10 animate-spin text-orange-600" />
          <span className="text-sm font-bold text-slate-600">Sayfa ayarları yükleniyor...</span>
        </div>
      </main>
    );
  }

  return (
    <main className="kdm-public-shell relative min-h-screen overflow-hidden bg-[#edecec] pb-24">
      <PublicHeroSection
        badge={<PublicBadge><Sparkles className="h-3.5 w-3.5" /> KADEME Hakkında</PublicBadge>}
        title={<h1 className="kdm-public-heading-title max-w-5xl text-balance" style={{ letterSpacing: '-0.02em' }}>{pageSettings.about.hero_title}</h1>}
        description={<p className="mt-7 max-w-3xl text-base leading-8 text-[#3f4653] sm:text-lg">{pageSettings.about.hero_description}</p>}
        aside={
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="grid gap-3 sm:grid-cols-2">
            {stats.map((item) => (
              <div key={item.label} className="kdm-public-stat-card">
                <div className={`text-3xl font-black ${item.tone}`}><PublicCounter value={item.value} /></div>
                <div className="mt-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{item.label}</div>
              </div>
            ))}
            <div className="kdm-public-stat-card sm:col-span-2">
              <div className="flex justify-center text-[#fd3a25]"><CalendarDays className="h-8 w-8" /></div>
              <div className="mt-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Dinamik Vitrin</div>
            </div>
          </motion.div>
        }
      />

      <section className="container mx-auto px-4 py-14 sm:px-6 lg:py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]"
        >
          <PublicCard className="p-7 sm:p-8">
            <PublicIconBadge className="mb-7 h-16 w-16 rounded-[1.25rem] bg-slate-950 shadow-[0_16px_32px_rgba(9,9,11,0.24),inset_0_1px_0_rgba(255,255,255,0.06)]">
              <Target className="h-8 w-8" />
            </PublicIconBadge>
            <h2 className="text-3xl font-semibold text-slate-950" style={{ letterSpacing: '-0.02em' }}>{pageSettings.about.mission_title}</h2>
            <p className="mt-5 text-base leading-8 text-slate-600">{pageSettings.about.mission_text}</p>
          </PublicCard>
          <PublicCard tone="gradient" className="p-7 sm:p-8">
            <PublicIconBadge className="mb-7 h-16 w-16 rounded-[1.25rem] bg-orange-600 shadow-[0_16px_32px_rgba(253,58,37,0.28),inset_0_1px_0_rgba(255,255,255,0.16)]">
              <Eye className="h-8 w-8" />
            </PublicIconBadge>
            <h2 className="text-3xl font-black text-slate-950">{pageSettings.about.vision_title}</h2>
            <p className="mt-5 text-base leading-8 text-slate-700">{pageSettings.about.vision_text}</p>
          </PublicCard>
        </motion.div>

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          <PublicCard>
            <PublicIconBadge className="mb-5 bg-slate-950"><HelpCircle className="h-6 w-6" /></PublicIconBadge>
            <h3 className="text-xl font-black text-slate-950">{pageSettings.about.faq_teaser_title}</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">{pageSettings.about.faq_teaser_text}</p>
            <div className="mt-5 space-y-2">
              {featuredFaqs.length ? featuredFaqs.map((faq) => <Link key={faq.id} href="/faq" className="block rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700">{faq.question}</Link>) : <p className="text-sm text-slate-500">SSS içerikleri yakında listelenecek.</p>}
            </div>
          </PublicCard>
          <PublicCard>
            <PublicIconBadge className="mb-5 bg-slate-950"><CalendarDays className="h-6 w-6" /></PublicIconBadge>
            <h3 className="text-xl font-black text-slate-950">{pageSettings.about.activities_teaser_title}</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">{pageSettings.about.activities_teaser_text}</p>
            <PublicButton href="/activities" variant="secondary" size="sm" className="mt-5" icon={<ArrowRight className="h-4 w-4" />}>Faaliyetlere Git</PublicButton>
          </PublicCard>
          <PublicCard>
            <PublicIconBadge className="mb-5 bg-orange-600"><BookOpen className="h-6 w-6" /></PublicIconBadge>
            <h3 className="text-xl font-black text-slate-950">{pageSettings.about.blog_teaser_title}</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">{pageSettings.about.blog_teaser_text}</p>
            <div className="mt-5 space-y-2">
              {featuredBlogs.length ? featuredBlogs.map((blog) => <Link key={blog.id} href={`/blog/${blog.slug}`} className="block rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700">{blog.title}</Link>) : <p className="text-sm text-slate-500">Blog içerikleri yakında listelenecek.</p>}
            </div>
          </PublicCard>
        </div>
      </section>
    </main>
  );
}
