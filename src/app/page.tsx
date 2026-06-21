"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  Calendar,
  ChevronRight,
  Globe,
  Loader2,
  MapPin,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import api from "@/lib/api/axios";
import { getCachedHomepage, getCachedPublicProjects, getCachedSiteConfig } from "@/lib/public-api-cache";
import { homePathForUser } from "@/lib/role-home";
import { defaultSiteSettings, SiteSettingsPayload } from "@/lib/site-config";
import { useAuth } from "@/store/useAuth";

interface HomeProject {
  id: number;
  name: string;
  slug: string;
  short_description?: string | null;
}

interface HomeBlog {
  id: number;
  title: string;
  slug: string;
  cover_image?: string | null;
  category?: string | { name?: string | null } | null;
  excerpt?: string | null;
  content?: string | null;
}

interface HomeProgram {
  id: number;
  title: string;
  description?: string | null;
  location?: string | null;
  start_at: string;
  project?: {
    id: number;
    name: string;
    slug: string;
  };
}

const iconMap = {
  users: Users,
  trophy: Trophy,
  calendar: Calendar,
  globe: Globe,
} as const;

export default function HomePage() {
  const { isAuthenticated, user } = useAuth();
  const [projects, setProjects] = useState<HomeProject[]>([]);
  const [blogs, setBlogs] = useState<HomeBlog[]>([]);
  const [activities, setActivities] = useState<HomeProgram[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettingsPayload | null>(null);
  const [computedStats, setComputedStats] = useState<Array<{ label: string; value: string; icon: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [newsletterName, setNewsletterName] = useState("");
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterSubmitting, setNewsletterSubmitting] = useState(false);
  const [newsletterFeedback, setNewsletterFeedback] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        try {
          const homepageResponse = await getCachedHomepage();
          setProjects((Array.isArray(homepageResponse.projects) ? homepageResponse.projects : []) as HomeProject[]);
          setBlogs((Array.isArray(homepageResponse.blogs) ? homepageResponse.blogs : []) as HomeBlog[]);
          setActivities((Array.isArray(homepageResponse.programs) ? homepageResponse.programs : []) as HomeProgram[]);
          setSiteSettings(homepageResponse.settings ?? null);
          setComputedStats(homepageResponse.computed_homepage_stats ?? []);
          return;
        } catch (homepageError) {
          console.error("Anasayfa toplu verileri cekilemedi, eski akis deneniyor", homepageError);
        }

        const [projectResponse, blogResponse, activitiesResponse, configResponse] = await Promise.all([
          getCachedPublicProjects().catch(() => [] as HomeProject[]),
          api.get<{ blogs: HomeBlog[] | { data?: HomeBlog[] } }>("/blogs").catch(() => ({ data: { blogs: [] as HomeBlog[] } })),
          api.get<{ programs: HomeProgram[] | { data?: HomeProgram[] } }>("/activities", { params: { per_page: 6 } }).catch(() => ({ data: { programs: [] as HomeProgram[] } })),
          getCachedSiteConfig(),
        ]);

        setProjects(projectResponse);

        const rawBlogs = blogResponse.data.blogs;
        setBlogs(Array.isArray(rawBlogs) ? rawBlogs : rawBlogs?.data ?? []);

        const rawActivities = activitiesResponse.data.programs;
        setActivities(Array.isArray(rawActivities) ? rawActivities : rawActivities?.data ?? []);
        setSiteSettings(configResponse.settings ?? null);
        setComputedStats(configResponse.computed_homepage_stats ?? []);
      } catch (error) {
        console.error("Anasayfa verileri cekilemedi", error);
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, []);

  const resolvedSettings = siteSettings ?? defaultSiteSettings;

  const stats = useMemo(
    () =>
      (resolvedSettings.homepage.stats_mode === "auto" && computedStats.length > 0 ? computedStats : resolvedSettings.homepage.stats).map((stat) => ({
        ...stat,
        icon: iconMap[stat.icon as keyof typeof iconMap] || Users,
      })),
    [computedStats, resolvedSettings.homepage.stats, resolvedSettings.homepage.stats_mode],
  );

  const dashboardLink = homePathForUser(user);

  const projectColors = ["from-blue-600 to-cyan-500", "from-orange-500 to-red-600", "from-green-500 to-emerald-600", "from-indigo-500 to-blue-600"];
  const featuredProjects =
    resolvedSettings.homepage.featured_project_slugs.length > 0
      ? projects
          .filter((project) => resolvedSettings.homepage.featured_project_slugs.includes(project.slug))
          .sort(
            (left, right) =>
              resolvedSettings.homepage.featured_project_slugs.indexOf(left.slug) -
              resolvedSettings.homepage.featured_project_slugs.indexOf(right.slug),
          )
          .slice(0, 4)
      : projects.slice(0, 4);
  const featuredActivities =
    resolvedSettings.homepage.featured_activity_ids.length > 0
      ? activities
          .filter((activity) => resolvedSettings.homepage.featured_activity_ids.includes(activity.id))
          .sort(
            (left, right) =>
              resolvedSettings.homepage.featured_activity_ids.indexOf(left.id) -
              resolvedSettings.homepage.featured_activity_ids.indexOf(right.id),
          )
          .slice(0, 3)
      : activities.slice(0, 3);
  const featuredBlogs =
    resolvedSettings.homepage.featured_blog_slugs.length > 0
      ? blogs
          .filter((blog) => resolvedSettings.homepage.featured_blog_slugs.includes(blog.slug))
          .sort(
            (left, right) =>
              resolvedSettings.homepage.featured_blog_slugs.indexOf(left.slug) -
              resolvedSettings.homepage.featured_blog_slugs.indexOf(right.slug),
          )
          .slice(0, 3)
      : blogs.slice(0, 3);
  const visibleBlockOrder = resolvedSettings.homepage.block_order.filter((block) => resolvedSettings.homepage.block_visibility[block]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  const handleNewsletterSubmit = async () => {
    if (!newsletterEmail.trim()) {
      setNewsletterFeedback("Lutfen gecerli bir e-posta adresi gir.");
      return;
    }

    setNewsletterSubmitting(true);
    setNewsletterFeedback(null);

    try {
      const response = await api.post<{ message: string }>("/newsletter/subscribe", {
        name: newsletterName,
        email: newsletterEmail,
      });
      setNewsletterFeedback(response.data.message);
      setNewsletterName("");
      setNewsletterEmail("");
    } catch (error) {
      console.error("E-bulten aboneligi kaydedilemedi", error);
      setNewsletterFeedback("E-bulten aboneligi kaydedilemedi.");
    } finally {
      setNewsletterSubmitting(false);
    }
  };

  const sectionMap: Record<"hero" | "intro" | "stats" | "projects" | "activities" | "about" | "blog" | "newsletter" | "certificate_verify", ReactNode> = {
    hero: (
      <section className="relative flex min-h-[calc(100svh-4rem)] items-center justify-center overflow-hidden px-0 py-16 pt-20 sm:min-h-[92vh]">
        {resolvedSettings.homepage.hero_background_image_url ? (
          <Image
            src={resolvedSettings.homepage.hero_background_image_url}
            alt={resolvedSettings.general.site_name}
            fill
            priority
            unoptimized
            className="object-cover opacity-20"
          />
        ) : null}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_28%,oklch(0.74_0.18_45/0.16),transparent_42%),radial-gradient(circle_at_80%_76%,oklch(0.56_0.12_255/0.12),transparent_48%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/78 to-background" />
        <div className="container relative z-10 mx-auto px-4 text-center sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 inline-flex max-w-full items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-bold text-primary sm:mb-8 sm:text-sm"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            {resolvedSettings.homepage.hero_badge}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl md:mb-8 md:text-8xl"
          >
            {resolvedSettings.homepage.hero_title_line_1}
            <br />
            <span className="text-primary">{resolvedSettings.homepage.hero_title_line_2}</span>, {resolvedSettings.homepage.hero_title_line_3}
            <br />
            {resolvedSettings.homepage.hero_title_line_4}.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mx-auto mb-8 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg md:mb-12 md:text-xl"
          >
            {resolvedSettings.homepage.hero_description}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap sm:gap-4"
          >
            {isAuthenticated ? (
              <Link
                href={dashboardLink}
                className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-8 py-4 font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/30 sm:px-10"
              >
                Panelime Git
                <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            ) : (
              <>
                <Link
                  href={resolvedSettings.homepage.hero_primary_href}
                  className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-8 py-4 font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/30 sm:px-10"
                >
                  {resolvedSettings.homepage.hero_primary_label}
                  <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
                <Link
                  href={resolvedSettings.homepage.hero_secondary_href}
                  className="inline-flex items-center justify-center rounded-2xl border border-border/80 bg-card px-8 py-4 font-bold text-foreground shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-muted/50 hover:shadow-md sm:px-10"
                >
                  {resolvedSettings.homepage.hero_secondary_label}
                </Link>
              </>
            )}
          </motion.div>
        </div>
      </section>
    ),
    intro: (
      <section className="py-14 sm:py-24">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {resolvedSettings.homepage.intro_cards.map((card, index) => (
              <motion.div
                key={`${card.title}-${index}`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="glass-panel group overflow-hidden rounded-2xl border border-border/80 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/5 sm:rounded-[32px]"
              >
                <div className="relative h-52 w-full bg-muted/30">
                  {card.image_url ? (
                    <Image src={card.image_url} alt={card.title} fill unoptimized className="object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/15 to-accent/15" />
                  )}
                </div>
                <div className="space-y-4 p-5 sm:p-8">
                  <h3 className="text-xl font-black text-foreground sm:text-2xl">{card.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{card.description}</p>
                  <Link href={card.cta_href} className="group/cta inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 font-bold text-primary-foreground shadow-md shadow-primary/20 transition-all duration-300 hover:shadow-lg hover:shadow-primary/30">
                    {card.cta_label}
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/cta:translate-x-1" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    ),
    stats: (
      <section className="border-y border-border/40 bg-muted/30 py-14 sm:py-24">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
            {stats.map((stat) => (
              <motion.div key={stat.label} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="group rounded-2xl border border-border/60 bg-card/60 px-3 py-5 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-lg hover:shadow-slate-900/5 sm:rounded-3xl sm:px-4 sm:py-6">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110 sm:mb-6 sm:h-16 sm:w-16">
                  <stat.icon className="h-6 w-6 sm:h-8 sm:w-8" />
                </div>
                <h3 className="mb-2 text-2xl font-black sm:text-4xl">{stat.value}</h3>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    ),
    projects: (
      <section className="relative overflow-hidden py-16 sm:py-32">
        <div className="absolute inset-0 origin-right -skew-y-3 transform bg-primary/5" />
        <div className="container relative mx-auto px-4 sm:px-6">
          <div className="mb-10 flex flex-col justify-between gap-5 md:mb-20 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <h2 className="mb-4 text-3xl font-black sm:text-4xl md:mb-6 md:text-6xl">{resolvedSettings.homepage.projects_title}</h2>
              <p className="text-base text-muted-foreground sm:text-lg">{resolvedSettings.homepage.projects_description}</p>
            </div>
            <Link href="/projects" className="flex items-center gap-2 font-bold text-primary hover:underline">
              Tumunu Gor
              <ChevronRight className="h-5 w-5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {loading ? (
              <div className="col-span-full flex justify-center py-10">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
              </div>
            ) : featuredProjects.length === 0 ? (
              <div className="col-span-full text-center text-muted-foreground">Su an aktif proje bulunmuyor.</div>
            ) : (
              featuredProjects.map((project, index) => (
                <Link href={`/projects/${project.slug}`} key={project.id}>
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="glass-panel group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-border/70 p-5 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-slate-900/10 sm:rounded-[32px] sm:p-8"
                  >
                    <div className={`absolute right-0 top-0 h-32 w-32 bg-gradient-to-br ${projectColors[index % projectColors.length]} opacity-0 blur-3xl transition-opacity group-hover:opacity-10`} />
                    <h3 className="mb-4 text-2xl font-bold">{project.name}</h3>
                    <p className="mb-8 flex-1 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                      {project.short_description || "Proje tanitimi yakinda eklenecek."}
                    </p>
                    <div className="mt-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                      <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-0.5" />
                    </div>
                  </motion.div>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>
    ),
    activities: (
      <section className="bg-muted/20 py-16 sm:py-32">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="mb-10 flex flex-col justify-between gap-5 md:mb-16 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <h2 className="mb-4 text-3xl font-black sm:text-4xl">{resolvedSettings.homepage.activities_title}</h2>
              <p className="text-muted-foreground">{resolvedSettings.homepage.activities_description}</p>
            </div>
            <Link href="/activities" className="flex items-center gap-2 font-bold text-primary hover:underline">
              Tum Faaliyetler
              <ChevronRight className="h-5 w-5" />
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : featuredActivities.length === 0 ? (
            <div className="glass-panel rounded-3xl p-12 text-center text-muted-foreground">
              Henuz yayinlanmis faaliyet bulunmuyor.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {featuredActivities.map((activity) => (
                <Link key={activity.id} href={`/activities/${activity.id}`} className="glass-panel group rounded-3xl border border-border/70 p-6 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-slate-900/10">
                  <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-primary">
                    {activity.project?.name || "Program"}
                  </div>
                  <h3 className="text-2xl font-bold text-foreground transition-colors duration-300 group-hover:text-primary">{activity.title}</h3>
                  <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {new Date(activity.start_at).toLocaleDateString("tr-TR")}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {activity.location || "Konum bilgisi yok"}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    ),
    about: (
      <section className="relative overflow-hidden py-16 sm:py-32">
        <div className="container mx-auto grid grid-cols-1 gap-8 px-4 sm:px-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <div className="text-xs font-bold uppercase tracking-[0.3em] text-primary">Hakkımızda</div>
            <h2 className="text-3xl font-black sm:text-4xl md:text-6xl">{resolvedSettings.homepage.about_teaser_title}</h2>
            <p className="max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {resolvedSettings.homepage.about_teaser_description}
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/about" className="group flex items-center gap-2 rounded-2xl bg-primary px-8 py-4 font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-primary/30">
                Bizi Tanıyın
                <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <Link
                href="/contact"
                className="rounded-2xl border border-border/80 bg-card px-8 py-4 font-bold text-foreground shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md"
              >
                İletişime Geçin
              </Link>
            </div>
          </div>

          <div className="glass-panel overflow-hidden rounded-3xl border border-border/40 sm:rounded-[40px]">
            <div className="relative h-56 w-full bg-muted/30">
              {resolvedSettings.homepage.about_teaser_image_url ? (
                <Image
                  src={resolvedSettings.homepage.about_teaser_image_url}
                  alt={resolvedSettings.homepage.about_teaser_title}
                  fill
                  unoptimized
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20" />
              )}
            </div>
            <div className="p-8">
              <h3 className="text-2xl font-black text-foreground">{resolvedSettings.about.journey_title}</h3>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{resolvedSettings.about.journey_text}</p>
              <div className="mt-8 grid grid-cols-2 gap-4">
                <div className="rounded-3xl border border-border/80 bg-muted/40 p-5">
                  <div className="text-2xl font-black text-foreground">{projects.length}</div>
                  <div className="mt-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">Proje</div>
                </div>
                <div className="rounded-3xl border border-border/80 bg-muted/40 p-5">
                  <div className="text-2xl font-black text-foreground">{activities.length}</div>
                  <div className="mt-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">Faaliyet</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    ),
    blog: (
      <section className="bg-muted/20 py-16 sm:py-32">
        <div className="container mx-auto mb-10 px-4 text-center sm:mb-16 sm:px-6">
          <h2 className="mb-4 text-3xl font-black sm:text-4xl">{resolvedSettings.homepage.blog_title}</h2>
        <p className="text-muted-foreground">{resolvedSettings.homepage.blog_description}</p>
        </div>
        <div className="container mx-auto px-4 sm:px-6">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : featuredBlogs.length === 0 ? (
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              {[1, 2, 3].map((card) => (
                <div key={card} className="glass-panel group cursor-pointer overflow-hidden rounded-3xl border border-border/70 opacity-50 grayscale transition-all duration-300 hover:-translate-y-1">
                  <div className="relative h-48 bg-muted">
                    <div className="absolute inset-0 bg-primary/5" />
                    <div className="absolute bottom-4 left-4 rounded bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary-foreground">
                      HABERLER
                    </div>
                  </div>
                  <div className="p-6">
                    <h4 className="mb-3 text-xl font-bold transition-colors group-hover:text-primary">Icerik Hazirlaniyor</h4>
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      Blog yazilari en kisa surede buraya eklenecektir.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              {featuredBlogs.map((blog) => (
                <Link href={`/blog/${blog.slug}`} key={blog.id}>
                  <div className="glass-panel group cursor-pointer overflow-hidden rounded-3xl border border-border/70 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-primary/10">
                    <div className="relative h-48 bg-muted">
                      {blog.cover_image ? (
                        <Image src={blog.cover_image} alt={blog.title} fill className="object-cover transition-transform group-hover:scale-105" />
                      ) : (
                        <div className="absolute inset-0 bg-primary/5" />
                      )}
                      <div className="absolute bottom-4 left-4 rounded bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary-foreground shadow-md">
                        {typeof blog.category === "string" ? blog.category : blog.category?.name || "HABERLER"}
                      </div>
                    </div>
                    <div className="p-6">
                      <h4 className="mb-3 line-clamp-2 text-xl font-bold transition-colors group-hover:text-primary">{blog.title}</h4>
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {blog.excerpt || `${blog.content?.slice(0, 100) || ""}...`}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    ),
    newsletter: (
      <section className="py-16 sm:py-28">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="glass-panel rounded-3xl border border-primary/20 p-5 sm:rounded-[40px] sm:p-10 md:p-14">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-center">
              <div>
                <div className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-primary">E-Bulten</div>
                <h2 className="text-3xl font-black sm:text-4xl md:text-5xl">{resolvedSettings.homepage.newsletter_title}</h2>
                <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                  {resolvedSettings.homepage.newsletter_description}
                </p>
              </div>
              <div className="space-y-4 rounded-2xl border border-border/80 bg-muted/30 p-4 sm:rounded-[32px] sm:p-6">
                <input
                  value={newsletterName}
                  onChange={(event) => setNewsletterName(event.target.value)}
                  placeholder="Adiniz Soyadiniz (opsiyonel)"
                  className="w-full rounded-2xl border border-input bg-card px-4 py-4 text-foreground outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                />
                <input
                  value={newsletterEmail}
                  onChange={(event) => setNewsletterEmail(event.target.value)}
                  placeholder="E-posta adresiniz"
                  className="w-full rounded-2xl border border-input bg-card px-4 py-4 text-foreground outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                />
                <button
                  type="button"
                  onClick={() => void handleNewsletterSubmit()}
                  disabled={newsletterSubmitting}
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-primary px-6 py-4 font-bold text-primary-foreground shadow-md shadow-primary/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/30 disabled:opacity-60"
                >
                  {newsletterSubmitting ? "Kaydediliyor..." : "E-Bultene Katil"}
                </button>
                {newsletterFeedback ? (
                  <div className="rounded-2xl border border-border/60 bg-card px-4 py-3 text-sm text-muted-foreground">
                    {newsletterFeedback}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>
    ),
    certificate_verify: (
      <section className="pb-16 sm:pb-28">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="glass-panel rounded-3xl border border-primary/20 p-5 sm:rounded-[34px] sm:p-8 md:p-10">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="max-w-3xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
                  <ShieldCheck className="h-4 w-4" />
                  Kamusal Dogrulama
                </div>
                <h2 className="text-3xl font-black md:text-4xl">{resolvedSettings.homepage.certificate_verify_title}</h2>
                <p className="mt-4 text-muted-foreground">{resolvedSettings.homepage.certificate_verify_description}</p>
              </div>
              <Link
                href={resolvedSettings.homepage.certificate_verify_cta_href}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-8 py-4 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition hover:-translate-y-0.5 hover:shadow-primary/30"
              >
                {resolvedSettings.homepage.certificate_verify_cta_label}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    ),
  };

  return (
    <div className="flex w-full flex-col">
      {visibleBlockOrder.map((block) => (
        <div key={block}>{sectionMap[block]}</div>
      ))}
    </div>
  );
}

