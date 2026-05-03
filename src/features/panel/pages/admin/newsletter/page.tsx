"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Mail, Search } from "lucide-react";
import { isAxiosError } from "axios";
import api from "@/lib/api/axios";
import { usePermissions } from "@/hooks/usePermissions";

interface Subscriber {
  id: number;
  email: string;
  name: string | null;
  subscribed_at: string | null;
}

export default function AdminNewsletterPage() {
  const { hasPermission, hasGlobalScope } = usePermissions();
  const canView = hasPermission("newsletter.view") && hasGlobalScope("newsletter.view");

  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  const fetchData = useCallback(
    async (pageNum: number) => {
      if (!canView) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await api.get("/panel/newsletter/subscribers", {
          params: { page: pageNum, search: search || undefined },
        });
        const data = res.data.subscribers;
        setSubscribers(data?.data ?? []);
        setLastPage(data?.last_page ?? 1);
      } catch (e: unknown) {
        if (isAxiosError(e) && e.response?.status === 403) {
          setSubscribers([]);
        }
        console.error(e);
      } finally {
        setLoading(false);
      }
    },
    [canView, search]
  );

  useEffect(() => {
    const t = window.setTimeout(() => void fetchData(page), 0);
    return () => window.clearTimeout(t);
  }, [page, fetchData]);

  if (!canView) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-sm text-muted-foreground">
        E-bulten listesi icin <span className="font-mono text-slate-900">newsletter.view</span> izni ve tum sistem kapsami gerekir.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/20 text-sky-400">
          <Mail className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900">E-Bulten Aboneleri</h1>
          <p className="mt-1 text-sm font-bold uppercase tracking-widest text-muted-foreground">Aktif kayitlar</p>
        </div>
      </div>

      <div className="glass-panel flex flex-col gap-4 rounded-3xl p-6 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setPage(1);
                void fetchData(1);
              }
            }}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none focus:border-sky-500"
            placeholder="E-posta veya isim ara..."
          />
        </div>
        <button
          type="button"
          onClick={() => {
            setPage(1);
            void fetchData(1);
          }}
          className="rounded-xl bg-sky-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-sky-500"
        >
          Ara
        </button>
      </div>

      <div className="glass-panel overflow-hidden rounded-3xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-muted-foreground">
            <thead className="border-b border-white/5 bg-white/5 text-xs font-bold uppercase tracking-widest text-slate-900">
              <tr>
                <th className="px-6 py-4">E-posta</th>
                <th className="px-6 py-4">Isim</th>
                <th className="px-6 py-4">Kayit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-sky-500" />
                  </td>
                </tr>
              ) : subscribers.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-muted-foreground">
                    Kayit bulunamadi.
                  </td>
                </tr>
              ) : (
                subscribers.map((s) => (
                  <tr key={s.id} className="transition-colors hover:bg-white/5">
                    <td className="px-6 py-4 font-mono text-sm text-slate-900">{s.email}</td>
                    <td className="px-6 py-4 text-slate-900">{s.name ?? "—"}</td>
                    <td className="px-6 py-4">
                      {s.subscribed_at ? new Date(s.subscribed_at).toLocaleString("tr-TR") : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {lastPage > 1 && (
          <div className="flex items-center justify-between border-t border-white/5 px-6 py-4">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-slate-900 disabled:opacity-50"
            >
              Onceki
            </button>
            <span className="text-xs font-bold text-muted-foreground">
              {page} / {lastPage}
            </span>
            <button
              type="button"
              disabled={page >= lastPage}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-slate-900 disabled:opacity-50"
            >
              Sonraki
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
