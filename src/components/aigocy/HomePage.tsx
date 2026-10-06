"use client";
import type { ReactNode } from "react";
import { PublicBrandLoader } from "@/components/public/PublicBrandLoader";
import { resolveTheme, type ThemeSectionId } from "@/lib/aigocy";
import { usePublicContent } from "./usePublicContent";
import { Feedback } from "./Primitives";
import {
  HomeHero,
  AboutSection,
  ActivitiesSection,
  StatsSection,
  ExtraSection,
  IntroSection,
  BlogSection,
  FaqSection,
  Marquee,
  CertificateSection,
  Newsletter,
} from "./Sections";
import { ContactSection } from "./ContactSection";
import { FeaturedProjectShowcase } from "./HomeTemplateSections";

export default function AigocyHome({ variant }: { variant?: "1" | "2" } = {}) {
  const {
    settings,
    projects,
    activities,
    blogs,
    faqs,
    stats,
    loading,
    error,
    retry,
  } = usePublicContent();
  if (loading) return <PublicBrandLoader fullPage />;
  const theme = resolveTheme(settings.theme),
    home = settings.homepage;
  const featuredProjects = home.featured_project_slugs.length
    ? projects.filter((p) => home.featured_project_slugs.includes(p.slug))
    : projects;
  const featuredBlogs = home.featured_blog_slugs.length
    ? blogs.filter((b) => home.featured_blog_slugs.includes(b.slug))
    : blogs.slice(0, 3);
  const featuredActivities = home.featured_activity_ids.length
    ? activities.filter((a) => home.featured_activity_ids.includes(a.id))
    : activities.slice(0, 3);
  const core: Record<string, ReactNode> = {
    hero: (
      <HomeHero
        settings={
          variant
            ? { ...settings, theme: { ...theme, home_variant: variant } }
            : settings
        }
      />
    ),
    about: <AboutSection settings={settings} projects={projects} />,
    projects: (
      <FeaturedProjectShowcase
        settings={settings}
        projects={featuredProjects}
      />
    ),
    activities: (
      <ActivitiesSection settings={settings} activities={featuredActivities} />
    ),
    stats: (
      <div className="box-black">
        <div className="light-box" />
        <StatsSection settings={settings} stats={stats} />
      </div>
    ),
    intro: <IntroSection settings={settings} />,
    blog: <BlogSection settings={settings} blogs={featuredBlogs} />,
    certificate_verify: <CertificateSection settings={settings} />,
    faqs: <FaqSection settings={settings} faqs={faqs} />,
    contact: <ContactSection settings={settings} projects={projects} />,
    newsletter: <Newsletter settings={settings} />,
    marquee: <Marquee settings={settings} />,
  };
  return (
    <>
      <Feedback error={error} retry={retry} />
      {!error &&
        theme.home_block_order.map((id) => {
          if (
            id in home.block_visibility &&
            home.block_visibility[id as keyof typeof home.block_visibility] ===
              false
          )
            return null;
          const extra = theme.sections.find((section) => section.id === id);
          if (
            extra &&
            (!extra.enabled ||
              (!extra.items.length &&
                !(
                  ["services", "tools", "pricing"].includes(id) &&
                  projects.length
                )))
          )
            return null;
          const section = core[id] || (
            <ExtraSection
              id={id as ThemeSectionId}
              settings={settings}
              projects={projects}
              homeLayout
            />
          );
          const dark = ["team", "awards", "testimonials"].includes(id),
            white = [
              "services",
              "projects",
              "process",
              "benefits",
              "features",
              "pricing",
              "intro",
              "blog",
              "faqs",
            ].includes(id);
          return (
            <div
              key={id}
              data-home-block={id}
              className={dark ? "box-black" : white ? "box-white" : undefined}
            >
              {section}
            </div>
          );
        })}
    </>
  );
}
