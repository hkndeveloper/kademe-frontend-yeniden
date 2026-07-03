"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Edit3, Loader2, Plus, Save, Search, Send, Trash2, Users } from "lucide-react";
import { isAxiosError } from "axios";
import api from "@/lib/api/axios";
import { ExportButtons } from "@/components/shared/ExportButtons";
import { usePermissions } from "@/hooks/usePermissions";

type UserSummary = {
  id: number;
  name?: string | null;
  surname?: string | null;
};

type Trainer = {
  id: number;
  first_name: string;
  last_name?: string | null;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  title?: string | null;
  organization?: string | null;
  expertise?: string | null;
  status: "active" | "passive" | "candidate";
  last_worked_at?: string | null;
  bio?: string | null;
  notes?: string | null;
  kademe_comment?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  comment_updated_at?: string | null;
  creator?: UserSummary | null;
  updater?: UserSummary | null;
  comment_updater?: UserSummary | null;
};

type Paginated<T> = {
  data: T[];
  current_page?: number;
  last_page?: number;
  total?: number;
};

type TrainersResponse = {
  trainers: Paginated<Trainer>;
  stats?: {
    total: number;
    active: number;
    candidate: number;
    with_email: number;
  };
  statuses?: string[];
};

type TrainerForm = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  title: string;
  organization: string;
  expertise: string;
  status: Trainer["status"];
  last_worked_at: string;
  bio: string;
  notes: string;
};

const emptyForm: TrainerForm = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  title: "",
  organization: "",
  expertise: "",
  status: "active",
  last_worked_at: "",
  bio: "",
  notes: "",
};

const statusLabels: Record<Trainer["status"], string> = {
  active: "Aktif",
  passive: "Pasif",
  candidate: "Aday",
};

function trainerToForm(trainer: Trainer): TrainerForm {
  return {
    first_name: trainer.first_name ?? "",
    last_name: trainer.last_name ?? "",
    email: trainer.email ?? "",
    phone: trainer.phone ?? "",
    title: trainer.title ?? "",
    organization: trainer.organization ?? "",
    expertise: trainer.expertise ?? "",
    status: trainer.status ?? "active",
    last_worked_at: trainer.last_worked_at ? trainer.last_worked_at.slice(0, 10) : "",
    bio: trainer.bio ?? "",
    notes: trainer.notes ?? "",
  };
}

function compactUser(user?: UserSummary | null): string {
  if (!user) return "-";
  return `${user.name ?? ""} ${user.surname ?? ""}`.trim() || `#${user.id}`;
}

function errorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    return String((error.response?.data as { message?: string } | undefined)?.message ?? fallback);
  }
  return fallback;
}

export default function PanelTrainersPage() {
  const { hasScopedPermission } = usePermissions();
  const canView = hasScopedPermission("trainers.view");
  const canCreate = hasScopedPermission("trainers.create");
  const canUpdate = hasScopedPermission("trainers.update");
  const canDelete = hasScopedPermission("trainers.delete");
  const canComment = hasScopedPermission("trainers.comment");
  const canEmail = hasScopedPermission("trainers.email");
  const canExport = hasScopedPermission("trainers.export");

  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | Trainer["status"]>("all");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [stats, setStats] = useState<TrainersResponse["stats"]>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mailSending, setMailSending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [form, setForm] = useState<TrainerForm>(emptyForm);
  const [commentDraft, setCommentDraft] = useState<{ trainerId: number | null; value: string }>({ trainerId: null, value: "" });
  const [mailDraft, setMailDraft] = useState<{ trainerId: number | null; subject: string; body: string }>({ trainerId: null, subject: "", body: "" });

  const selected = useMemo(
    () => trainers.find((trainer) => trainer.id === selectedId) ?? trainers[0] ?? null,
    [selectedId, trainers]
  );

  const loadTrainers = useCallback(
    async (pageNumber = page) => {
      if (!canView) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await api.get<TrainersResponse>("/panel/trainers", {
          params: {
            page: pageNumber,
            search: search || undefined,
            status: status !== "all" ? status : undefined,
          },
        });
        const payload = response.data.trainers;
        const rows = payload?.data ?? [];
        setTrainers(rows);
        setStats(response.data.stats);
        setLastPage(payload?.last_page ?? 1);
        setSelectedId((current) => current && rows.some((trainer) => trainer.id === current) ? current : rows[0]?.id ?? null);
      } catch (error) {
        setFeedback(errorMessage(error, "Egitmen listesi yuklenemedi."));
      } finally {
        setLoading(false);
      }
    },
    [canView, page, search, status]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadTrainers(page);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadTrainers, page]);



  const activeCommentDraft = selected && commentDraft.trainerId === selected.id ? commentDraft.value : selected?.kademe_comment ?? "";
  const activeMailSubject = selected && mailDraft.trainerId === selected.id ? mailDraft.subject : selected ? `${selected.full_name} - KADEME iletisim` : "";
  const activeMailBody = selected && mailDraft.trainerId === selected.id ? mailDraft.body : "";
  function beginCreate() {
    setEditingId("new");
    setForm(emptyForm);
    setFeedback(null);
  }

  function beginEdit(trainer: Trainer) {
    setEditingId(trainer.id);
    setForm(trainerToForm(trainer));
    setFeedback(null);
  }

  async function submitTrainer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.first_name.trim()) return;

    setSaving(true);
    setFeedback(null);
    const payload = {
      ...form,
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      title: form.title.trim() || null,
      organization: form.organization.trim() || null,
      expertise: form.expertise.trim() || null,
      last_worked_at: form.last_worked_at || null,
      bio: form.bio.trim() || null,
      notes: form.notes.trim() || null,
    };

    try {
      const response = editingId === "new"
        ? await api.post<{ message: string; trainer: Trainer }>("/panel/trainers", payload)
        : await api.put<{ message: string; trainer: Trainer }>(`/panel/trainers/${editingId}`, payload);

      setFeedback(response.data.message);
      setEditingId(null);
      setSelectedId(response.data.trainer.id);
      await loadTrainers(page);
    } catch (error) {
      setFeedback(errorMessage(error, "Egitmen kaydi kaydedilemedi."));
    } finally {
      setSaving(false);
    }
  }

  async function saveComment() {
    if (!selected) return;
    setSaving(true);
    setFeedback(null);
    try {
      const response = await api.patch<{ message: string; trainer: Trainer }>(`/panel/trainers/${selected.id}/comment`, {
        kademe_comment: activeCommentDraft.trim() || null,
      });
      setFeedback(response.data.message);
      setTrainers((current) => current.map((trainer) => trainer.id === selected.id ? response.data.trainer : trainer));
    } catch (error) {
      setFeedback(errorMessage(error, "Kademe yorumu kaydedilemedi."));
    } finally {
      setSaving(false);
    }
  }

  async function sendMail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected?.email || !activeMailSubject.trim() || !activeMailBody.trim()) return;

    setMailSending(true);
    setFeedback(null);
    try {
      const response = await api.post<{ message: string; sent_count: number }>(`/panel/trainers/${selected.id}/email`, {
        subject: activeMailSubject.trim(),
        body: activeMailBody.trim(),
      });
      setFeedback(response.data.message);
      setMailDraft({ trainerId: selected.id, subject: activeMailSubject, body: "" });
    } catch (error) {
      setFeedback(errorMessage(error, "E-posta gonderilemedi."));
    } finally {
      setMailSending(false);
    }
  }

  async function deleteTrainer(trainer: Trainer) {
    if (!window.confirm(`${trainer.full_name} kaydi silinsin mi?`)) return;
    setSaving(true);
    setFeedback(null);
    try {
      await api.delete(`/panel/trainers/${trainer.id}`);
      setFeedback("Egitmen kaydi silindi.");
      setSelectedId(null);
      await loadTrainers(page);
    } catch (error) {
      setFeedback(errorMessage(error, "Egitmen kaydi silinemedi."));
    } finally {
      setSaving(false);
    }
  }

  if (!canView) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-semibold text-amber-800">
        Egitmen bilgilerini gorme yetkiniz veya kapsam atamaniz bulunmuyor.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-primary">Yonetim ve kisiler</p>
          <h1 className="mt-2 text-2xl font-black text-slate-950 md:text-3xl">Egitmen Bilgileri</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">KADEME egitmen havuzu, iletisim bilgileri, uzmanlik alanlari ve Kademe yorumu.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canExport ? (
            <ExportButtons
              endpoint="/panel/trainers/export"
              filename="egitmenler"
              params={{ search: search || undefined, status: status !== "all" ? status : undefined }}
              buttonLabel="Disa Aktar"
            />
          ) : null}
          {canCreate ? (
            <button type="button" onClick={beginCreate} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800">
              <Plus className="h-4 w-4" /> Yeni Egitmen
            </button>
          ) : null}
        </div>
      </header>

      {stats ? (
        <section className="grid gap-3 md:grid-cols-4">
          {[
            ["Toplam", stats.total],
            ["Aktif", stats.active],
            ["Aday", stats.candidate],
            ["E-posta var", stats.with_email],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">{label}</p>
              <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
            </div>
          ))}
        </section>
      ) : null}

      {feedback ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{feedback}</div> : null}

      <section className="grid gap-5 xl:grid-cols-[390px,1fr]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    setPage(1);
                    void loadTrainers(1);
                  }
                }}
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary"
                placeholder="Isim, e-posta, uzmanlik ara"
              />
            </div>
            <div className="flex gap-2">
              <select value={status} onChange={(event) => { setStatus(event.target.value as typeof status); setPage(1); }} className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary">
                <option value="all">Tum durumlar</option>
                <option value="active">Aktif</option>
                <option value="candidate">Aday</option>
                <option value="passive">Pasif</option>
              </select>
              <button type="button" onClick={() => { setPage(1); void loadTrainers(1); }} className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
                Ara
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {loading ? (
              <div className="flex min-h-48 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : trainers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm font-semibold text-slate-500">Kayit bulunamadi.</div>
            ) : trainers.map((trainer) => (
              <button key={trainer.id} type="button" onClick={() => { setSelectedId(trainer.id); setEditingId(null); }} className={`w-full rounded-xl border p-3 text-left transition ${selected?.id === trainer.id ? "border-primary bg-primary/5" : "border-slate-200 hover:bg-slate-50"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-black text-slate-950">{trainer.full_name}</p>
                    <p className="mt-1 truncate text-xs text-slate-500">{trainer.expertise || trainer.title || "Uzmanlik bilgisi yok"}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase text-slate-600">{statusLabels[trainer.status]}</span>
                </div>
                <p className="mt-2 truncate text-xs text-slate-400">{trainer.email || trainer.phone || trainer.organization || "Iletisim bilgisi yok"}</p>
              </button>
            ))}
          </div>

          {lastPage > 1 ? (
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
              <button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold disabled:opacity-50">Onceki</button>
              <span className="text-xs font-bold text-slate-500">{page} / {lastPage}</span>
              <button type="button" disabled={page >= lastPage} onClick={() => setPage((current) => current + 1)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold disabled:opacity-50">Sonraki</button>
            </div>
          ) : null}
        </aside>

        <main className="space-y-5">
          {editingId ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-black text-slate-950">{editingId === "new" ? "Yeni egitmen" : "Egitmen kaydini duzenle"}</h2>
                <button type="button" onClick={() => setEditingId(null)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600">Vazgec</button>
              </div>
              <form onSubmit={submitTrainer} className="grid gap-4 md:grid-cols-2">
                <Field label="Ad" value={form.first_name} onChange={(value) => setForm((current) => ({ ...current, first_name: value }))} required />
                <Field label="Soyad" value={form.last_name} onChange={(value) => setForm((current) => ({ ...current, last_name: value }))} />
                <Field label="E-posta" value={form.email} onChange={(value) => setForm((current) => ({ ...current, email: value }))} type="email" />
                <Field label="Telefon" value={form.phone} onChange={(value) => setForm((current) => ({ ...current, phone: value }))} />
                <Field label="Unvan" value={form.title} onChange={(value) => setForm((current) => ({ ...current, title: value }))} />
                <Field label="Kurum" value={form.organization} onChange={(value) => setForm((current) => ({ ...current, organization: value }))} />
                <Field label="Uzmanlik" value={form.expertise} onChange={(value) => setForm((current) => ({ ...current, expertise: value }))} />
                <label className="text-sm font-bold text-slate-700">
                  Durum
                  <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as Trainer["status"] }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary">
                    <option value="active">Aktif</option>
                    <option value="candidate">Aday</option>
                    <option value="passive">Pasif</option>
                  </select>
                </label>
                <Field label="Son calisma tarihi" value={form.last_worked_at} onChange={(value) => setForm((current) => ({ ...current, last_worked_at: value }))} type="date" />
                <TextArea label="Biyografi / tanitim" value={form.bio} onChange={(value) => setForm((current) => ({ ...current, bio: value }))} />
                <TextArea label="Genel notlar" value={form.notes} onChange={(value) => setForm((current) => ({ ...current, notes: value }))} />
                <div className="md:col-span-2">
                  <button type="submit" disabled={saving || !form.first_name.trim()} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Kaydet
                  </button>
                </div>
              </form>
            </section>
          ) : selected ? (
            <>
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><Users className="h-5 w-5" /></div>
                      <div className="min-w-0">
                        <h2 className="truncate text-2xl font-black text-slate-950">{selected.full_name}</h2>
                        <p className="text-sm font-semibold text-slate-500">{selected.title || selected.expertise || "Egitmen"}</p>
                      </div>
                    </div>
                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                      <Info label="E-posta" value={selected.email} />
                      <Info label="Telefon" value={selected.phone} />
                      <Info label="Kurum" value={selected.organization} />
                      <Info label="Uzmanlik" value={selected.expertise} />
                      <Info label="Durum" value={statusLabels[selected.status]} />
                      <Info label="Son calisma" value={selected.last_worked_at ? new Date(selected.last_worked_at).toLocaleDateString("tr-TR") : null} />
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {canUpdate ? <button type="button" onClick={() => beginEdit(selected)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"><Edit3 className="h-4 w-4" /> Duzenle</button> : null}
                    {canDelete ? <button type="button" onClick={() => void deleteTrainer(selected)} className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700"><Trash2 className="h-4 w-4" /> Sil</button> : null}
                  </div>
                </div>
                {selected.bio || selected.notes ? (
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    {selected.bio ? <LongInfo label="Biyografi" value={selected.bio} /> : null}
                    {selected.notes ? <LongInfo label="Genel notlar" value={selected.notes} /> : null}
                  </div>
                ) : null}
                <div className="mt-5 border-t border-slate-100 pt-4 text-xs font-semibold text-slate-400">
                  Olusturan: {compactUser(selected.creator)} | Son guncelleme: {selected.updated_at ? new Date(selected.updated_at).toLocaleString("tr-TR") : "-"}
                </div>
              </section>

              <section className="grid gap-5 xl:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-base font-black text-slate-950">Kademe yorumu</h3>
                  <p className="mt-1 text-xs font-semibold text-slate-500">Bu alan tek yorumdur; yetkisi olan kisiler son izlenimi gunceller.</p>
                  <textarea
                    value={activeCommentDraft}
                    onChange={(event) => setCommentDraft({ trainerId: selected.id, value: event.target.value })}
                    readOnly={!canComment}
                    className="mt-4 min-h-36 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-primary disabled:bg-slate-50"
                    placeholder="Egitmenin calismalari, saha izlenimi, guvenilirlik ve tekrar calisma notlari..."
                  />
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold text-slate-400">Son yorum: {selected.comment_updated_at ? new Date(selected.comment_updated_at).toLocaleString("tr-TR") : "-"}</span>
                    {canComment ? <button type="button" onClick={() => void saveComment()} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"><Save className="h-4 w-4" /> Yorumu Kaydet</button> : null}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-base font-black text-slate-950">E-posta gonder</h3>
                  <p className="mt-1 text-xs font-semibold text-slate-500">Adres varsa secili egitmene sistem uzerinden mesaj gonderilir.</p>
                  {!selected.email ? (
                    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">Bu egitmenin e-posta adresi yok.</div>
                  ) : !canEmail ? (
                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500">E-posta gonderme yetkiniz yok.</div>
                  ) : (
                    <form onSubmit={sendMail} className="mt-4 space-y-3">
                      <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500">Alici: <span className="text-slate-900">{selected.email}</span></div>
                      <input value={activeMailSubject} onChange={(event) => setMailDraft({ trainerId: selected.id, subject: event.target.value, body: activeMailBody })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary" placeholder="Konu" />
                      <textarea value={activeMailBody} onChange={(event) => setMailDraft({ trainerId: selected.id, subject: activeMailSubject, body: event.target.value })} className="min-h-32 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-primary" placeholder="Mesaj" />
                      <button type="submit" disabled={mailSending || !activeMailSubject.trim() || !activeMailBody.trim()} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
                        {mailSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Gonder
                      </button>
                    </form>
                  )}
                </div>
              </section>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm font-semibold text-slate-500">Bir egitmen secin veya yeni kayit olusturun.</div>
          )}
        </main>
      </section>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="text-sm font-bold text-slate-700">
      {label}
      <input required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary" />
    </label>
  );
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="text-sm font-bold text-slate-700 md:col-span-2">
      {label}
      <textarea value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary" />
    </label>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 truncate text-sm font-bold text-slate-900">{value || "-"}</p>
    </div>
  );
}

function LongInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{value}</p>
    </div>
  );
}