"use client";

import { useEffect, useMemo, useState } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, ChevronLeft, GripVertical, Loader2, Save, Settings2, Trash2, Type, List, Upload, Eye, CheckSquare } from "lucide-react";
import { Reorder } from "framer-motion";
import api from "@/lib/api/axios";
import {
  isPeriodArchiveMode,
  periodHasWriteCapability,
  PeriodArchiveModeNotice,
  type PeriodOption,
} from "@/components/shared/ProjectPeriodFilters";

interface Project {
  id: number;
  name: string;
}

type PeriodItem = PeriodOption;

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
  const hasFormPermission = Number.isFinite(projectIdNum) && canAccessProject("projects.application_form.update", projectIdNum);

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
  const isArchiveMode = isPeriodArchiveMode(selectedPeriod ?? undefined);
  const periodCanConfigure = !selectedPeriod || periodHasWriteCapability(selectedPeriod, "configure_period");
  const canEditForm = hasFormPermission && periodCanConfigure;

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

  useEffect(() => {
    const url = new URL(window.location.href);
    if (projectId) url.searchParams.set("project_id", projectId); else url.searchParams.delete("project_id");
    if (periodId) url.searchParams.set("period_id", periodId); else url.searchParams.delete("period_id");
    if (effectiveProgramId) url.searchParams.set("program_id", effectiveProgramId); else url.searchParams.delete("program_id");
    const nextUrl = `${url.pathname}${url.search}${url.hash}`;
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (nextUrl !== currentUrl) window.history.replaceState(null, "", nextUrl);
  }, [effectiveProgramId, periodId, projectId]);

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
          <Link href="/panel/periods" className="panel-button panel-button-secondary h-10 w-10 px-0">
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
            className="panel-button panel-button-secondary h-11 px-5"
          >
            <Eye className="h-5 w-5" /> Onizle
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={loading || saving || success || !canEditForm}
            className="panel-button panel-button-primary h-11 px-5"
          >
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : success ? <CheckCircle2 className="h-5 w-5" /> : <Save className="h-5 w-5" />}
            {success ? "Kaydedildi" : "Formu Kaydet"}
          </button>
        </div>
      </div>

      {errorMessage ? <div className="panel-notice panel-notice-error">{errorMessage}</div> : null}
      <PeriodArchiveModeNotice period={selectedPeriod ?? undefined} />

      {projectId && !canEditForm && !isArchiveMode ? (
        <div className="panel-notice panel-notice-error">
          {hasFormPermission && !periodCanConfigure
            ? "Kapanış hazırlığındaki dönemin başvuru formu artık değiştirilemez; form yalnızca görüntülenebilir."
            : "Bu proje icin basvuru formunu guncelleme yetkiniz yok; formu yalnizca goruntuleyebilirsiniz."}
        </div>
      ) : null}

      {showPreview ? (
        <div className="panel-section-card">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Form Onizleme</h2>
              <p className="text-sm text-muted-foreground">{selectedProject?.name ?? "Secili proje"} basvuru formu</p>
            </div>
            <button
              type="button"
              onClick={() => setShowPreview(false)}
              className="panel-card-action"
            >
              Kapat
            </button>
          </div>

          {questions.length === 0 ? (
            <div className="panel-empty-card">
              Onizlenecek soru bulunmuyor.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {questions.map((question) => (
                  <div key={`preview-${question.id}`} className="panel-card-muted">
                    <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      {question.label}
                      {question.required ? <span className="ml-1 text-red-500">*</span> : null}
                    </label>
                    {question.type === "longtext" ? (
                      <textarea disabled rows={3} className="panel-textarea min-h-24" />
                    ) : question.type === "select" ? (
                      <select disabled className="panel-control">
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
                      <input disabled type="file" className="panel-control" />
                    ) : (
                      <input disabled type="text" className="panel-control" />
                    )}
                  </div>
                ))}
              </div>
              {requireConsent ? (
                <label className="panel-card-muted flex items-start gap-3 text-sm text-slate-700">
                  <input disabled type="checkbox" className="mt-1" />
                  <span>{consentText || defaultConsentText}</span>
                </label>
              ) : null}
            </div>
          )}
        </div>
      ) : null}

      <div className="panel-section-card">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <select
            value={projectId}
            onChange={(event) => {
              setProjectId(event.target.value);
              setPeriodId("");
              setProgramId("");
            }}
            className="panel-control"
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
            className="panel-control"
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
            className="panel-control"
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

      <div className="panel-section-card">
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
          className="panel-textarea mt-4"
        />
      </div>

      <div className="panel-section-card">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Otomatik Eleme Kurallari</h2>
            <p className="mt-1 text-sm text-muted-foreground">Basvuru cevabi belirli kosulu sagladiginda basvuru otomatik reddedilir ve gerekce kayda yazilir.</p>
          </div>
          <button
            type="button"
            disabled={!canEditForm || autoRejectFields.length === 0}
            onClick={addAutoRejectRule}
            className="panel-card-action panel-card-action-info"
          >
            <Settings2 className="h-4 w-4" />
            Kural Ekle
          </button>
        </div>

        {autoRejectFields.length === 0 ? (
          <div className="panel-empty-card mt-4 p-4">
            Otomatik eleme icin once dosya disinda en az bir soru ekleyin.
          </div>
        ) : autoRejectRules.length === 0 ? (
          <div className="panel-empty-card mt-4 p-4">
            Henuz otomatik eleme kurali yok.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {autoRejectRules.map((rule, index) => (
              <div key={`auto-rule-${index}`} className="panel-card-muted">
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_160px_1fr_auto]">
                  <select
                    disabled={!canEditForm}
                    value={rule.field_id}
                    onChange={(event) => updateAutoRejectRule(index, { field_id: event.target.value })}
                    className="panel-control h-10"
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
                    className="panel-control h-10"
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
                    className="panel-control h-10"
                  />
                  <button
                    type="button"
                    disabled={!canEditForm}
                    onClick={() => removeAutoRejectRule(index)}
                    className="panel-card-action panel-card-action-danger px-3"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <input
                  readOnly={!canEditForm}
                  value={rule.reason}
                  onChange={(event) => updateAutoRejectRule(index, { reason: event.target.value })}
                  placeholder="Adaya/panele yazilacak gerekce"
                  className="panel-control mt-3 h-10"
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
                  className="panel-list-card group flex gap-4"
                >
                  <div
                    className={`mt-2 text-muted-foreground opacity-30 transition-opacity group-hover:opacity-100 ${canEditForm ? "cursor-grab active:cursor-grabbing" : "cursor-default"}`}
                  >
                    <GripVertical className="h-5 w-5" />
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="panel-chip">{question.type}</span>
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
                      <div className="space-y-2 border-t border-slate-200 pt-3">
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Seçenekler</p>
                        {question.options?.map((option, index) => (
                          <div key={`${question.id}-${index}`} className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-slate-300" />
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
                          className="pt-2 text-[10px] font-bold uppercase text-indigo-700 transition-colors hover:text-indigo-800 disabled:opacity-40"
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
              <div className="panel-empty-card p-12 font-bold italic">
                Henüz soru eklemediniz. Sağ taraftan bir soru tipi seçerek başlayın.
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="panel-section-card sticky top-8">
              <h3 className="mb-6 text-xs font-bold uppercase tracking-widest text-muted-foreground">Soru Tipleri</h3>
              <div className="space-y-2">
                {questionTypes.map((item) => (
                  <button
                    type="button"
                    key={item.type}
                    disabled={!canEditForm}
                    onClick={() => addQuestion(item.type)}
                    className="panel-card-action group w-full justify-start p-4 text-left"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-all group-hover:bg-accent group-hover:text-white">
                      <item.icon className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-600 transition-colors group-hover:text-slate-900">{item.label}</span>
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
