"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ArrowUpRight } from "lucide-react";
import api from "@/lib/api/axios";
import { PublicBrandLoader } from "@/components/public/PublicBrandLoader";
import { formatPublicDate } from "@/lib/aigocy";
import {
  usePublicContent,
  type ThemeBlog,
  type ThemeActivity,
} from "./usePublicContent";
import { BlogCards } from "./Sections";
import { Empty, Feedback, PageHero, Reveal, ThemeImage } from "./Primitives";
type Paginated<T> = {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
};

export function ListingPage({
  kind,
  initialLayout = "three",
}: {
  kind: "blog" | "activities";
  initialLayout?: "standard" | "two" | "three";
}) {
  const data = usePublicContent();
  const [query, setQuery] = useState(""),
    [project, setProject] = useState(""),
    [page, setPage] = useState(1),
    [layout, setLayout] = useState(initialLayout);
  const [items, setItems] = useState<(ThemeBlog | ThemeActivity)[]>([]),
    [lastPage, setLastPage] = useState(1),
    [total, setTotal] = useState(0),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      setLoading(true);
      void api
        .get(kind === "blog" ? "/blogs" : "/activities", {
          params: {
            page,
            per_page: 12,
            search: query.trim() || undefined,
            project_id: project || undefined,
          },
          signal: controller.signal,
        })
        .then((response) => {
          const payload = response.data[
            kind === "blog" ? "blogs" : "programs"
          ] as Paginated<ThemeBlog | ThemeActivity>;
          setItems(payload.data || []);
          setLastPage(payload.last_page || 1);
          setTotal(payload.total || 0);
          setError("");
        })
        .catch(() => {
          if (!controller.signal.aborted)
            setError("İçerikler yüklenemedi. Lütfen tekrar deneyin.");
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 200);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [kind, page, query, project, attempt]);
  const copy = data.settings.blog_page;
  return (
    <>
      <PageHero
        variant={kind === "blog" ? "page-title" : "banner"}
        badge={kind === "blog" ? copy.badge_label : "KADEME faaliyet takvimi"}
        title={
          kind === "blog" ? copy.title : data.settings.homepage.activities_title
        }
        description={
          kind === "blog"
            ? copy.description
            : data.settings.homepage.activities_description
        }
      />
      <section className="flat-spacing">
        <div className="container">
          <div className="theme-filter-bar">
            <label>
              {kind === "blog" ? "İçerik ara" : "Faaliyet ara"}
              <input
                type="search"
                value={query}
                placeholder={
                  kind === "blog"
                    ? copy.search_placeholder
                    : "Faaliyet adı veya konum…"
                }
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
              />
            </label>
            {kind === "activities" ? (
              <label>
                Proje
                <select
                  value={project}
                  onChange={(e) => {
                    setProject(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">Tüm projeler</option>
                  {data.projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <div className="theme-view-buttons" aria-label="Blog görünümü">
                {(["standard", "two", "three"] as const).map((view) => (
                  <button
                    type="button"
                    key={view}
                    aria-pressed={layout === view}
                    onClick={() => setLayout(view)}
                  >
                    {
                      {
                        standard: "Standart",
                        two: "2 sütun",
                        three: "3 sütun",
                      }[view]
                    }
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="text-secondary theme-result-count" role="status">
            {total} içerik · Sayfa {page}/{lastPage}
          </p>
          <Feedback error={error} retry={() => setAttempt((a) => a + 1)} />
          {loading ? (
            <PublicBrandLoader />
          ) : (
            !error &&
            (items.length ? (
              kind === "blog" ? (
                <BlogCards blogs={items as ThemeBlog[]} layout={layout} />
              ) : (
                <div className="theme-project-grid">
                  {(items as ThemeActivity[]).map((activity, i) => (
                    <Reveal key={activity.id} delay={Math.min(i * 0.05, 0.2)}>
                      <article className="featured-works-item">
                        <Link
                          href={`/activities/${activity.id}`}
                          className="image"
                        >
                          <ThemeImage
                            src={activity.cover_image}
                            alt={activity.title}
                          />
                          <span className="view-project">
                            İncele
                            <ArrowUpRight />
                          </span>
                        </Link>
                        <div className="content">
                          <div className="theme-kicker">
                            {activity.project?.name || "KADEME"}
                          </div>
                          <h3 className="heading fw-semibold">
                            <Link href={`/activities/${activity.id}`}>
                              {activity.title}
                            </Link>
                          </h3>
                          <div className="theme-card-meta">
                            <span>
                              {formatPublicDate(activity.start_at)}
                              <br />
                              {activity.location}
                            </span>
                            <span>
                              {(
                                {
                                  scheduled: "Planlandı",
                                  active: "Devam ediyor",
                                  completed: "Tamamlandı",
                                  cancelled: "İptal edildi",
                                } as Record<string, string>
                              )[activity.status || ""] || activity.status}
                            </span>
                          </div>
                        </div>
                      </article>
                    </Reveal>
                  ))}
                </div>
              )
            ) : (
              <Empty>
                {kind === "blog"
                  ? copy.empty_text
                  : "Aramanızla eşleşen faaliyet bulunamadı."}
              </Empty>
            ))
          )}
          <div className="theme-pagination">
            <button
              type="button"
              aria-label="Önceki sayfa"
              disabled={loading || page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft />
            </button>
            <span>
              {page} / {lastPage}
            </span>
            <button
              type="button"
              aria-label="Sonraki sayfa"
              disabled={loading || page >= lastPage}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight />
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
