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

interface ProgramItem {
  id: number;
  period_id?: number | null;
  title: string;
  start_at?: string | null;
  status?: string | null;
}

interface Question {
  id: string;
  type: "text" | "longtext" | "select" | "radio" | "checkbox" | "file";
  label: string;
  required: boolean;
  options?: string[];
}

interface AutoRejectRule {
  field_id: string;
  operator: "equals" | "not_equals" | "contains" | "gt" | "lt" | "gte" | "lte";
  value: string;
  reason: string;
}

interface ApplicationFormResponse {
  project: Project;
  periods: PeriodItem[];
  programs: ProgramItem[];
  application_form?: {
    id: number;
    period_id?: number | null;
    program_id?: number | null;
    fields: Question[];
    require_consent?: boolean;
    consent_text?: string | null;
    auto_reject_rules?: AutoRejectRule[] | null;
    is_active: boolean;
  } | null;
}

const defaultConsentText =
  "Basvuru kosullarini, uyarilari ve yaptirimlari okudum; verdigim bilgilerin dogru oldugunu kabul ediyorum.";

const questionTypes: Array<{ type: Question["type"]; label: string; icon: typeof Type }> = [
  { type: "text", label: "Kisa Metin", icon: Type },
  { type: "longtext", label: "Uzun Metin", icon: List },
  { type: "select", label: "Acilir Liste", icon: Settings2 },
  { type: "radio", label: "Tekli Secim", icon: CheckCircle2 },
  { type: "checkbox", label: "Coklu Secim", icon: CheckSquare },
  { type: "file", label: "Dosya Yukleme", icon: Upload },
];

const autoRejectOperators: Array<{ value: AutoRejectRule["operator"]; label: string }> = [
  { value: "equals", label: "Esitse" },
  { value: "not_equals", label: "Esit degilse" },
  { value: "contains", label: "Iceriyorsa" },
  { value: "gt", label: "Buyukse" },
  { value: "lt", label: "Kucukse" },
  { value: "gte", label: "Buyuk/esitse" },
  { value: "lte", label: "Kucuk/esitse" },
];

export default function FormBuilderPage() {
  const searchParams = useSearchParams();
  const initialProjectId = searchParams.get("project_id") ?? "";
  const initialPeriodId = searchParams.get("period_id") ?? "";
  const initialProgramId = searchParams.get("program_id") ?? "";

  const [projects, setProjects] = useState<Project[]>([]);
  const [periods, setPeriods] = useState<PeriodItem[]>([]);
  const [programs, setPrograms] = useState<ProgramItem[]>([]);
  const [projectId, setProjectId] = useState(initialProjectId);
  const [periodId, setPeriodId] = useState(initialPeriodId);
  const [programId, setProgramId] = useState(initialProgramId);
  const [questionSeed, setQuestionSeed] = useState(1);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [requireConsent, setRequireConsent] = useState(false);
  const [consentText, setConsentText] = useState(defaultConsentText);
  const [autoRejectRules, setAutoRejectRules] = useState<AutoRejectRule[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { canAccessProject } = usePermissions();
  const projectIdNum = projectId ? Number(projectId) : NaN;
  const canEditForm = Number.isFinite(projectIdNum) && canAccessProject("projects.application_form.update", projectIdNum);

  const selectedProject = useMemo(
    () => projects.find((project) => String(project.id) === projectId) ?? null,
    [projectId, projects]
  );

  const filteredPrograms = useMemo(
    () => programs.filter((program) => !periodId || String(program.period_id ?? "") === periodId),
    [periodId, programs],
  );

  const selectedPeriod = useMemo(
    () => periods.find((period) => String(period.id) === periodId) ?? null,
    [periodId, periods],
  );

  const selectedProgram = useMemo(
    () => filteredPrograms.find((program) => String(program.id) === programId) ?? null,
    [filteredPrograms, programId],
  );
  const effectiveProgramId = programs.length === 0 || selectedProgram ? programId : "";

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const response = await api.get<{ projects: Project[] }>("/panel/projects/manageable", {
          params: { permission: "projects.application_form.update" },
        });
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
        setPrograms([]);
        setQuestions([]);
        return;
      }

      setLoading(true);
      setErrorMessage(null);

      try {
        const response = await api.get<ApplicationFormResponse>(`/panel/projects/${projectId}/application-form`, {
          params: {
            period_id: periodId || undefined,
            program_id: effectiveProgramId || undefined,
          },
        });
        const nextPeriods = response.data.periods ?? [];
        const nextPrograms = response.data.programs ?? [];
        const nextQuestions = response.data.application_form?.fields ?? [];
        const nextForm = response.data.application_form;

        setPeriods(nextPeriods);
        setPrograms(nextPrograms);
        setQuestions(nextQuestions);
        setRequireConsent(Boolean(nextForm?.require_consent));
        setConsentText(nextForm?.consent_text || defaultConsentText);
        setAutoRejectRules(nextForm?.auto_reject_rules ?? []);
        setQuestionSeed(Math.max(1, nextQuestions.length + 1));

        if (response.data.application_form?.period_id) {
          setPeriodId(String(response.data.application_form.period_id));
        } else if (!initialPeriodId && !periodId) {
          setPeriodId("");
        }

        if (response.data.application_form?.program_id) {
          setProgramId(String(response.data.application_form.program_id));
        } else if (!initialProgramId && !programId) {
          setProgramId("");
        }
      } catch (error) {
        console.error("Basvuru formu yuklenemedi", error);
        setQuestions([]);
        setPeriods([]);
        setPrograms([]);
        setRequireConsent(false);
        setConsentText(defaultConsentText);
        setAutoRejectRules([]);
        setErrorMessage("Basvuru formu yuklenemedi.");
      } finally {
        setLoading(false);
      }
    };

    void loadApplicationForm();
  }, [projectId, initialPeriodId, initialProgramId, periodId, effectiveProgramId, programId]);

  const addQuestion = (type: Question["type"]) => {
    if (!canEditForm) return;
    const nextQuestion: Question = {
      id: `q_${questionSeed}`,
      type,
      label: "Yeni soru başlığı",
      required: false,
      options: type === "select" || type === "radio" || type === "checkbox" ? ["Seçenek 1"] : undefined,
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

  const autoRejectFields = useMemo(
    () => questions.filter((question) => question.type !== "file"),
    [questions],
  );

  const addAutoRejectRule = () => {
    if (!canEditForm) return;
    setAutoRejectRules((current) => [
      ...current,
      {
        field_id: autoRejectFields[0]?.id ?? "",
        operator: "equals",
        value: "",
        reason: "",
      },
    ]);
  };

  const updateAutoRejectRule = (index: number, updates: Partial<AutoRejectRule>) => {
    if (!canEditForm) return;
    setAutoRejectRules((current) => current.map((rule, itemIndex) => (itemIndex === index ? { ...rule, ...updates } : rule)));
  };

  const removeAutoRejectRule = (index: number) => {
    if (!canEditForm) return;
    setAutoRejectRules((current) => current.filter((_, itemIndex) => itemIndex !== index));
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
    const autoRejectFieldIds = new Set(autoRejectFields.map((field) => field.id));

    try {
      await api.put(`/panel/projects/${projectId}/application-form`, {
        period_id: periodId ? Number(periodId) : null,
        program_id: effectiveProgramId ? Number(effectiveProgramId) : null,
        fields: questions.map((question) => ({
          id: question.id,
          type: question.type,
          label: question.label,
          required: question.required,
          options: question.options ?? [],
        })),
        require_consent: requireConsent,
        consent_text: requireConsent ? consentText.trim() : null,
        auto_reject_rules: autoRejectRules
          .filter((rule) => autoRejectFieldIds.has(rule.field_id) && rule.value.trim())
          .map((rule) => ({
            field_id: rule.field_id,
            operator: rule.operator,
            value: rule.value.trim(),
            reason: rule.reason.trim() || null,
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
          <Link href="/panel/periods" className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-muted-foreground transition-all hover:bg-white/10 hover:text-slate-900">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-black text-slate-900">Form Olusturucu</h1>
            <p className="mt-1 text-sm font-bold uppercase tracking-widest text-muted-foreground">Proje ve doneme bagli basvuru sorularini gercek backend uzerinden yonetin</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setShowPreview((current) => !current)}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 font-bold text-slate-900 transition-all hover:bg-white/10"
          >
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

      {showPreview ? (
        <div className="glass-panel rounded-3xl border border-indigo-500/20 bg-indigo-500/5 p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Form Onizleme</h2>
              <p className="text-sm text-muted-foreground">{selectedProject?.name ?? "Secili proje"} basvuru formu</p>
            </div>
            <button
              type="button"
              onClick={() => setShowPreview(false)}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-900"
            >
              Kapat
            </button>
          </div>

          {questions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-muted-foreground">
              Onizlenecek soru bulunmuyor.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {questions.map((question) => (
                  <div key={`preview-${question.id}`} className="rounded-2xl border border-white/10 bg-white/70 p-4">
                    <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      {question.label}
                      {question.required ? <span className="ml-1 text-red-500">*</span> : null}
                    </label>
                    {question.type === "longtext" ? (
                      <textarea disabled rows={3} className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
                    ) : question.type === "select" ? (
                      <select disabled className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                        <option>Secim yapin</option>
                        {question.options?.map((option) => <option key={option}>{option}</option>)}
                      </select>
                    ) : question.type === "radio" || question.type === "checkbox" ? (
                      <div className="space-y-2">
                        {question.options?.map((option) => (
                          <label key={option} className="flex items-center gap-2 text-sm text-slate-700">
                            <input disabled type={question.type === "radio" ? "radio" : "checkbox"} />
                            {option}
                          </label>
                        ))}
                      </div>
                    ) : question.type === "file" ? (
                      <input disabled type="file" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
                    ) : (
                      <input disabled type="text" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
                    )}
                  </div>
                ))}
              </div>
              {requireConsent ? (
                <label className="flex items-start gap-3 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4 text-sm text-slate-700">
                  <input disabled type="checkbox" className="mt-1" />
                  <span>{consentText || defaultConsentText}</span>
                </label>
              ) : null}
            </div>
          )}
        </div>
      ) : null}

      <div className="glass-panel rounded-3xl p-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <select
            value={projectId}
            onChange={(event) => {
              setProjectId(event.target.value);
              setPeriodId("");
              setProgramId("");
            }}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-900"
          >
            <option value="">Proje secin</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <select
            value={periodId}
            onChange={(event) => {
              setPeriodId(event.target.value);
              setProgramId("");
            }}
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
          <select
            value={effectiveProgramId}
            onChange={(event) => setProgramId(event.target.value)}
            disabled={!canEditForm || filteredPrograms.length === 0}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-900 disabled:opacity-60"
          >
            <option value="">Programa ozel form yok</option>
            {filteredPrograms.map((program) => (
              <option key={program.id} value={program.id}>
                {program.title}
              </option>
            ))}
          </select>
        </div>
        {selectedProject ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Aktif duzenleme kapsami: {selectedProject.name}
            {selectedPeriod ? ` / ${selectedPeriod.name}` : ""}
            {selectedProgram ? ` / ${selectedProgram.title}` : ""}
          </p>
        ) : null}
      </div>

      <div className="glass-panel rounded-3xl p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Basvuru Onayi</h2>
            <p className="mt-1 text-sm text-muted-foreground">Uyari, yaptirim ve kosul metnini public basvuru formunda zorunlu onay olarak gosterir.</p>
          </div>
          <label className={`flex items-center gap-2 ${canEditForm ? "cursor-pointer" : "cursor-default opacity-70"}`}>
            <input
              type="checkbox"
              checked={requireConsent}
              disabled={!canEditForm}
              onChange={(event) => setRequireConsent(event.target.checked)}
              className="h-4 w-4 rounded border-slate-200 bg-white text-indigo-600 disabled:opacity-50"
            />
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Zorunlu</span>
          </label>
        </div>
        <textarea
          value={consentText}
          readOnly={!canEditForm}
          onChange={(event) => setConsentText(event.target.value)}
          rows={4}
          className="mt-4 w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 read-only:opacity-70"
        />
      </div>

      <div className="glass-panel rounded-3xl p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Otomatik Eleme Kurallari</h2>
            <p className="mt-1 text-sm text-muted-foreground">Basvuru cevabi belirli kosulu sagladiginda basvuru otomatik reddedilir ve gerekce kayda yazilir.</p>
          </div>
          <button
            type="button"
            disabled={!canEditForm || autoRejectFields.length === 0}
            onClick={addAutoRejectRule}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Settings2 className="h-4 w-4" />
            Kural Ekle
          </button>
        </div>

        {autoRejectFields.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            Otomatik eleme icin once dosya disinda en az bir soru ekleyin.
          </div>
        ) : autoRejectRules.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            Henuz otomatik eleme kurali yok.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {autoRejectRules.map((rule, index) => (
              <div key={`auto-rule-${index}`} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_160px_1fr_auto]">
                  <select
                    disabled={!canEditForm}
                    value={rule.field_id}
                    onChange={(event) => updateAutoRejectRule(index, { field_id: event.target.value })}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 disabled:opacity-60"
                  >
                    <option value="">Soru secin</option>
                    {autoRejectFields.map((question) => (
                      <option key={question.id} value={question.id}>
                        {question.label}
                      </option>
                    ))}
                  </select>
                  <select
                    disabled={!canEditForm}
                    value={rule.operator}
                    onChange={(event) => updateAutoRejectRule(index, { operator: event.target.value as AutoRejectRule["operator"] })}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 disabled:opacity-60"
                  >
                    {autoRejectOperators.map((operator) => (
                      <option key={operator.value} value={operator.value}>
                        {operator.label}
                      </option>
                    ))}
                  </select>
                  <input
                    readOnly={!canEditForm}
                    value={rule.value}
                    onChange={(event) => updateAutoRejectRule(index, { value: event.target.value })}
                    placeholder="Karsilastirilacak cevap"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 read-only:opacity-60"
                  />
                  <button
                    type="button"
                    disabled={!canEditForm}
                    onClick={() => removeAutoRejectRule(index)}
                    className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-red-700 disabled:opacity-40"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <input
                  readOnly={!canEditForm}
                  value={rule.reason}
                  onChange={(event) => updateAutoRejectRule(index, { reason: event.target.value })}
                  placeholder="Adaya/panele yazilacak gerekce"
                  className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 read-only:opacity-60"
                />
              </div>
            ))}
          </div>
        )}
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
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Seçenekler</p>
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
                          onClick={() => updateQuestion(question.id, { options: [...(question.options || []), "Yeni seçenek"] })}
                          className="pt-2 text-[10px] font-bold uppercase text-indigo-400 transition-colors hover:text-indigo-300 disabled:opacity-40"
                        >
                          + Seçenek Ekle
                        </button>
                      </div>
                    )}
                  </div>
                </Reorder.Item>
              ))}
            </Reorder.Group>

            {questions.length === 0 && (
              <div className="glass-panel rounded-3xl border border-dashed border-white/10 p-20 text-center font-bold italic text-muted-foreground">
                Henüz soru eklemediniz. Sağ taraftan bir soru tipi seçerek başlayın.
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
