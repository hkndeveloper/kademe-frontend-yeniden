"use client";

import { FormEvent, useEffect, useState } from "react";
import { CheckCircle2, HeartHandshake, Loader2, MapPin, Send, Users } from "lucide-react";
import { isAxiosError } from "axios";
import api from "@/lib/api/axios";

interface VolunteerOpportunity {
  id: number;
  title: string;
  description: string;
  location?: string | null;
  start_at?: string | null;
  end_at?: string | null;
  quota?: number | null;
  status: string;
  project?: {
    id: number;
    name: string;
    slug?: string;
    type?: string | null;
  } | null;
  my_application?: {
    id: number;
    status: string;
    motivation_text: string;
    notes?: string | null;
    evaluation_note?: string | null;
    created_at: string;
  } | null;
}

interface VolunteerApplication {
  id: number;
  status: string;
  motivation_text: string;
  notes?: string | null;
  evaluation_note?: string | null;
  created_at: string;
  opportunity?: {
    id: number;
    title: string;
    project?: {
      id: number;
      name: string;
      slug?: string;
      type?: string | null;
    } | null;
  } | null;
}

interface VolunteerPayload {
  opportunities: VolunteerOpportunity[];
  my_applications: VolunteerApplication[];
}

export default function AlumniVolunteerPage() {
  const [opportunities, setOpportunities] = useState<VolunteerOpportunity[]>([]);
  const [applications, setApplications] = useState<VolunteerApplication[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [motivationText, setMotivationText] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const response = await api.get<VolunteerPayload>("/volunteer/opportunities");
      setOpportunities(response.data.opportunities ?? []);
      setApplications(response.data.my_applications ?? []);
    } catch (error) {
      console.error("Gonulluluk ilanlari yuklenemedi", error);
      setErrorMessage("Gonulluluk ilanlari yuklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const selectedOpportunity = opportunities.find((opportunity) => opportunity.id === selectedId) ?? null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedOpportunity) {
      setErrorMessage("Basvuru yapmak icin once bir ilan secin.");
      return;
    }

    setSubmitting(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      await api.post(`/volunteer/opportunities/${selectedOpportunity.id}/apply`, {
        motivation_text: motivationText,
        notes: notes || null,
      });

      setMessage("Gonulluluk basvurunuz alindi.");
      setMotivationText("");
      setNotes("");
      await loadData();
    } catch (error) {
      console.error("Gonulluluk basvurusu gonderilemedi", error);
      setErrorMessage(
        isAxiosError(error) && typeof error.response?.data?.message === "string"
          ? error.response.data.message
          : "Gonulluluk basvurusu gonderilemedi.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-primary">
          <HeartHandshake className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-900">Gonulluluk Havuzu</h1>
          <p className="mt-1 text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Mezunlara acik gonulluluk firsatlarini incele ve basvurularini takip et.
          </p>
        </div>
      </div>

      {message && <div className="rounded-2xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-400">{message}</div>}
      {errorMessage && <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{errorMessage}</div>}

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          {loading ? (
            <div className="glass-panel rounded-3xl p-16">
              <div className="flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            </div>
          ) : opportunities.length === 0 ? (
            <div className="glass-panel rounded-3xl p-16 text-center text-muted-foreground">
              Su anda acik gonulluluk ilani bulunmuyor.
            </div>
          ) : (
            opportunities.map((opportunity) => {
              const isSelected = selectedId === opportunity.id;

              return (
                <button
                  key={opportunity.id}
                  type="button"
                  onClick={() => setSelectedId(opportunity.id)}
                  className={`glass-panel w-full rounded-3xl p-8 text-left transition ${
                    isSelected ? "border-primary/40 bg-primary/5" : ""
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-xl font-bold text-slate-900">{opportunity.title}</h2>
                    <span className="rounded-full bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      {opportunity.project?.name || "Genel"}
                    </span>
                    {opportunity.my_application ? (
                      <span className="rounded-full bg-green-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-green-400">
                        Basvuru var
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{opportunity.description}</p>

                  <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span>{opportunity.location || "Konum daha sonra duyurulacak"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      <span>Kontenjan: {opportunity.quota ?? "Sinirsiz"}</span>
                    </div>
                  </div>

                  <div className="mt-3 text-xs uppercase tracking-widest text-muted-foreground">
                    {opportunity.start_at ? new Date(opportunity.start_at).toLocaleString("tr-TR") : "Tarih yakinda"}
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="space-y-6">
          <div className="glass-panel rounded-3xl p-8">
            <h2 className="mb-4 text-xl font-bold text-slate-900">Basvuru Formu</h2>
            {selectedOpportunity ? (
              selectedOpportunity.my_application ? (
                <div className="rounded-2xl bg-green-500/10 p-5 text-sm text-green-300">
                  <div className="mb-3 flex items-center gap-2 font-bold">
                    <CheckCircle2 className="h-4 w-4" />
                    Bu ilan icin daha once basvuru yaptiniz.
                  </div>
                  <p>Durum: {selectedOpportunity.my_application.status}</p>
                  <p className="mt-2 text-green-200/80">
                    Basvuru tarihi: {new Date(selectedOpportunity.my_application.created_at).toLocaleString("tr-TR")}
                  </p>
                </div>
              ) : (
                <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-muted-foreground">Motivasyon Metni</label>
                    <textarea
                      value={motivationText}
                      onChange={(event) => setMotivationText(event.target.value)}
                      rows={6}
                      placeholder="Bu gonulluluk ilanina neden katilmak istediginizi detayli yazin."
                      className="w-full rounded-xl border border-border bg-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-bold text-muted-foreground">Ek Notlar</label>
                    <textarea
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      rows={3}
                      placeholder="Uygunluk, deneyim veya ek aciklamalarinizi yazabilirsiniz."
                      className="w-full rounded-xl border border-border bg-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting || motivationText.trim().length < 20}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-bold text-slate-900 transition hover:opacity-90 disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                    Basvuruyu Gonder
                  </button>
                </form>
              )
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-muted-foreground">
                Basvuru yapmak icin soldan bir gonulluluk ilani secin.
              </div>
            )}
          </div>

          <div className="glass-panel rounded-3xl p-6">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-muted-foreground">
              <Users className="h-4 w-4" />
              Son Basvurularim
            </h3>
            <div className="space-y-4">
              {applications.length === 0 ? (
                <p className="text-sm text-muted-foreground">Henuz gonulluluk basvurunuz bulunmuyor.</p>
              ) : (
                applications.slice(0, 4).map((application) => (
                  <div key={application.id} className="rounded-2xl bg-white/5 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">{application.opportunity?.title || "Gonulluluk ilani"}</h4>
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
                        {application.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{application.opportunity?.project?.name || "Genel kapsam"}</p>
                    <p className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">
                      {new Date(application.created_at).toLocaleString("tr-TR")}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
