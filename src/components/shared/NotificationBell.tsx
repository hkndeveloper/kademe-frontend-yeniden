"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, Loader2, Trash2, X } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api/axios";
import { cn } from "@/lib/utils";

interface SystemNotification {
  id: number;
  type: string;
  title: string;
  body: string | null;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ notifications: SystemNotification[]; unread_count: number }>("/user/notifications");
      setNotifications(res.data.notifications ?? []);
      setUnreadCount(res.data.unread_count ?? 0);
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const interval = setInterval(() => void load(), 60_000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const markRead = async (id: number) => {
    await api.patch(`/user/notifications/${id}/read`).catch(() => null);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const markAllRead = async () => {
    await api.post("/user/notifications/read-all").catch(() => null);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const remove = async (id: number) => {
    await api.delete(`/user/notifications/${id}`).catch(() => null);
    const removed = notifications.find((n) => n.id === id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (removed && !removed.is_read) setUnreadCount((c) => Math.max(0, c - 1));
  };

  const typeColor: Record<string, string> = {
    application: "text-sky-600 bg-sky-50 border-sky-200",
    support: "text-amber-600 bg-amber-50 border-amber-200",
    financial: "text-emerald-600 bg-emerald-50 border-emerald-200",
    kpd: "text-violet-600 bg-violet-50 border-violet-200",
    program: "text-orange-600 bg-orange-50 border-orange-200",
    assignment: "text-indigo-600 bg-indigo-50 border-indigo-200",
    system: "text-slate-600 bg-slate-50 border-slate-200",
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-white"
        aria-label="Bildirimler"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#FF6B00] text-[9px] font-black text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-white/10 bg-[#0f1020] shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-300">
              Bildirimler {unreadCount > 0 ? `(${unreadCount} yeni)` : ""}
            </span>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => void markAllRead()}
                  className="rounded p-1 text-slate-400 hover:text-white"
                  title="Tümünü okundu say"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded p-1 text-slate-400 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
              </div>
            ) : notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-slate-500">Yeni bildirim yok.</p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "group flex items-start gap-3 border-b border-white/[0.06] px-4 py-3 transition-colors hover:bg-white/[0.04]",
                    !n.is_read && "bg-white/[0.03]"
                  )}
                >
                  <div className={cn("mt-0.5 rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase", typeColor[n.type] ?? typeColor.system)}>
                    {n.type}
                  </div>
                  <div className="min-w-0 flex-1">
                    {n.action_url ? (
                      <Link
                        href={n.action_url}
                        onClick={() => { void markRead(n.id); setOpen(false); }}
                        className="block text-xs font-semibold text-slate-200 hover:text-white"
                      >
                        {n.title}
                      </Link>
                    ) : (
                      <p className="text-xs font-semibold text-slate-200">{n.title}</p>
                    )}
                    {n.body && <p className="mt-0.5 line-clamp-2 text-[10px] text-slate-500">{n.body}</p>}
                    <p className="mt-1 text-[9px] text-slate-600">
                      {new Date(n.created_at).toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    {!n.is_read && (
                      <button
                        type="button"
                        onClick={() => void markRead(n.id)}
                        className="rounded p-0.5 text-slate-500 hover:text-[#FF6B00]"
                        title="Okundu"
                      >
                        <CheckCheck className="h-3 w-3" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void remove(n.id)}
                      className="rounded p-0.5 text-slate-500 hover:text-red-400"
                      title="Sil"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
