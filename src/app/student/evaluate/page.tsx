"use client";

import { useEffect, useState } from "react";
import { Calendar, CheckCircle2, Loader2, MessageSquare, Send } from "lucide-react";
import api from "@/lib/api/axios";
import { formatIstanbulDateTime } from "@/lib/istanbul-time";

interface FeedbackQuestion {
  id: string;
  label: string;
  type: "rating" | "text" | "choice";
  options?: string[] | null;
  min?: number;
  max?: number;
  required?: boolean;
}

interface FeedbackProgram {
  id: number;
  title: string;
  start_at: string;
  status: string;
  feedback_submitted: boolean;
  submitted_at?: string | null;
  anonymous_feedback_id?: string | null;
  feedback_deadline_at?: string | null;
  feedback_open?: boolean;
  questions?: FeedbackQuestion[];
  project?: {
    id: number;
    name: string;
  } | null;
}

interface FeedbackResponse {
  questions: FeedbackQuestion[];
  programs: FeedbackProgram[];
}

export default function EvaluatePage() {
  const [questions, setQuestions] = useState<FeedbackQuestion[]>([]);
  const [programs, setPrograms] = useState<FeedbackProgram[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [initialProgramId] = useState(() => {
    if (typeof window === "undefined") return null;
    const raw = new URLSearchParams(window.location.search).get("program_id");
    const parsed = raw ? Number(raw) : null;
    return parsed && Number.isFinite(parsed) ? parsed : null;
  });

  useEffect(() => {
    const loadEvaluateData = async () => {
      try {
        const feedbackResponse = await api.get<FeedbackResponse>("/feedbacks");
        const nextPrograms = feedbackResponse.data.programs ?? [];

        setQuestions(feedbackResponse.data.questions ?? []);
        setPrograms(nextPrograms);
        if (initialProgramId && nextPrograms.some((program) => program.id === initialProgramId)) {
          setSelectedProgramId(initialProgramId);
        }
      } catch (error) {
        console.error("Degerlendirme ekran verileri yuklenemedi", error);
        setErrorMessage("Degerlendirme verileri yuklenemedi.");
      } finally {
        setLoading(false);
      }
    };

    void loadEvaluateData();
  }, [initialProgramId]);

  const selectedProgram = selectedProgramId === null ? null : programs.find((program) => program.id === selectedProgramId) ?? null;
  const selectedQuestions = selectedProgram?.questions?.length ? selectedProgram.questions : questions;

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
      const responses = selectedQuestions.reduce<Record<string, string | number | null>>((payload, question) => {
        const value = form[question.id] ?? "";
        payload[question.id] = question.type === "rating" ? Number(value) : value.trim() || null;
        return payload;
      }, {});

      const response = await api.post<{ message: string; anonymous_feedback_id?: string }>("/feedbacks", {
        program_id: selectedProgramId,
        responses,
      });

      setPrograms((current) =>
        current.map((program) =>
          program.id === selectedProgramId
            ? {
                ...program,
                feedback_submitted: true,
                submitted_at: new Date().toISOString(),
                anonymous_feedback_id: response.data.anonymous_feedback_id ?? program.anonymous_feedback_id,
              }
            : program,
        ),
      );
      setFeedbackMessage(response.data.message);
      setForm({});
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
    <div className="mx-auto max-w-5xl space-y-8 py-10">
      <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-primary">
            <MessageSquare className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900">Oturum Degerlendirmesi</h1>
            <p className="mt-1 max-w-2xl text-sm font-medium text-muted-foreground">
              Tamamlanan ve yoklamasi alinan oturumlar icin anonim degerlendirme formunu doldurabilirsin.
            </p>
          </div>
        </div>
        <div className="grid w-full grid-cols-2 gap-3 lg:max-w-sm">
          <div className="rounded-2xl border border-border bg-background/70 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Acik Form</p>
            <p className="mt-2 text-2xl font-black text-slate-900">
              {programs.filter((program) => !program.feedback_submitted && program.feedback_open !== false).length}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-background/70 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Gonderilen</p>
            <p className="mt-2 text-2xl font-black text-slate-900">{programs.filter((program) => program.feedback_submitted).length}</p>
          </div>
        </div>
      </div>

      {feedbackMessage ? (
        <div className="glass-panel rounded-3xl border-emerald-500/20 bg-emerald-500/10 p-5 text-sm font-medium text-emerald-700">
          {feedbackMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="glass-panel rounded-3xl border-red-500/20 bg-red-500/10 p-5 text-sm font-medium text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,0.92fr),minmax(0,1.08fr)]">
        <div className="glass-panel rounded-3xl border-primary/20 bg-primary/5 p-6 md:p-8">
          <div className="mb-5 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-black text-slate-900">Degerlendirilecek Oturumlar</h2>
          </div>

          <div className="space-y-4">
            {programs.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-border bg-background/60 p-6 text-sm text-muted-foreground">
                Degerlendirmeye acik oturum kaydi bulunmuyor.
              </div>
            ) : (
              programs.map((program) => (
                <button
                  key={program.id}
                  type="button"
                  onClick={() => {
                    setSelectedProgramId(program.id);
                    setForm({});
                  }}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    selectedProgramId === program.id ? "border-primary bg-primary/10 shadow-sm" : "border-border bg-background/70 hover:border-primary/30"
                  }`}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{program.title}</h3>
                      <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {formatIstanbulDateTime(program.start_at)}
                      </div>
                      <div className="mt-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        {program.project?.name || "Proje"}
                      </div>
                    </div>
                    <div className="flex flex-col items-start gap-2 md:items-end">
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        {program.feedback_submitted ? "Gonderildi" : "Bekliyor"}
                      </span>
                      {program.anonymous_feedback_id ? (
                        <span className="text-[10px] text-muted-foreground">
                          Anonim ID: {program.anonymous_feedback_id.slice(0, 8).toUpperCase()}
                        </span>
                      ) : null}
                      {program.feedback_deadline_at && !program.feedback_submitted ? (
                        <span className="text-[10px] text-muted-foreground">
                          Son tarih: {formatIstanbulDateTime(program.feedback_deadline_at)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="glass-panel rounded-3xl p-6 md:p-8">
          <h3 className="mb-4 text-lg font-bold text-slate-900">Secili Oturum Formu</h3>
          {!selectedProgram ? (
            <div className="rounded-2xl border border-dashed border-border bg-background/60 p-6 text-sm text-muted-foreground">
              Formu doldurmak icin soldan bir oturum sec.
            </div>
          ) : selectedProgram.feedback_submitted ? (
            <div className="rounded-2xl border border-primary/20 bg-primary/10 p-6 text-sm text-muted-foreground">
              Bu oturum icin degerlendirme zaten gonderildi.
              {selectedProgram.submitted_at ? ` Gonderim zamani: ${formatIstanbulDateTime(selectedProgram.submitted_at)}` : ""}
              {selectedProgram.anonymous_feedback_id ? ` Anonim takip ID: ${selectedProgram.anonymous_feedback_id.slice(0, 8).toUpperCase()}` : ""}
            </div>
          ) : selectedProgram.feedback_open === false ? (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-6 text-sm font-medium text-amber-700">
              Bu oturum icin degerlendirme suresi doldu.
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              {selectedQuestions.map((question) => {
                if (question.type === "rating") {
                  return (
                    <div key={question.id} className="space-y-3">
                      <label className="text-sm font-semibold text-slate-900">{question.label}</label>
                      <div className="flex flex-wrap gap-3">
                        {Array.from({ length: (question.max ?? 5) - (question.min ?? 1) + 1 }, (_, index) => {
                          const value = String((question.min ?? 1) + index);
                          const checked = form[question.id] === value;

                          return (
                            <label
                              key={value}
                              className={`flex cursor-pointer items-center gap-2 rounded-2xl border px-4 py-3 text-sm transition ${
                                checked ? "border-primary bg-primary/10 text-slate-900" : "border-border bg-background/70 text-muted-foreground hover:border-primary/30"
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
                  );
                }

                if (question.type === "choice") {
                  return (
                    <div key={question.id} className="space-y-3">
                      <label className="text-sm font-semibold text-slate-900">{question.label}</label>
                      <div className="flex flex-wrap gap-3">
                        {(question.options ?? []).map((option) => {
                          const checked = form[question.id] === option;

                          return (
                            <label
                              key={option}
                              className={`flex cursor-pointer items-center gap-2 rounded-2xl border px-4 py-3 text-sm transition ${
                                checked ? "border-primary bg-primary/10 text-slate-900" : "border-border bg-background/70 text-muted-foreground hover:border-primary/30"
                              }`}
                            >
                              <input
                                type="radio"
                                name={question.id}
                                value={option}
                                checked={checked}
                                onChange={(event) => setForm((current) => ({ ...current, [question.id]: event.target.value }))}
                                className="sr-only"
                              />
                              {option}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                }

                return (
                  <label key={question.id} className="block space-y-2">
                    <span className="text-sm font-semibold text-slate-900">{question.label}</span>
                    <textarea
                      value={form[question.id] ?? ""}
                      onChange={(event) => setForm((current) => ({ ...current, [question.id]: event.target.value }))}
                      rows={5}
                      placeholder="Ek gorus ve onerilerini yaz."
                      className="w-full rounded-2xl border border-border bg-background/70 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary"
                    />
                  </label>
                );
              })}

              <button
                type="submit"
                disabled={saving || selectedQuestions.some((question) => question.required !== false && !String(form[question.id] ?? "").trim())}
                className="inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 font-bold text-primary-foreground shadow-lg shadow-primary/20 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                Degerlendirmeyi Gonder
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}