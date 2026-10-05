"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PublicBrandLoader } from "@/components/public/PublicBrandLoader";
import { plain, resolveTheme, safeHref } from "@/lib/aigocy";
import { usePublicContent } from "./usePublicContent";
import {
  Empty,
  Feedback,
  PageHero,
  Reveal,
  ThemeButton,
  ThemeImage,
} from "./Primitives";
import { ExtraSection, FaqSection } from "./Sections";
import { ContactSection } from "./ContactSection";

export function ServiceDetail() {
  const { slug } = useParams<{ slug: string }>(),
    data = usePublicContent();
  if (data.loading) return <PublicBrandLoader fullPage />;
  if (data.error) return <Feedback error={data.error} retry={data.retry} />;
  const configured = resolveTheme(data.settings.theme).sections.find(
    (s) => s.id === "services",
  );
  const item = configured?.enabled
    ? configured.items.find((item) => item.id === slug)
    : undefined;
  const project = data.projects.find((project) => project.slug === slug);
  if (!item && !project)
    return (
      <>
        <PageHero badge="Gelişim alanları" title="Bu alan bulunamadı." />
        <div className="container flat-spacing">
          <Empty>Yayınlanan diğer gelişim alanlarını keşfedebilirsiniz.</Empty>
          <ThemeButton href="/services">Gelişim alanlarına dön</ThemeButton>
        </div>
      </>
    );
  const title = item?.title || project!.name,
    description = item?.description || plain(project?.description),
    image = item?.image_url || project?.cover_image,
    href = item?.href || (project ? `/projects/${project.slug}` : "/contact");
  return (
    <>
      <PageHero
        badge="Gelişim alanları"
        decorations={[13, 14, 15]}
        title={title}
        description={description}
      />
      <section className="section-service-single flat-spacing">
        <div className="container">
          <div className="theme-detail-grid">
            <Reveal>
              <div className="theme-article-cover">
                <ThemeImage src={image} alt={title} />
              </div>
              <h2 className="h3 fw-semibold">{title}</h2>
              <p className="theme-description">{description}</p>
              {item?.details?.length ? (
                <ul className="tf-list theme-service-details">
                  {item.details.map((detail) => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>
              ) : null}
              <div className="theme-section-action">
                <ThemeButton href={safeHref(href)}>
                  {item?.label || "Projeyi incele"}
                </ThemeButton>
              </div>
            </Reveal>
            <aside className="theme-detail-sidebar">
              <h2>Gelişim alanları</h2>
              <ul>
                {configured?.items.length
                  ? configured.items.map((item) => (
                      <li key={item.id}>
                        <Link href={`/services/${encodeURIComponent(item.id)}`}>
                          {item.title}
                        </Link>
                      </li>
                    ))
                  : data.projects.map((project) => (
                      <li key={project.id}>
                        <Link href={`/services/${project.slug}`}>
                          {project.name}
                        </Link>
                      </li>
                    ))}
              </ul>
            </aside>
          </div>
        </div>
      </section>
      <ExtraSection
        id="benefits"
        settings={data.settings}
        projects={data.projects}
      />
      <ExtraSection
        id="process"
        settings={data.settings}
        projects={data.projects}
      />
      <FaqSection settings={data.settings} faqs={data.faqs} />
      <ContactSection settings={data.settings} projects={data.projects} />
    </>
  );
}
