"use client";

import { ArrowUpRight, BookOpen, CalendarDays, Eye, HelpCircle, Loader2, Sparkles, Target } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import styles from "./about.module.css";
import { useEffect, useMemo, useState } from "react";
import { PublicCounter } from "@/components/public";
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
    <div className={styles.page}>
      <section className={styles.hero} aria-labelledby="about-title">
        <div className={styles.container}>
          <div className={styles.heroGrid}>
            <div>
              <div className={styles.eyebrow}><Sparkles size={15} aria-hidden="true" /> KADEME Hakkında</div>
              <h1 id="about-title">{pageSettings.about.hero_title}</h1>
              <p className={styles.description}>{pageSettings.about.hero_description}</p>
            </div>
            <div className={styles.heroArt}>
              <Image src="/images/about-community.png" alt="Bir masa etrafında birlikte fikir geliştiren gençlerin üç boyutlu illüstrasyonu" width={1280} height={1280} unoptimized loading="eager" />
              <span className={styles.artIcon} aria-hidden="true"><Sparkles size={22} /></span>
            </div>
          </div>
          <div className={styles.stats}>
            {stats.map((item, index) => <div className={styles.stat} key={item.label}>
              <span className={styles.statIcon}>{index === 0 ? <BookOpen size={22} aria-hidden="true" /> : <HelpCircle size={22} aria-hidden="true" />}</span>
              <div><strong><PublicCounter value={item.value} /></strong><small>{item.label}</small></div>
            </div>)}
            <div className={styles.stat}><span className={styles.statIcon}><CalendarDays size={22} aria-hidden="true" /></span><strong className={styles.showcase}>Dinamik Vitrin</strong></div>
          </div>
        </div>
      </section>

      <div className={styles.container}>
        <section className={styles.values} aria-label="Misyon ve vizyon">
          <article className={styles.valueCard}>
            <div className={styles.valueCopy}>
              <div className={styles.valueTop}><span className={styles.valueIcon}><Target size={23} aria-hidden="true" /></span><span className={styles.number} aria-hidden="true">01 /</span></div>
              <h2>{pageSettings.about.mission_title}</h2>
              <p>{pageSettings.about.mission_text}</p>
            </div>
            <div className={styles.valueArt}><Image src="/images/about-mentoring.png" alt="Bir mentor ve öğrencinin birlikte çalışmasını anlatan illüstrasyon" width={1280} height={1280} unoptimized /></div>
          </article>
          <article className={styles.valueCard}>
            <div className={styles.valueCopy}>
              <div className={styles.valueTop}><span className={styles.valueIcon}><Eye size={23} aria-hidden="true" /></span><span className={styles.number} aria-hidden="true">02 /</span></div>
              <h2>{pageSettings.about.vision_title}</h2>
              <p>{pageSettings.about.vision_text}</p>
            </div>
            <div className={styles.valueArt}><Image src="/images/about-vision.png" alt="Birlikte geleceğe bakan gençler ve yükselen yön oku illüstrasyonu" width={1280} height={1280} unoptimized /></div>
          </article>
        </section>

        <section className={styles.resources} aria-label="SSS, faaliyetler ve blog">
          <article className={styles.resource}>
            <span className={styles.resourceIcon}><HelpCircle size={28} strokeWidth={1.6} aria-hidden="true" /></span>
            <h3>{pageSettings.about.faq_teaser_title}</h3>
            <p>{pageSettings.about.faq_teaser_text}</p>
            <div className={styles.links}>
              {featuredFaqs.length ? featuredFaqs.map(faq => <Link key={faq.id} href="/faq">{faq.question}<ArrowUpRight size={16} aria-hidden="true" /></Link>) : <p>SSS içerikleri yakında listelenecek.</p>}
            </div>
          </article>
          <article className={styles.resource}>
            <span className={styles.resourceIcon}><CalendarDays size={28} strokeWidth={1.6} aria-hidden="true" /></span>
            <h3>{pageSettings.about.activities_teaser_title}</h3>
            <p>{pageSettings.about.activities_teaser_text}</p>
            <Link href="/activities" className={styles.activityLink}>Faaliyetlere Git<ArrowUpRight size={17} aria-hidden="true" /></Link>
          </article>
          <article className={styles.resource}>
            <span className={styles.resourceIcon}><BookOpen size={28} strokeWidth={1.6} aria-hidden="true" /></span>
            <h3>{pageSettings.about.blog_teaser_title}</h3>
            <p>{pageSettings.about.blog_teaser_text}</p>
            <div className={styles.links}>
              {featuredBlogs.length ? featuredBlogs.map(blog => <Link key={blog.id} href={`/blog/${blog.slug}`}>{blog.title}<ArrowUpRight size={16} aria-hidden="true" /></Link>) : <p>Blog içerikleri yakında listelenecek.</p>}
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}
