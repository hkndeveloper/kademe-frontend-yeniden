"use client";

import { useEffect, useMemo, useState } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, ChevronLeft, GripVertical, Loader2, Save, Settings2, Trash2, Type, List, Upload, Eye, CheckSquare } from "lucide-react";
import { Reorder } from "framer-motion";
import api from "@/lib/api/axios";

interface Project {
  id: number;
  name: string;
}

interface PeriodItem {
  id: number;
  name: string;
}

interface Question {
  id: string;
  type: "text" | "longtext" | "select" | "radio" | "checkbox" | "file";
  label: string;
  required: boolean;
  options?: string[];
}

interface ApplicationFormResponse {
  project: Project;
  periods: PeriodItem[];
  application_form?: {
    id: number;
    period_id?: number | null;
    fields: Question[];
    is_active: boolean;
  } | null;
}

const questionTypes: Array<{ type: Question["type"]; label: string; icon: typeof Type }> = [
  { type: "text", label: "Kisa Metin", icon: Type },
  { type: "longtext", label: "Uzun Metin", icon: List },
  { type: "select", label: "Acilir Liste", icon: Settings2 },
  { type: "radio", label: "Tekli Secim", icon: CheckCircle2 },
  { type: "checkbox", label: "Coklu Secim", icon: CheckSquare },
  { type: "file", label: "Dosya Yukleme", icon: Upload },
];

export default function FormBuilderPage() {
  const searchParams = useSearchParams();
  const initialProjectId = searchParams.get("project_id") ?? "";
  const initialPeriodId = searchParams.get("period_id") ?? "";

  const [projects, setProjects] = useState<Project[]>([]);
  const [periods, setPeriods] = useState<PeriodItem[]>([]);
  const [projectId, setProjectId] = useState(initialProjectId);
  const [periodId, setPeriodId] = useState(initialPeriodId);
  const [questionSeed, setQuestionSeed] = useState(1);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { canAccessProject } = usePermissions();
  const projectIdNum = projectId ? Number(projectId) : NaN;
  const canEditForm = Number.isFinite(projectIdNum) && canAccessProject("projects.application_form.update", projectIdNum);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const response = await api.get<{ projects: Project[] }>("/admin/projects/manageable");
        const nextProjects = response.data.projects ?? [];
        setProjects(nextProjects);

        if (!projectId && nextProjects.length > 0) {
          setProjectId(String(nextProjects[0].id));
        }
      } catch (error) {
        console.error("Form builder proje listesi yuklenemedi", error);
        setErrorMessage("Proje listesi yuklenemedi.");
      } finally {
        setLoading(false);
      }
    };

    void loadProjects();
  }, [projectId]);

  useEffect(() => {
    const loadApplicationForm = async () => {
      if (!projectId) {
        setPeriods([]);
        setQuestions([]);
        return;
      }

      setLoading(true);
      setErrorMessage(null);

      try {
        const response = await api.get<ApplicationFormResponse>(`/admin/projects/${projectId}/application-form`);
        const nextPeriods = response.data.periods ?? [];
        const nextQuestions = response.data.application_form?.fields ?? [];

        setPeriods(nextPeriods);
        setQuestions(nextQuestions);
        setQuestionSeed(Math.max(1, nextQuestions.length + 1));

        if (initialPeriodId && !periodId) {
          setPeriodId(initialPeriodId);
        } else if (response.data.application_form?.period_id) {
          setPeriodId(String(response.data.application_form.period_id));
        } else if (!initialPeriodId) {
          setPeriodId("");
        }
      } catch (error) {
        console.error("Basvuru formu yuklenemedi", error);
        setQuestions([]);
        setPeriods([]);
        setErrorMessage("Basvuru formu yuklenemedi.");
      } finally {
        setLoading(false);
      }
    };

    void loadApplicationForm();
  }, [projectId, initialPeriodId, periodId]);

  const selectedProject = useMemo(
    () => projects.find((project) => String(project.id) === projectId) ?? null,
    [projectId, projects]
  );

  const addQuestion = (type: Question["type"]) => {
    if (!canEditForm) return;
    const nextQuestion: Question = {
      id: `q_${questionSeed}`,
      type,
      label: "Yeni soru basligi",
      required: false,
      options: type === "select" || type === "radio" || type === "checkbox" ? ["Secenek 1"] : undefined,
    };

    setQuestions((prev) => [...prev, nextQuestion]);
    setQuestionSeed((prev) => prev + 1);
  };

  const removeQuestion = (id: string) => {
    if (!canEditForm) return;
    setQuestions((prev) => prev.filter((question) => question.id !== id));
  };

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    if (!canEditForm) return;
    setQuestions((prev) => prev.map((question) => (question.id === id ? { ...question, ...updates } : question)));
  };

  const handleSave = async () => {
    if (!projectId || questions.length === 0) {
      setErrorMessage("Kaydetmeden once proje secip en az bir soru ekleyin.");
      return;
    }

    if (!canEditForm) {
      setErrorMessage("Bu proje icin basvuru formu guncelleme yetkiniz yok.");
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    try {
      await api.put(`/admin/projects/${projectId}/application-form`, {
        period_id: periodId ? Number(periodId) : null,
        fields: questions.map((question) => ({
          id: question.id,
          type: question.type,
          label: question.label,
          required: question.required,
          options: question.options ?? [],
        })),
        is_active: true,
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    } catch (error) {
      console.error("Basvuru formu kaydedilemedi", error);
      setErrorMessage("Basvuru formu kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <Link href="/admin/periods" className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-muted-foreground transition-all hover:bg-white/10 hover:text-slate-900">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-black text-slate-900">Form Olusturucu</h1>
            <p className="mt-1 text-sm font-bold uppercase tracking-widest text-muted-foreground">Proje ve doneme bagli basvuru sorularini gercek backend uzerinden yonetin</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button type="button" className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 font-bold text-slate-900 transition-all hover:bg-white/10">
            <Eye className="h-5 w-5" /> Onizle
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={loading || saving || success || !canEditForm}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-bold text-white shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-500 disabled:opacity-70"
          >
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : success ? <CheckCircle2 className="h-5 w-5" /> : <Save className="h-5 w-5" />}
            {success ? "Kaydedildi" : "Formu Kaydet"}
          </button>
        </div>
      </div>

      {errorMessage ? <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-200">{errorMessage}</div> : null}

      {projectId && !canEditForm ? (
        <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
          Bu proje icin basvuru formunu guncelleme yetkiniz yok; formu yalnizca goruntuleyebilirsiniz.
        </div>
      ) : null}

      <div className="glass-panel rounded-3xl p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <select value={projectId} onChange={(event) => setProjectId(event.target.value)} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-900">
            <option value="">Proje secin</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <select
            value={periodId}
            onChange={(event) => setPeriodId(event.target.value)}
            disabled={!canEditForm}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-900 disabled:opacity-60"
          >
            <option value="">Projeye genel form</option>
            {periods.map((period) => (
              <option key={period.id} value={period.id}>
                {period.name}
              </option>
            ))}
          </select>
        </div>
        {selectedProject ? <p className="mt-4 text-sm text-muted-foreground">Aktif duzenleme kapsami: {selectedProject.name}{periodId ? ` / ${periods.find((period) => String(period.id) === periodId)?.name ?? "Secili donem"}` : ""}</p> : null}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr,300px]">
          <div className="space-y-6">
            <Reorder.Group
              axis="y"
              values={questions}
              onReorder={(next) => {
                if (canEditForm) setQuestions(next);
              }}
              className="space-y-4"
            >
              {questions.map((question) => (
                <Reorder.Item
                  key={question.id}
                  value={question}
                  drag={canEditForm}
                  className="glass-panel group flex gap-4 rounded-3xl border border-white/5 p-6 transition-all hover:border-indigo-500/30"
                >
                  <div
                    className={`mt-2 text-muted-foreground opacity-30 transition-opacity group-hover:opacity-100 ${canEditForm ? "cursor-grab active:cursor-grabbing" : "cursor-default"}`}
                  >
                    <GripVertical className="h-5 w-5" />
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="rounded bg-white/5 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{question.type}</span>
                      <div className="flex items-center gap-4">
                        <label className={`flex items-center gap-2 ${canEditForm ? "cursor-pointer" : "cursor-default opacity-70"}`}>
                          <input
                            type="checkbox"
                            checked={question.required}
                            disabled={!canEditForm}
                            onChange={(event) => updateQuestion(question.id, { required: event.target.checked })}
                            className="h-4 w-4 rounded border-slate-200 bg-white text-indigo-600 disabled:opacity-50"
                          />
                          <span className="text-xs font-bold uppercase text-muted-foreground">Zorunlu</span>
                        </label>
                        <button
                          type="button"
                          disabled={!canEditForm}
                          onClick={() => removeQuestion(question.id)}
                          className="rounded-lg p-2 text-muted-foreground transition-colors hover:text-red-500 disabled:opacity-40"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <input
                      value={question.label}
                      readOnly={!canEditForm}
                      onChange={(event) => updateQuestion(question.id, { label: event.target.value })}
                      className="w-full border-none bg-transparent p-0 text-xl font-bold text-slate-900 outline-none placeholder:opacity-20 focus:ring-0 read-only:cursor-default read-only:opacity-90"
                      placeholder="Soru basligini buraya yazin..."
                    />

                    {(question.type === "select" || question.type === "radio" || question.type === "checkbox") && (
                      <div className="space-y-2 border-t border-white/5 pt-2">
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Secenekler</p>
                        {question.options?.map((option, index) => (
                          <div key={`${question.id}-${index}`} className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-white/10" />
                            <input
                              value={option}
                              readOnly={!canEditForm}
                              onChange={(event) => {
                                const nextOptions = [...(question.options || [])];
                                nextOptions[index] = event.target.value;
                                updateQuestion(question.id, { options: nextOptions });
                              }}
                              className="flex-1 border-none bg-transparent p-0 text-sm text-muted-foreground outline-none focus:text-slate-900 focus:ring-0 read-only:cursor-default"
                            />
                          </div>
                        ))}
                        <button
                          type="button"
                          disabled={!canEditForm}
                          onClick={() => updateQuestion(question.id, { options: [...(question.options || []), "Yeni secenek"] })}
                          className="pt-2 text-[10px] font-bold uppercase text-indigo-400 transition-colors hover:text-indigo-300 disabled:opacity-40"
                        >
                          + Secenek Ekle
                        </button>
                      </div>
                    )}
                  </div>
                </Reorder.Item>
              ))}
            </Reorder.Group>

            {questions.length === 0 && (
              <div className="glass-panel rounded-3xl border border-dashed border-white/10 p-20 text-center font-bold italic text-muted-foreground">
                Henuz soru eklemediniz. Sag taraftan bir soru tipi secerek baslayin.
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="glass-panel sticky top-8 rounded-3xl p-6">
              <h3 className="mb-6 text-xs font-bold uppercase tracking-widest text-muted-foreground">Soru Tipleri</h3>
              <div className="space-y-2">
                {questionTypes.map((item) => (
                  <button
                    type="button"
                    key={item.type}
                    disabled={!canEditForm}
                    onClick={() => addQuestion(item.type)}
                    className="group flex w-full items-center gap-3 rounded-xl border border-white/5 bg-white/5 p-4 text-left transition-all hover:border-indigo-600/30 hover:bg-indigo-600/10 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-muted-foreground transition-all group-hover:bg-indigo-600 group-hover:text-white">
                      <item.icon className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold text-muted-foreground transition-colors group-hover:text-slate-900">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
