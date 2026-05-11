"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import api from "@/lib/api/axios";
import { PermissionGate } from "@/components/shared/PermissionGate";

type ForgetStatus = "pending" | "completed" | "rejected";

interface ForgetRequestItem {
  id: number;
  status: ForgetStatus;
  request_note?: string | null;
  reviewer_note?: string | null;
  reviewed_at?: string | null;
  anonymized_at?: string | null;
  created_at: string;
  user: {
    id: number;
    name: string;
    surname: string;
    email: string;
    role: string;
    status: string;
    kvkk_forgotten: boolean;
  };
  reviewer?: {
    id: number;
    name: string;
    surname: string;
  } | null;
}

interface ForgetRequestResponse {
  forget_requests: {
    data: ForgetRequestItem[];
  };
}

const statusLabel: Record<ForgetStatus, string> = {
  pending: "Bekliyor",
  completed: "Tamamlandi",
  rejected: "Reddedildi",
};

export default function PanelKvkkForgetPage() {
  const [items, setItems] = useState<ForgetRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [reviewNotes, setReviewNotes] = useState<Record<number, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<ForgetRequestResponse>("/panel/kvkk/forget-requests", {
        params: statusFilter ? { status: statusFilter } : undefined,
      });
      setItems(response.data.forget_requests?.data ?? []);
    } catch (loadError) {
      console.error("KVKK unutulma talepleri yuklenemedi", loadError);
      setError("KVKK unutulma talepleri yuklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const pendingCount = useMemo(() => items.filter((item) => item.status === "pending").length, [items]);

  const resolveRequest = async (id: number, decision: "approve" | "reject") => {
    setUpdatingId(id);
    setMessage(null);
    setError(null);
    try {
      const response = await api.post<{ message: string; forget_request: ForgetRequestItem }>(
        `/panel/kvkk/forget-requests/${id}/resolve`,
        {
          decision,
          reviewer_note: reviewNotes[id] || null,
        }
      );
      setItems((current) => current.map((item) => (item.id === id ? response.data.forget_request : item)));
      setMessage(response.data.message);
    } catch (resolveError) {
      console.error("KVKK talebi sonuclandirilemedi", resolveError);
      setError("KVKK talebi sonuclandirilemedi.");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <PermissionGate
      permission="users.update"
      fallback={<div className="glass-panel rounded-3xl p-10 text-center text-sm text-muted-foreground">Bu modulu goruntulemek icin yetkiniz bulunmuyor.</div>}
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-300">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900">KVKK Unutulma Talepleri</h1>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Bekleyen talep: {pendingCount}</p>
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-900"
          >
            <option value="">Tum durumlar</option>
            <option value="pending">Bekleyen</option>
            <option value="completed">Tamamlanan</option>
            <option value="rejected">Reddedilen</option>
          </select>
        </div>

        {message ? <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">{message}</div> : null}
        {error ? <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">{error}</div> : null}

        <div className="glass-panel rounded-3xl p-6">
          {loading ? (
            <div className="flex min-h-24 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-sm text-muted-foreground">Filtreye uygun KVKK talebi bulunmuyor.</div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-bold text-slate-900">
                      #{item.id} - {item.user.name} {item.user.surname}
                    </div>
                    <span className="rounded-xl border border-slate-200 bg-white px-2 py-1 text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                      {statusLabel[item.status]}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {item.user.email} | Rol: {item.user.role} | Talep: {new Date(item.created_at).toLocaleString("tr-TR")}
                  </div>
                  {item.request_note ? <p className="mt-3 text-sm text-muted-foreground">{item.request_note}</p> : null}
                  {item.status === "pending" ? (
                    <div className="mt-4 space-y-3">
                      <textarea
                        rows={3}
                        value={reviewNotes[item.id] ?? ""}
                        onChange={(event) => setReviewNotes((current) => ({ ...current, [item.id]: event.target.value }))}
                        placeholder="Inceleme notu"
                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-900"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={updatingId === item.id}
                          onClick={() => void resolveRequest(item.id, "approve")}
                          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                        >
                          Anonimlestirmeyi Onayla
                        </button>
                        <button
                          type="button"
                          disabled={updatingId === item.id}
                          onClick={() => void resolveRequest(item.id, "reject")}
                          className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                        >
                          Talebi Reddet
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 text-xs text-muted-foreground">
                      {item.reviewer_note ? `Inceleme notu: ${item.reviewer_note}` : "Inceleme notu yok."}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PermissionGate>
  );
}
