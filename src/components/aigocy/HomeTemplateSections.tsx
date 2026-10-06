"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { plain, safeHref, type ThemeSection } from "@/lib/aigocy";
import type { SiteSettingsPayload } from "@/lib/site-config";
import type { ThemeProject } from "./usePublicContent";
import { Empty, Reveal, ThemeButton, ThemeImage } from "./Primitives";

const templateIcons: Record<string, string> = {
  compass: "icon-search-solid",
  sparkles: "icon-bolt-solid",
  users: "icon-user-check-solid",
  award: "icon-clipboard-check-solid",
  book: "icon-book-solid",
};

function SectionHeading({
  badge,
  title,
  description,
  center = false,
}: {
  badge: string;
  title: string;
  description?: string;
  center?: boolean;
}) {
  return (
    <div className={`heading-section ${center ? "center" : ""}`}>
      <Reveal>
        <div className="heading-sub fw-semibold">{badge}</div>
      </Reveal>
      <Reveal effect="rotate">
        <h2 className="heading-title text-gradient-3">{title}</h2>
      </Reveal>
      {description && (
        <Reveal>
          <p className="theme-description text-secondary">{description}</p>
        </Reveal>
      )}
    </div>
  );
}

/** Original Featured Works geometry, populated by the public project payload. */
export function FeaturedProjectShowcase({
  settings,
  projects,
}: {
  settings: SiteSettingsPayload;
  projects: ThemeProject[];
}) {
  return (
    <section
      className="section-featured-works flat-spacing theme-home-works"
      id="projeler"
    >
      <div className="container">
        <SectionHeading
          badge="Projelerimiz"
          title={settings.homepage.projects_title}
          description={settings.homepage.projects_description}
          center
        />
        <div className="featured-works-list position-relative">
          {projects.map((project, index) => (
            <Reveal key={project.id}>
              <article className="featured-works-item theme-home-work">
                <Link
                  className="image main-mouse-hover"
                  href={`/projects/${project.slug}`}
                >
                  <ThemeImage
                    src={
                      project.cover_image ||
                      `/aigocy-original/images/section/featured-works-${(index % 4) + 1}.jpg`
                    }
                    alt={project.name}
                  />
                  <span className="view-project h6">
                    Projeyi keşfet <ArrowUpRight size={24} aria-hidden="true" />
                  </span>
                </Link>
                <div className="content">
                  <div className="pagi-dot" aria-hidden="true">
                    {projects.map((p, dot) => (
                      <span
                        key={p.id}
                        className={dot === index ? "active" : undefined}
                      />
                    ))}
                  </div>
                  <div className="bot">
                    <h3 className="heading fw-semibold">
                      <Link href={`/projects/${project.slug}`}>
                        {project.name}
                      </Link>
                    </h3>
                    <dl className="grid-text">
                      <div className="item">
                        <dt className="title text-secondary">AÇIKLAMA</dt>
                        <dd className="text-body-3 fw-semibold">
                          {plain(
                            project.short_description || project.description,
                          ) ||
                            "Projenin gelişim yolculuğunu ve başvuru koşullarını keşfedin."}
                        </dd>
                      </div>
                      <div className="item">
                        <dt className="title text-secondary">DÖNEM</dt>
                        <dd className="fw-semibold">
                          {project.active_period?.name ||
                            "Dönem bilgisi proje sayfasında"}
                        </dd>
                      </div>
                      <div className="item">
                        <dt className="title text-secondary">BAŞVURU</dt>
                        <dd className="fw-semibold">
                          {project.is_application_open
                            ? "Başvuru açık"
                            : "Güncel koşulları inceleyin"}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
        {!projects.length && <Empty>Henüz yayınlanan proje bulunmuyor.</Empty>}
        <div className="theme-section-action">
          <ThemeButton href="/projects">Tüm projeler</ThemeButton>
        </div>
      </div>
    </section>
  );
}

/** Original split Process section with a native touch/keyboard accessible slider. */
export function ProcessShowcase({ section }: { section: ThemeSection }) {
  const track = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });
  useEffect(() => {
    const element = track.current;
    if (!element) return;
    const update = () =>
      setEdges({
        start: element.scrollLeft <= 2,
        end:
          element.scrollLeft + element.clientWidth >= element.scrollWidth - 2,
      });
    update();
    element.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => {
      element.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [section.items.length]);
  const move = (direction: number) => {
    const element = track.current;
    const first = element?.firstElementChild;
    if (!element || !first) return;
    element.scrollBy({
      left: direction * (first.getBoundingClientRect().width + 24),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  };
  return (
    <section
      className="section-process flat-spacing theme-home-process"
      data-theme-section="process"
    >
      <div className="container">
        <div className="row">
          <div className="col-lg-5">
            <div className="process-heading h-100">
              <SectionHeading
                badge="Nasıl katılırım?"
                title={section.title}
                description={section.description}
              />
              <div className="group-btn-slider">
                <button
                  type="button"
                  className="nav-prev-swiper"
                  aria-label="Önceki başvuru adımı"
                  aria-controls="home-process-track"
                  disabled={edges.start}
                  onClick={() => move(-1)}
                >
                  <ChevronLeft aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="nav-next-swiper"
                  aria-label="Sonraki başvuru adımı"
                  aria-controls="home-process-track"
                  disabled={edges.end}
                  onClick={() => move(1)}
                >
                  <ChevronRight aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
          <div className="col-lg-7">
            <div className="process-slide">
              <div
                className="theme-home-process-track"
                id="home-process-track"
                ref={track}
                role="region"
                aria-label={section.title}
                tabIndex={0}
              >
                {section.items.map((item, index) => (
                  <Reveal
                    key={item.id}
                    className="theme-home-process-slide"
                    delay={Math.min(index * 0.1, 0.2)}
                  >
                    <article className="process-card">
                      <i
                        className={`icon ${templateIcons[item.icon || ""] || "icon-bolt-solid"}`}
                        aria-hidden="true"
                      />
                      <div className="content">
                        <h3 className="title fw-semibold">{item.title}</h3>
                        <p className="text text-secondary">
                          {item.description}
                        </p>
                      </div>
                      <div className="bot">
                        {item.href ? (
                          <Link
                            className="time fw-semibold"
                            href={safeHref(item.href)}
                          >
                            {item.label || "Keşfet"}
                            <ArrowUpRight size={16} aria-hidden="true" />
                          </Link>
                        ) : (
                          <span className="time fw-semibold">
                            {item.label || "KADEME"}
                          </span>
                        )}
                        <div
                          className="number"
                          aria-label={`${index + 1} / ${section.items.length}`}
                        >
                          <span className="text-neutral-400">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <span className="text-neutral-200">
                            /{String(section.items.length).padStart(2, "0")}
                          </span>
                        </div>
                      </div>
                    </article>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Original All Features in One cards and animated electric connectors. */
export function FeaturesHub({ section }: { section: ThemeSection }) {
  const middle = Math.ceil(section.items.length / 2);
  const columns = [section.items.slice(0, middle), section.items.slice(middle)];
  const column = (index: number) => (
    <div
      className={`features-col ${index ? "col-right" : "col-left lg-mb-24"}`}
    >
      {columns[index].map((item, itemIndex) => (
        <Reveal
          key={item.id}
          delay={Math.min(itemIndex * 0.05 + index * 0.1, 0.25)}
        >
          <article className="features-item">
            <i
              className={`icon ${templateIcons[item.icon || ""] || "icon-robot-solid"}`}
              aria-hidden="true"
            />
            <h3 className="title fw-semibold">{item.title}</h3>
            <p className="text-secondary">{item.description}</p>
            {item.href && (
              <Link className="theme-inline-link" href={safeHref(item.href)}>
                {item.label || "Keşfet"}
                <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
            )}
          </article>
        </Reveal>
      ))}
    </div>
  );
  return (
    <section
      className="section-features flat-spacing theme-home-features"
      data-theme-section="features"
    >
      <div className="container">
        <SectionHeading
          badge="Değerlerimiz"
          title={section.title}
          description={section.description}
          center
        />
      </div>
      <div className="position-relative">
        <div className="container z-5">
          <div className="features-wrap justify-content-between">
            {column(0)}
            <div
              className="features-center flex-shrink"
              role="img"
              aria-label="KADEME"
            >
              <Image
                src="/branding/kademe-logo-beyaz.svg"
                alt=""
                width={120}
                height={120}
                unoptimized
              />
            </div>
            {column(1)}
          </div>
        </div>
        <div className="side-line-main d-none d-lg-block" aria-hidden="true">
          <div className="container">
            <div className="row">
              <div className="col-lg-4 mx-auto">
                <div className="side-line-wrap">
                  <div className="link-break-line left">
                    <div className="link-break-line">
                      <span className="item top" />
                      <span className="item bottom" />
                    </div>
                  </div>
                  <div className="link-break-center">
                    <span className="simu-electric left" />
                    <span className="simu-electric right" />
                  </div>
                  <div className="link-break-line right">
                    <span className="item top" />
                    <span className="item bottom" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
