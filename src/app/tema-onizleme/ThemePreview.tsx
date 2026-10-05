"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowUpRight,
  ArrowRight,
  Menu,
  X,
  Plus,
  Sparkles,
  GraduationCap,
  Compass,
  Users,
  Award,
} from "lucide-react";
import { HeaderBrand } from "@/components/shared/HeaderBrand";
import { getCachedHomepage } from "@/lib/public-api-cache";
import {
  defaultSiteSettings,
  type SiteSettingsPayload,
} from "@/lib/site-config";
import api from "@/lib/api/axios";
import styles from "./preview.module.css";

interface Project {
  id: number;
  name: string;
  slug: string;
  short_description?: string;
  cover_image?: string;
}
interface Activity {
  id: number;
  title: string;
  start_at: string;
  location?: string;
  project?: { name: string };
}
interface Blog {
  id: number;
  title: string;
  slug: string;
  cover_image?: string;
  excerpt?: string;
}
interface Faq {
  id: number;
  question: string;
  answer: string;
}
const theme = "https://wpriverthemes.com/HTML/aigocy/assets/images";
const icons = [Compass, GraduationCap, Users, Sparkles];
const links = [
  { label: "Ana Sayfa", href: "#baslangic" },
  { label: "Hakkımızda", href: "#hakkimizda" },
  { label: "Projeler", href: "#projeler" },
  { label: "Faaliyetler", href: "#faaliyetler" },
  { label: "Blog", href: "#blog" },
  { label: "İletişim", href: "#iletisim" },
];
function Button({
  href,
  children,
  red = false,
}: {
  href: string;
  children: ReactNode;
  red?: boolean;
}) {
  return (
    <Link href={href} className={`${styles.button} ${red ? styles.red : ""}`}>
      {children}
      <ArrowUpRight size={18} />
    </Link>
  );
}
function Heading({
  badge,
  title,
  center = false,
}: {
  badge: string;
  title: string;
  center?: boolean;
}) {
  return (
    <div className={`${styles.heading} ${center ? styles.center : ""}`}>
      <span className={styles.badge}>{badge}</span>
      <h2>{title}</h2>
    </div>
  );
}
function clean(text?: string) {
  return (text || "").replace(/<[^>]*>/g, " ");
}

export default function ThemePreview() {
  const [settings, setSettings] =
    useState<SiteSettingsPayload>(defaultSiteSettings);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [stats, setStats] = useState(defaultSiteSettings.homepage.stats);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [email, setEmail] = useState("");
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    void getCachedHomepage()
      .then((data) => {
        if (!active) return;
        const config = data.settings ?? defaultSiteSettings;
        setSettings(config);
        setProjects(data.projects as Project[]);
        setActivities(data.programs as Activity[]);
        setBlogs(data.blogs as Blog[]);
        setStats(
          config.homepage.stats_mode === "auto" &&
            data.computed_homepage_stats?.length
            ? data.computed_homepage_stats
            : config.homepage.stats,
        );
      })
      .catch(() => {
        if (active) setLoadError(true);
      });
    void api
      .get<{ faqs: Record<string, Faq[]> }>("/faqs")
      .then(({ data }) => {
        if (active)
          setFaqs(
            Object.values(data.faqs ?? {})
              .flat()
              .slice(0, 6),
          );
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const home = settings.homepage;
  const selectedProjects = (
    home.featured_project_slugs.length
      ? projects.filter((p) => home.featured_project_slugs.includes(p.slug))
      : projects
  ).slice(0, 6);
  const selectedActivities = (
    home.featured_activity_ids.length
      ? activities.filter((a) => home.featured_activity_ids.includes(a.id))
      : activities
  ).slice(0, 5);
  const selectedBlogs = (
    home.featured_blog_slugs.length
      ? blogs.filter((b) => home.featured_blog_slugs.includes(b.slug))
      : blogs
  ).slice(0, 3);
  const visible = home.block_visibility;

  async function subscribe(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFeedback("");
    try {
      const { data } = await api.post<{ message: string }>(
        "/newsletter/subscribe",
        { email },
      );
      setFeedback(data.message || "Aboneliğiniz kaydedildi.");
      setEmail("");
    } catch {
      setFeedback("Abonelik kaydedilemedi. Lütfen tekrar deneyin.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero} id="baslangic">
        <header className={styles.nav}>
          <Link href="/tema-onizleme" aria-label="KADEME ana sayfa önizlemesi">
            <HeaderBrand />
          </Link>
          <nav
            aria-label="Önizleme ana menüsü"
            className={`${styles.links} ${menuOpen ? styles.open : ""}`}
          >
            {links.map((link, i) => (
              <a
                key={link.href}
                href={link.href}
                className={i === 0 ? styles.active : ""}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <Link
              href={home.hero_secondary_href || "/auth/login"}
              onClick={() => setMenuOpen(false)}
            >
              {settings.navigation.header_login_label}
            </Link>
          </nav>
          <div className={styles.navCta}>
            <Button href={home.hero_primary_href || "/register"}>
              {settings.navigation.header_register_label}
            </Button>
          </div>
          <button
            className={styles.menuToggle}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? "Menüyü kapat" : "Menüyü aç"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
        </header>
        <div className={styles.heroContent}>
          <span className={styles.heroEyebrow}>{home.hero_badge}</span>
          <h1>
            {home.hero_title_line_1} {home.hero_title_line_2}
            <br />
            <span>
              {home.hero_title_line_3} {home.hero_title_line_4}
            </span>
            <span className={styles.heroArt} aria-hidden="true">
              <i />
              <GraduationCap className={styles.artOne} />
              <Compass className={styles.artTwo} />
              <Sparkles className={styles.artThree} />
            </span>
          </h1>
          <p>{home.hero_description}</p>
          <div className={styles.heroButtons}>
            <Button href={home.hero_primary_href} red>
              {home.hero_primary_label}
            </Button>
            <Link href={home.hero_secondary_href}>
              {home.hero_secondary_label} <ArrowUpRight size={18} />
            </Link>
          </div>
        </div>
      </section>
      {loadError && (
        <p role="status" className={styles.notice}>
          Canlı içerikler şu anda alınamadı. Varsayılan KADEME metinleri
          gösteriliyor.
        </p>
      )}
      {visible.about && (
        <section className={styles.section} id="hakkimizda">
          <Heading badge="Hakkımızda" title={home.about_teaser_title} />
          <div className={styles.aboutGrid}>
            <div className={styles.earthCard}>
              <span>
                <i /> {settings.general.site_tagline}
              </span>
              <h3>{settings.about.ecosystem_title}</h3>
              <p>{settings.about.ecosystem_description}</p>
              <Button href="/about">Bizi tanıyın</Button>
              <Image src={`${theme}/item/earth.png`} alt="" aria-hidden="true" width={600} height={600} unoptimized />
            </div>
            <div className={styles.mission}>
              <h3>{settings.about.mission_title}</h3>
              <p>{settings.about.mission_text}</p>
              <div className={styles.quote}>
                <span>“</span>
                <p>{settings.about.vision_text}</p>
                <strong>{settings.about.vision_title}</strong>
              </div>
            </div>
          </div>
        </section>
      )}
      {visible.marquee && (
        <div className={styles.strip}>
          <span>Birlikte gelişiyoruz</span>
          <div>
            {home.marquee_items.map((item, i) => (
              <span key={`${item}-${i}`}>
                {item}
                <Sparkles size={22} />
              </span>
            ))}
          </div>
        </div>
      )}
      {visible.intro && (
        <section className={`${styles.section} ${styles.white}`}>
          <Heading
            badge="KADEME deneyimi"
            title={settings.about.journey_title}
            center
          />
          <div className={styles.values}>
            {home.intro_cards.map((card, i) => {
              const Icon = icons[i % icons.length];
              return (
                <article key={card.title}>
                  <span className={styles.icon}>
                    <Icon size={32} />
                  </span>
                  <h3>{card.title}</h3>
                  <p>{card.description}</p>
                  <Link href={card.cta_href}>
                    {card.cta_label}
                    <ArrowUpRight size={18} />
                  </Link>
                </article>
              );
            })}
          </div>
        </section>
      )}
      {visible.certificate_verify && (
        <section className={`${styles.section} ${styles.tools}`}>
          <Heading
            badge="Dijital doğrulama"
            title={home.certificate_verify_title}
            center
          />
          <p>{home.certificate_verify_description}</p>
          <div className={styles.toolDiagram} aria-hidden="true">
            <span>
              <GraduationCap />
            </span>
            <span>
              <Award />
            </span>
            <div>
              <Sparkles size={54} />
            </div>
            <span>
              <Users />
            </span>
            <span>
              <Compass />
            </span>
          </div>
          <Button href={home.certificate_verify_cta_href}>
            {home.certificate_verify_cta_label}
          </Button>
        </section>
      )}
      {visible.projects && (
        <section className={`${styles.section} ${styles.white}`} id="projeler">
          <div className={styles.headingRow}>
            <Heading badge="Projelerimiz" title={home.projects_title} />
            <Button href="/projects">Tüm projeler</Button>
          </div>
          <p className={styles.description}>{home.projects_description}</p>
          <div className={styles.projects}>
            {selectedProjects.map((project, i) => (
              <Link
                href={`/projects/${project.slug}`}
                key={project.id}
                className={styles.project}
              >
                <div className={styles.projectImage}>
                  <Image
                    width={800}
                    height={600}
                    unoptimized
                    src={
                      project.cover_image ||
                      `${theme}/section/featured-works-${(i % 4) + 1}.jpg`
                    }
                    alt={project.name}
                    loading="lazy"
                  />
                  <span>
                    <ArrowUpRight />
                  </span>
                </div>
                <small>KADEME / {String(i + 1).padStart(2, "0")}</small>
                <h3>{project.name}</h3>
                <p>{clean(project.short_description)}</p>
              </Link>
            ))}
          </div>
          {selectedProjects.length === 0 && (
            <p className={styles.empty}>Şu an yayınlanmış proje bulunmuyor.</p>
          )}
        </section>
      )}
      {visible.stats && (
        <section className={`${styles.section} ${styles.stats}`}>
          <Heading badge="Etki" title="KADEME rakamlarda" center />
          <div>
            {stats.map((stat) => (
              <article key={stat.label}>
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </article>
            ))}
          </div>
        </section>
      )}
      {visible.activities && (
        <section
          className={`${styles.section} ${styles.white}`}
          id="faaliyetler"
        >
          <div className={styles.headingRow}>
            <Heading badge="Faaliyet takvimi" title={home.activities_title} />
            <Button href="/activities">Takvimi keşfet</Button>
          </div>
          <p className={styles.description}>{home.activities_description}</p>
          <div className={styles.activityList}>
            {selectedActivities.map((activity, i) => (
              <Link key={activity.id} href={`/activities/${activity.id}`}>
                <span>{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{activity.title}</h3>
                  <p>
                    {activity.project?.name || "KADEME"} ·{" "}
                    {activity.location || "Konum yakında duyurulacak"}
                  </p>
                </div>
                <time dateTime={activity.start_at}>
                  {Number.isNaN(new Date(activity.start_at).getTime())
                    ? "Tarih duyurulacak"
                    : new Date(activity.start_at).toLocaleDateString("tr-TR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        timeZone: "Europe/Istanbul",
                      })}
                </time>
                <ArrowUpRight />
              </Link>
            ))}
          </div>
          {selectedActivities.length === 0 && (
            <p className={styles.empty}>Yeni faaliyetler yakında burada.</p>
          )}
        </section>
      )}
      {visible.blog && (
        <section className={styles.section} id="blog">
          <div className={styles.headingRow}>
            <Heading badge="Blog & haberler" title={home.blog_title} />
            <Button href="/blog">Tüm yazılar</Button>
          </div>
          <div className={styles.blogs}>
            {selectedBlogs.map((blog, i) => (
              <Link key={blog.id} href={`/blog/${blog.slug}`}>
                <Image
                  width={800}
                  height={600}
                  unoptimized
                  src={blog.cover_image || `${theme}/blog/blog-${i + 1}.jpg`}
                  alt={blog.title}
                  loading="lazy"
                />
                <small>KADEME GÜNCEL</small>
                <h3>{blog.title}</h3>
                <p>{clean(blog.excerpt)}</p>
                <span>
                  Yazıyı oku <ArrowRight size={18} />
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
      <section className={`${styles.section} ${styles.white} ${styles.faq}`}>
        <div>
          <Heading
            badge="Sık sorulan sorular"
            title={settings.faq_page.title}
          />
          <p>{settings.faq_page.description}</p>
          <Button href="/faq">Tüm sorular</Button>
        </div>
        <div>
          {faqs.length ? (
            faqs.map((faq) => (
              <details key={faq.id}>
                <summary>
                  {faq.question}
                  <Plus size={20} />
                </summary>
                <p>{clean(faq.answer)}</p>
              </details>
            ))
          ) : (
            <p>{settings.faq_page.empty_text}</p>
          )}
        </div>
      </section>
      <section className={`${styles.section} ${styles.contact}`} id="iletisim">
        <span className={styles.badge}>Bir sonraki adımı birlikte atalım</span>
        <h2>
          {visible.newsletter
            ? home.newsletter_title
            : settings.faq_page.contact_title}
        </h2>
        <div className={styles.contactGrid}>
          <div>
            <p>
              {visible.newsletter
                ? home.newsletter_description
                : settings.faq_page.contact_description}
            </p>
            <Button href="/contact" red>
              İletişime geçin
            </Button>
            <a
              className={styles.email}
              href={`mailto:${settings.contact.contact_email}`}
            >
              {settings.contact.contact_email}
              <ArrowUpRight />
            </a>
          </div>
          {visible.newsletter && (
            <form onSubmit={subscribe}>
              <label htmlFor="preview-email">KADEME’den haberdar olun</label>
              <input
                id="preview-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E-posta adresiniz"
                required
              />
              <button
                type="submit"
                className={styles.button}
                disabled={submitting}
              >
                {submitting ? "Kaydediliyor…" : "E-bültene katıl"}
                <ArrowUpRight size={18} />
              </button>
              {feedback && <p role="status">{feedback}</p>}
              <small>
                Projeler, faaliyetler ve gelişim fırsatları e-posta kutunuza
                gelsin.
              </small>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
