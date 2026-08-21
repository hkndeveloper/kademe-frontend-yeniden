"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Loader2, Megaphone, Pin, Star } from "lucide-react";
import api from "@/lib/api/axios";
import { LinkifiedText } from "@/components/shared/LinkifiedText";
import { useAuth } from "@/store/useAuth";

type InboxMessage = {
  source_type: string;
  source_id: number;
  type: string;
  source_label?: string | null;
  source_action_label?: string | null;
  source_action_url?: string | null;
  title: string;
  content?: string | null;
  category?: string | null;
  timestamp?: string | null;
  project?: { id: number; name: string } | null;
  state: {
    is_read: boolean;
    is_starred: boolean;
    is_pinned: boolean;
    read_at?: string | null;
  };
};

export default function PanelInboxPage() {
  const { hasPermission } = useAuth();
  const [items, setItems] = useState<InboxMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [starredOnly, setStarredOnly] = useState(false);
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [projectFilter, setProjectFilter] = useState("all");

  const typeFallbackLabels: Record<string, string> = {
    announcement: "Duyuru",
    opportunity: "Kariyer Firsati",
    forum_post: "Forum",
  };

  const projects = Array.from(
    new Map(
      items
        .filter((item) => item.project?.id != null)
        .map((item) => [item.project!.id, item.project!]),
    ).values(),
  );

  useEffect(() => {
    const fetchInbox = async () => {
      try {
        const response = await api.get<{ messages: InboxMessage[] }>("/panel/inbox/messages", {
          params: {
            unread_only: unreadOnly || undefined,
            starred_only: starredOnly || undefined,
            pinned_only: pinnedOnly || undefined,
            project_id: projectFilter !== "all" ? Number(projectFilter) : undefined,
          },
        });
        setItems(response.data.messages ?? []);
      } catch (error) {
        console.error("Panel inbox yuklenemedi", error);
      } finally {
        setLoading(false);
      }
    };

    void fetchInbox();
  }, [unreadOnly, starredOnly, pinnedOnly, projectFilter]);

  const updateState = async (item: InboxMessage, partial: { is_read?: boolean; is_starred?: boolean; is_pinned?: boolean }) => {
    try {
      await api.put("/panel/inbox/messages/state", {
        source_type: item.source_type,
        source_id: item.source_id,
        ...partial,
      });
      const refresh = await api.get<{ messages: InboxMessage[] }>("/panel/inbox/messages", {
        params: {
          unread_only: unreadOnly || undefined,
          starred_only: starredOnly || undefined,
          pinned_only: pinnedOnly || undefined,
          project_id: projectFilter !== "all" ? Number(projectFilter) : undefined,
        },
      });
      setItems(refresh.data.messages ?? []);
    } catch (error) {
      console.error("Panel inbox state guncellenemedi", error);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Bell className="mt-1 h-6 w-6 shrink-0 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Gelen Kutusu</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
              Size gorunen duyurular, kariyer firsatlari ve forum bildirimleri burada toplanir. Bu ekran kisiye ozel mesaj yazma alani degildir.
            </p>
          </div>
        </div>
        {hasPermission("announcements.create") ? (
          <Link href="/panel/announcements" className="panel-card-action panel-card-action-primary shrink-0">
            <Megaphone className="h-4 w-4" /> Yeni duyuru gonder
          </Link>
        ) : null}
      </div>
      <div className="panel-filter-card">
        <div className="flex flex-wrap items-center gap-3">
          <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="panel-control w-auto min-w-56">
            <option value="all">Tum projeler</option>
            {projects.map((project) => (
              <option key={project.id} value={String(project.id)}>
                {project.name}
              </option>
            ))}
          </select>
          <label className="panel-chip cursor-pointer"><input type="checkbox" checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)} /> Okunmamis</label>
          <label className="panel-chip cursor-pointer"><input type="checkbox" checked={starredOnly} onChange={(e) => setStarredOnly(e.target.checked)} /> Yildizli</label>
          <label className="panel-chip cursor-pointer"><input type="checkbox" checked={pinnedOnly} onChange={(e) => setPinnedOnly(e.target.checked)} /> Sabit</label>
        </div>
      </div>
      {items.length === 0 ? (
        <div className="panel-empty-card">Size gosterilecek duyuru, kariyer firsati veya forum bildirimi bulunmuyor.</div>
      ) : (
        items.map((item) => (
          <div key={`${item.source_type}:${item.source_id}`} className="panel-list-card">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{item.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.source_label || typeFallbackLabels[item.type] || item.type}
                  {item.project?.name ? ` · ${item.project.name}` : ""}
                  {item.category ? ` · ${item.category}` : ""}
                </p>
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(item.timestamp ?? "1970-01-01").toLocaleDateString("tr-TR")}
              </span>
            </div>
            <LinkifiedText text={item.content ?? "-"} className="whitespace-pre-wrap text-sm text-muted-foreground" />
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => void updateState(item, { is_read: !item.state.is_read })} className="panel-card-action">
                {item.state.is_read ? "Okunmamis yap" : "Okundu yap"}
              </button>
              <button type="button" onClick={() => void updateState(item, { is_starred: !item.state.is_starred })} className="panel-card-action">
                <Star className={`h-3.5 w-3.5 ${item.state.is_starred ? "fill-current" : ""}`} /> {item.state.is_starred ? "Yildizi kaldir" : "Yildizla"}
              </button>
              <button type="button" onClick={() => void updateState(item, { is_pinned: !item.state.is_pinned })} className="panel-card-action">
                <Pin className={`h-3.5 w-3.5 ${item.state.is_pinned ? "fill-current" : ""}`} /> {item.state.is_pinned ? "Sabiti kaldir" : "Sabitle"}
              </button>
              {item.source_action_url ? (
                <Link href={item.source_action_url} className="panel-card-action">
                  {item.source_action_label || "Kaynak"}
                </Link>
              ) : null}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
