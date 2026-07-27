"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, MessageCircle, MessagesSquare, Search, UsersRound } from "lucide-react";
import { LinkifiedText } from "@/components/shared/LinkifiedText";
import { ProjectPeriodFilters, type ProjectWithPeriods } from "@/components/shared/ProjectPeriodFilters";
import api from "@/lib/api/axios";

type Author = { id: number; name: string; surname: string };

type ForumReply = {
  id: number;
  content: string;
  created_at?: string | null;
  author?: Author | null;
};

type ForumPost = {
  id: number;
  title: string;
  content: string;
  created_at?: string | null;
  is_pinned?: boolean;
  replies_count?: number;
  project?: { id: number; name: string } | null;
  period?: { id: number; name: string; status?: string | null } | null;
  author?: Author | null;
  replies?: ForumReply[];
};

type Paginated<T> = { data?: T[] };

function authorName(author?: Author | null) {
  return author ? `${author.name} ${author.surname}` : "KADEME uyesi";
}

function formatDate(value?: string | null) {
  if (!value) return "Tarih yok";
  return new Date(value).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" });
}

function sortReplies(replies: ForumReply[] = []) {
  return [...replies].sort((a, b) => {
    const dateCompare = new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime();
    return dateCompare !== 0 ? dateCompare : a.id - b.id;
  });
}

export default function PanelForumPage() {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [projects, setProjects] = useState<ProjectWithPeriods[]>([]);
  const [projectFilter, setProjectFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function fetchPosts(nextProject = projectFilter, nextPeriod = periodFilter) {
    const response = await api.get<{ posts?: Paginated<ForumPost> }>("/panel/forum/posts", {
      params: {
        project_id: nextProject !== "all" ? Number(nextProject) : undefined,
        period_id: nextPeriod !== "all" ? Number(nextPeriod) : undefined,
      },
    });
    setPosts(response.data.posts?.data ?? []);
  }

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get<{ posts?: Paginated<ForumPost> }>("/panel/forum/posts"),
      api.get<{ projects: ProjectWithPeriods[] }>("/panel/projects/manageable", { params: { permission: "announcements.view" } }),
    ])
      .then(([postsResponse, projectsResponse]) => {
        if (!active) return;
        setPosts(postsResponse.data.posts?.data ?? []);
        setProjects(projectsResponse.data.projects ?? []);
      })
      .catch((error) => {
        console.error("Panel forum yuklenemedi", error);
        if (active) setErrorMessage("Forum konulari yuklenemedi.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const filteredPosts = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase("tr-TR");
    if (!query) return posts;

    return posts.filter((post) =>
      [
        post.title,
        post.content,
        post.project?.name,
        post.period?.name,
        post.author?.name,
        post.author?.surname,
        ...(post.replies ?? []).map((reply) => reply.content),
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("tr-TR")
        .includes(query),
    );
  }, [posts, searchTerm]);

  const replyCount = posts.reduce((total, post) => total + (post.replies_count ?? post.replies?.length ?? 0), 0);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-600">
            <MessagesSquare className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900">Forum</h1>
            <p className="mt-1 text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Proje forum konulari ve kronolojik yanit akislari
            </p>
          </div>
        </div>
        <div className="grid w-full grid-cols-3 gap-3 lg:max-w-md">
          <SummaryCard label="Proje" value={projects.length} />
          <SummaryCard label="Konu" value={posts.length} />
          <SummaryCard label="Yanit" value={replyCount} />
        </div>
      </div>

      {errorMessage ? <div className="panel-notice panel-notice-error">{errorMessage}</div> : null}

      <div className="panel-filter-card space-y-4">
        <ProjectPeriodFilters
          projects={projects}
          selectedProjectId={projectFilter}
          selectedPeriodId={periodFilter}
          onProjectChange={(value) => {
            setProjectFilter(value);
            setPeriodFilter("all");
            void fetchPosts(value, "all");
          }}
          onPeriodChange={(value) => {
            setPeriodFilter(value);
            void fetchPosts(projectFilter, value);
          }}
        />
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Baslik, icerik, proje veya yanit ara"
            className="panel-control w-full pl-10"
          />
        </div>
      </div>

      <div className="space-y-4">
        {filteredPosts.length === 0 ? (
          <div className="panel-empty-card">Forum konusu bulunamadi.</div>
        ) : (
          filteredPosts.map((post) => {
            const replies = sortReplies(post.replies ?? []);

            return (
              <article key={post.id} className="panel-list-card p-0">
                <div className="border-b border-slate-200 bg-slate-50/70 p-5 md:p-6">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="panel-chip panel-chip-info">{post.project?.name ?? "Proje yok"}</span>
                    {post.period?.name ? <span className="panel-chip panel-chip-warning">{post.period.name}</span> : null}
                    {post.is_pinned ? <span className="panel-chip panel-chip-success">Sabit</span> : null}
                    <span className="text-xs font-medium text-muted-foreground">
                      {authorName(post.author)} - {formatDate(post.created_at)}
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-slate-900">{post.title}</h2>
                  <LinkifiedText text={post.content} className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground" />
                </div>

                <div className="space-y-3 p-5 md:p-6">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    <MessageCircle className="h-4 w-4 text-indigo-600" />
                    {replies.length.toLocaleString("tr-TR")} yanit
                  </div>

                  {replies.length === 0 ? (
                    <div className="panel-card-muted">Bu konuda henuz yanit yok.</div>
                  ) : (
                    replies.map((reply) => (
                      <div key={reply.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
                          <UsersRound className="h-3.5 w-3.5" />
                          {authorName(reply.author)} - {formatDate(reply.created_at)}
                        </div>
                        <LinkifiedText text={reply.content} className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800" />
                      </div>
                    ))
                  )}
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-black text-slate-900">{value.toLocaleString("tr-TR")}</p>
    </div>
  );
}
