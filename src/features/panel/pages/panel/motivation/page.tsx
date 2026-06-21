"use client";

import { useEffect, useMemo, useState } from "react";
import { ImagePlus, Loader2, Plus, Save, Sparkles, Trash2 } from "lucide-react";
import api from "@/lib/api/axios";
import { usePermissions } from "@/hooks/usePermissions";

type RotationPeriod = "daily" | "weekly" | "monthly";

interface MotivationQuote {
  id: number;
  quote: string;
  speaker?: string | null;
  image_url?: string | null;
  sort_order: number;
  is_active: boolean;
}

interface MotivationList {
  id: number;
  name: string;
  description?: string | null;
  rotation_period: RotationPeriod;
  is_active: boolean;
  quotes: MotivationQuote[];
}

const emptyQuote = {
  quote: "",
  speaker: "",
  sort_order: 0,
  is_active: true,
};

export default function PanelMotivationPage() {
  const { hasPermission, hasGlobalScope } = usePermissions();
  const canView = hasPermission("motivation.view") && hasGlobalScope("motivation.view");
  const canManage = hasPermission("motivation.manage") && hasGlobalScope("motivation.manage");
  const [lists, setLists] = useState<MotivationList[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [listForm, setListForm] = useState({ name: "", description: "", rotation_period: "monthly" as RotationPeriod, is_active: false });
  const [quoteForm, setQuoteForm] = useState({ ...emptyQuote });
  const [imageFile, setImageFile] = useState<File | null>(null);

  const selected = useMemo(() => lists.find((list) => list.id === selectedId) ?? lists[0] ?? null, [lists, selectedId]);

  const loadLists = async () => {
    if (!canView) return;
    setLoading(true);
    try {
      const response = await api.get<{ lists: MotivationList[] }>("/panel/motivation/lists");
      setLists(response.data.lists ?? []);
      setSelectedId((current) => current ?? response.data.lists?.[0]?.id ?? null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadLists();
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView]);

  const createList = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const response = await api.post<{ list: MotivationList }>("/panel/motivation/lists", listForm);
      setLists((prev) => [response.data.list, ...prev]);
      setSelectedId(response.data.list.id);
      setListForm({ name: "", description: "", rotation_period: "monthly", is_active: false });
      setFeedback("Motivasyon listesi olusturuldu.");
    } finally {
      setSaving(false);
    }
  };

  const updateList = async (list: MotivationList, patch: Partial<MotivationList>) => {
    const response = await api.put<{ list: MotivationList }>(`/panel/motivation/lists/${list.id}`, patch);
    setLists((prev) => prev.map((item) => (item.id === list.id ? response.data.list : patch.is_active ? { ...item, is_active: false } : item)));
    setFeedback("Liste guncellendi.");
  };

  const deleteList = async (list: MotivationList) => {
    if (!window.confirm(`${list.name} silinsin mi?`)) return;
    await api.delete(`/panel/motivation/lists/${list.id}`);
    setLists((prev) => prev.filter((item) => item.id !== list.id));
    setSelectedId(null);
    setFeedback("Liste silindi.");
  };

  const createQuote = async () => {
    if (!selected) return;
    setSaving(true);
    setFeedback(null);
    try {
      const data = new FormData();
      data.append("quote", quoteForm.quote);
      data.append("speaker", quoteForm.speaker);
      data.append("sort_order", String(quoteForm.sort_order));
      data.append("is_active", quoteForm.is_active ? "1" : "0");
      if (imageFile) data.append("image", imageFile);
      await api.post(`/panel/motivation/lists/${selected.id}/quotes`, data, { headers: { "Content-Type": "multipart/form-data" } });
      setQuoteForm({ ...emptyQuote });
      setImageFile(null);
      setFeedback("Motivasyon cumlesi eklendi.");
      await loadLists();
    } finally {
      setSaving(false);
    }
  };

  const deleteQuote = async (quote: MotivationQuote) => {
    if (!window.confirm("Bu motivasyon cumlesi silinsin mi?")) return;
    await api.delete(`/panel/motivation/quotes/${quote.id}`);
    await loadLists();
  };

  if (!canView) {
    return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-semibold text-amber-800">Motivasyon alanini gorme yetkiniz yok.</div>;
  }

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-9 w-9 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-primary">Icerik ve iletisim</p>
          <h1 className="mt-2 text-2xl font-black text-slate-950 md:text-3xl">Motivasyon Yonetimi</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">Ogrenci ve mezun panellerindeki motivasyon karti aktif listeden gunluk, haftalik veya aylik olarak otomatik degisir.</p>
        </div>
        {selected ? (
          <button disabled={!canManage} onClick={() => updateList(selected, { is_active: true })} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
            Bu listeyi aktif yap
          </button>
        ) : null}
      </header>

      {feedback ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{feedback}</div> : null}

      <section className="grid gap-5 xl:grid-cols-[360px,1fr]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-black text-slate-900">Listeler</h2>
          <div className="space-y-2">
            {lists.map((list) => (
              <button key={list.id} onClick={() => setSelectedId(list.id)} className={`w-full rounded-xl border p-3 text-left transition ${selected?.id === list.id ? "border-primary bg-primary/5" : "border-slate-200 hover:bg-slate-50"}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-900">{list.name}</span>
                  {list.is_active ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700">AKTIF</span> : null}
                </div>
                <p className="mt-1 text-xs text-slate-500">{list.rotation_period} | {list.quotes.length} cumle</p>
              </button>
            ))}
          </div>

          {canManage ? (
            <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">
              <input value={listForm.name} onChange={(e) => setListForm((p) => ({ ...p, name: e.target.value }))} placeholder="Liste adi" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <textarea value={listForm.description} onChange={(e) => setListForm((p) => ({ ...p, description: e.target.value }))} placeholder="Kisa aciklama" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <select value={listForm.rotation_period} onChange={(e) => setListForm((p) => ({ ...p, rotation_period: e.target.value as RotationPeriod }))} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                <option value="daily">Gunluk degissin</option>
                <option value="weekly">Haftalik degissin</option>
                <option value="monthly">Aylik degissin</option>
              </select>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                <input type="checkbox" checked={listForm.is_active} onChange={(e) => setListForm((p) => ({ ...p, is_active: e.target.checked }))} />
                Olusturunca aktif yap
              </label>
              <button disabled={saving || !listForm.name.trim()} onClick={createList} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">
                <Plus className="h-4 w-4" /> Liste olustur
              </button>
            </div>
          ) : null}
        </aside>

        <main className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
          {!selected ? (
            <div className="flex min-h-80 items-center justify-center rounded-2xl border border-dashed border-slate-200 text-sm text-slate-500">Once bir motivasyon listesi olusturun.</div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                <div>
                  <h2 className="text-xl font-black text-slate-950">{selected.name}</h2>
                  <p className="text-sm text-slate-500">{selected.description || "Aciklama yok."}</p>
                </div>
                {canManage ? (
                  <div className="flex flex-wrap gap-2">
                    <select value={selected.rotation_period} onChange={(e) => updateList(selected, { rotation_period: e.target.value as RotationPeriod })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                      <option value="daily">Gunluk</option>
                      <option value="weekly">Haftalik</option>
                      <option value="monthly">Aylik</option>
                    </select>
                    <button onClick={() => deleteList(selected)} className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm font-bold text-red-600"><Trash2 className="h-4 w-4" /> Sil</button>
                  </div>
                ) : null}
              </div>

              {canManage ? (
                <div className="grid gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 md:grid-cols-2">
                  <textarea value={quoteForm.quote} onChange={(e) => setQuoteForm((p) => ({ ...p, quote: e.target.value }))} placeholder="Motivasyon cumlesi" className="min-h-28 rounded-xl border border-slate-200 px-3 py-2 text-sm md:col-span-2" />
                  <input value={quoteForm.speaker} onChange={(e) => setQuoteForm((p) => ({ ...p, speaker: e.target.value }))} placeholder="Soyleleyen kisi" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                  <input type="number" value={quoteForm.sort_order} onChange={(e) => setQuoteForm((p) => ({ ...p, sort_order: Number(e.target.value) }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-600">
                    <ImagePlus className="h-4 w-4" />
                    {imageFile ? imageFile.name : "Gorsel sec"}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} />
                  </label>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                    <input type="checkbox" checked={quoteForm.is_active} onChange={(e) => setQuoteForm((p) => ({ ...p, is_active: e.target.checked }))} />
                    Aktif
                  </label>
                  <button disabled={saving || !quoteForm.quote.trim()} onClick={createQuote} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50 md:col-span-2">
                    <Save className="h-4 w-4" /> Cumleyi ekle
                  </button>
                </div>
              ) : null}

              <div className="grid gap-3 md:grid-cols-2">
                {selected.quotes.map((quote) => (
                  <article key={quote.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    {quote.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={quote.image_url} alt="" className="h-36 w-full object-cover" />
                    ) : null}
                    <div className="p-4">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <span className="text-[10px] font-black uppercase text-slate-400">Sira {quote.sort_order}</span>
                      </div>
                      <p className="text-sm font-semibold leading-6 text-slate-900">&quot;{quote.quote}&quot;</p>
                      <p className="mt-2 text-xs font-bold text-slate-500">{quote.speaker || "KADEME"}</p>
                      {canManage ? <button onClick={() => deleteQuote(quote)} className="mt-3 text-xs font-bold text-red-600">Sil</button> : null}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </main>
      </section>
    </div>
  );
}
