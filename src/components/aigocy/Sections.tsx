"use client";
import { useRef, useState } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowDown,
  ArrowUpRight,
  Award,
  Check,
  ChevronLeft,
  ChevronRight,
  Quote,
} from "lucide-react";
import { PublicCounter } from "@/components/public/PublicCounter";
import {
  formatPublicDate,
  plain,
  resolveTheme,
  safeHref,
  type ThemeItem,
  type ThemeSectionId,
} from "@/lib/aigocy";
import type { SiteSettingsPayload } from "@/lib/site-config";
import type {
  ThemeProject,
  ThemeActivity,
  ThemeBlog,
  ThemeFaq,
} from "./usePublicContent";
import {
  Empty,
  FaqAccordion,
  Heading,
  Reveal,
  ThemeButton,
  ThemeIcon,
  ThemeImage,
} from "./Primitives";
import api from "@/lib/api/axios";
import { ServiceAccordion } from "./ServiceAccordion";
import { BenefitArtwork } from "./BenefitArtwork";
import { ToolsSection } from "./ToolsSection";

export function HomeHero({ settings }: { settings: SiteSettingsPayload }) {
  const home = settings.homepage;
  const theme = resolveTheme(settings.theme);
  const target = useRef<HTMLElement>(null),
    reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target,
    offset: ["start start", "end start"],
  });
  const cardShift = useTransform(scrollYProgress, [0, 1], [0, -60]);
  return (
    <section
      ref={target}
      className="section-hero theme-home-hero"
      id="baslangic"
    >
      <div
        className="hero-image theme-gradient-background"
        aria-hidden="true"
        style={
          theme.hero_background_url
            ? {
                backgroundImage: `url("${safeHref(theme.hero_background_url)}")`,
              }
            : undefined
        }
      />
      {theme.home_variant === "2" && (
        <video
          className="theme-hero-video"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
          src={safeHref(
            theme.video_url,
            "/aigocy-original/images/video/hero.mp4",
          )}
        />
      )}
      <div className="container">
        <Reveal className="content-wrap text-center">
          <div className="sub fw-semibold">
            <ThemeIcon name="sparkles" size={20} />
            {home.hero_badge}
          </div>
          <h1 className="title text-display-2">
            <span className="title1 fw-semibold text-gradient-1">
              {home.hero_title_line_1} {home.hero_title_line_2}
            </span>
            <span className="title2 d-flex gap-20 justify-content-center flex-wrap">
              <span className="fw-semibold text-gradient-1">
                {home.hero_title_line_3} {home.hero_title_line_4}
              </span>
              <span className="title-icon" aria-hidden="true">
                <span className="box" />
                <span className="title-icon-wrap">
                  {[1, 2, 3].map((n) => (
                    <motion.img
                      key={n}
                      style={{ y: reduced ? 0 : cardShift }}
                      className={`img-${n} img-transform-3`}
                      src={`/aigocy-original/images/item/hero-${n}.svg`}
                      alt=""
                    />
                  ))}
                </span>
              </span>
            </span>
          </h1>
          <p className="text">{home.hero_description}</p>
          <div className="bot-btns">
            <ThemeButton href={home.hero_primary_href}>
              {home.hero_primary_label}
            </ThemeButton>
            <ThemeButton secondary href={home.hero_secondary_href}>
              {home.hero_secondary_label}
            </ThemeButton>
          </div>
        </Reveal>
      </div>
      <a href="#kesfet" className="scroll-more">
        <span className="fw-semibold link1">Keşfetmeye devam et</span>
        <ArrowDown size={18} />
      </a>
    </section>
  );
}
export function AboutSection({
  settings,
  projects,
  full = false,
}: {
  settings: SiteSettingsPayload;
  projects: ThemeProject[];
  full?: boolean;
}) {
  const about = settings.about,
    home = settings.homepage;
  return (
    <section className="section-about-us flat-spacing" id="kesfet">
      <div className="container">
        <Heading
          badge="Hakkımızda"
          title={full ? about.ecosystem_title : home.about_teaser_title}
          description={
            full ? about.ecosystem_description : home.about_teaser_description
          }
        />
        <div className="row">
          <Reveal className="col-lg-7 mb-24">
            <div className="col-left">
              <div className="position-relative z-5">
                <div className="sub text-white">
                  <span className="dot" /> {settings.general.site_tagline}
                </div>
                <h3 className="title fw-semibold text-white">
                  {about.journey_title}
                </h3>
                <p className="theme-description text-neutral-300">
                  {about.journey_text}
                </p>
                <ThemeButton href="/projects">Projeleri keşfet</ThemeButton>
              </div>
              <Image
                width={700}
                height={700}
                unoptimized
                src="/aigocy-original/images/item/earth.png"
                alt=""
                className="theme-earth"
                aria-hidden="true"
              />
            </div>
          </Reveal>
          <div className="col-lg-5">
            <Reveal className="mission-box mb-24">
              <h3 className="title fw-semibold">{about.mission_title}</h3>
              <div className="line" />
              <p className="text">{about.mission_text}</p>
            </Reveal>
            <Reveal className="box-quotes">
              <div className="image">
                <ThemeImage
                  src={home.about_teaser_image_url}
                  alt="KADEME ekosistemi"
                />
              </div>
              <div className="content">
                <Quote size={25} />
                <div className="text-body-1 fw-semibold desc">
                  {about.vision_title}
                </div>
                <p className="text-body-3">{about.vision_text}</p>
                <Link href="/about" className="theme-inline-link">
                  Bizi tanıyın
                  <ArrowUpRight size={18} />
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
        {projects.length > 0 && (
          <div className="theme-about-meta">
            <span>{projects.length} proje, ortak bir gelişim yolculuğu</span>
            <Link href="/projects">
              Tüm projeler
              <ArrowUpRight size={18} />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
export function ProjectCards({
  projects,
  service = false,
}: {
  projects: ThemeProject[];
  service?: boolean;
}) {
  return (
    <div
      className={`theme-project-grid ${service ? "theme-service-grid" : ""}`}
    >
      {projects.map((project, index) => (
        <Reveal key={project.id} delay={Math.min(index * 0.08, 0.24)}>
          <article
            className={service ? "theme-service-card" : "featured-works-item"}
          >
            <Link className="image" href={`/projects/${project.slug}`}>
              <ThemeImage src={project.cover_image} alt={project.name} />
              <span className="view-project">
                Projeyi keşfet
                <ArrowUpRight size={22} />
              </span>
            </Link>
            <div className="content">
              {!service && (
                <div className="pagi-dot" aria-hidden="true">
                  <span className="active" />
                  <span />
                  <span />
                </div>
              )}
              <div className="content-top">
                <h3 className="heading fw-semibold">
                  <Link href={`/projects/${project.slug}`}>{project.name}</Link>
                </h3>
                <p className="text-secondary">
                  {plain(project.short_description || project.description)}
                </p>
              </div>
              <div className="theme-card-meta">
                <span>{project.active_period?.name || "KADEME projesi"}</span>
                <Link
                  href={`/projects/${project.slug}`}
                  aria-label={`${project.name} detayları`}
                >
                  <ArrowUpRight size={24} />
                </Link>
              </div>
            </div>
          </article>
        </Reveal>
      ))}
    </div>
  );
}
export function ProjectsSection({
  settings,
  projects,
}: {
  settings: SiteSettingsPayload;
  projects: ThemeProject[];
}) {
  return (
    <section className="section-featured-works flat-spacing">
      <div className="container">
        <Heading
          badge="Projelerimiz"
          title={settings.homepage.projects_title}
          description={settings.homepage.projects_description}
        />
        {projects.length ? (
          <ProjectCards projects={projects} />
        ) : (
          <Empty>Henüz yayınlanan proje bulunmuyor.</Empty>
        )}
        <div className="theme-section-action">
          <ThemeButton href="/projects">Tüm projeler</ThemeButton>
        </div>
      </div>
    </section>
  );
}
export function ActivitiesSection({
  settings,
  activities,
}: {
  settings: SiteSettingsPayload;
  activities: ThemeActivity[];
}) {
  return (
    <section className="flat-spacing">
      <div className="container">
        <Heading
          badge="Faaliyetler"
          title={settings.homepage.activities_title}
          description={settings.homepage.activities_description}
        />
        <div className="theme-project-grid">
          {activities.map((activity, index) => (
            <Reveal key={activity.id} delay={Math.min(index * 0.08, 0.24)}>
              <article className="featured-works-item">
                <Link className="image" href={`/activities/${activity.id}`}>
                  <ThemeImage src={activity.cover_image} alt={activity.title} />
                  <span className="view-project">
                    Faaliyeti incele
                    <ArrowUpRight size={22} />
                  </span>
                </Link>
                <div className="content">
                  <span className="theme-kicker">
                    {activity.project?.name || "KADEME faaliyeti"}
                  </span>
                  <h3 className="heading fw-semibold">
                    <Link href={`/activities/${activity.id}`}>
                      {activity.title}
                    </Link>
                  </h3>
                  <p className="text-secondary">
                    {plain(activity.description)}
                  </p>
                  <div className="theme-card-meta">
                    <span>
                      {formatPublicDate(activity.start_at)}
                      <br />
                      {activity.location}
                    </span>
                    <ArrowUpRight size={22} />
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
        {!activities.length && (
          <Empty>Henüz yayınlanan faaliyet bulunmuyor.</Empty>
        )}
        <div className="theme-section-action">
          <ThemeButton href="/activities">Faaliyet takvimi</ThemeButton>
        </div>
      </div>
    </section>
  );
}
export function StatsSection({
  settings,
  stats,
}: {
  settings: SiteSettingsPayload;
  stats: { label: string; value: string; icon: string }[];
}) {
  return (
    <section className="section-statistic flat-spacing">
      <div className="container">
        <Heading
          badge="Etki"
          title="KADEME rakamlarla"
          description="Projeler, katılımcılar ve yayınlanan içerikler."
          dark
        />
        <div className="theme-stat-grid">
          {stats.map((stat, index) => (
            <Reveal key={`${stat.label}-${index}`}>
              <div className="statistic-number">
                <span className="number text-white fw-semibold">
                  {/^\d+$/.test(stat.value) ? (
                    <PublicCounter value={Number(stat.value)} />
                  ) : (
                    stat.value
                  )}
                </span>
              </div>
              <div className="text-body-1 fw-semibold text-neutral-300">
                {stat.label}
              </div>
            </Reveal>
          ))}
        </div>
        <p className="theme-stat-note text-neutral-400">
          {settings.homepage.stats_mode === "auto"
            ? "Güncel sistem verilerinden hesaplanır."
            : "KADEME tarafından paylaşılan veriler."}
        </p>
      </div>
    </section>
  );
}
function Carousel({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (direction: number) => {
    const el = ref.current;
    if (el)
      el.scrollBy({
        left: direction * (el.clientWidth * 0.85),
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
  };
  return (
    <>
      <div
        className="theme-carousel"
        ref={ref}
        role="region"
        aria-label={label}
        tabIndex={0}
      >
        {children}
      </div>
      <div className="group-btn-slider theme-carousel-buttons">
        <button
          type="button"
          className="btn-slider"
          aria-label="Önceki kart"
          onClick={() => scroll(-1)}
        >
          <ChevronLeft />
        </button>
        <button
          type="button"
          className="btn-slider"
          aria-label="Sonraki kart"
          onClick={() => scroll(1)}
        >
          <ChevronRight />
        </button>
      </div>
    </>
  );
}
export function ExtraSection({
  id,
  settings,
  projects,
}: {
  id: ThemeSectionId;
  settings: SiteSettingsPayload;
  projects: ThemeProject[];
}) {
  const section = resolveTheme(settings.theme).sections.find(
    (s) => s.id === id,
  )!;
  if (!section.enabled) return null;
  const projectItems: ThemeItem[] = projects.map((p) => ({
    id: String(p.id),
    title: p.name,
    description: plain(p.short_description || p.description),
    image_url: p.cover_image || undefined,
    href: `/projects/${p.slug}`,
    label: "Projeyi incele",
    subtitle: p.active_period?.name || "KADEME projesi",
    value: p.is_application_open ? "Başvuru açık" : "Projeyi keşfet",
    details: [
      p.active_period?.name || "Dönem bilgisi proje sayfasında",
      p.is_application_open
        ? "Başvuru koşullarını inceleyin"
        : "Güncel duyuruları takip edin",
    ],
  }));
  const items = section.items.length
    ? section.items
    : ["services", "tools", "pricing"].includes(id)
      ? projectItems
      : [];
  if (!items.length) return null;
  if (id === "services")
    return (
      <ServiceAccordion
        items={items}
        title={section.title}
        description={section.description}
      />
    );
  if (id === "partners")
    return (
      <section className="section-partner">
        <div className="container">
          <div className="partner-wrap">
            <p className="text-secondary text fw-semibold">{section.title}</p>
            <div className="theme-partner-strip">
              {items.map((item) => (
                <Link
                  key={item.id}
                  href={safeHref(item.href)}
                  aria-label={item.title}
                >
                  {item.image_url ? (
                    <ThemeImage src={item.image_url} alt={item.title} />
                  ) : (
                    <span>{item.title}</span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  if (id === "tools")
    return (
      <ToolsSection
        items={items}
        title={section.title}
        description={section.description}
      />
    );
  return (
    <section className={`section-${id} flat-spacing`} data-theme-section={id}>
      <div className="container">
        <Heading
          badge={
            (
              {
                services: "Gelişim alanları",
                process: "Nasıl katılırım?",
                benefits: "Kazanımlar",
                features: "Değerlerimiz",
                team: "Ekibimiz",
                awards: "Kilometre taşları",
                testimonials: "Görüşler",
                pricing: "Başvuru yolları",
              } as Record<string, string>
            )[id] || section.title
          }
          title={section.title}
          description={section.description}
          center={["team", "features", "pricing"].includes(id)}
          dark={["team", "awards", "testimonials"].includes(id)}
        />
        {id === "process" && (
          <Carousel label={section.title}>
            {items.map((item, i) => (
              <article className="process-card" key={item.id}>
                <div className="icon">
                  <ThemeIcon name={item.icon} />
                </div>
                <div className="content">
                  <h3 className="title fw-semibold">{item.title}</h3>
                  <p className="text-secondary">{item.description}</p>
                </div>
                <div className="bot">
                  <Link className="time" href={safeHref(item.href)}>
                    {item.label || "Keşfet"}
                    <ArrowUpRight size={16} />
                  </Link>
                  <span className="number">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
              </article>
            ))}
          </Carousel>
        )}
        {id === "benefits" && (
          <div className="theme-benefit-grid">
            {items.map((item, i) => (
              <Reveal key={item.id} delay={i * 0.05}>
                <article
                  className={`benefits-box ${["benefits-progress", "benefits-step", "benefits-secure", "benefits-design"][i % 4]}`}
                >
                  <BenefitArtwork
                    index={i}
                    labels={items.map((item) => item.title)}
                  />
                  <div className="content">
                    <h3 className="fw-semibold title">{item.title}</h3>
                    <p className="text text-secondary">{item.description}</p>
                    {item.href && (
                      <Link
                        href={safeHref(item.href)}
                        className="theme-inline-link"
                      >
                        {item.label || "Keşfet"}
                        <ArrowUpRight size={18} />
                      </Link>
                    )}
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        )}
        {id === "features" && (
          <div className="row">
            {items.map((item, i) => (
              <Reveal key={item.id} className="col-md-6 mb-24" delay={i * 0.05}>
                <article className="features-item style-2 h-100">
                  <div className="icon">
                    <ThemeIcon name={item.icon} size={40} />
                  </div>
                  <h3 className="title fw-semibold">{item.title}</h3>
                  <p className="text-secondary">{item.description}</p>
                </article>
              </Reveal>
            ))}
          </div>
        )}
        {id === "team" && (
          <div className="theme-team-grid">
            {items.map((item, i) => (
              <Reveal key={item.id} delay={i * 0.05}>
                <article className="team-item h-100">
                  <div className="image">
                    <ThemeImage src={item.image_url} alt={item.title} />
                  </div>
                  <div className="content">
                    <h3>{item.title}</h3>
                    <p className="text-secondary">{item.subtitle}</p>
                    <p>{item.description}</p>
                    {item.href && (
                      <Link
                        href={safeHref(item.href)}
                        className="theme-inline-link"
                      >
                        {item.label || "Tanıyın"}
                        <ArrowUpRight size={18} />
                      </Link>
                    )}
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        )}
        {id === "awards" && (
          <div className="theme-awards-list">
            {items.map((item) => (
              <Reveal key={item.id}>
                <Link className="theme-award-row" href={safeHref(item.href)}>
                  <span className="text-brand">{item.value}</span>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>
                  <span>{item.subtitle}</span>
                  <ArrowUpRight />
                </Link>
              </Reveal>
            ))}
          </div>
        )}
        {id === "testimonials" && (
          <Carousel label={section.title}>
            {items.map((item) => (
              <article key={item.id} className="theme-testimonial">
                <Quote size={44} />
                <blockquote>{item.description}</blockquote>
                <div className="theme-testimonial-person">
                  {item.image_url && (
                    <ThemeImage src={item.image_url} alt={item.title} />
                  )}
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.subtitle}</p>
                  </div>
                </div>
              </article>
            ))}
          </Carousel>
        )}
        {id === "pricing" && (
          <div className="theme-pricing-grid">
            {items.map((item, i) => (
              <Reveal key={item.id} delay={i * 0.05}>
                <article
                  className={`pricing-item h-100 ${i % 2 ? "style-black" : ""}`}
                >
                  <div className="top d-flex gap-12 align-items-center">
                    <ThemeIcon name={item.icon} size={24} />
                    <h3 className="fw-semibold text">{item.title}</h3>
                  </div>
                  <div className="heading">
                    <div className="price-number fw-bold theme-price-label">
                      {item.value || item.subtitle}
                    </div>
                    <ThemeButton href={safeHref(item.href)}>
                      {item.label || "Detayları incele"}
                    </ThemeButton>
                  </div>
                  <div className="line" />
                  <div className="content">
                    <p className="text fw-semibold">{item.description}</p>
                    <ul className="list-text type-check">
                      {(item.details || []).map((detail) => (
                        <li key={detail}>
                          <Check size={18} />
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
export function IntroSection({ settings }: { settings: SiteSettingsPayload }) {
  return (
    <section className="flat-spacing">
      <div className="container">
        <div className="theme-intro-grid">
          {settings.homepage.intro_cards.map((card, i) => (
            <Reveal key={`${card.title}-${i}`} delay={i * 0.08}>
              <article className="features-item style-2 h-100">
                {card.image_url && (
                  <ThemeImage src={card.image_url} alt={card.title} />
                )}
                <div className="icon">
                  <ThemeIcon name={["compass", "users", "award"][i % 3]} />
                </div>
                <h3 className="title fw-semibold">{card.title}</h3>
                <p className="text-secondary">{card.description}</p>
                <ThemeButton secondary href={safeHref(card.cta_href)}>
                  {card.cta_label || "Keşfet"}
                </ThemeButton>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
export function BlogCards({
  blogs,
  layout = "three",
}: {
  blogs: ThemeBlog[];
  layout?: "standard" | "two" | "three";
}) {
  return (
    <div className={`theme-blog-grid layout-${layout}`}>
      {blogs.map((blog, i) => (
        <Reveal key={blog.id} delay={Math.min(i * 0.1, 0.3)}>
          <article
            className={`article-blog hover-img no-div ${layout === "standard" ? "style-horizontal" : ""}`}
          >
            <Link href={`/blog/${blog.slug}`} className="blog-image img-style">
              <ThemeImage src={blog.cover_image} alt={blog.title} />
            </Link>
            <div className="blog-content">
              <div className="infor">
                <p className="infor_sub text-secondary">
                  {typeof blog.category === "string"
                    ? blog.category
                    : blog.category?.name || "KADEME"}{" "}
                  · {formatPublicDate(blog.published_at)}
                </p>
                <h3 className="h6 fw-semibold">
                  <Link
                    href={`/blog/${blog.slug}`}
                    className="link1 infor_name"
                  >
                    {blog.title}
                  </Link>
                </h3>
                {layout === "standard" && (
                  <p className="text-secondary">
                    {plain(blog.excerpt || blog.summary || blog.content).slice(
                      0,
                      240,
                    )}
                  </p>
                )}
              </div>
              <ThemeButton secondary href={`/blog/${blog.slug}`}>
                Devamını oku
              </ThemeButton>
            </div>
          </article>
        </Reveal>
      ))}
    </div>
  );
}
export function BlogSection({
  settings,
  blogs,
}: {
  settings: SiteSettingsPayload;
  blogs: ThemeBlog[];
}) {
  return (
    <section className="flat-spacing">
      <div className="container">
        <Heading
          badge="Blog"
          title={settings.homepage.blog_title}
          description={settings.homepage.blog_description}
        />
        {blogs.length ? (
          <BlogCards blogs={blogs} />
        ) : (
          <Empty>Henüz yayınlanan içerik bulunmuyor.</Empty>
        )}
        <div className="theme-section-action">
          <ThemeButton href="/blog">Tüm içerikler</ThemeButton>
        </div>
      </div>
    </section>
  );
}
export function FaqSection({
  settings,
  faqs,
}: {
  settings: SiteSettingsPayload;
  faqs: ThemeFaq[];
}) {
  return (
    <section className="section-faqs flat-spacing">
      <div className="container">
        <div className="theme-faq-grid">
          <div>
            <Heading
              badge="Sık sorulan sorular"
              title={settings.faq_page.title}
              description={settings.faq_page.description}
            />
            <ThemeButton secondary href="/faq">
              Tüm sorular
            </ThemeButton>
          </div>
          {faqs.length ? (
            <FaqAccordion items={faqs.slice(0, 6)} />
          ) : (
            <Empty>{settings.faq_page.empty_text}</Empty>
          )}
        </div>
      </div>
    </section>
  );
}
export function Marquee({ settings }: { settings: SiteSettingsPayload }) {
  const items = settings.homepage.marquee_items;
  return (
    <div className="theme-marquee" aria-label={items.join(", ")}>
      <div
        className="theme-marquee-track"
        aria-hidden="true"
        style={{
          animationDuration: `${settings.homepage.marquee_speed_seconds || 24}s`,
        }}
      >
        {[0, 1].map((group) => (
          <div className="theme-marquee-group" key={group}>
            {items.map((text, i) => (
              <span key={`${text}-${i}`}>
                <span>{text}</span>
                <span className="text-brand">✳</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
export function CertificateSection({
  settings,
}: {
  settings: SiteSettingsPayload;
}) {
  return (
    <section className="flat-spacing">
      <div className="container">
        <Reveal className="theme-certificate">
          <div>
            <Heading
              badge="Sertifika doğrulama"
              title={settings.homepage.certificate_verify_title}
              description={settings.homepage.certificate_verify_description}
            />
            <ThemeButton href={settings.homepage.certificate_verify_cta_href}>
              {settings.homepage.certificate_verify_cta_label}
            </ThemeButton>
          </div>
          <div className="theme-certificate-art" aria-hidden="true">
            <div className="theme-document">
              <span />
              <span />
              <span />
              <Award size={64} />
            </div>
            <div className="theme-verified">
              <Check size={28} />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
export function Newsletter({ settings }: { settings: SiteSettingsPayload }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <section className="flat-spacing">
      <div className="container">
        <Reveal className="theme-newsletter">
          <Heading
            badge="E-bülten"
            title={settings.homepage.newsletter_title}
            description={settings.homepage.newsletter_description}
            dark
          />
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (pending) return;
              setPending(true);
              setMessage("");
              try {
                await api.post("/newsletter/subscribe", { email, name });
                setMessage("E-bülten kaydınız alındı.");
                setEmail("");
              } catch {
                setMessage("Kayıt tamamlanamadı. Lütfen tekrar deneyin.");
              } finally {
                setPending(false);
              }
            }}
          >
            <label>
              Adınız soyadınız (isteğe bağlı)
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </label>
            <label>
              E-posta adresiniz
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </label>
            <button className="tf-btn" disabled={pending}>
              {pending ? "Kaydediliyor…" : "E-bültene katıl"}
              <ArrowUpRight size={18} />
            </button>
            <p role="status">{message}</p>
          </form>
        </Reveal>
      </div>
    </section>
  );
}
