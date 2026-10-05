"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api/axios";
import { formatPublicDate, plain } from "@/lib/aigocy";
import { PublicBrandLoader } from "@/components/public/PublicBrandLoader";
import { usePublicContent, type ThemeBlog } from "./usePublicContent";
import {
  Feedback,
  PageHero,
  Reveal,
  ThemeButton,
  ThemeImage,
} from "./Primitives";
import { BlogCards } from "./Sections";

export default function BlogDetail() {
  const { slug } = useParams<{ slug: string }>();
  const data = usePublicContent();
  const [blog, setBlog] = useState<ThemeBlog | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void api
      .get<{ blog: ThemeBlog }>(`/blogs/${encodeURIComponent(slug)}`, {
        signal: controller.signal,
      })
      .then((response) => {
        setBlog(response.data.blog);
        setError("");
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError(
            "Yazıya ulaşılamadı. İçerik kaldırılmış veya bağlantı değişmiş olabilir.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [slug, attempt]);
  if (loading) return <PublicBrandLoader fullPage />;
  if (!blog)
    return (
      <div className="theme-error-page container">
        <h1>İçerik bulunamadı.</h1>
        <Feedback
          error={error}
          retry={() => {
            setLoading(true);
            setAttempt((a) => a + 1);
          }}
        />
        <ThemeButton href="/blog">Bloga dön</ThemeButton>
      </div>
    );
  return (
    <>
      <PageHero
        variant="page-title"
        badge="KADEME blog"
        title={blog.title}
        description={plain(blog.summary || blog.excerpt)}
      >
        <div className="theme-article-meta">
          {formatPublicDate(blog.published_at)}
        </div>
      </PageHero>
      <section className="container flat-spacing">
        <div className="theme-detail-grid">
          <article>
            <Reveal className="theme-article-cover">
              <ThemeImage src={blog.cover_image} alt={blog.title} priority />
            </Reveal>
            <Reveal>
              <div className="theme-article-body">
                {(blog.content || blog.summary || "")
                  .split(/\n\s*\n/)
                  .map((paragraph, index) => (
                    <p key={index}>{plain(paragraph)}</p>
                  ))}
              </div>
            </Reveal>
            <div className="theme-article-navigation">
              <ThemeButton secondary href="/blog">
                {data.settings.blog_page.detail_back_label || "Bloga dön"}
              </ThemeButton>
            </div>
          </article>
          <aside className="theme-detail-sidebar">
            <h2>Diğer içerikler</h2>
            <ul>
              {data.blogs
                .filter((item) => item.slug !== slug)
                .slice(0, 5)
                .map((item) => (
                  <li key={item.id}>
                    <Link href={`/blog/${item.slug}`}>{item.title}</Link>
                  </li>
                ))}
            </ul>
            <ThemeButton href="/contact">İletişime geç</ThemeButton>
          </aside>
        </div>
        {data.blogs.some((item) => item.slug !== slug) && (
          <section className="flat-spacing">
            <h2 className="heading-title text-gradient-2 mb-48">
              Keşfetmeye devam et
            </h2>
            <BlogCards
              blogs={data.blogs
                .filter((item) => item.slug !== slug)
                .slice(0, 3)}
            />
          </section>
        )}
      </section>
    </>
  );
}
