"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, CheckCircle2, Loader2, MessageSquare, Send, Zap } from "lucide-react";
import api from "@/lib/api/axios";

interface FeedbackQuestion {
  id: string;
  label: string;
  type: "rating" | "text";
  min?: number;
  max?: number;
  required?: boolean;
}

interface FeedbackProgram {
  id: number;
  title: string;
  start_at: string;
  status: string;
  credit_deduction: number;
  feedback_submitted: boolean;
  submitted_at?: string | null;
  anonymous_feedback_id?: string | null;
  credit_restored: boolean;
  feedback_deadline_at?: string | null;
  feedback_open?: boolean;
  project?: {
    id: number;
    name: string;
  } | null;
}

interface CreditLog {
  id: number;
  description?: string | null;
  reason?: string | null;
  created_at: string;
  amount?: number | null;
  program?: {
    id: number;
    title: string;
  } | null;
}

interface Participation {
  id: number;
  credit: number;
  project?: {
    id: number;
    name: string;
  } | null;
  period?: {
    id: number;
    name?: string | null;
  } | null;
}

interface DashboardSummaryResponse {
  participations?: Participation[];
  recent_credit_history?: CreditLog[];
  total_score?: number;
}

interface FeedbackResponse {
  questions: FeedbackQuestion[];
  programs: FeedbackProgram[];
}

interface FeedbackFormState {
  content_quality: string;
  speaker_quality: string;
  organization_quality: string;
  comment: string;
}

const initialFormState: FeedbackFormState = {
  content_quality: "",
  speaker_quality: "",
  organization_quality: "",
  comment: "",
};

export default function EvaluatePage() {
  const [questions, setQuestions] = useState<FeedbackQuestion[]>([]);
  const [programs, setPrograms] = useState<FeedbackProgram[]>([]);
  const [creditLogs, setCreditLogs] = useState<CreditLog[]>([]);
  const [participations, setParticipations] = useState<Participation[]>([]);
  const [totalScore, setTotalScore] = useState(0);
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);
  const [form, setForm] = useState<FeedbackFormState>(initialFormState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadEvaluateData = async () => {
      try {
        const [feedbackResponse, summaryResponse] = await Promise.all([
          api.get<FeedbackResponse>("/feedbacks"),
          api.get<DashboardSummaryResponse>("/dashboard/summary"),
        ]);

        setQuestions(feedbackResponse.data.questions ?? []);
        setPrograms(feedbackResponse.data.programs ?? []);
        setCreditLogs(summaryResponse.data.recent_credit_history ?? []);
        setParticipations(summaryResponse.data.participations ?? []);
        setTotalScore(summaryResponse.data.total_score ?? 0);
      } catch (error) {
        console.error("Degerlendirme ekran verileri yuklenemedi", error);
        setErrorMessage("Degerlendirme verileri yuklenemedi.");
      } finally {
        setLoading(false);
      }
    };

    void loadEvaluateData();
  }, []);

  const selectedProgram =
    selectedProgramId === null ? null : programs.find((program) => program.id === selectedProgramId) ?? null;

  const latestNegativeCredit = useMemo(
    () => creditLogs.find((log) => (log.amount ?? 0) < 0),
    [creditLogs],
  );

  const latestPositiveCredit = useMemo(
    () => creditLogs.find((log) => (log.amount ?? 0) > 0),
    [creditLogs],
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedProgramId) {
      setErrorMessage("Lutfen once bir oturum sec.");
      return;
    }

    setSaving(true);
    setFeedbackMessage(null);
    setErrorMessage(null);

    try {
      const response = await api.post<{ message: string; current_credit: number; anonymous_feedback_id?: string }>("/feedbacks", {
        program_id: selectedProgramId,
        responses: {
          content_quality: Number(form.content_quality),
          speaker_quality: Number(form.speaker_quality),
          organization_quality: Number(form.organization_quality),
          comment: form.comment.trim() || null,
        },
      });

      setPrograms((current) =>
        current.map((program) =>
          program.id === selectedProgramId
            ? {
                ...program,
                feedback_submitted: true,
                credit_restored: true,
                submitted_at: new Date().toISOString(),
                anonymous_feedback_id: response.data.anonymous_feedback_id ?? program.anonymous_feedback_id,
              }
            : program,
        ),
      );
      setTotalScore(response.data.current_credit);
      setFeedbackMessage(response.data.message);
      setForm(initialFormState);
    } catch (error) {
      console.error("Degerlendirme gonderilemedi", error);
      setErrorMessage("Degerlendirme gonderilemedi. Alanlari kontrol edip tekrar dene.");
    } finally {
      setSaving(false);
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
    <div className="mx-auto max-w-6xl space-y-8 py-10">
      <div className="mb-10 flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-primary">
          <MessageSquare className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Oturum Degerlendirmesi</h1>
          <p className="text-sm text-muted-foreground">Tamamlanan ve yoklamasi alinan oturumlar icin anonim degerlendirme gonderebilir ve kesilen kredini geri alabilirsin.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1.45fr,1fr]">
        <div className="space-y-6">
          {feedbackMessage ? (
            <div className="glass-panel rounded-3xl border-emerald-500/20 bg-emerald-500/5 p-5 text-sm text-emerald-300">
              {feedbackMessage}
            </div>
          ) : null}

          {errorMessage ? (
            <div className="glass-panel rounded-3xl border-red-500/20 bg-red-500/5 p-5 text-sm text-red-300">
              {errorMessage}
            </div>
          ) : null}

          <div className="glass-panel rounded-[40px] border-primary/20 bg-primary/5 p-8 md:p-10">
            <div className="mb-8 flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-slate-900">Degerlendirme ve kredi iadesi aktif</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Etkinlik tamamlandiktan sonra, bir sonraki etkinlik baslamadan once bir kez anonim degerlendirme gonderebilirsin. Form tamamlandiginda oturuma ait kredi iadesi uygulanir.
                </p>
              </div>
            </div>

            <div className="mb-8 flex items-center gap-2 rounded-2xl border border-primary/20 bg-primary/10 p-4">
              <Zap className="h-5 w-5 text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">
                Etkinlik tamamlaninca tum aktif katilimcilardan oturum kredisi dusulur. Yoklamasi olan ve sure icinde degerlendirme gonderen ogrencinin kredisi geri eklenir.
              </p>
            </div>

            <div className="space-y-4">
              {programs.length === 0 ? (
                <div className="rounded-3xl border border-white/5 bg-white/5 p-6 text-sm text-muted-foreground">Degerlendirmeye acik oturum kaydi bulunmuyor.</div>
              ) : (
                programs.map((program) => (
                  <button
                    key={program.id}
                    type="button"
                    onClick={() => setSelectedProgramId(program.id)}
                    className={`w-full rounded-3xl border p-5 text-left transition ${
                      selectedProgramId === program.id ? "border-primary bg-primary/10" : "border-white/5 bg-white/5 hover:border-primary/30"
                    }`}
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">{program.title}</h3>
                        <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {new Date(program.start_at).toLocaleString("tr-TR")}
                        </div>
                        <div className="mt-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
                          {program.project?.name || "Proje"} - {program.credit_deduction} kredi
                        </div>
                      </div>
                      <div className="flex flex-col items-start gap-2 md:items-end">
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                          {program.feedback_submitted ? "Gonderildi" : "Bekliyor"}
                        </span>
                        {program.credit_restored ? (
                          <span className="text-xs text-emerald-300">Kredi iadesi tamamlandi</span>
                        ) : (
                          <span className="text-xs text-amber-300">Kredi iadesi bekliyor</span>
                        )}
                        {program.anonymous_feedback_id ? (
                          <span className="text-[10px] text-muted-foreground">
                            Anonim ID: {program.anonymous_feedback_id.slice(0, 8).toUpperCase()}
                          </span>
                        ) : null}
                        {program.feedback_deadline_at && !program.feedback_submitted ? (
                          <span className="text-[10px] text-muted-foreground">
                            Son tarih: {new Date(program.feedback_deadline_at).toLocaleString("tr-TR")}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="glass-panel rounded-3xl p-8">
            <h3 className="mb-4 text-lg font-bold text-slate-900">Secili Oturum Formu</h3>
            {!selectedProgram ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-sm text-muted-foreground">
                Formu doldurmak icin soldan bir oturum sec.
              </div>
            ) : selectedProgram.feedback_submitted ? (
              <div className="rounded-2xl border border-primary/20 bg-primary/10 p-6 text-sm text-muted-foreground">
                Bu oturum icin degerlendirme zaten gonderildi. {selectedProgram.submitted_at ? `Gonderim zamani: ${new Date(selectedProgram.submitted_at).toLocaleString("tr-TR")}` : ""}
                {selectedProgram.anonymous_feedback_id ? ` Anonim takip ID: ${selectedProgram.anonymous_feedback_id.slice(0, 8).toUpperCase()}` : ""}
              </div>
            ) : selectedProgram.feedback_open === false ? (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-6 text-sm text-amber-200">
                Bu oturum icin degerlendirme suresi doldu. Sure bir sonraki etkinlik basladiginda kapanir.
              </div>
            ) : (
              <form className="space-y-6" onSubmit={handleSubmit}>
                {questions.map((question) =>
                  question.type === "rating" ? (
                    <div key={question.id} className="space-y-3">
                      <label className="text-sm font-semibold text-slate-900">{question.label}</label>
                      <div className="flex flex-wrap gap-3">
                        {Array.from({ length: (question.max ?? 5) - (question.min ?? 1) + 1 }, (_, index) => {
                          const value = String((question.min ?? 1) + index);
                          const checked = form[question.id as keyof FeedbackFormState] === value;

                          return (
                            <label
                              key={value}
                              className={`flex cursor-pointer items-center gap-2 rounded-2xl border px-4 py-3 text-sm transition ${
                                checked ? "border-primary bg-primary/10 text-slate-900" : "border-white/10 bg-white/5 text-muted-foreground"
                              }`}
                            >
                              <input
                                type="radio"
                                name={question.id}
                                value={value}
                                checked={checked}
                                onChange={(event) =>
                                  setForm((current) => ({
                                    ...current,
                                    [question.id]: event.target.value,
                                  }))
                                }
                                className="sr-only"
                              />
                              {value}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <label key={question.id} className="block space-y-2">
                      <span className="text-sm font-semibold text-slate-900">{question.label}</span>
                      <textarea
                        value={form.comment}
                        onChange={(event) => setForm((current) => ({ ...current, comment: event.target.value }))}
                        rows={5}
                        placeholder="Ek gorus ve onerilerini yaz."
                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary"
                      />
                    </label>
                  ),
                )}

                <button
                  type="submit"
                  disabled={saving || !form.content_quality || !form.speaker_quality || !form.organization_quality}
                  className="inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 font-bold text-primary-foreground shadow-lg shadow-primary/20 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                  Degerlendirmeyi Gonder
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <div className="glass-panel rounded-3xl p-6">
              <h3 className="mb-2 text-sm font-bold uppercase tracking-widest text-muted-foreground">Toplam Kredi</h3>
              <div className="text-4xl font-black text-slate-900">{totalScore.toLocaleString("tr-TR")}</div>
            </div>
            <div className="glass-panel rounded-3xl p-6">
              <h3 className="mb-2 text-sm font-bold uppercase tracking-widest text-muted-foreground">Aktif Katilim</h3>
              <div className="text-4xl font-black text-slate-900">{participations.length}</div>
            </div>
          </div>

          <div className="glass-panel rounded-3xl p-6">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Calisan Akis
            </h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>Yoklamasi alinan oturumlar listeleniyor.</li>
              <li>Anonim token ile tek seferlik form gonderimi yapiliyor.</li>
              <li>Form gonderilince ayni oturumun kredisi geri veriliyor.</li>
              <li>Kredi ozeti ogrenci panelinde anlik yansitiliyor.</li>
            </ul>
          </div>

          <div className="glass-panel rounded-3xl p-6">
            <h3 className="mb-4 text-lg font-bold text-slate-900">Aktif Proje Baglami</h3>
            <div className="space-y-3">
              {participations.length === 0 ? (
                <div className="text-sm text-muted-foreground">Aktif proje katilimi gorunmuyor.</div>
              ) : (
                participations.slice(0, 4).map((participation) => (
                  <div key={participation.id} className="rounded-2xl border border-white/5 bg-white/5 p-4">
                    <div className="text-sm font-bold text-slate-900">{participation.project?.name || "Proje"}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{participation.period?.name || "Donem bilgisi yok"}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="glass-panel rounded-3xl p-6">
            <h3 className="mb-4 text-lg font-bold text-slate-900">Son Kredi Hareketleri</h3>
            <div className="space-y-3">
              {creditLogs.length === 0 ? (
                <div className="text-sm text-muted-foreground">Kredi gecmisi gorunmuyor.</div>
              ) : (
                creditLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="rounded-2xl border border-white/5 bg-white/5 p-4">
                    <div className="text-sm font-bold text-slate-900">{log.program?.title || log.reason || log.description || "Kredi hareketi"}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString("tr-TR")}</div>
                  </div>
                ))
              )}
            </div>
            {latestNegativeCredit ? (
              <p className="mt-4 text-xs text-muted-foreground">
                Son gecici kesinti: {latestNegativeCredit.program?.title || latestNegativeCredit.reason || "Oturum"}.
              </p>
            ) : null}
            {latestPositiveCredit ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Son kredi iadesi: {latestPositiveCredit.program?.title || latestPositiveCredit.reason || "Oturum"}.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
