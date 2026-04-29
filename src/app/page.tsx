"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  Briefcase,
  Calendar,
  Camera,
  ChevronRight,
  Globe,
  Loader2,
  MapPin,
  PlayCircle,
  Send,
  Trophy,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import api from "@/lib/api/axios";
import { defaultSiteSettings, SiteSettingsPayload, SiteSettingsResponse } from "@/lib/site-config";
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
        const [projectResponse, blogResponse, activitiesResponse, configResponse] = await Promise.all([
          api.get<{ projects: HomeProject[] }>("/projects").catch(() => ({ data: { projects: [] as HomeProject[] } })),
          api.get<{ blogs: HomeBlog[] | { data?: HomeBlog[] } }>("/blogs").catch(() => ({ data: { blogs: [] as HomeBlog[] } })),
          api.get<{ programs: HomeProgram[] }>("/activities").catch(() => ({ data: { programs: [] as HomeProgram[] } })),
          api.get<SiteSettingsResponse>("/site-config"),
        ]);

        setProjects(projectResponse.data.projects ?? []);

        const rawBlogs = blogResponse.data.blogs;
        setBlogs(Array.isArray(rawBlogs) ? rawBlogs : rawBlogs?.data ?? []);

        setActivities(activitiesResponse.data.programs ?? []);
        setSiteSettings(configResponse.data.settings ?? null);
        setComputedStats(configResponse.data.computed_homepage_stats ?? []);
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

  const dashboardLink =
    user?.role === "super_admin" || user?.role === "coordinator" || user?.role === "staff"
      ? "/panel/dashboard"
      : user?.role === "alumni"
        ? "/alumni/dashboard"
        : "/student/dashboard";

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
  const footerProjectLinks =
    resolvedSettings.navigation.footer_project_links.length > 0
      ? resolvedSettings.navigation.footer_project_links
      : featuredProjects.map((project) => ({
          label: project.name,
          href: `/projects/${project.slug}`,
        }));
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

  const sectionMap: Record<"hero" | "intro" | "stats" | "projects" | "activities" | "about" | "blog" | "newsletter", ReactNode> = {
    hero: (
      <section className="relative flex min-h-[90vh] items-center justify-center overflow-hidden pt-20">
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
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,oklch(0.5_0.08_250/0.12),transparent_55%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/80 to-background" />
        <div className="container relative z-10 mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-bold text-primary"
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
            className="mb-8 text-5xl font-black leading-tight tracking-tighter md:text-8xl"
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
            className="mx-auto mb-12 max-w-2xl text-lg text-muted-foreground md:text-xl"
          >
            {resolvedSettings.homepage.hero_description}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap justify-center gap-4"
          >
            {isAuthenticated ? (
              <Link
                href={dashboardLink}
                className="flex items-center gap-2 rounded-2xl bg-primary px-10 py-4 font-bold text-primary-foreground shadow-md shadow-slate-900/15 transition-all hover:scale-[1.02]"
              >
                Panelime Git
                <ArrowRight className="h-5 w-5" />
              </Link>
            ) : (
              <>
                <Link
                  href={resolvedSettings.homepage.hero_primary_href}
                  className="flex items-center gap-2 rounded-2xl bg-primary px-10 py-4 font-bold text-primary-foreground shadow-md shadow-slate-900/12 transition-all hover:scale-[1.02]"
                >
                  {resolvedSettings.homepage.hero_primary_label}
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  href={resolvedSettings.homepage.hero_secondary_href}
                  className="rounded-2xl border border-border/80 bg-card px-10 py-4 font-bold text-foreground shadow-sm transition-all hover:border-primary/30 hover:bg-muted/50"
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
      <section className="py-24">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {resolvedSettings.homepage.intro_cards.map((card, index) => (
              <motion.div
                key={`${card.title}-${index}`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="glass-panel overflow-hidden rounded-[32px] border border-border/80 shadow-sm"
              >
                <div className="relative h-52 w-full bg-muted/30">
                  {card.image_url ? (
                    <Image src={card.image_url} alt={card.title} fill unoptimized className="object-cover" />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/15 to-accent/15" />
                  )}
                </div>
                <div className="space-y-4 p-8">
                  <h3 className="text-2xl font-black text-foreground">{card.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{card.description}</p>
                  <Link href={card.cta_href} className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 font-bold text-primary-foreground">
                    {card.cta_label}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    ),
    stats: (
      <section className="border-y border-border/40 bg-muted/30 py-24">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 gap-12 lg:grid-cols-4">
            {stats.map((stat) => (
              <motion.div key={stat.label} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="group text-center">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                  <stat.icon className="h-8 w-8" />
                </div>
                <h3 className="mb-2 text-4xl font-black">{stat.value}</h3>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    ),
    projects: (
      <section className="relative overflow-hidden py-32">
        <div className="absolute inset-0 origin-right -skew-y-3 transform bg-primary/5" />
        <div className="container relative mx-auto px-6">
          <div className="mb-20 flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <h2 className="mb-6 text-4xl font-black md:text-6xl">{resolvedSettings.homepage.projects_title}</h2>
              <p className="text-lg text-muted-foreground">{resolvedSettings.homepage.projects_description}</p>
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
                    className="glass-panel group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-[32px] p-8 transition-all hover:-translate-y-2"
                  >
                    <div className={`absolute right-0 top-0 h-32 w-32 bg-gradient-to-br ${projectColors[index % projectColors.length]} opacity-0 blur-3xl transition-opacity group-hover:opacity-10`} />
                    <h3 className="mb-4 text-2xl font-bold">{project.name}</h3>
                    <p className="mb-8 flex-1 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                      {project.short_description || "Proje tanitimi yakinda eklenecek."}
                    </p>
                    <div className="mt-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <ArrowRight className="h-5 w-5" />
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
      <section className="bg-muted/20 py-32">
        <div className="container mx-auto px-6">
          <div className="mb-16 flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <h2 className="mb-4 text-4xl font-black">{resolvedSettings.homepage.activities_title}</h2>
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
                <Link key={activity.id} href={`/activities/${activity.id}`} className="glass-panel rounded-3xl p-6 shadow-sm transition-transform hover:-translate-y-1">
                  <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-primary">
                    {activity.project?.name || "Program"}
                  </div>
                  <h3 className="text-2xl font-bold text-foreground">{activity.title}</h3>
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
      <section className="relative overflow-hidden py-32">
        <div className="container mx-auto grid grid-cols-1 gap-10 px-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <div className="text-xs font-bold uppercase tracking-[0.3em] text-primary">Hakkimizda</div>
            <h2 className="text-4xl font-black md:text-6xl">{resolvedSettings.homepage.about_teaser_title}</h2>
            <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">
              {resolvedSettings.homepage.about_teaser_description}
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/about" className="flex items-center gap-2 rounded-2xl bg-primary px-8 py-4 font-bold text-primary-foreground">
                Bizi Taniyin
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/contact"
                className="rounded-2xl border border-border/80 bg-card px-8 py-4 font-bold text-foreground shadow-sm transition-colors hover:border-primary/25"
              >
                Iletisime Gecin
              </Link>
            </div>
          </div>

          <div className="glass-panel overflow-hidden rounded-[40px] border border-border/40">
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
      <section className="bg-muted/20 py-32">
        <div className="container mx-auto mb-16 px-6 text-center">
          <h2 className="mb-4 text-4xl font-black">{resolvedSettings.homepage.blog_title}</h2>
          <p className="text-muted-foreground">{resolvedSettings.homepage.blog_description}</p>
        </div>
        <div className="container mx-auto px-6">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : featuredBlogs.length === 0 ? (
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              {[1, 2, 3].map((card) => (
                <div key={card} className="glass-panel group cursor-pointer overflow-hidden rounded-3xl opacity-50 grayscale">
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
                  <div className="glass-panel group cursor-pointer overflow-hidden rounded-3xl transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5">
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
      <section className="py-28">
        <div className="container mx-auto px-6">
          <div className="glass-panel rounded-[40px] border border-primary/20 p-10 md:p-14">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-center">
              <div>
                <div className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-primary">E-Bulten</div>
                <h2 className="text-4xl font-black md:text-5xl">{resolvedSettings.homepage.newsletter_title}</h2>
                <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
                  {resolvedSettings.homepage.newsletter_description}
                </p>
              </div>
              <div className="space-y-4 rounded-[32px] border border-border/80 bg-muted/30 p-6">
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
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-primary px-6 py-4 font-bold text-primary-foreground disabled:opacity-60"
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
  };

  return (
    <div className="flex w-full flex-col">
      {visibleBlockOrder.map((block) => (
        <div key={block}>{sectionMap[block]}</div>
      ))}

      <footer className="border-t border-slate-200/90 bg-slate-50/90 py-20 text-slate-800">
        <div className="container mx-auto mb-20 grid grid-cols-1 gap-12 px-6 md:grid-cols-4">
          <div>
            <div className="mb-6 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/branding/kademe-logo-turuncu.svg"
                alt="KADEME"
                className="h-10 w-auto"
                width={140}
                height={40}
              />
              <span className="text-2xl font-bold tracking-tight text-slate-900">{resolvedSettings.general.site_name}</span>
            </div>
            <p className="mb-8 text-sm leading-relaxed text-slate-600">{resolvedSettings.homepage.footer_description}</p>
            <div className="flex gap-4">
              {resolvedSettings.social_media.instagram_url ? (
                <Link
                  href={resolvedSettings.social_media.instagram_url}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/90 bg-white text-slate-600 shadow-sm transition-colors hover:border-primary/30 hover:text-primary"
                >
                  <Camera className="h-5 w-5" />
                </Link>
              ) : null}
              {resolvedSettings.social_media.twitter_url ? (
                <Link
                  href={resolvedSettings.social_media.twitter_url}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/90 bg-white text-slate-600 shadow-sm transition-colors hover:border-primary/30 hover:text-primary"
                >
                  <Send className="h-5 w-5" />
                </Link>
              ) : null}
              {resolvedSettings.social_media.youtube_url ? (
                <Link
                  href={resolvedSettings.social_media.youtube_url}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/90 bg-white text-slate-600 shadow-sm transition-colors hover:border-primary/30 hover:text-primary"
                >
                  <PlayCircle className="h-5 w-5" />
                </Link>
              ) : null}
              {resolvedSettings.social_media.linkedin_url ? (
                <Link
                  href={resolvedSettings.social_media.linkedin_url}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/90 bg-white text-slate-600 shadow-sm transition-colors hover:border-primary/30 hover:text-primary"
                >
                  <Briefcase className="h-5 w-5" />
                </Link>
              ) : null}
            </div>
          </div>

          <div>
            <h5 className="mb-6 text-xs font-bold uppercase tracking-widest text-primary">KURUMSAL</h5>
            <ul className="space-y-4 text-sm text-slate-600">
              {resolvedSettings.navigation.footer_quick_links.map((link) => (
                <li key={`${link.label}-${link.href}`}>
                  <Link href={link.href} className="transition-colors hover:text-primary">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h5 className="mb-6 text-xs font-bold uppercase tracking-widest text-primary">PROJELER</h5>
            <ul className="space-y-4 text-sm text-slate-600">
              {footerProjectLinks.length > 0 ? (
                footerProjectLinks.map((link) => (
                  <li key={`${link.label}-${link.href}`}>
                    <Link href={link.href} className="transition-colors hover:text-primary">
                      {link.label}
                    </Link>
                  </li>
                ))
              ) : (
                <li>Proje listesi yakinda guncellenecek.</li>
              )}
            </ul>
          </div>

          <div>
            <h5 className="mb-6 text-xs font-bold uppercase tracking-widest text-primary">ILETISIM</h5>
            <p className="mb-4 text-sm text-slate-600">{resolvedSettings.contact.contact_address}</p>
            <p className="mb-2 text-sm font-bold text-slate-900">{resolvedSettings.contact.contact_email}</p>
            <p className="text-sm font-bold text-slate-900">{resolvedSettings.contact.contact_phone}</p>
          </div>
        </div>
        <div className="container mx-auto border-t border-slate-200/80 px-6 pt-10 text-center text-xs font-medium uppercase tracking-widest text-slate-500">
          {resolvedSettings.homepage.footer_copyright}
        </div>
      </footer>
    </div>
  );
}
