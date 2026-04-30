"use client";

import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Eye, Target } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api/axios";
import { defaultSiteSettings, SiteSettingsPayload, SiteSettingsResponse } from "@/lib/site-config";

interface BlogSummary {
  id: number;
  title: string;
  slug: string;
}

type FaqGroups = Record<string, Array<{ id: number; question: string }>>;

export default function AboutPage() {
  const [settings, setSettings] = useState<SiteSettingsPayload | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
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
        const normalizedBlogs = Array.isArray(rawBlogs) ? rawBlogs : rawBlogs?.data ?? [];
        setBlogCount(normalizedBlogs.length);
        setFeaturedBlogs(normalizedBlogs.slice(0, 2));

        const faqGroups = faqResponse.data.faqs ?? {};
        const totalFaqs = Object.values(faqGroups).reduce((sum, group) => sum + group.length, 0);
        setFaqCount(totalFaqs);
        setFeaturedFaqs(
          Object.entries(faqGroups)
            .flatMap(([category, items]) => items.map((item) => ({ ...item, category })))
            .slice(0, 3),
        );
      } catch (error) {
        console.error("Hakkimizda verileri cekilemedi", error);
      } finally {
        setSettingsLoading(false);
      }
    };

    void loadAbout();
  }, []);

  const journeyStats = useMemo(
    () => [
      { label: "Blog Yazisi", value: String(blogCount) },
      { label: "SSS Maddesi", value: String(faqCount) },
    ],
    [blogCount, faqCount],
  );

  if (settingsLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-sm text-muted-foreground">Sayfa ayarlari yukleniyor...</div>
      </div>
    );
  }

  const pageSettings = settings ?? defaultSiteSettings;

  return (
    <div className="min-h-screen bg-background pb-24">
      <section className="relative overflow-hidden border-b border-border/40 py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_25%,oklch(0.74_0.18_45/0.14),transparent_42%),radial-gradient(circle_at_85%_75%,oklch(0.56_0.12_255/0.1),transparent_45%)]" />
        <div className="container relative z-10 mx-auto px-6 text-center">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 text-4xl font-black md:text-6xl">
            {pageSettings.about.hero_title}
          </motion.h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">{pageSettings.about.hero_description}</p>
        </div>
      </section>

      <div className="container mx-auto mt-20 space-y-24 px-6">
        <section className="grid grid-cols-1 gap-12 md:grid-cols-2">
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="glass-panel rounded-[40px] border border-border/70 p-10 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/10">
            <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Target className="h-8 w-8" />
            </div>
            <h2 className="mb-6 text-3xl font-black">{pageSettings.about.mission_title}</h2>
            <p className="leading-relaxed text-muted-foreground">{pageSettings.about.mission_text}</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="glass-panel rounded-[40px] border border-accent/20 p-10 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/10">
            <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 text-accent">
              <Eye className="h-8 w-8" />
            </div>
            <h2 className="mb-6 text-3xl font-black text-accent">{pageSettings.about.vision_title}</h2>
            <p className="leading-relaxed text-muted-foreground">{pageSettings.about.vision_text}</p>
          </motion.div>
        </section>

        <section className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          <div className="space-y-8">
            <h2 className="text-4xl font-black">
              {pageSettings.about.ecosystem_title.split(" ").slice(0, -1).join(" ")}
              <br />
              <span className="text-primary">{pageSettings.about.ecosystem_title.split(" ").slice(-1)}</span>
            </h2>
            <p className="text-lg leading-relaxed text-muted-foreground">{pageSettings.about.ecosystem_description}</p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-3xl border border-border/80 bg-muted/30 p-6 shadow-sm transition-all duration-300 hover:border-primary/20 hover:shadow-md">
                <h3 className="mb-2 font-bold text-foreground">{pageSettings.about.faq_teaser_title}</h3>
                <p className="mb-4 text-sm text-muted-foreground">{pageSettings.about.faq_teaser_text}</p>
                <div className="space-y-2">
                  {featuredFaqs.map((faq) => (
                    <Link
                      key={faq.id}
                      href="/faq"
                      className="block rounded-2xl border border-border/60 bg-card px-4 py-3 text-sm text-muted-foreground transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:text-foreground"
                    >
                      {faq.question}
                    </Link>
                  ))}
                </div>
              </div>
              <div className="rounded-3xl border border-border/80 bg-muted/30 p-6 shadow-sm transition-all duration-300 hover:border-primary/20 hover:shadow-md">
                <h3 className="mb-2 font-bold text-foreground">{pageSettings.about.blog_teaser_title}</h3>
                <p className="mb-4 text-sm text-muted-foreground">{pageSettings.about.blog_teaser_text}</p>
                <div className="space-y-2">
                  {featuredBlogs.map((blog) => (
                    <Link
                      key={blog.id}
                      href={`/blog/${blog.slug}`}
                      className="block rounded-2xl border border-border/60 bg-card px-4 py-3 text-sm text-muted-foreground transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:text-foreground"
                    >
                      {blog.title}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              <Link href="/projects" className="group flex items-center gap-2 rounded-xl bg-primary px-8 py-3 font-bold text-primary-foreground shadow-md shadow-primary/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/30">
                Projeleri Incele
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <Link href="/activities" className="glass-panel rounded-xl px-8 py-3 font-bold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
                Faaliyetlere Git
              </Link>
              <Link href="/contact" className="glass-panel rounded-xl px-8 py-3 font-bold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
                Iletisim
              </Link>
            </div>
          </div>

          <div className="glass-panel flex min-h-[320px] flex-col justify-center rounded-[40px] border border-border/50 bg-muted/30 p-10 shadow-sm">
            <BookOpen className="mb-4 h-16 w-16 text-primary/40" />
            <h3 className="text-2xl font-black text-foreground">{pageSettings.about.journey_title}</h3>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">{pageSettings.about.journey_text}</p>
            <div className="mt-8 grid grid-cols-2 gap-4">
              {journeyStats.map((item) => (
                <div key={item.label} className="rounded-3xl border border-border/80 bg-muted/40 p-4">
                  <div className="text-2xl font-black text-foreground">{item.value}</div>
                  <div className="mt-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
