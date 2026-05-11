"use client";

import { FormEvent, useEffect, useState } from "react";
import { Loader2, MessageSquarePlus, MessagesSquare } from "lucide-react";
import api from "@/lib/api/axios";

type Project = { id: number; name: string };

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
  project: Project;
  author?: { id: number; name: string; surname: string } | null;
  replies?: ForumReply[];
};

export function ForumPortalPage() {
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [projectFilter, setProjectFilter] = useState("all");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [projects, setProjects] = useState<Project[]>([]);

  const canSubmit = title.trim().length > 2 && content.trim().length > 5 && projectFilter !== "all";

  async function fetchPosts(projectId?: string) {
    const res = await api.get<{ posts?: { data?: ForumPost[] } }>("/forum/posts", {
      params: { project_id: projectId && projectId !== "all" ? projectId : undefined },
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
        setProjects(projectsRes.data.projects ?? []);
      } catch (error) {
        console.error("Forum yuklenemedi", error);
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, []);

  const createPost = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setMessage(null);
    try {
      const response = await api.post<{ message?: string }>("/forum/posts", {
        project_id: Number(projectFilter),
        title: title.trim(),
        content: content.trim(),
      });
      setTitle("");
      setContent("");
      setMessage(response.data.message ?? "Forum konusu olusturuldu.");
      await fetchPosts(projectFilter);
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
    try {
      await api.post(`/forum/posts/${postId}/replies`, { content: draft });
      setReplyDrafts((prev) => ({ ...prev, [postId]: "" }));
      await fetchPosts(projectFilter);
    } catch (error) {
      console.error("Yanit gonderilemedi", error);
      setMessage("Yanit gonderilemedi.");
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
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-primary">
          <MessagesSquare className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Proje Forumu</h1>
          <p className="text-sm text-muted-foreground">Katilimda oldugun projeler icin kapali forum akisi.</p>
        </div>
      </div>

      <form onSubmit={createPost} className="glass-panel rounded-3xl p-6">
        <div className="mb-3 text-sm font-semibold text-slate-900">Yeni Konu</div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[220px_1fr]">
          <select
            value={projectFilter}
            onChange={(e) => {
              const nextProjectId = e.target.value;
              setProjectFilter(nextProjectId);
              void fetchPosts(nextProjectId);
            }}
            className="rounded-xl border border-border bg-input px-3 py-2 text-sm"
          >
            <option value="all">Proje secin</option>
            {projects.map((project) => (
              <option key={project.id} value={String(project.id)}>
                {project.name}
              </option>
            ))}
          </select>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Konu basligi"
            className="rounded-xl border border-border bg-input px-3 py-2 text-sm"
          />
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Mesaj icerigi"
          className="mt-3 min-h-[110px] w-full rounded-xl border border-border bg-input px-3 py-2 text-sm"
        />
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Sadece uye oldugun projelerde konu acabilirsin.</span>
          <button
            type="submit"
            disabled={!canSubmit || saving}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            <MessageSquarePlus className="h-4 w-4" />
            Konu Ac
          </button>
        </div>
      </form>

      {message ? (
        <div className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-slate-800">{message}</div>
      ) : null}

      <div className="space-y-4">
        {posts.length === 0 ? (
          <div className="glass-panel rounded-3xl p-10 text-center text-muted-foreground">Henuz forum konusu yok.</div>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="glass-panel rounded-3xl p-6">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {post.project.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {post.author ? `${post.author.name} ${post.author.surname}` : "-"} ·{" "}
                  {new Date(post.created_at).toLocaleString("tr-TR")}
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900">{post.title}</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{post.content}</p>

              <div className="mt-4 space-y-2 border-t border-border pt-4">
                {(post.replies ?? []).map((reply) => (
                  <div key={reply.id} className="rounded-xl bg-white/5 p-3 text-sm">
                    <div className="mb-1 text-xs text-muted-foreground">
                      {reply.author ? `${reply.author.name} ${reply.author.surname}` : "-"} ·{" "}
                      {new Date(reply.created_at).toLocaleString("tr-TR")}
                    </div>
                    <div className="whitespace-pre-wrap text-slate-800">{reply.content}</div>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input
                    value={replyDrafts[post.id] ?? ""}
                    onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))}
                    placeholder="Yanit yaz..."
                    className="flex-1 rounded-xl border border-border bg-input px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => void sendReply(post.id)}
                    className="rounded-xl border border-border bg-white px-3 py-2 text-sm font-semibold hover:bg-muted"
                  >
                    Gonder
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

