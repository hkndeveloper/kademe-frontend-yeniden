"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bell, Calendar, Loader2, Pin, Star } from "lucide-react";
import api from "@/lib/api/axios";
import { LinkifiedText } from "@/components/shared/LinkifiedText";

interface InboxMessage {
  type: string;
  source_label?: string | null;
  source_type: string;
  source_id: number;
  title: string;
  content?: string | null;
  category?: string | null;
  project?: { id: number; name: string } | null;
  timestamp?: string | null;
  state: {
    is_read: boolean;
    read_at?: string | null;
    is_starred: boolean;
    is_pinned: boolean;
  };
}

export function ParticipantInboxPage() {
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [projectFilter, setProjectFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [starredOnly, setStarredOnly] = useState(false);
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchInbox = useCallback(async () => {
    try {
      const response = await api.get<{ messages: InboxMessage[] }>("/inbox/messages", {
        params: {
          project_id: projectFilter !== "all" ? Number(projectFilter) : undefined,
          category: categoryFilter !== "all" ? categoryFilter : undefined,
          from: fromDate || undefined,
          to: toDate || undefined,
          unread_only: unreadOnly || undefined,
          starred_only: starredOnly || undefined,
          pinned_only: pinnedOnly || undefined,
        },
      });
      setMessages(response.data.messages ?? []);
    } catch (error) {
      console.error("Inbox yuklenemedi", error);
    } finally {
      setLoading(false);
    }
  }, [projectFilter, categoryFilter, fromDate, toDate, unreadOnly, starredOnly, pinnedOnly]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchInbox();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchInbox]);

  const typeFallbackLabels: Record<string, string> = {
    announcement: "Duyuru",
    opportunity: "Kariyer Firsati",
    forum_post: "Forum",
  };

  const projects = Array.from(
    new Map(
      messages
        .filter((item) => item.project?.id != null)
        .map((item) => [item.project!.id, item.project!]),
    ).values(),
  );

  const categories = Array.from(
    new Set(messages.map((item) => item.category).filter((value): value is string => Boolean(value))),
  );

  const updateState = async (item: InboxMessage, partial: { is_read?: boolean; is_starred?: boolean; is_pinned?: boolean }) => {
    try {
      await api.put("/inbox/messages/state", {
        source_type: item.source_type,
        source_id: item.source_id,
        ...partial,
      });
      await fetchInbox();
    } catch (error) {
      console.error("Inbox state guncellenemedi", error);
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
          <Bell className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Mesaj / Duyuru Kutusu</h1>
          <p className="text-sm text-muted-foreground">Sana acik duyurular tek kutuda listelenir.</p>
        </div>
      </div>

      <div className="glass-panel rounded-3xl p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="rounded-xl border border-border bg-input px-3 py-2 text-sm">
            <option value="all">Tum projeler</option>
            {projects.map((project) => (
              <option key={project.id} value={String(project.id)}>
                {project.name}
              </option>
            ))}
          </select>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="rounded-xl border border-border bg-input px-3 py-2 text-sm">
            <option value="all">Tum kategoriler</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2 text-xs">
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full rounded-xl border border-border bg-input px-2 py-2" />
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full rounded-xl border border-border bg-input px-2 py-2" />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-5 text-xs text-muted-foreground">
          <label className="inline-flex items-center gap-2"><input type="checkbox" checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)} /> Sadece okunmamis</label>
          <label className="inline-flex items-center gap-2"><input type="checkbox" checked={starredOnly} onChange={(e) => setStarredOnly(e.target.checked)} /> Sadece yildizli</label>
          <label className="inline-flex items-center gap-2"><input type="checkbox" checked={pinnedOnly} onChange={(e) => setPinnedOnly(e.target.checked)} /> Sadece sabit</label>
        </div>
      </div>

      <div className="space-y-6">
        {messages.length === 0 ? (
          <div className="glass-panel rounded-3xl p-20 text-center text-muted-foreground">
            <Bell className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
            Kutunda henuz duyuru yok.
          </div>
        ) : (
          messages.map((item, index) => (
            <motion.div
              key={`${item.source_type}:${item.source_id}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="glass-panel rounded-3xl p-6 transition-colors hover:bg-white/5"
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{item.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.source_label || typeFallbackLabels[item.type] || item.type}
                    {item.project?.name ? ` · ${item.project.name}` : ""}
                    {item.category ? ` · ${item.category}` : ""}
                  </p>
                </div>
                <span className="flex whitespace-nowrap rounded-full bg-white/5 px-3 py-1.5 text-xs text-muted-foreground">
                  <Calendar className="mr-2 h-3.5 w-3.5" />
                  {new Date(item.timestamp ?? "1970-01-01").toLocaleDateString("tr-TR")}
                </span>
              </div>
              <LinkifiedText text={item.content ?? "-"} className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground" />
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => void updateState(item, { is_read: !item.state.is_read })} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted">
                  {item.state.is_read ? "Okunmamis yap" : "Okundu yap"}
                </button>
                <button type="button" onClick={() => void updateState(item, { is_starred: !item.state.is_starred })} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted">
                  <Star className={`h-3.5 w-3.5 ${item.state.is_starred ? "fill-current" : ""}`} /> {item.state.is_starred ? "Yildizi kaldir" : "Yildizla"}
                </button>
                <button type="button" onClick={() => void updateState(item, { is_pinned: !item.state.is_pinned })} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted">
                  <Pin className={`h-3.5 w-3.5 ${item.state.is_pinned ? "fill-current" : ""}`} /> {item.state.is_pinned ? "Sabiti kaldir" : "Sabitle"}
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

