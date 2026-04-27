"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AlertCircle, BrainCircuit, CheckCircle2, Loader2, Save } from "lucide-react";
import api from "@/lib/api/axios";

interface Question {
  id: string;
  category: string;
  text: string;
}

interface SavedResult {
  answers?: Record<string, number>;
  scores?: Record<string, number>;
  top_category?: string;
  summary?: string;
  completed_at?: string;
}

interface PersonalityResponse {
  questions: Question[];
  scale: Record<string, string>;
  saved_result?: SavedResult | null;
}

export default function StudentPersonalityPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [scale, setScale] = useState<Record<string, string>>({});
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [savedResult, setSavedResult] = useState<SavedResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadTest = async () => {
      try {
        const response = await api.get<PersonalityResponse>("/user/personality-test");
        const nextQuestions = response.data.questions ?? [];
        const nextSavedResult = response.data.saved_result ?? null;
        setQuestions(nextQuestions);
        setScale(response.data.scale ?? {});
        setSavedResult(nextSavedResult);

        const initialAnswers = nextQuestions.reduce<Record<string, number>>((acc, question) => {
          const savedValue = nextSavedResult?.answers?.[question.id];
          acc[question.id] = savedValue ?? 3;
          return acc;
        }, {});

        setAnswers(initialAnswers);
      } catch (error) {
        console.error("Kisilik testi yuklenemedi", error);
        setErrorMessage("Kisilik testi yuklenemedi.");
      } finally {
        setLoading(false);
      }
    };

    void loadTest();
  }, []);

  const allAnswered = useMemo(
    () => questions.every((question) => typeof answers[question.id] === "number"),
    [answers, questions]
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!allAnswered) return;

    setSaving(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const response = await api.post<{ message: string; result: SavedResult }>("/user/personality-test", {
        answers,
      });

      setSavedResult(response.data.result);
      setMessage(response.data.message || "Kisilik analizi kaydedildi.");
    } catch (error) {
      console.error("Kisilik analizi kaydedilemedi", error);
      setErrorMessage("Kisilik analizi kaydedilemedi.");
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
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-primary">
          <BrainCircuit className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-900">Kisilik Analizi</h1>
          <p className="mt-1 text-sm font-bold uppercase tracking-widest text-muted-foreground">Soru seti ve kaydetme akisi artik backend&apos;e bagli</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1.4fr,1fr]">
        <form onSubmit={(event) => void handleSubmit(event)} className="glass-panel rounded-3xl p-8">
          <div className="mb-6 flex items-start gap-4 rounded-2xl border border-primary/20 bg-primary/10 p-5 text-primary">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="text-sm leading-relaxed">
              Bu testin sonucu profil verisine kaydedilir ve KPD surecinde yetkili uzmanlar tarafindan gorulebilir.
            </p>
          </div>

          <div className="space-y-6">
            {questions.map((question, index) => (
              <div key={question.id} className="rounded-2xl border border-white/5 bg-white/5 p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="text-sm font-bold text-slate-900">
                    {index + 1}. {question.text}
                  </h2>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
                    {question.category}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
                  {Object.entries(scale).map(([value, label]) => (
                    <label key={value} className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/5 bg-background/40 px-3 py-3 text-sm text-muted-foreground transition-colors hover:border-primary/30">
                      <input
                        type="radio"
                        name={question.id}
                        value={value}
                        checked={answers[question.id] === Number(value)}
                        onChange={() => setAnswers((prev) => ({ ...prev, [question.id]: Number(value) }))}
                        className="accent-[var(--primary)]"
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {message && <div className="mt-6 rounded-2xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-400">{message}</div>}
          {errorMessage && <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{errorMessage}</div>}

          <button
            type="submit"
            disabled={saving || !allAnswered}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Sonuclari Kaydet
          </button>
        </form>

        <div className="space-y-6">
          <div className="glass-panel rounded-3xl p-6">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Kayitli Sonuc
            </h3>

            {!savedResult ? (
              <div className="text-sm text-muted-foreground">Henuz kaydedilmis bir kisilik analizi sonucu bulunmuyor.</div>
            ) : (
              <div className="space-y-4 text-sm text-muted-foreground">
                <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-widest text-primary">Baskin Alan</div>
                  <div className="mt-2 text-lg font-bold text-slate-900">{savedResult.top_category || "Belirtilmemis"}</div>
                </div>
                <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-widest text-primary">Ozet</div>
                  <div className="mt-2">{savedResult.summary || "Ozet bulunmuyor."}</div>
                </div>
                <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-widest text-primary">Son Kayit</div>
                  <div className="mt-2">
                    {savedResult.completed_at ? new Date(savedResult.completed_at).toLocaleString("tr-TR") : "Tarih yok"}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="glass-panel rounded-3xl p-6">
            <h3 className="mb-4 text-lg font-bold text-slate-900">Skorlar</h3>
            {!savedResult?.scores ? (
              <div className="text-sm text-muted-foreground">Kayitli skor bulunmuyor.</div>
            ) : (
              <div className="space-y-3">
                {Object.entries(savedResult.scores).map(([key, value]) => (
                  <div key={key} className="rounded-2xl border border-white/5 bg-white/5 p-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-bold text-slate-900">{key}</span>
                      <span className="text-primary">{value}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
