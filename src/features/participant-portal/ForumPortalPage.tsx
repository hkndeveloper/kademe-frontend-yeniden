"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Loader2, MessageCircle, MessageSquarePlus, MessagesSquare, Search, Send, UsersRound } from "lucide-react";
import { defaultPeriodIdForProject, periodHasWriteCapability, periodOptionById, PeriodArchiveModeNotice, periodsForProject, type PeriodOption } from "@/components/shared/ProjectPeriodFilters";
import api from "@/lib/api/axios";

type Project = {
  id: number;
  name: string;
  period?: PeriodOption | null;
  periods?: PeriodOption[];
  active_period?: PeriodOption | null;
};

type ForumReply = {
  id: number;
  content: string;
  created_at: string;
  author?: { id: number; name: string; surname: string } | null;
};

type ForumPost = {
  id: number;
  title: string;
  content: string;
  created_at: string;
  is_pinned?: boolean;
  project: Project;
  period?: PeriodOption | null;
  author?: { id: number; name: string; surname: string } | null;
  replies?: ForumReply[];
};

function authorName(author?: { name: string; surname: string } | null) {
  return author ? `${author.name} ${author.surname}` : "KADEME uyesi";
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" });
}

function normalizeProjects(items: Project[]) {
  const grouped = new Map<number, Project>();
  items.forEach((item) => {
    const existing = grouped.get(item.id) ?? { ...item, periods: [] };
    const periods = [...(existing.periods ?? [])];
    if (item.period && !periods.some((period) => period.id === item.period?.id)) {
      periods.push(item.period);
    }
    grouped.set(item.id, {
      ...existing,
      ...item,
      period: undefined,
      active_period: periods.find((period) => period.status === "active") ?? existing.active_period ?? null,
      periods,
    });
  });

  return Array.from(grouped.values());
}

export function ForumPortalPage() {
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [projectFilter, setProjectFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [replyingId, setReplyingId] = useState<number | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);

  const canSubmit = title.trim().length > 2 && content.trim().length > 5 && projectFilter !== "all";
  const selectedProject = useMemo(
    () => projects.find((project) => String(project.id) === projectFilter),
    [projectFilter, projects]
  );
  const selectedPeriods = useMemo(() => periodsForProject(selectedProject), [selectedProject]);
  const selectedPeriod = periodOptionById(projects, periodFilter);
  const canCreateInSelectedPeriod = periodHasWriteCapability(selectedPeriod, "create_operations");

  async function fetchPosts(projectId?: string, periodId?: string) {
    const res = await api.get<{ posts?: { data?: ForumPost[] } }>("/forum/posts", {
      params: {
        project_id: projectId && projectId !== "all" ? projectId : undefined,
        period_id: periodId && periodId !== "all" ? periodId : undefined,
      },
    });
    setPosts(res.data.posts?.data ?? []);
  }

  useEffect(() => {
    const run = async () => {
      try {
        const [postsRes, projectsRes] = await Promise.all([
          api.get<{ posts?: { data?: ForumPost[] } }>("/forum/posts"),
          api.get<{ projects?: Project[] }>("/dashboard/projects"),
        ]);
        setPosts(postsRes.data.posts?.data ?? []);
        setProjects(normalizeProjects(projectsRes.data.projects ?? []));
      } catch (error) {
        console.error("Forum yuklenemedi", error);
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, []);

  const filteredPosts = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase("tr-TR");
    if (!query) return posts;

    return posts.filter((post) =>
      [post.title, post.content, post.project?.name, post.author?.name, post.author?.surname, ...(post.replies ?? []).map((reply) => reply.content)]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("tr-TR")
        .includes(query)
    );
  }, [posts, searchTerm]);

  const replyCount = posts.reduce((total, post) => total + (post.replies?.length ?? 0), 0);

  const createPost = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setMessage(null);
    try {
      const response = await api.post<{ message?: string }>("/forum/posts", {
        project_id: Number(projectFilter),
        period_id: periodFilter !== "all" ? Number(periodFilter) : undefined,
        title: title.trim(),
        content: content.trim(),
      });
      setTitle("");
      setContent("");
      setMessage(response.data.message ?? "Forum konusu olusturuldu.");
      await fetchPosts(projectFilter, periodFilter);
    } catch (error) {
      console.error("Forum konusu olusturulamadi", error);
      setMessage("Forum konusu olusturulamadi.");
    } finally {
      setSaving(false);
    }
  };

  const sendReply = async (postId: number) => {
    const draft = (replyDrafts[postId] ?? "").trim();
    if (!draft) return;
    setReplyingId(postId);
    setMessage(null);
    try {
      await api.post(`/forum/posts/${postId}/replies`, { content: draft });
      setReplyDrafts((prev) => ({ ...prev, [postId]: "" }));
      await fetchPosts(projectFilter, periodFilter);
    } catch (error) {
      console.error("Yanit gonderilemedi", error);
      setMessage("Yanit gonderilemedi.");
    } finally {
      setReplyingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-primary">
            <MessagesSquare className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900">Proje Forumu</h1>
            <p className="mt-1 text-sm font-bold uppercase tracking-widest text-muted-foreground">Uye oldugun projeler icin kapali tartisma alani</p>
          </div>
        </div>

        <div className="grid w-full grid-cols-3 gap-3 lg:max-w-lg">
          <SummaryCard label="Proje" value={projects.length} />
          <SummaryCard label="Konu" value={posts.length} />
          <SummaryCard label="Yanit" value={replyCount} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px,1fr]">
        <aside className="space-y-5">
          <form onSubmit={createPost} className="glass-panel rounded-3xl p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <MessageSquarePlus className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-black text-slate-900">Yeni Konu</h2>
                <p className="text-xs text-muted-foreground">Konu proje bazli acilir.</p>
              </div>
            </div>

            <div className="space-y-3">
              <select
                value={projectFilter}
                onChange={(e) => {
                  const nextProjectId = e.target.value;
                  const nextProject = projects.find((project) => String(project.id) === nextProjectId);
                  const nextPeriodId = nextProjectId !== "all" ? defaultPeriodIdForProject(nextProject) || "all" : "all";
                  setProjectFilter(nextProjectId);
                  setPeriodFilter(nextPeriodId);
                  void fetchPosts(nextProjectId, nextPeriodId);
                }}
                className="w-full rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none focus:border-primary"
              >
                <option value="all">Proje secin</option>
                {projects.map((project) => (
                  <option key={project.id} value={String(project.id)}>
                    {project.name}
                  </option>
                ))}
              </select>
              <PeriodArchiveModeNotice period={selectedPeriod} />
              <select
                value={periodFilter}
                onChange={(e) => {
                  const nextPeriodId = e.target.value;
                  setPeriodFilter(nextPeriodId);
                  void fetchPosts(projectFilter, nextPeriodId);
                }}
                disabled={projectFilter === "all" || selectedPeriods.length === 0}
                className="w-full rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="all">{projectFilter === "all" ? "Proje secince donem" : "Proje geneli / tum donemler"}</option>
                {selectedPeriods.map((period) => (
                  <option key={period.id} value={String(period.id)}>
                    {period.name}
                    {period.status === "active" ? " (aktif)" : period.status === "completed" ? " (tamamlandi)" : ""}
                  </option>
                ))}
              </select>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Konu basligi"
                className="w-full rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none focus:border-primary"
              />
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Mesaj icerigi"
                className="min-h-[130px] w-full rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none focus:border-primary"
              />
            </div>

            <div className="mt-4 flex flex-col gap-3">
              <p className="text-xs leading-relaxed text-muted-foreground">Sadece dahil oldugun proje forumlarinda konu acabilir ve yanit yazabilirsin.</p>
              <button
                type="submit"
                disabled={!canSubmit || saving || !canCreateInSelectedPeriod}
                title={!canCreateInSelectedPeriod && periodFilter !== "all" ? "Bu dönemde yeni forum konusu açılamaz." : undefined}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquarePlus className="h-4 w-4" />}
                Konu Ac
              </button>
            </div>
          </form>

          <div className="glass-panel rounded-3xl p-6">
            <h2 className="mb-4 flex items-center gap-2 font-black text-slate-900">
              <UsersRound className="h-5 w-5 text-primary" />
              Proje Filtreleri
            </h2>
            <div className="space-y-2">
              <ProjectButton active={projectFilter === "all"} label="Tum Projeler" count={posts.length} onClick={() => { setProjectFilter("all"); setPeriodFilter("all"); void fetchPosts("all", "all"); }} />
              {projects.map((project) => (
                <ProjectButton
                  key={project.id}
                  active={projectFilter === String(project.id)}
                  label={project.name}
                  count={posts.filter((post) => post.project.id === project.id).length}
                  onClick={() => {
                    const nextPeriodId = defaultPeriodIdForProject(project) || "all";
                    setProjectFilter(String(project.id));
                    setPeriodFilter(nextPeriodId);
                    void fetchPosts(String(project.id), nextPeriodId);
                  }}
                />
              ))}
            </div>
          </div>
        </aside>

        <main className="space-y-5">
          <div className="glass-panel rounded-3xl p-5">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Baslik, icerik, proje veya yanit ara"
                className="w-full rounded-2xl border border-border bg-background py-3 pl-10 pr-4 text-sm outline-none focus:border-primary"
              />
            </div>
          </div>

          {message ? <div className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm font-medium text-slate-800">{message}</div> : null}

          {filteredPosts.length === 0 ? (
            <div className="glass-panel rounded-3xl border border-dashed border-border p-12 text-center text-muted-foreground">
              <MessagesSquare className="mx-auto mb-4 h-12 w-12 text-primary/30" />
              {posts.length === 0 ? "Henuz forum konusu yok." : "Aramana uygun konu bulunamadi."}
            </div>
          ) : (
            filteredPosts.map((post) => {
              const postPeriod = periodOptionById(projects, post.period?.id);
              const canReplyToPost = periodHasWriteCapability(postPeriod, "resolve_operations");
              return (
              <article key={post.id} className="glass-panel overflow-hidden rounded-3xl p-0">
                <div className="border-b border-border bg-background/50 p-5">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">{post.project.name}</span>
                    {post.period?.name ? <span className="rounded-full bg-amber-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-700">{post.period.name}</span> : null}
                    {post.is_pinned ? <span className="rounded-full bg-amber-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-700">Sabit</span> : null}
                    <span className="text-xs font-medium text-muted-foreground">{authorName(post.author)} - {formatDate(post.created_at)}</span>
                  </div>
                  <h3 className="text-xl font-black text-slate-900">{post.title}</h3>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{post.content}</p>
                </div>

                <div className="space-y-3 p-5">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    <MessageCircle className="h-4 w-4 text-primary" />
                    {(post.replies?.length ?? 0).toLocaleString("tr-TR")} yanit
                  </div>

                  {(post.replies ?? []).map((reply) => (
                    <div key={reply.id} className="rounded-2xl border border-border bg-background/70 p-4">
                      <div className="mb-2 text-xs font-medium text-muted-foreground">{authorName(reply.author)} - {formatDate(reply.created_at)}</div>
                      <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{reply.content}</div>
                    </div>
                  ))}

                  <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                    <input
                      value={replyDrafts[post.id] ?? ""}
                      onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))}
                      placeholder="Yanit yaz..."
                      disabled={!canReplyToPost}
                      className="flex-1 rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => void sendReply(post.id)}
                      disabled={!canReplyToPost || replyingId === post.id || !(replyDrafts[post.id] ?? "").trim()}
                      title={!canReplyToPost ? "Bu dönemde yeni yanıt gönderilemez." : undefined}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-3 text-sm font-bold text-slate-900 transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {replyingId === post.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Gonder
                    </button>
                  </div>
                </div>
              </article>
              );
            })
          )}
        </main>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-background/70 p-3">
      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-black text-slate-900">{value.toLocaleString("tr-TR")}</p>
    </div>
  );
}

function ProjectButton({ active, label, count, onClick }: { active: boolean; label: string; count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-3 text-left text-sm transition ${
        active ? "border-primary bg-primary/10 text-slate-900" : "border-border bg-background/60 text-muted-foreground hover:border-primary/30 hover:text-slate-900"
      }`}
    >
      <span className="min-w-0 truncate font-bold">{label}</span>
      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-black">{count}</span>
    </button>
  );
}
