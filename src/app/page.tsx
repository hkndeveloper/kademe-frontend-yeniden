"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  Calendar,
  ChevronRight,
  Globe,
  Loader2,
  Mail,
  MapPin,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { PublicButton, PublicCounter, PublicMarquee } from "@/components/public";
import { HomeDiscoveryHero } from "@/components/public/HomeDiscoveryHero";
import { HomeEcosystem } from "@/components/public/HomeEcosystem";
import api from "@/lib/api/axios";
import { getCachedHomepage, getCachedPublicProjects, getCachedSiteConfig } from "@/lib/public-api-cache";
import { homePathForUser } from "@/lib/role-home";
import { defaultSiteSettings, SiteSettingsPayload } from "@/lib/site-config";
import { useAuth } from "@/store/useAuth";

interface HomeProject { id: number; name: string; slug: string; short_description?: string | null; cover_image?: string | null; }
interface HomeBlog { id: number; title: string; slug: string; cover_image?: string | null; category?: string | { name?: string | null } | null; excerpt?: string | null; content?: string | null; }
interface HomeProgram { id: number; title: string; description?: string | null; location?: string | null; start_at: string; cover_image?: string | null; is_featured?: boolean; project?: { id: number; name: string; slug: string; }; }

type HomeBlock = SiteSettingsPayload["homepage"]["block_order"][number];

const projectShowcaseImages = ["/aigocy/images/section/featured-works-1.jpg", "/aigocy/images/section/featured-works-2.jpg", "/aigocy/images/section/featured-works-3.jpg", "/aigocy/images/section/featured-works-4.jpg"];
const activityShowcaseImages = ["/aigocy/images/section/service-1.jpg", "/aigocy/images/section/service-2.jpg", "/aigocy/images/section/service-3.jpg"];
const blogShowcaseImages = ["/aigocy/images/blog/blog-1.jpg", "/aigocy/images/blog/blog-2.jpg", "/aigocy/images/blog/blog-3.jpg"];
const iconMap = { users: Users, trophy: Trophy, calendar: Calendar, globe: Globe } as const;

function formatDate(value: string) { const date = new Date(value); if (Number.isNaN(date.getTime())) return "Tarih bilgisi yok"; return date.toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" }); }
function getBlogCategory(blog: HomeBlog) { if (typeof blog.category === "string") return blog.category; return blog.category?.name || "Haberler"; }
function parseCounterValue(value: string) { const match = value.trim().match(/^([^0-9]*)([0-9][0-9.,]*)(.*)$/); if (!match) return null; const numeric = Number(match[2].replace(/\./g, "").replace(",", ".")); if (!Number.isFinite(numeric)) return null; return { prefix: match[1], value: Math.round(numeric), suffix: match[3] }; }
function AnimatedStatValue({ value }: { value: string }) { const parsed = parseCounterValue(value); if (!parsed) return <>{value}</>; return <PublicCounter value={parsed.value} prefix={parsed.prefix} suffix={parsed.suffix} />; }
function SectionHeading({ eyebrow, title, description, center = false, dark = false }: { eyebrow: ReactNode; title: ReactNode; description?: ReactNode; center?: boolean; dark?: boolean }) {
  const headingClass = ["kdm-public-section-heading", center ? "center" : "", dark ? "text-white" : ""].filter(Boolean).join(" ");
  const titleClass = ["kdm-public-heading-title", dark ? "!text-white ![background:none] ![-webkit-text-fill-color:white]" : ""].filter(Boolean).join(" ");
  const descClass = ["mt-5 max-w-2xl text-base leading-8", center ? "mx-auto" : "", dark ? "text-zinc-400" : "text-[#71717a]"].filter(Boolean).join(" ");
  return <div className={headingClass}><div className="kdm-public-heading-sub">{eyebrow}</div><h2 className={titleClass}>{title}</h2>{description ? <p className={descClass}>{description}</p> : null}</div>;
}

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
        } catch (homepageError) { console.error("Anasayfa toplu verileri çekilemedi, eski akış deneniyor", homepageError); }
        const [projectResponse, blogResponse, activitiesResponse, configResponse] = await Promise.all([
          getCachedPublicProjects().catch(() => [] as HomeProject[]),
          api.get<{ blogs: HomeBlog[] | { data?: HomeBlog[] } }>("/blogs").catch(() => ({ data: { blogs: [] as HomeBlog[] } })),
          api.get<{ programs: HomeProgram[] | { data?: HomeProgram[] } }>("/activities", { params: { per_page: 6 } }).catch(() => ({ data: { programs: [] as HomeProgram[] } })),
          getCachedSiteConfig(),
        ]);
        setProjects(projectResponse);
        const rawBlogs = blogResponse.data.blogs; setBlogs(Array.isArray(rawBlogs) ? rawBlogs : rawBlogs?.data ?? []);
        const rawActivities = activitiesResponse.data.programs; setActivities(Array.isArray(rawActivities) ? rawActivities : rawActivities?.data ?? []);
        setSiteSettings(configResponse.settings ?? null); setComputedStats(configResponse.computed_homepage_stats ?? []);
      } catch (error) { console.error("Anasayfa verileri çekilemedi", error); } finally { setLoading(false); }
    };
    void loadData();
  }, []);

  const resolvedSettings = siteSettings ?? defaultSiteSettings;
  const stats = useMemo(() => (resolvedSettings.homepage.stats_mode === "auto" && computedStats.length > 0 ? computedStats : resolvedSettings.homepage.stats).map((stat) => ({ ...stat, icon: iconMap[stat.icon as keyof typeof iconMap] || Users })), [computedStats, resolvedSettings.homepage.stats, resolvedSettings.homepage.stats_mode]);
  const dashboardLink = homePathForUser(user);
  const featuredProjects = resolvedSettings.homepage.featured_project_slugs.length > 0 ? projects.filter((project) => resolvedSettings.homepage.featured_project_slugs.includes(project.slug)).sort((left, right) => resolvedSettings.homepage.featured_project_slugs.indexOf(left.slug) - resolvedSettings.homepage.featured_project_slugs.indexOf(right.slug)).slice(0, 4) : projects.slice(0, 4);
  const featuredActivities = resolvedSettings.homepage.featured_activity_ids.length > 0 ? activities.filter((activity) => resolvedSettings.homepage.featured_activity_ids.includes(activity.id)).sort((left, right) => resolvedSettings.homepage.featured_activity_ids.indexOf(left.id) - resolvedSettings.homepage.featured_activity_ids.indexOf(right.id)).slice(0, 3) : [...activities].sort((left, right) => Number(right.is_featured === true) - Number(left.is_featured === true)).slice(0, 3);
  const featuredBlogs = resolvedSettings.homepage.featured_blog_slugs.length > 0 ? blogs.filter((blog) => resolvedSettings.homepage.featured_blog_slugs.includes(blog.slug)).sort((left, right) => resolvedSettings.homepage.featured_blog_slugs.indexOf(left.slug) - resolvedSettings.homepage.featured_blog_slugs.indexOf(right.slug)).slice(0, 3) : blogs.slice(0, 3);
  const homepageBlockKeys = Object.keys(defaultSiteSettings.homepage.block_visibility) as HomeBlock[];
  const normalizedBlockOrder = [
    ...resolvedSettings.homepage.block_order,
    ...homepageBlockKeys.filter((block) => !resolvedSettings.homepage.block_order.includes(block)),
  ];
  const visibleBlockOrder = normalizedBlockOrder.filter((block) => resolvedSettings.homepage.block_visibility[block] ?? defaultSiteSettings.homepage.block_visibility[block]);

  const handleNewsletterSubmit = async () => { if (!newsletterEmail.trim()) { setNewsletterFeedback("Lütfen geçerli bir e-posta adresi girin."); return; } setNewsletterSubmitting(true); setNewsletterFeedback(null); try { const response = await api.post<{ message: string }>("/newsletter/subscribe", { name: newsletterName, email: newsletterEmail }); setNewsletterFeedback(response.data.message); setNewsletterName(""); setNewsletterEmail(""); } catch (error) { console.error("E-bülten aboneliği kaydedilemedi", error); setNewsletterFeedback("E-bülten aboneliği kaydedilemedi."); } finally { setNewsletterSubmitting(false); } };

  if (loading) return <div className="kdm-public-shell flex min-h-[70vh] items-center justify-center pt-20"><div className="kdm-public-card flex flex-col items-center gap-4 px-8 py-7"><Loader2 className="h-10 w-10 animate-spin text-[#fd3a25]" /><span className="text-sm font-bold text-[#71717a]">Anasayfa hazırlanıyor...</span></div></div>;

  const sectionMap: Record<HomeBlock, ReactNode> = {
    hero: <HomeDiscoveryHero settings={resolvedSettings.homepage} projects={featuredProjects} isAuthenticated={isAuthenticated} dashboardLink={dashboardLink} showIntro={visibleBlockOrder.includes("intro")} />,
    intro: <section id="about" className="kdm-public-flat-spacing bg-[#edecec]"><div className="container mx-auto px-4 sm:px-6"><SectionHeading center eyebrow="Deneyim" title="KADEME deneyimi tek yolculukta birleşir" description="Başvuru, proje, faaliyet, mentorluk ve içerik akışları sade ve izlenebilir bir KADEME deneyiminde toplanır." /><HomeEcosystem cards={resolvedSettings.homepage.intro_cards} /></div></section>,
    stats: <section className="kdm-public-flat-spacing kdm-public-dark-gradient text-white"><div className="container mx-auto px-4 sm:px-6"><SectionHeading center dark eyebrow="Etki" title="KADEME rakamlarda" description="KADEME proje, faaliyet ve gelişim ritmini hızlıca tarayın." /><div className="grid grid-cols-2 gap-5 lg:grid-cols-4">{stats.map((stat, index) => <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.45, delay: index * 0.06 }} className="kdm-public-stat-card kdm-public-stat-card-live kdm-public-stat-card-dark"><div className="mb-5 flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-[#fd3a25] text-white shadow-[0_16px_32px_rgba(253,58,37,0.36),inset_0_1px_0_rgba(255,255,255,0.2)]"><stat.icon className="h-7 w-7" /></div><div className="text-4xl font-black tracking-tight"><AnimatedStatValue value={stat.value} /></div><div className="mt-2 text-[11px] font-black uppercase tracking-[0.16em] text-zinc-400">{stat.label}</div></motion.div>)}</div></div></section>,
    projects: <section className="kdm-public-flat-spacing bg-white"><div className="container mx-auto px-4 sm:px-6"><div className="mb-12 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"><SectionHeading eyebrow="Öne Çıkan Projeler" title={resolvedSettings.homepage.projects_title} description={resolvedSettings.homepage.projects_description} /><PublicButton href="/projects" variant="dark" icon={<ChevronRight className="h-4 w-4" />}>Tümünü Gör</PublicButton></div>{featuredProjects.length === 0 ? <div className="kdm-public-card p-8 text-center text-[#52525b]">Şu an aktif proje bulunmuyor.</div> : <div className="grid gap-6 lg:grid-cols-2">{featuredProjects.map((project, index) => { const imageSrc = project.cover_image || projectShowcaseImages[index % projectShowcaseImages.length]; return <Link key={project.id} href={"/projects/" + project.slug} className="group kdm-public-project-card relative min-h-[27rem] overflow-hidden rounded-[32px] bg-[#09090b] text-white"><Image src={imageSrc} alt={project.name} fill unoptimized className="object-cover opacity-78 transition duration-700 group-hover:scale-105" /><div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(9,9,11,0.02),rgba(9,9,11,0.90)),radial-gradient(circle_at_22%_18%,rgba(253,58,37,0.34),transparent_18rem)]" /><div className="relative z-10 flex min-h-[27rem] flex-col justify-between p-6 sm:p-8"><div className="flex items-center justify-between gap-4"><span className="rounded-full border border-white/20 bg-white/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] backdrop-blur">KADEME Projesi</span><span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#09090b] transition group-hover:bg-[#fd3a25] group-hover:text-white"><ArrowRight className="h-5 w-5" /></span></div><div><h3 className="max-w-xl text-4xl font-semibold leading-tight text-white sm:text-5xl" style={{ letterSpacing: '-0.02em' }}>{project.name}</h3><p className="mt-5 line-clamp-3 max-w-xl text-base leading-8 text-zinc-200">{project.short_description || "Proje tanıtımı yakında eklenecek."}</p><div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/10 pt-5"><div><div className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-500">Proje Türü</div><div className="mt-1 text-sm font-semibold text-zinc-200">KADEME Projesi</div></div><div><div className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-500">Durum</div><div className="mt-1 text-sm font-semibold text-[#fd3a25]">Aktif</div></div></div></div></div></Link>; })}</div>}</div></section>,
    activities: <section className="kdm-public-flat-spacing kdm-public-dark-gradient text-white"><div className="container mx-auto px-4 sm:px-6"><div className="mb-12 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"><SectionHeading dark eyebrow="Faaliyet Akışı" title={resolvedSettings.homepage.activities_title} description={resolvedSettings.homepage.activities_description} /><PublicButton href="/activities" variant="primary" icon={<ChevronRight className="h-4 w-4" />}>Tüm Faaliyetler</PublicButton></div>{featuredActivities.length === 0 ? <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-8 text-center text-zinc-300">Henüz yayınlanmış faaliyet bulunmuyor.</div> : <div className="grid gap-5 lg:grid-cols-3">{featuredActivities.map((activity, index) => <Link key={activity.id} href={"/activities/" + activity.id} className="group rounded-[32px] border border-white/10 bg-white/[0.04] p-4 transition hover:-translate-y-1 hover:border-[#fd3a25]/45 hover:bg-white/[0.07]"><div className="relative mb-6 aspect-[1.15] overflow-hidden rounded-[24px] bg-zinc-900"><Image src={activity.cover_image || activityShowcaseImages[index % activityShowcaseImages.length]} alt={activity.title} fill unoptimized={Boolean(activity.cover_image)} className="object-cover opacity-78 transition duration-700 group-hover:scale-105" sizes="(min-width: 1024px) 33vw, 100vw" /><div className="absolute inset-0 bg-gradient-to-t from-[#09090b]/86 to-transparent" /><span className="absolute left-4 top-4 rounded-full bg-[#fd3a25] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white">Faaliyet</span></div><span className="text-[11px] font-black uppercase tracking-[0.16em] text-[#fd3a25]">{activity.project?.name || "Program"}</span><h3 className="mt-3 text-3xl font-semibold leading-tight transition group-hover:text-orange-100">{activity.title}</h3><div className="mt-6 space-y-3 text-sm leading-6 text-zinc-400"><div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-zinc-500" />{formatDate(activity.start_at)}</div><div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-zinc-500" />{activity.location || "Konum bilgisi yok"}</div></div></Link>)}</div>}</div></section>,
    about: <section className="kdm-public-flat-spacing bg-[#edecec]"><div className="container mx-auto grid gap-8 px-4 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:items-center"><div><SectionHeading eyebrow="Hakkımızda" title={resolvedSettings.homepage.about_teaser_title} description={resolvedSettings.homepage.about_teaser_description} /><div className="mt-8 flex flex-col gap-3 sm:flex-row"><PublicButton href="/about" variant="dark" icon={<ArrowRight className="h-4 w-4" />}>Bizi Tanıyın</PublicButton><PublicButton href="/contact" variant="secondary">İletişime Geçin</PublicButton></div></div><div className="kdm-public-review-box p-6 sm:p-8"><div className="kdm-public-dark-gradient relative mb-6 h-64 overflow-hidden rounded-[28px]">{resolvedSettings.homepage.about_teaser_image_url ? <Image src={resolvedSettings.homepage.about_teaser_image_url} alt={resolvedSettings.homepage.about_teaser_title} fill unoptimized className="object-cover" /> : <Image src="/aigocy/images/section/quotes-1.jpg" alt="KADEME" fill className="object-cover opacity-86" />}<div className="absolute inset-0 bg-gradient-to-t from-[#09090b]/65 to-transparent" /></div><h3 className="text-3xl font-semibold leading-tight text-[#292c2e]">{resolvedSettings.about.journey_title}</h3><p className="mt-4 text-base leading-8 text-[#71717a]">{resolvedSettings.about.journey_text}</p><div className="mt-7 grid grid-cols-2 gap-3"><div className="rounded-3xl bg-white p-5 shadow-[0px_7.77px_16px_rgba(0,0,0,0.06),0px_-3px_0_rgba(0,0,0,0.04)_inset]"><div className="text-4xl font-black text-[#292c2e]">{projects.length}</div><div className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#71717a]">Proje</div></div><div className="rounded-3xl bg-white p-5 shadow-[0px_7.77px_16px_rgba(0,0,0,0.06),0px_-3px_0_rgba(0,0,0,0.04)_inset]"><div className="text-4xl font-black text-[#292c2e]">{activities.length}</div><div className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#71717a]">Faaliyet</div></div></div></div></div></section>,
    blog: <section className="kdm-public-flat-spacing bg-white"><div className="container mx-auto px-4 sm:px-6"><SectionHeading center eyebrow="Blog" title={resolvedSettings.homepage.blog_title} description={resolvedSettings.homepage.blog_description} />{featuredBlogs.length === 0 ? <div className="grid gap-5 md:grid-cols-3">{[1, 2, 3].map((card) => <div key={card} className="kdm-public-card h-80 opacity-70" />)}</div> : <div className="grid gap-5 md:grid-cols-3">{featuredBlogs.map((blog, index) => { const imageSrc = blog.cover_image || blogShowcaseImages[index % blogShowcaseImages.length]; return <Link href={"/blog/" + blog.slug} key={blog.id} className="group kdm-public-card kdm-public-blog-card overflow-hidden p-0"><div className="relative h-64 bg-[#09090b]"><Image src={imageSrc} alt={blog.title} fill unoptimized className="object-cover transition duration-700 group-hover:scale-105" /><div className="absolute inset-0 bg-gradient-to-t from-[#09090b]/74 via-transparent to-transparent" /><span className="absolute bottom-4 left-4 rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#09090b]">{getBlogCategory(blog)}</span></div><div className="p-6"><h3 className="line-clamp-2 text-2xl font-semibold leading-tight text-[#292c2e] transition group-hover:text-[#fd3a25]">{blog.title}</h3><p className="mt-3 line-clamp-3 text-sm leading-7 text-[#71717a]">{blog.excerpt || (blog.content?.slice(0, 120) || "") + "..."}</p><div className="mt-5 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[#fd3a25]">Oku <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></div></div></Link>; })}</div>}</div></section>,
    newsletter: <section className="kdm-public-flat-spacing bg-[#edecec]"><div className="container mx-auto px-4 sm:px-6"><div className="section-contact kdm-public-dark-gradient relative overflow-hidden rounded-[40px] p-6 text-white shadow-[0_32px_90px_rgba(9,9,11,0.22)] sm:p-10 lg:p-14"><div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 12% 16%, rgba(253,58,37,0.42), transparent 22rem), radial-gradient(circle at 88% 84%, rgba(255,100,40,0.16), transparent 16rem), linear-gradient(135deg, rgba(9,9,11,0.97), rgba(9,9,11,0.82))' }} /><div className="relative z-10 grid gap-10 lg:grid-cols-[1fr_0.86fr] lg:items-center"><div><div className="kdm-public-heading-sub mb-6"><Mail className="mr-2 h-4 w-4" /> E-Bülten</div><h2 className="text-balance text-4xl font-semibold leading-tight text-white sm:text-5xl" style={{ letterSpacing: '-0.02em' }}>{resolvedSettings.homepage.newsletter_title}</h2><p className="mt-5 max-w-2xl text-base leading-8 text-zinc-300">{resolvedSettings.homepage.newsletter_description}</p></div><div className="rounded-[28px] border border-white/10 bg-white/[0.08] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-6"><div className="grid gap-3"><input value={newsletterName} onChange={(event) => setNewsletterName(event.target.value)} placeholder="Adınız Soyadınız (isteğe bağlı)" className="kdm-public-input" /><input value={newsletterEmail} onChange={(event) => setNewsletterEmail(event.target.value)} placeholder="E-posta adresiniz" className="kdm-public-input" /><PublicButton type="button" onClick={() => void handleNewsletterSubmit()} disabled={newsletterSubmitting} variant="primary" className="w-full">{newsletterSubmitting ? "Kaydediliyor..." : "E-Bültene Katıl"}</PublicButton>{newsletterFeedback ? <div className="rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-3 text-sm font-semibold text-zinc-200">{newsletterFeedback}</div> : null}</div></div></div></div></div></section>,
    marquee: <PublicMarquee items={resolvedSettings.homepage.marquee_items ?? defaultSiteSettings.homepage.marquee_items} durationSeconds={resolvedSettings.homepage.marquee_speed_seconds ?? defaultSiteSettings.homepage.marquee_speed_seconds} />,
    certificate_verify: <section className="bg-[#edecec] px-4 pb-20 sm:px-6"><div className="container mx-auto"><div className="kdm-public-card-dark overflow-hidden rounded-[32px] p-6 sm:p-8 lg:p-10"><div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center"><div><div className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-300/30 bg-orange-400/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-orange-100"><ShieldCheck className="h-4 w-4" /> Kamusal Doğrulama</div><h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{resolvedSettings.homepage.certificate_verify_title}</h2><p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">{resolvedSettings.homepage.certificate_verify_description}</p></div><PublicButton href={resolvedSettings.homepage.certificate_verify_cta_href} variant="primary" size="lg" icon={<ArrowRight className="h-4 w-4" />}>{resolvedSettings.homepage.certificate_verify_cta_label}</PublicButton></div></div></div></section>,
  };

  return <div className="kdm-public-shell flex w-full flex-col bg-[#edecec] font-[var(--font-urbanist)]">{visibleBlockOrder.map((block) => <div key={block}>{sectionMap[block]}</div>)}</div>;
}
