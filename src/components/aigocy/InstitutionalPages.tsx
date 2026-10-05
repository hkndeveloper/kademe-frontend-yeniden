"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { PublicBrandLoader } from "@/components/public/PublicBrandLoader";
import { usePublicContent } from "./usePublicContent";
import {
  Empty,
  FaqAccordion,
  Feedback,
  Heading,
  PageHero,
  Reveal,
  ThemeButton,
} from "./Primitives";
import {
  AboutSection,
  ExtraSection,
  FaqSection,
  ProjectCards,
  StatsSection,
} from "./Sections";
import { ContactInfo, ContactSection } from "./ContactSection";

export function AboutPage() {
  const data = usePublicContent();
  const { settings, projects, stats, faqs, blogs, loading, error, retry } =
    data;
  if (loading) return <PublicBrandLoader fullPage />;
  return (
    <>
      <PageHero
        badge="KADEME hakkında"
        title={settings.about.hero_title}
        description={settings.about.hero_description}
      />
      <Feedback error={error} retry={retry} />
      {!error && (
        <>
          <AboutSection settings={settings} projects={projects} full />
          <ExtraSection id="partners" {...data} />
          <div className="box-white">
            <ExtraSection id="features" {...data} />
          </div>
          <ExtraSection id="tools" {...data} />
          {settings.theme?.sections.find((section) => section.id === "team")
            ?.items.length ? (
            <div className="box-black">
              <ExtraSection id="team" {...data} />
            </div>
          ) : null}
          <div className="box-black">
            <div className="light-box" />
            <StatsSection settings={settings} stats={stats} />
            <ExtraSection id="awards" {...data} />
            <ExtraSection id="testimonials" {...data} />
          </div>
          <section className="flat-spacing">
            <div className="container">
              <div className="theme-intro-grid">
                {[
                  {
                    title: settings.about.faq_teaser_title,
                    text: settings.about.faq_teaser_text,
                    href: "/faq",
                    links: faqs
                      .slice(0, 3)
                      .map((f) => ({ title: f.question, href: "/faq" })),
                  },
                  {
                    title: settings.about.activities_teaser_title,
                    text: settings.about.activities_teaser_text,
                    href: "/activities",
                    links: [],
                  },
                  {
                    title: settings.about.blog_teaser_title,
                    text: settings.about.blog_teaser_text,
                    href: "/blog",
                    links: blogs.slice(0, 2).map((b) => ({
                      title: b.title,
                      href: `/blog/${b.slug}`,
                    })),
                  },
                ].map((card) => (
                  <Reveal key={card.href}>
                    <article className="features-item style-2 h-100">
                      <h3 className="title fw-semibold">{card.title}</h3>
                      <p className="text-secondary">{card.text}</p>
                      {card.links.map((link) => (
                        <Link
                          key={link.href + link.title}
                          className="theme-resource-link"
                          href={link.href}
                        >
                          {link.title}
                        </Link>
                      ))}
                      <ThemeButton secondary href={card.href}>
                        Keşfet
                      </ThemeButton>
                    </article>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
          <FaqSection settings={settings} faqs={faqs} />
          <ContactSection settings={settings} projects={projects} />
        </>
      )}
    </>
  );
}
export function ProjectsPage() {
  const data = usePublicContent();
  const { settings, projects, loading, error, retry } = data;
  const [query, setQuery] = useState("");
  const filtered = projects.filter((p) =>
    `${p.name} ${p.short_description || ""}`
      .toLocaleLowerCase("tr-TR")
      .includes(query.toLocaleLowerCase("tr-TR")),
  );
  if (loading) return <PublicBrandLoader fullPage />;
  return (
    <>
      <PageHero
        badge="Projelerimiz"
        title={settings.homepage.projects_title}
        description={settings.homepage.projects_description}
      />
      <Feedback error={error} retry={retry} />
      {!error && (
        <>
          <section className="section-featured-works flat-spacing">
            <div className="container">
              <div className="theme-filter-bar">
                <label>
                  Proje ara
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Proje adı veya açıklama…"
                    type="search"
                  />
                </label>
              </div>
              {filtered.length ? (
                <ProjectCards projects={filtered} />
              ) : (
                <Empty>Aramanızla eşleşen proje bulunamadı.</Empty>
              )}
            </div>
          </section>
          <ExtraSection id="process" {...data} />
          <div className="box-white">
            <ExtraSection id="pricing" {...data} />
          </div>
          <FaqSection settings={settings} faqs={data.faqs} />
          <ContactSection settings={settings} projects={projects} />
        </>
      )}
    </>
  );
}
export function FaqPage() {
  const data = usePublicContent();
  const { settings, faqs, loading, error, retry } = data;
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Tümü");
  const categories = useMemo(
    () => ["Tümü", ...new Set(faqs.map((f) => f.category || "Genel"))],
    [faqs],
  );
  const filtered = faqs.filter(
    (f) =>
      (category === "Tümü" || f.category === category) &&
      `${f.question} ${f.answer}`
        .toLocaleLowerCase("tr-TR")
        .includes(query.toLocaleLowerCase("tr-TR")),
  );
  if (loading) return <PublicBrandLoader fullPage />;
  return (
    <>
      <PageHero
        badge="Sık sorulan sorular"
        title={settings.faq_page.title}
        description={settings.faq_page.description}
      />
      <Feedback error={error} retry={retry} />
      {!error && (
        <section className="flat-spacing">
          <div className="container">
            <div className="theme-filter-bar">
              <label>
                Sorularda ara
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Merak ettiğiniz konuyu arayın…"
                />
              </label>
              <label>
                Kategori
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="theme-faq-grid">
              <div>
                <Heading
                  badge="Yanıtlar"
                  title="Merak ettiklerin burada."
                  description={`${faqs.length} soru, ${categories.length - 1} kategori`}
                />
              </div>
              {filtered.length ? (
                <FaqAccordion items={filtered} />
              ) : (
                <Empty>{settings.faq_page.empty_text}</Empty>
              )}
            </div>
            <Reveal className="theme-support-card">
              <Heading
                badge="Destek"
                title={settings.faq_page.contact_title}
                description={settings.faq_page.contact_description}
                dark
              />
              <ThemeButton href={settings.faq_page.contact_cta_href}>
                {settings.faq_page.contact_cta_label}
              </ThemeButton>
            </Reveal>
          </div>
        </section>
      )}
    </>
  );
}
export function ContactPage() {
  const data = usePublicContent();
  if (data.loading) return <PublicBrandLoader fullPage />;
  return (
    <>
      <PageHero
        badge="İletişim"
        decorations={[13, 14, 15]}
        title="Birlikte iletişimde kalalım."
        description="Başvurular, projeler ve destek talepleri için KADEME’ye ulaşın."
      />
      <Feedback error={data.error} retry={data.retry} />
      {!data.error && (
        <>
          <ContactInfo settings={data.settings} />
          <ContactSection settings={data.settings} projects={data.projects} />
        </>
      )}
    </>
  );
}
export function ServicesPage() {
  const data = usePublicContent();
  if (data.loading) return <PublicBrandLoader fullPage />;
  return (
    <>
      <PageHero
        badge="Gelişim alanları"
        title="Geleceğin için birlikte çalışalım."
        description={data.settings.about.ecosystem_description}
      />
      <Feedback error={data.error} retry={data.retry} />
      {!data.error && (
        <>
          <div className="box-white">
            <ExtraSection id="services" {...data} />
            <ExtraSection id="benefits" {...data} />
          </div>
          <ExtraSection id="tools" {...data} />
          <ExtraSection id="process" {...data} />
          <div className="box-white">
            <ExtraSection id="pricing" {...data} />
          </div>
          <FaqSection settings={data.settings} faqs={data.faqs} />
          <ContactSection settings={data.settings} projects={data.projects} />
        </>
      )}
    </>
  );
}
