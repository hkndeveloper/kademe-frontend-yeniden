"use client";

import { Award, BriefcaseBusiness, Edit2, Handshake, Layers, Loader2, Plus, Trash2, Upload, UserPlus, Users, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { isAxiosError } from "axios";
import api from "@/lib/api/axios";
import { useAuth } from "@/store/useAuth";
import { cn } from "@/lib/utils";

type FamilyKey = "diplomasi360" | "pergel" | "eurodesk" | "kademe_plus" | "zirve_kademe";
type ApiFamilyKey = "diplomasi360" | "pergel" | "eurodesk" | "kademe-plus" | "zirve-kademe";

type FamilyConfig = {
  title: string;
  eyebrow: string;
  description: string;
  apiKey: ApiFamilyKey;
  icon: typeof Layers;
  tabs: Array<{ id: string; label: string; permissions: string[] }>;
};

type FamilyProject = {
  id: number;
  name: string;
  slug?: string | null;
  type?: string | null;
  status?: string | null;
  applicable_modules?: string[];
};

type FamilyPeriod = {
  id: number;
  project_id: number;
  name: string;
  status?: string | null;
};

type FamilySummary = {
  id: string;
  label: string;
  value: number | string;
};

type FamilyTab = {
  id: string;
  label: string;
  permissions: string[];
  visible: boolean;
};

type FamilyPanelResponse = {
  family: {
    key: ApiFamilyKey;
    label: string;
    project_types: string[];
    special_modules: string[];
  };
  projects: FamilyProject[];
  selected_project: FamilyProject | null;
  periods: FamilyPeriod[];
  access: Record<string, boolean>;
  tabs: FamilyTab[];
  summary: FamilySummary[];
  data: Record<string, unknown>;
};

type LatestRow = {
  id: number | string;
  title: string;
  meta: string;
};

type PergelParticipant = {
  id: number;
  name: string;
  email?: string | null;
  period_id?: number | null;
  note?: string | null;
};

type DiplomasiInternship = {
  id: number;
  participant_id?: number | null;
  company_name: string;
  position: string;
  participant_name?: string | null;
  participant_email?: string | null;
  start_date: string;
  end_date?: string | null;
  description?: string | null;
  document_path?: string | null;
};

type InternshipForm = {
  participant_id: string;
  company_name: string;
  position: string;
  start_date: string;
  end_date: string;
  description: string;
  document_path: string;
};

type EurodeskPartnership = {
  id: number;
  organization_name: string;
  country?: string | null;
  contact_info?: string | null;
};

type EurodeskProject = {
  id: number;
  period_id?: number | null;
  period?: { id: number; name: string; status?: string | null } | null;
  title: string;
  partner_organizations?: string[] | null;
  grant_amount?: string | number | null;
  grant_status: string;
  start_date?: string | null;
  end_date?: string | null;
  partnerships?: EurodeskPartnership[];
};

type EurodeskSummary = {
  total_projects: number;
  applied_projects: number;
  approved_projects: number;
  completed_projects: number;
  rejected_projects: number;
  total_grant_amount: number;
  approved_grant_amount: number;
  partnership_count: number;
  country_count: number;
  countries: string[];
};

type EurodeskProjectForm = {
  period_id: string;
  title: string;
  partner_organizations: string;
  grant_amount: string;
  grant_status: string;
  start_date: string;
  end_date: string;
};

type RewardTier = {
  id: number;
  project_id?: number | null;
  name: string;
  description?: string | null;
  min_badges: number;
  min_credits: number;
  reward_description: string;
};

type RewardAward = {
  id: number;
  participant_id?: number | null;
  reward_tier_id?: number | null;
  name?: string | null;
  email?: string | null;
  reward_name: string;
  status: string;
  awarded_at?: string | null;
  delivered_at?: string | null;
  note?: string | null;
  tier?: { id: number; name: string; reward_description?: string | null } | null;
  awarder?: string | null;
  deliverer?: string | null;
};

type RewardEligibleParticipant = {
  participant_id: number;
  name: string;
  email?: string | null;
  badge_count: number;
  credit: number;
  eligible_rewards: Array<{ id: number; name: string; reward_description: string }>;
};

type KademeModuleEnrollment = {
  id: number;
  user_id: number;
  participant_id?: number | null;
  status: string;
  note?: string | null;
  user?: { name?: string | null; email?: string | null } | null;
};

type KademeModule = {
  id: number;
  title: string;
  description?: string | null;
  period_id?: number | null;
  sort_order: number;
  is_active: boolean;
  application_open: boolean;
  requires_consent: boolean;
  consent_checkbox_label?: string | null;
  warning_text?: string | null;
  requires_coordinator_approval: boolean;
  outcomes?: string[];
  enrollments?: KademeModuleEnrollment[];
  enrollments_count?: number;
};

type RewardTierForm = {
  name: string;
  description: string;
  min_badges: string;
  min_credits: string;
  reward_description: string;
};

type RewardAwardForm = {
  participant_id: string;
  reward_tier_id: string;
  reward_name: string;
  status: string;
  note: string;
};

type KademeModuleForm = {
  period_id: string;
  title: string;
  description: string;
  sort_order: string;
  is_active: boolean;
  application_open: boolean;
  requires_consent: boolean;
  requires_coordinator_approval: boolean;
  consent_checkbox_label: string;
  warning_text: string;
  outcomesText: string;
};

type PergelMentor = {
  id: number;
  name: string;
  expertise?: string | null;
  bio?: string | null;
  photo_path?: string | null;
  participants_count?: number;
  assigned_participants?: PergelParticipant[];
};

const familyConfigs: Record<FamilyKey, FamilyConfig> = {
  diplomasi360: {
    title: "Diplomasi360",
    eyebrow: "Proje ailesi",
    description: "Stajlar, belge akislari ve projeye bagli ozel icerikler bu authority panel ekraninda toplanir.",
    apiKey: "diplomasi360",
    icon: BriefcaseBusiness,
    tabs: [
      { id: "overview", label: "Ozet", permissions: ["projects.internships.view", "projects.internships.manage"] },
      { id: "internships", label: "Stajlar", permissions: ["projects.internships.view", "projects.internships.manage"] },
      { id: "files", label: "Dosyalar", permissions: ["projects.internships.manage"] },
    ],
  },
  pergel: {
    title: "Pergel Fellowship",
    eyebrow: "Proje ailesi",
    description: "Mentorler, mentor-katilimci eslestirmeleri ve Pergel'e bagli proje ozel akislari burada toplanir.",
    apiKey: "pergel",
    icon: Users,
    tabs: [
      { id: "overview", label: "Ozet", permissions: ["projects.mentors.view", "projects.mentors.manage"] },
      { id: "mentors", label: "Mentorler", permissions: ["projects.mentors.view", "projects.mentors.manage"] },
      { id: "assignments", label: "Eslestirmeler", permissions: ["projects.mentors.manage"] },
    ],
  },
  eurodesk: {
    title: "Eurodesk",
    eyebrow: "Proje ailesi",
    description: "Hibe projeleri, ortakliklar ve grant status ozetleri bu ekranda yonetilir.",
    apiKey: "eurodesk",
    icon: Handshake,
    tabs: [
      { id: "overview", label: "Ozet", permissions: ["projects.eurodesk.view", "projects.eurodesk.manage"] },
      { id: "projects", label: "Projeler", permissions: ["projects.eurodesk.view", "projects.eurodesk.manage"] },
      { id: "partnerships", label: "Ortakliklar", permissions: ["projects.eurodesk.manage"] },
    ],
  },
  kademe_plus: {
    title: "KADEME+",
    eyebrow: "Proje ailesi",
    description: "Rozetler, odul kademeleri, hediyeler ve modul programlari bu ekranda toplanir.",
    apiKey: "kademe-plus",
    icon: Award,
    tabs: [
      { id: "overview", label: "Ozet", permissions: ["projects.rewards.view", "projects.rewards.manage"] },
      { id: "badges", label: "Rozetler", permissions: ["projects.rewards.view", "projects.rewards.manage"] },
      { id: "rewards", label: "Oduller", permissions: ["projects.rewards.view", "projects.rewards.manage"] },
      { id: "modules", label: "Moduller", permissions: ["projects.rewards.view", "projects.rewards.manage"] },
    ],
  },
  zirve_kademe: {
    title: "Zirve Kademe",
    eyebrow: "Proje ailesi",
    description: "Zirve Kademe rozet, hediye ve modul programi akislari KADEME+ modeliyle uyumlu yonetilir.",
    apiKey: "zirve-kademe",
    icon: Award,
    tabs: [
      { id: "overview", label: "Ozet", permissions: ["projects.rewards.view", "projects.rewards.manage"] },
      { id: "badges", label: "Rozetler", permissions: ["projects.rewards.view", "projects.rewards.manage"] },
      { id: "rewards", label: "Oduller", permissions: ["projects.rewards.view", "projects.rewards.manage"] },
      { id: "modules", label: "Moduller", permissions: ["projects.rewards.view", "projects.rewards.manage"] },
    ],
  },
};

function hasAny(enabledActions: string[], permissions: string[]): boolean {
  return permissions.some((permission) => enabledActions.includes(permission));
}

function rowText(value: unknown): string {
  return typeof value === "string" && value.trim() ? value : "-";
}

function latestRows(familyKey: FamilyKey, data: Record<string, unknown> | undefined): LatestRow[] {
  const listKey = familyKey === "diplomasi360"
    ? "internships"
    : familyKey === "pergel"
      ? "mentors"
      : familyKey === "eurodesk"
        ? "eurodesk_projects"
        : "reward_awards";
  const items = Array.isArray(data?.[listKey]) ? data?.[listKey] as Array<Record<string, unknown>> : [];

  return items.slice(0, 8).map((item, index) => {
    if (familyKey === "diplomasi360") {
      return {
        id: (item.id as number | string | undefined) ?? index,
        title: rowText(item.company_name),
        meta: [item.position, item.participant_name].map(rowText).filter((value) => value !== "-").join(" / ") || "Staj kaydi",
      };
    }

    if (familyKey === "pergel") {
      return {
        id: (item.id as number | string | undefined) ?? index,
        title: rowText(item.name),
        meta: rowText(item.expertise) !== "-" ? rowText(item.expertise) : `${item.participants_count ?? 0} katilimci`,
      };
    }

    if (familyKey === "eurodesk") {
      return {
        id: (item.id as number | string | undefined) ?? index,
        title: rowText(item.title),
        meta: rowText(item.grant_status),
      };
    }

    return {
      id: (item.id as number | string | undefined) ?? index,
      title: rowText(item.reward_name),
      meta: [item.status, item.participant_name].map(rowText).filter((value) => value !== "-").join(" / ") || "Hediye kaydi",
    };
  });
}

export function ProjectFamilyPanelPage({ familyKey }: { familyKey: FamilyKey }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { panelModules, hasAnyPermission } = useAuth();
  const config = familyConfigs[familyKey];
  const panelModule = panelModules.find((item) => item.family_key === familyKey || item.id === familyKey);
  const enabledActions = panelModule?.enabled_actions ?? [];
  const matchedProjectIds = panelModule?.matched_project_ids ?? [];
  const [loadState, setLoadState] = useState<{ key: string; payload: FamilyPanelResponse | null; error: string | null }>({
    key: "",
    payload: null,
    error: null,
  });
  const [refreshToken, setRefreshToken] = useState(0);
  const Icon = config.icon;

  const requestedProjectId = searchParams.get("project_id");
  const requestedPeriodId = searchParams.get("period_id");
  const requestKey = `${config.apiKey}:${requestedProjectId ?? ""}:${requestedPeriodId ?? ""}:${refreshToken}`;
  const isLoading = loadState.key !== requestKey;
  const payload = isLoading ? null : loadState.payload;
  const error = isLoading ? null : loadState.error;

  useEffect(() => {
    let active = true;

    api.get<FamilyPanelResponse>(`/panel/project-families/${config.apiKey}`, {
      params: {
        ...(requestedProjectId ? { project_id: requestedProjectId } : {}),
        ...(requestedPeriodId ? { period_id: requestedPeriodId } : {}),
      },
    })
      .then((response) => {
        if (!active) return;
        setLoadState({ key: requestKey, payload: response.data, error: null });
      })
      .catch((caught) => {
        if (!active) return;
        const message = isAxiosError(caught)
          ? caught.response?.data?.message ?? "Proje ailesi verisi alinamadi."
          : "Proje ailesi verisi alinamadi.";
        setLoadState({ key: requestKey, payload: null, error: message });
      });

    return () => {
      active = false;
    };
  }, [config.apiKey, requestedPeriodId, requestedProjectId, requestKey]);

  const visibleTabs = payload?.tabs.length
    ? payload.tabs.filter((tab) => tab.visible)
    : config.tabs.filter((tab) => hasAny(enabledActions, tab.permissions) || hasAnyPermission(tab.permissions));

  const rows = latestRows(familyKey, payload?.data);
  const projectCount = payload?.projects.length ?? matchedProjectIds.length;

  function updateFilter(name: "project_id" | "period_id", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(name, value);
    else params.delete(name);
    if (name === "project_id") params.delete("period_id");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  function reloadFamilyData() {
    setRefreshToken((value) => value + 1);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/15 text-accent">
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xs font-black uppercase tracking-widest text-accent">{config.eyebrow}</div>
            <h1 className="mt-2 text-3xl font-black text-slate-900">{config.title}</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{config.description}</p>
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700">
          {projectCount} erisilebilir proje
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <label className="space-y-2 text-sm font-bold text-slate-700">
          Proje
          <select
            value={payload?.selected_project?.id ? String(payload.selected_project.id) : requestedProjectId ?? ""}
            onChange={(event) => updateFilter("project_id", event.target.value)}
            disabled={isLoading || !payload?.projects.length}
            className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-accent"
          >
            {payload?.projects.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
        </label>
        <label className="space-y-2 text-sm font-bold text-slate-700">
          Donem
          <select
            value={requestedPeriodId ?? ""}
            onChange={(event) => updateFilter("period_id", event.target.value)}
            disabled={isLoading || !payload?.periods.length}
            className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-accent"
          >
            <option value="">Tum donemler</option>
            {payload?.periods.map((period) => (
              <option key={period.id} value={period.id}>{period.name}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        {visibleTabs.map((tab, index) => (
          <button
            key={tab.id}
            type="button"
            className={cn(
              "rounded-lg border px-4 py-2 text-sm font-bold",
              index === 0 ? "border-accent bg-accent text-white" : "border-slate-200 bg-white text-slate-700"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <section className="flex min-h-52 items-center justify-center rounded-lg border border-slate-200 bg-white p-8 text-sm font-bold text-slate-600">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Yukleniyor
        </section>
      ) : payload ? (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {payload.summary.map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="text-xs font-black uppercase tracking-widest text-slate-500">{item.label}</div>
                <div className="mt-3 text-3xl font-black text-slate-900">{item.value}</div>
              </div>
            ))}
          </div>

          {familyKey === "diplomasi360" ? (
            <DiplomasiFamilyContent
              payload={payload}
              canManage={Boolean(payload.access["projects.internships.manage"])}
              onReload={reloadFamilyData}
            />
          ) : familyKey === "pergel" ? (
            <PergelFamilyContent
              payload={payload}
              canManage={Boolean(payload.access["projects.mentors.manage"])}
              periodId={requestedPeriodId}
              onReload={reloadFamilyData}
            />
          ) : familyKey === "eurodesk" ? (
            <EurodeskFamilyContent
              payload={payload}
              canManage={Boolean(payload.access["projects.eurodesk.manage"])}
              periodId={requestedPeriodId}
              onReload={reloadFamilyData}
            />
          ) : familyKey === "kademe_plus" || familyKey === "zirve_kademe" ? (
            <KademeRewardsFamilyContent
              payload={payload}
              title={config.title}
              canManage={Boolean(payload.access["projects.rewards.manage"])}
              periodId={requestedPeriodId}
              onReload={reloadFamilyData}
            />
          ) : (
            <section className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Son kayitlar</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{payload.selected_project?.name ?? config.title}</p>
                </div>
              </div>
              <div className="mt-4 divide-y divide-slate-100">
                {rows.length ? rows.map((row) => (
                  <div key={row.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="font-bold text-slate-900">{row.title}</div>
                    <div className="text-sm text-slate-500">{row.meta}</div>
                  </div>
                )) : (
                  <div className="py-8 text-sm font-semibold text-slate-500">Bu filtre icin kayit bulunamadi.</div>
                )}
              </div>
            </section>
          )}
        </div>
      ) : null}
    </div>
  );
}

function arrayData<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function apiMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as { message?: string } | undefined;
    return data?.message ?? fallback;
  }

  return fallback;
}

const emptyRewardTierForm: RewardTierForm = { name: "", description: "", min_badges: "0", min_credits: "0", reward_description: "" };
const emptyRewardAwardForm: RewardAwardForm = { participant_id: "", reward_tier_id: "", reward_name: "", status: "given", note: "" };
const emptyKademeModuleForm: KademeModuleForm = {
  period_id: "",
  title: "",
  description: "",
  sort_order: "0",
  is_active: true,
  application_open: true,
  requires_consent: true,
  requires_coordinator_approval: false,
  consent_checkbox_label: "Okudum, kabul ediyorum.",
  warning_text: "",
  outcomesText: "",
};

const rewardStatusMeta: Record<string, { label: string; className: string }> = {
  planned: { label: "Planlandi", className: "border-amber-200 bg-amber-50 text-amber-700" },
  given: { label: "Verildi", className: "border-sky-200 bg-sky-50 text-sky-700" },
  delivered: { label: "Teslim edildi", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  cancelled: { label: "Iptal", className: "border-red-200 bg-red-50 text-red-700" },
};

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function KademeRewardsFamilyContent({
  payload,
  title,
  canManage,
  periodId,
  onReload,
}: {
  payload: FamilyPanelResponse;
  title: string;
  canManage: boolean;
  periodId: string | null;
  onReload: () => void;
}) {
  const projectId = payload.selected_project?.id;
  const participants = arrayData<PergelParticipant>(payload.data.participants);
  const rewardTiers = arrayData<RewardTier>(payload.data.reward_tiers);
  const rewardAwards = arrayData<RewardAward>(payload.data.reward_awards);
  const eligibleParticipants = arrayData<RewardEligibleParticipant>(payload.data.reward_eligible_participants);
  const kademeModules = arrayData<KademeModule>(payload.data.kademe_modules);
  const [tierForm, setTierForm] = useState<RewardTierForm>(emptyRewardTierForm);
  const [awardForm, setAwardForm] = useState<RewardAwardForm>(emptyRewardAwardForm);
  const [moduleForm, setModuleForm] = useState<KademeModuleForm>({ ...emptyKademeModuleForm, period_id: periodId ?? "" });
  const [editingTierId, setEditingTierId] = useState<number | null>(null);
  const [editingModuleId, setEditingModuleId] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const awardStats = {
    total: rewardAwards.length,
    delivered: rewardAwards.filter((award) => award.status === "delivered").length,
    pending: rewardAwards.filter((award) => award.status === "planned" || award.status === "given").length,
    cancelled: rewardAwards.filter((award) => award.status === "cancelled").length,
  };

  function editTier(tier: RewardTier) {
    setEditingTierId(tier.id);
    setTierForm({
      name: tier.name,
      description: tier.description ?? "",
      min_badges: String(tier.min_badges ?? 0),
      min_credits: String(tier.min_credits ?? 0),
      reward_description: tier.reward_description,
    });
  }

  function resetTierForm() {
    setTierForm(emptyRewardTierForm);
    setEditingTierId(null);
  }

  async function submitTier(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectId || !tierForm.name.trim() || !tierForm.reward_description.trim()) return;
    setBusy("tier");
    setFeedback(null);

    try {
      const requestPayload = {
        name: tierForm.name,
        description: tierForm.description || null,
        min_badges: Number(tierForm.min_badges || 0),
        min_credits: Number(tierForm.min_credits || 0),
        reward_description: tierForm.reward_description,
      };
      if (editingTierId) {
        await api.put(`/panel/projects/${projectId}/special-modules/reward-tiers/${editingTierId}`, requestPayload);
      } else {
        await api.post(`/panel/projects/${projectId}/special-modules/reward-tiers`, requestPayload);
      }
      setFeedback(editingTierId ? "Odul kademesi guncellendi." : "Odul kademesi kaydedildi.");
      resetTierForm();
      onReload();
    } catch (error) {
      setFeedback(apiMessage(error, "Odul kademesi kaydedilemedi."));
    } finally {
      setBusy(null);
    }
  }

  async function deleteTier(id: number) {
    if (!projectId) return;
    setBusy(`tier-${id}`);
    setFeedback(null);

    try {
      await api.delete(`/panel/projects/${projectId}/special-modules/reward-tiers/${id}`);
      setFeedback("Odul kademesi silindi.");
      if (editingTierId === id) resetTierForm();
      onReload();
    } catch (error) {
      setFeedback(apiMessage(error, "Odul kademesi silinemedi."));
    } finally {
      setBusy(null);
    }
  }

  async function submitAward(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectId || !awardForm.participant_id || !awardForm.reward_name.trim()) return;
    setBusy("award");
    setFeedback(null);

    try {
      await api.post(`/panel/projects/${projectId}/special-modules/reward-awards`, {
        participant_id: Number(awardForm.participant_id),
        reward_tier_id: awardForm.reward_tier_id ? Number(awardForm.reward_tier_id) : null,
        reward_name: awardForm.reward_name,
        status: awardForm.status,
        note: awardForm.note || null,
      });
      setAwardForm(emptyRewardAwardForm);
      setFeedback("Hediye kaydi olusturuldu.");
      onReload();
    } catch (error) {
      setFeedback(apiMessage(error, "Hediye kaydi olusturulamadi."));
    } finally {
      setBusy(null);
    }
  }

  async function markDelivered(id: number) {
    if (!projectId) return;
    setBusy(`award-${id}`);
    setFeedback(null);

    try {
      await api.patch(`/panel/projects/${projectId}/special-modules/reward-awards/${id}/deliver`);
      setFeedback("Hediye teslim edildi.");
      onReload();
    } catch (error) {
      setFeedback(apiMessage(error, "Hediye teslim isaretlenemedi."));
    } finally {
      setBusy(null);
    }
  }

  async function deleteAward(id: number) {
    if (!projectId) return;
    setBusy(`award-delete-${id}`);
    setFeedback(null);

    try {
      await api.delete(`/panel/projects/${projectId}/special-modules/reward-awards/${id}`);
      setFeedback("Hediye kaydi silindi.");
      onReload();
    } catch (error) {
      setFeedback(apiMessage(error, "Hediye kaydi silinemedi."));
    } finally {
      setBusy(null);
    }
  }

  function editModule(module: KademeModule) {
    setEditingModuleId(module.id);
    setModuleForm({
      period_id: module.period_id ? String(module.period_id) : "",
      title: module.title,
      description: module.description ?? "",
      sort_order: String(module.sort_order ?? 0),
      is_active: module.is_active,
      application_open: module.application_open,
      requires_consent: module.requires_consent,
      requires_coordinator_approval: module.requires_coordinator_approval,
      consent_checkbox_label: module.consent_checkbox_label ?? "Okudum, kabul ediyorum.",
      warning_text: module.warning_text ?? "",
      outcomesText: (module.outcomes ?? []).join("\n"),
    });
  }

  function resetModuleForm() {
    setModuleForm({ ...emptyKademeModuleForm, period_id: periodId ?? "" });
    setEditingModuleId(null);
  }

  async function submitModule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectId || !moduleForm.title.trim()) return;
    setBusy("module");
    setFeedback(null);

    const requestPayload = {
      period_id: moduleForm.period_id ? Number(moduleForm.period_id) : null,
      title: moduleForm.title,
      description: moduleForm.description || null,
      sort_order: Number(moduleForm.sort_order || 0),
      is_active: moduleForm.is_active,
      application_open: moduleForm.application_open,
      requires_consent: moduleForm.requires_consent,
      requires_coordinator_approval: moduleForm.requires_coordinator_approval,
      consent_checkbox_label: moduleForm.consent_checkbox_label || null,
      warning_text: moduleForm.warning_text || null,
      outcomes: moduleForm.outcomesText.split("\n").map((item) => item.trim()).filter(Boolean),
    };

    try {
      if (editingModuleId) {
        await api.put(`/panel/projects/${projectId}/special-modules/kademe-modules/${editingModuleId}`, requestPayload);
      } else {
        await api.post(`/panel/projects/${projectId}/special-modules/kademe-modules`, requestPayload);
      }
      setFeedback(editingModuleId ? "Modul guncellendi." : "Modul kaydedildi.");
      resetModuleForm();
      onReload();
    } catch (error) {
      setFeedback(apiMessage(error, "Modul kaydedilemedi."));
    } finally {
      setBusy(null);
    }
  }

  async function deleteModule(id: number) {
    if (!projectId) return;
    setBusy(`module-${id}`);
    setFeedback(null);

    try {
      await api.delete(`/panel/projects/${projectId}/special-modules/kademe-modules/${id}`);
      setFeedback("Modul silindi.");
      if (editingModuleId === id) resetModuleForm();
      onReload();
    } catch (error) {
      setFeedback(apiMessage(error, "Modul silinemedi."));
    } finally {
      setBusy(null);
    }
  }

  async function updateEnrollment(id: number, status: "approved" | "rejected") {
    if (!projectId) return;
    setBusy(`enrollment-${id}`);
    setFeedback(null);

    try {
      await api.put(`/panel/projects/${projectId}/special-modules/kademe-module-enrollments/${id}`, { status });
      setFeedback(status === "approved" ? "Kayit onaylandi." : "Kayit reddedildi.");
      onReload();
    } catch (error) {
      setFeedback(apiMessage(error, "Kayit guncellenemedi."));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(390px,0.8fr)]">
      <section className="space-y-5 rounded-lg border border-slate-200 bg-white p-5">
        <div>
          <h2 className="text-lg font-black text-slate-900">{title} odul ve moduller</h2>
          <p className="mt-1 text-sm text-muted-foreground">{payload.selected_project?.name ?? title}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg bg-slate-50 p-3"><div className="text-xs font-black uppercase text-slate-500">Hediye</div><div className="mt-2 text-xl font-black text-slate-900">{awardStats.total}</div></div>
          <div className="rounded-lg bg-slate-50 p-3"><div className="text-xs font-black uppercase text-slate-500">Teslim</div><div className="mt-2 text-xl font-black text-slate-900">{awardStats.delivered}</div></div>
          <div className="rounded-lg bg-slate-50 p-3"><div className="text-xs font-black uppercase text-slate-500">Bekleyen</div><div className="mt-2 text-xl font-black text-slate-900">{awardStats.pending}</div></div>
          <div className="rounded-lg bg-slate-50 p-3"><div className="text-xs font-black uppercase text-slate-500">Modul</div><div className="mt-2 text-xl font-black text-slate-900">{kademeModules.length}</div></div>
        </div>

        <div className="rounded-lg border border-slate-200 p-4">
          <h3 className="font-black text-slate-900">Odul kademeleri</h3>
          <div className="mt-3 space-y-2">
            {rewardTiers.length ? rewardTiers.map((tier) => (
              <div key={tier.id} className="flex flex-col gap-3 rounded-lg bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-bold text-slate-900">{tier.name}</div>
                  <div className="text-sm text-slate-500">{tier.reward_description} / {tier.min_badges} rozet / {tier.min_credits} kredi</div>
                </div>
                {canManage && tier.project_id === projectId ? (
                  <div className="flex gap-2">
                    <button type="button" onClick={() => editTier(tier)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600" title="Duzenle"><Edit2 className="h-4 w-4" /></button>
                    <button type="button" onClick={() => void deleteTier(tier.id)} disabled={busy === `tier-${tier.id}`} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-600 disabled:opacity-50" title="Sil"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ) : null}
              </div>
            )) : <div className="text-sm font-semibold text-slate-500">Odul kademesi yok.</div>}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 p-4">
          <h3 className="font-black text-slate-900">Hediyeler ve teslimler</h3>
          <div className="mt-3 space-y-3">
            {rewardAwards.length ? rewardAwards.map((award) => {
              const status = rewardStatusMeta[award.status] ?? rewardStatusMeta.given;
              const canDeliver = canManage && award.status !== "delivered" && award.status !== "cancelled";

              return (
                <div key={award.id} className="rounded-lg bg-slate-50 p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="font-bold text-slate-900">{award.name || award.email || `Katilimci #${award.participant_id}`}</div>
                      <div className="mt-1 text-sm text-slate-600">{award.reward_name}</div>
                      <div className="mt-1 text-xs text-slate-500">Kayit: {formatDateTime(award.awarded_at)} / Teslim: {formatDateTime(award.delivered_at)}</div>
                    </div>
                    <span className={`w-fit rounded-full border px-3 py-1 text-xs font-black ${status.className}`}>{status.label}</span>
                  </div>
                  {award.note ? <div className="mt-2 text-sm text-slate-500">{award.note}</div> : null}
                  {canManage ? (
                    <div className="mt-3 flex justify-end gap-2">
                      {canDeliver ? <button type="button" onClick={() => void markDelivered(award.id)} disabled={busy === `award-${award.id}`} className="rounded-lg border border-emerald-200 px-3 py-2 text-xs font-black text-emerald-700 disabled:opacity-50">Teslim edildi</button> : null}
                      <button type="button" onClick={() => void deleteAward(award.id)} disabled={busy === `award-delete-${award.id}`} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-black text-red-600 disabled:opacity-50">Sil</button>
                    </div>
                  ) : null}
                </div>
              );
            }) : <div className="text-sm font-semibold text-slate-500">Hediye kaydi yok.</div>}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 p-4">
          <h3 className="font-black text-slate-900">Hak kazananlar</h3>
          <div className="mt-3 space-y-2">
            {eligibleParticipants.length ? eligibleParticipants.map((participant) => (
              <div key={participant.participant_id} className="rounded-lg bg-slate-50 p-3 text-sm">
                <div className="font-bold text-slate-900">{participant.name || participant.email || `#${participant.participant_id}`}</div>
                <div className="text-slate-500">{participant.badge_count} rozet / {participant.credit} kredi / {participant.eligible_rewards.map((reward) => reward.reward_description).join(", ")}</div>
              </div>
            )) : <div className="text-sm font-semibold text-slate-500">Bu filtrede hak kazanan katilimci yok.</div>}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 p-4">
          <h3 className="font-black text-slate-900">Moduller ve kayitlar</h3>
          <div className="mt-3 space-y-3">
            {kademeModules.length ? kademeModules.map((module) => (
              <div key={module.id} className="rounded-lg bg-slate-50 p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="font-bold text-slate-900">{module.title}</div>
                    <div className="mt-1 text-sm text-slate-500">{module.is_active ? "Aktif" : "Pasif"} / {module.application_open ? "Basvuru acik" : "Basvuru kapali"} / {module.enrollments_count ?? module.enrollments?.length ?? 0} kayit</div>
                    {module.description ? <p className="mt-2 text-sm text-slate-600">{module.description}</p> : null}
                  </div>
                  {canManage ? (
                    <div className="flex gap-2">
                      <button type="button" onClick={() => editModule(module)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600" title="Duzenle"><Edit2 className="h-4 w-4" /></button>
                      <button type="button" onClick={() => void deleteModule(module.id)} disabled={busy === `module-${module.id}`} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-600 disabled:opacity-50" title="Sil"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  ) : null}
                </div>
                {canManage && module.enrollments?.length ? (
                  <div className="mt-3 space-y-2 border-t border-slate-200 pt-3">
                    {module.enrollments.map((enrollment) => (
                      <div key={enrollment.id} className="flex flex-col gap-2 rounded-lg bg-white p-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="font-bold text-slate-800">{enrollment.user?.name || enrollment.user?.email || `Kullanici #${enrollment.user_id}`}</div>
                          <div className="text-xs text-slate-500">{enrollment.status}</div>
                        </div>
                        {enrollment.status === "pending" ? (
                          <div className="flex gap-2">
                            <button type="button" onClick={() => void updateEnrollment(enrollment.id, "approved")} disabled={busy === `enrollment-${enrollment.id}`} className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-black text-white disabled:opacity-50">Onayla</button>
                            <button type="button" onClick={() => void updateEnrollment(enrollment.id, "rejected")} disabled={busy === `enrollment-${enrollment.id}`} className="rounded-lg bg-red-600 px-3 py-1 text-xs font-black text-white disabled:opacity-50">Reddet</button>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            )) : <div className="text-sm font-semibold text-slate-500">Modul kaydi yok.</div>}
          </div>
        </div>
      </section>

      <aside className="space-y-4">
        {feedback ? <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm font-bold text-slate-700">{feedback}</div> : null}
        {canManage ? (
          <>
            <form onSubmit={(event) => void submitTier(event)} className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between gap-3"><h3 className="text-base font-black text-slate-900">{editingTierId ? "Kademe duzenle" : "Odul kademesi ekle"}</h3>{editingTierId ? <button type="button" onClick={resetTierForm} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500"><X className="h-4 w-4" /></button> : null}</div>
              <div className="mt-4 space-y-3">
                <input value={tierForm.name} onChange={(event) => setTierForm((current) => ({ ...current, name: event.target.value }))} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-accent" placeholder="Kademe adi" />
                <input value={tierForm.reward_description} onChange={(event) => setTierForm((current) => ({ ...current, reward_description: event.target.value }))} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-accent" placeholder="Hediye" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <input type="number" value={tierForm.min_badges} onChange={(event) => setTierForm((current) => ({ ...current, min_badges: event.target.value }))} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-accent" placeholder="Min rozet" />
                  <input type="number" value={tierForm.min_credits} onChange={(event) => setTierForm((current) => ({ ...current, min_credits: event.target.value }))} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-accent" placeholder="Min kredi" />
                </div>
                <textarea value={tierForm.description} onChange={(event) => setTierForm((current) => ({ ...current, description: event.target.value }))} className="min-h-20 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-accent" placeholder="Aciklama" />
                <button type="submit" disabled={busy === "tier"} className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-black text-white disabled:opacity-50"><Plus className="h-4 w-4" /> {editingTierId ? "Guncelle" : "Kaydet"}</button>
              </div>
            </form>

            <form onSubmit={(event) => void submitAward(event)} className="rounded-lg border border-slate-200 bg-white p-5">
              <h3 className="text-base font-black text-slate-900">Hediye kaydi ekle</h3>
              <div className="mt-4 space-y-3">
                <select value={awardForm.participant_id} onChange={(event) => setAwardForm((current) => ({ ...current, participant_id: event.target.value }))} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-accent"><option value="">Katilimci sec</option>{participants.map((participant) => <option key={participant.id} value={participant.id}>{participant.name || participant.email || `#${participant.id}`}</option>)}</select>
                <select value={awardForm.reward_tier_id} onChange={(event) => { const tier = rewardTiers.find((item) => String(item.id) === event.target.value); setAwardForm((current) => ({ ...current, reward_tier_id: event.target.value, reward_name: tier?.reward_description || current.reward_name })); }} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-accent"><option value="">Kademe secmeden</option>{rewardTiers.map((tier) => <option key={tier.id} value={tier.id}>{tier.name}</option>)}</select>
                <input value={awardForm.reward_name} onChange={(event) => setAwardForm((current) => ({ ...current, reward_name: event.target.value }))} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-accent" placeholder="Verilen hediye" />
                <select value={awardForm.status} onChange={(event) => setAwardForm((current) => ({ ...current, status: event.target.value }))} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-accent"><option value="given">Verildi</option><option value="planned">Planlandi</option><option value="cancelled">Iptal</option></select>
                <textarea value={awardForm.note} onChange={(event) => setAwardForm((current) => ({ ...current, note: event.target.value }))} className="min-h-20 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-accent" placeholder="Not" />
                <button type="submit" disabled={busy === "award"} className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-black text-white disabled:opacity-50"><Award className="h-4 w-4" /> Hediye ekle</button>
              </div>
            </form>

            <form onSubmit={(event) => void submitModule(event)} className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between gap-3"><h3 className="text-base font-black text-slate-900">{editingModuleId ? "Modul duzenle" : "Modul ekle"}</h3>{editingModuleId ? <button type="button" onClick={resetModuleForm} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500"><X className="h-4 w-4" /></button> : null}</div>
              <div className="mt-4 space-y-3">
                <input value={moduleForm.title} onChange={(event) => setModuleForm((current) => ({ ...current, title: event.target.value }))} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-accent" placeholder="Modul basligi" />
                <select value={moduleForm.period_id} onChange={(event) => setModuleForm((current) => ({ ...current, period_id: event.target.value }))} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-accent"><option value="">Genel / donemsiz</option>{payload.periods.map((period) => <option key={period.id} value={period.id}>{period.name}</option>)}</select>
                <textarea value={moduleForm.description} onChange={(event) => setModuleForm((current) => ({ ...current, description: event.target.value }))} className="min-h-20 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-accent" placeholder="Aciklama" />
                <textarea value={moduleForm.outcomesText} onChange={(event) => setModuleForm((current) => ({ ...current, outcomesText: event.target.value }))} className="min-h-20 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-accent" placeholder="Kazanimlar, her satira bir madde" />
                <input type="number" value={moduleForm.sort_order} onChange={(event) => setModuleForm((current) => ({ ...current, sort_order: event.target.value }))} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-accent" placeholder="Sira" />
                <textarea value={moduleForm.warning_text} onChange={(event) => setModuleForm((current) => ({ ...current, warning_text: event.target.value }))} className="min-h-20 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-accent" placeholder="Uyari metni" />
                <input value={moduleForm.consent_checkbox_label} onChange={(event) => setModuleForm((current) => ({ ...current, consent_checkbox_label: event.target.value }))} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-accent" placeholder="Onay metni" />
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" checked={moduleForm.is_active} onChange={(event) => setModuleForm((current) => ({ ...current, is_active: event.target.checked }))} /> Aktif</label>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" checked={moduleForm.application_open} onChange={(event) => setModuleForm((current) => ({ ...current, application_open: event.target.checked }))} /> Basvuru acik</label>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" checked={moduleForm.requires_consent} onChange={(event) => setModuleForm((current) => ({ ...current, requires_consent: event.target.checked }))} /> Onay gerekli</label>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" checked={moduleForm.requires_coordinator_approval} onChange={(event) => setModuleForm((current) => ({ ...current, requires_coordinator_approval: event.target.checked }))} /> Koordinator onayi</label>
                <button type="submit" disabled={busy === "module"} className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-black text-white disabled:opacity-50"><Plus className="h-4 w-4" /> {editingModuleId ? "Guncelle" : "Kaydet"}</button>
              </div>
            </form>
          </>
        ) : <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm font-semibold text-slate-500">Bu ekranda goruntuleme yetkiniz var; odul ve modul duzenleme aksiyonlari gizlendi.</div>}
      </aside>
    </div>
  );
}
const emptyEurodeskForm: EurodeskProjectForm = {
  period_id: "",
  title: "",
  partner_organizations: "",
  grant_amount: "",
  grant_status: "applied",
  start_date: "",
  end_date: "",
};

const eurodeskStatusMeta: Record<string, { label: string; className: string }> = {
  applied: { label: "Basvuruldu", className: "border-sky-200 bg-sky-50 text-sky-700" },
  approved: { label: "Onaylandi", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  rejected: { label: "Reddedildi", className: "border-red-200 bg-red-50 text-red-700" },
  completed: { label: "Tamamlandi", className: "border-violet-200 bg-violet-50 text-violet-700" },
};

function formatCurrency(value: string | number | null | undefined): string {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) return "-";

  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(amount);
}

function EurodeskFamilyContent({
  payload,
  canManage,
  periodId,
  onReload,
}: {
  payload: FamilyPanelResponse;
  canManage: boolean;
  periodId: string | null;
  onReload: () => void;
}) {
  const projectId = payload.selected_project?.id;
  const eurodeskProjects = arrayData<EurodeskProject>(payload.data.eurodesk_projects);
  const summary = payload.data.eurodesk_summary as EurodeskSummary | undefined;
  const [form, setForm] = useState<EurodeskProjectForm>({ ...emptyEurodeskForm, period_id: periodId ?? "" });
  const [partnershipForm, setPartnershipForm] = useState({ eurodesk_project_id: "", organization_name: "", country: "", contact_info: "" });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  function resetProjectForm() {
    setForm({ ...emptyEurodeskForm, period_id: periodId ?? "" });
    setEditingId(null);
  }

  function editProject(item: EurodeskProject) {
    setEditingId(item.id);
    setForm({
      period_id: item.period_id ? String(item.period_id) : "",
      title: item.title ?? "",
      partner_organizations: (item.partner_organizations ?? []).join(", "),
      grant_amount: item.grant_amount ? String(item.grant_amount) : "",
      grant_status: item.grant_status || "applied",
      start_date: dateInput(item.start_date),
      end_date: dateInput(item.end_date),
    });
  }

  async function submitProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectId || !form.title.trim()) return;
    setBusy("project");
    setFeedback(null);

    const requestPayload = {
      period_id: form.period_id ? Number(form.period_id) : null,
      title: form.title,
      partner_organizations: form.partner_organizations.split(",").map((item) => item.trim()).filter(Boolean),
      grant_amount: form.grant_amount ? Number(form.grant_amount) : null,
      grant_status: form.grant_status,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
    };

    try {
      if (editingId) {
        await api.put(`/panel/projects/${projectId}/special-modules/eurodesk-projects/${editingId}`, requestPayload);
      } else {
        await api.post(`/panel/projects/${projectId}/special-modules/eurodesk-projects`, requestPayload);
      }
      setFeedback(editingId ? "Eurodesk projesi guncellendi." : "Eurodesk projesi kaydedildi.");
      resetProjectForm();
      onReload();
    } catch (error) {
      setFeedback(apiMessage(error, "Eurodesk projesi kaydedilemedi."));
    } finally {
      setBusy(null);
    }
  }

  async function deleteProject(id: number) {
    if (!projectId) return;
    setBusy(`project-${id}`);
    setFeedback(null);

    try {
      await api.delete(`/panel/projects/${projectId}/special-modules/eurodesk-projects/${id}`);
      setFeedback("Eurodesk projesi silindi.");
      if (editingId === id) resetProjectForm();
      onReload();
    } catch (error) {
      setFeedback(apiMessage(error, "Eurodesk projesi silinemedi."));
    } finally {
      setBusy(null);
    }
  }

  async function submitPartnership(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectId || !partnershipForm.eurodesk_project_id || !partnershipForm.organization_name.trim()) return;
    setBusy("partnership");
    setFeedback(null);

    try {
      await api.post(`/panel/projects/${projectId}/special-modules/eurodesk-projects/${partnershipForm.eurodesk_project_id}/partnerships`, {
        organization_name: partnershipForm.organization_name,
        country: partnershipForm.country || null,
        contact_info: partnershipForm.contact_info || null,
      });
      setPartnershipForm({ eurodesk_project_id: partnershipForm.eurodesk_project_id, organization_name: "", country: "", contact_info: "" });
      setFeedback("Ortaklik kaydedildi.");
      onReload();
    } catch (error) {
      setFeedback(apiMessage(error, "Ortaklik kaydedilemedi."));
    } finally {
      setBusy(null);
    }
  }

  async function deletePartnership(eurodeskProjectId: number, partnershipId: number) {
    if (!projectId) return;
    setBusy(`partnership-${partnershipId}`);
    setFeedback(null);

    try {
      await api.delete(`/panel/projects/${projectId}/special-modules/eurodesk-projects/${eurodeskProjectId}/partnerships/${partnershipId}`);
      setFeedback("Ortaklik silindi.");
      onReload();
    } catch (error) {
      setFeedback(apiMessage(error, "Ortaklik silinemedi."));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(380px,0.8fr)]">
      <section className="space-y-5 rounded-lg border border-slate-200 bg-white p-5">
        <div>
          <h2 className="text-lg font-black text-slate-900">Eurodesk projeleri</h2>
          <p className="mt-1 text-sm text-muted-foreground">{payload.selected_project?.name ?? "Eurodesk"}</p>
        </div>

        {summary ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg bg-slate-50 p-3"><div className="text-xs font-black uppercase text-slate-500">Basvuru</div><div className="mt-2 text-xl font-black text-slate-900">{summary.applied_projects}</div></div>
            <div className="rounded-lg bg-slate-50 p-3"><div className="text-xs font-black uppercase text-slate-500">Tamamlanan</div><div className="mt-2 text-xl font-black text-slate-900">{summary.completed_projects}</div></div>
            <div className="rounded-lg bg-slate-50 p-3"><div className="text-xs font-black uppercase text-slate-500">Ulke</div><div className="mt-2 text-xl font-black text-slate-900">{summary.country_count}</div></div>
            <div className="rounded-lg bg-slate-50 p-3"><div className="text-xs font-black uppercase text-slate-500">Toplam hibe</div><div className="mt-2 text-xl font-black text-slate-900">{formatCurrency(summary.total_grant_amount)}</div></div>
          </div>
        ) : null}

        <div className="space-y-3">
          {eurodeskProjects.length ? eurodeskProjects.map((item) => {
            const status = eurodeskStatusMeta[item.grant_status] ?? eurodeskStatusMeta.applied;
            const partners = item.partner_organizations ?? [];

            return (
              <div key={item.id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="font-black text-slate-900">{item.title}</div>
                    <div className="mt-1 flex flex-wrap gap-2 text-sm text-slate-500">
                      {item.period?.name ? <span>{item.period.name}</span> : null}
                      {item.start_date ? <span>{dateInput(item.start_date)}{item.end_date ? ` - ${dateInput(item.end_date)}` : ""}</span> : null}
                    </div>
                  </div>
                  <span className={`w-fit rounded-full border px-3 py-1 text-xs font-black ${status.className}`}>{status.label}</span>
                </div>
                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                  <div className="rounded-lg bg-slate-50 p-3"><div className="text-xs font-black uppercase text-slate-500">Hibe</div><div className="mt-1 font-bold text-slate-900">{formatCurrency(item.grant_amount)}</div></div>
                  <div className="rounded-lg bg-slate-50 p-3"><div className="text-xs font-black uppercase text-slate-500">Ortak kaydi</div><div className="mt-1 font-bold text-slate-900">{item.partnerships?.length ?? 0}</div></div>
                  <div className="rounded-lg bg-slate-50 p-3"><div className="text-xs font-black uppercase text-slate-500">Ortak listesi</div><div className="mt-1 font-bold text-slate-900">{partners.length ? partners.join(", ") : "-"}</div></div>
                </div>
                {canManage ? (
                  <div className="mt-4 flex flex-wrap justify-end gap-2">
                    <button type="button" onClick={() => editProject(item)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-600">
                      <Edit2 className="h-4 w-4" /> Duzenle
                    </button>
                    <button type="button" onClick={() => void deleteProject(item.id)} disabled={busy === `project-${item.id}`} className="inline-flex h-9 items-center gap-2 rounded-lg border border-red-200 px-3 text-sm font-bold text-red-600 disabled:opacity-50">
                      <Trash2 className="h-4 w-4" /> Sil
                    </button>
                  </div>
                ) : null}
                <div className="mt-4 rounded-lg bg-slate-50 p-3">
                  <div className="text-xs font-black uppercase tracking-widest text-slate-500">Ortakliklar</div>
                  <div className="mt-2 space-y-2">
                    {item.partnerships?.length ? item.partnerships.map((partnership) => (
                      <div key={partnership.id} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm">
                        <div>
                          <div className="font-bold text-slate-800">{partnership.organization_name}</div>
                          <div className="text-xs text-slate-500">{[partnership.country, partnership.contact_info].filter(Boolean).join(" - ") || "Detay yok"}</div>
                        </div>
                        {canManage ? (
                          <button type="button" onClick={() => void deletePartnership(item.id, partnership.id)} disabled={busy === `partnership-${partnership.id}`} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-50" title="Ortakligi sil">
                            <X className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                    )) : <div className="text-sm font-semibold text-slate-500">Ortaklik kaydi yok.</div>}
                  </div>
                </div>
              </div>
            );
          }) : (
            <div className="rounded-lg border border-dashed border-slate-300 p-8 text-sm font-semibold text-slate-500">Eurodesk proje kaydi yok.</div>
          )}
        </div>
      </section>

      <aside className="space-y-4">
        {feedback ? <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm font-bold text-slate-700">{feedback}</div> : null}
        {canManage ? (
          <>
            <form onSubmit={(event) => void submitProject(event)} className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-black text-slate-900">{editingId ? "Eurodesk projesi duzenle" : "Eurodesk projesi ekle"}</h3>
                {editingId ? <button type="button" onClick={resetProjectForm} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500" title="Vazgec"><X className="h-4 w-4" /></button> : null}
              </div>
              <div className="mt-4 space-y-3">
                <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-accent" placeholder="Proje adi" />
                <select value={form.period_id} onChange={(event) => setForm((current) => ({ ...current, period_id: event.target.value }))} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-accent">
                  <option value="">Genel / donemsiz</option>
                  {payload.periods.map((period) => <option key={period.id} value={period.id}>{period.name}</option>)}
                </select>
                <input value={form.partner_organizations} onChange={(event) => setForm((current) => ({ ...current, partner_organizations: event.target.value }))} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-accent" placeholder="Ortaklar, virgulle" />
                <input type="number" value={form.grant_amount} onChange={(event) => setForm((current) => ({ ...current, grant_amount: event.target.value }))} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-accent" placeholder="Hibe tutari" />
                <select value={form.grant_status} onChange={(event) => setForm((current) => ({ ...current, grant_status: event.target.value }))} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-accent">
                  <option value="applied">Basvuruldu</option>
                  <option value="approved">Onaylandi</option>
                  <option value="rejected">Reddedildi</option>
                  <option value="completed">Tamamlandi</option>
                </select>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input type="date" value={form.start_date} onChange={(event) => setForm((current) => ({ ...current, start_date: event.target.value }))} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-accent" />
                  <input type="date" value={form.end_date} onChange={(event) => setForm((current) => ({ ...current, end_date: event.target.value }))} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-accent" />
                </div>
                <button type="submit" disabled={busy === "project"} className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-black text-white disabled:opacity-50">
                  <Plus className="h-4 w-4" /> {editingId ? "Guncelle" : "Kaydet"}
                </button>
              </div>
            </form>

            <form onSubmit={(event) => void submitPartnership(event)} className="rounded-lg border border-slate-200 bg-white p-5">
              <h3 className="text-base font-black text-slate-900">Ortaklik ekle</h3>
              <div className="mt-4 space-y-3">
                <select value={partnershipForm.eurodesk_project_id} onChange={(event) => setPartnershipForm((current) => ({ ...current, eurodesk_project_id: event.target.value }))} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-accent">
                  <option value="">Eurodesk projesi sec</option>
                  {eurodeskProjects.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
                </select>
                <input value={partnershipForm.organization_name} onChange={(event) => setPartnershipForm((current) => ({ ...current, organization_name: event.target.value }))} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-accent" placeholder="Kurulus adi" />
                <input value={partnershipForm.country} onChange={(event) => setPartnershipForm((current) => ({ ...current, country: event.target.value }))} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-accent" placeholder="Ulke" />
                <input value={partnershipForm.contact_info} onChange={(event) => setPartnershipForm((current) => ({ ...current, contact_info: event.target.value }))} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-accent" placeholder="Iletisim / not" />
                <button type="submit" disabled={busy === "partnership"} className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-black text-white disabled:opacity-50">
                  <Handshake className="h-4 w-4" /> Ortaklik ekle
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm font-semibold text-slate-500">Bu ekranda goruntuleme yetkiniz var; Eurodesk duzenleme aksiyonlari gizlendi.</div>
        )}
      </aside>
    </div>
  );
}
const emptyInternshipForm: InternshipForm = {
  participant_id: "",
  company_name: "",
  position: "",
  start_date: "",
  end_date: "",
  description: "",
  document_path: "",
};

function dateInput(value: string | null | undefined): string {
  return typeof value === "string" ? value.slice(0, 10) : "";
}

function DiplomasiFamilyContent({
  payload,
  canManage,
  onReload,
}: {
  payload: FamilyPanelResponse;
  canManage: boolean;
  onReload: () => void;
}) {
  const projectId = payload.selected_project?.id;
  const internships = arrayData<DiplomasiInternship>(payload.data.internships);
  const participants = arrayData<PergelParticipant>(payload.data.participants);
  const [form, setForm] = useState<InternshipForm>(emptyInternshipForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  function resetForm() {
    setForm(emptyInternshipForm);
    setEditingId(null);
  }

  function editInternship(item: DiplomasiInternship) {
    setEditingId(item.id);
    setForm({
      participant_id: item.participant_id ? String(item.participant_id) : "",
      company_name: item.company_name ?? "",
      position: item.position ?? "",
      start_date: dateInput(item.start_date),
      end_date: dateInput(item.end_date),
      description: item.description ?? "",
      document_path: item.document_path ?? "",
    });
  }

  async function submitInternship(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectId || !form.company_name.trim() || !form.position.trim() || !form.start_date) return;
    if (!editingId && !form.participant_id) return;
    setBusy("internship");
    setFeedback(null);

    const requestPayload = {
      participant_id: form.participant_id ? Number(form.participant_id) : undefined,
      company_name: form.company_name,
      position: form.position,
      start_date: form.start_date,
      end_date: form.end_date || null,
      description: form.description || null,
      document_path: form.document_path || null,
    };

    try {
      if (editingId) {
        await api.put(`/panel/projects/${projectId}/special-modules/internships/${editingId}`, requestPayload);
      } else {
        await api.post(`/panel/projects/${projectId}/special-modules/internships`, requestPayload);
      }
      setFeedback(editingId ? "Staj guncellendi." : "Staj kaydedildi.");
      resetForm();
      onReload();
    } catch (error) {
      setFeedback(apiMessage(error, "Staj kaydedilemedi."));
    } finally {
      setBusy(null);
    }
  }

  async function deleteInternship(id: number) {
    if (!projectId) return;
    setBusy(`internship-${id}`);
    setFeedback(null);

    try {
      await api.delete(`/panel/projects/${projectId}/special-modules/internships/${id}`);
      setFeedback("Staj silindi.");
      if (editingId === id) resetForm();
      onReload();
    } catch (error) {
      setFeedback(apiMessage(error, "Staj silinemedi."));
    } finally {
      setBusy(null);
    }
  }

  async function uploadDocument(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "internship-documents");
    setBusy("upload");
    setFeedback(null);

    try {
      const response = await api.post<{ path: string; url?: string }>("/panel/media/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setForm((current) => ({ ...current, document_path: response.data.path }));
      setFeedback("Belge yuklendi.");
    } catch (error) {
      setFeedback(apiMessage(error, "Belge yuklenemedi."));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <div>
          <h2 className="text-lg font-black text-slate-900">Stajlar</h2>
          <p className="mt-1 text-sm text-muted-foreground">{payload.selected_project?.name ?? "Diplomasi360"}</p>
        </div>
        <div className="mt-5 space-y-3">
          {internships.length ? internships.map((item) => (
            <div key={item.id} className="rounded-lg border border-slate-200 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="font-black text-slate-900">{item.company_name}</div>
                  <div className="mt-1 text-sm font-semibold text-slate-600">{item.position}</div>
                  <div className="mt-2 text-sm text-slate-500">
                    {item.participant_name || item.participant_email || "Katilimci belirtilmemis"} / {dateInput(item.start_date)}{item.end_date ? ` - ${dateInput(item.end_date)}` : ""}
                  </div>
                  {item.description ? <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p> : null}
                  {item.document_path ? <div className="mt-2 text-xs font-bold text-accent">Belge: {item.document_path}</div> : null}
                </div>
                {canManage ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => editInternship(item)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600"
                      title="Staji duzenle"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteInternship(item.id)}
                      disabled={busy === `internship-${item.id}`}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-600 disabled:opacity-50"
                      title="Staji sil"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          )) : (
            <div className="rounded-lg border border-dashed border-slate-300 p-8 text-sm font-semibold text-slate-500">Staj kaydi bulunamadi.</div>
          )}
        </div>
      </section>

      <aside className="space-y-4">
        {feedback ? <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm font-bold text-slate-700">{feedback}</div> : null}
        {canManage ? (
          <form onSubmit={(event) => void submitInternship(event)} className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-black text-slate-900">{editingId ? "Staj duzenle" : "Staj ekle"}</h3>
              {editingId ? (
                <button type="button" onClick={resetForm} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500" title="Vazgec">
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
            <div className="mt-4 space-y-3">
              <select
                value={form.participant_id}
                onChange={(event) => setForm((current) => ({ ...current, participant_id: event.target.value }))}
                disabled={Boolean(editingId)}
                className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-accent disabled:bg-slate-50"
              >
                <option value="">Katilimci sec</option>
                {participants.map((participant) => <option key={participant.id} value={participant.id}>{participant.name || participant.email || `#${participant.id}`}</option>)}
              </select>
              <input
                value={form.company_name}
                onChange={(event) => setForm((current) => ({ ...current, company_name: event.target.value }))}
                className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-accent"
                placeholder="Kurum / sirket"
              />
              <input
                value={form.position}
                onChange={(event) => setForm((current) => ({ ...current, position: event.target.value }))}
                className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-accent"
                placeholder="Pozisyon"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(event) => setForm((current) => ({ ...current, start_date: event.target.value }))}
                  className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-accent"
                />
                <input
                  type="date"
                  value={form.end_date}
                  onChange={(event) => setForm((current) => ({ ...current, end_date: event.target.value }))}
                  className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-accent"
                />
              </div>
              <textarea
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                className="min-h-24 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-accent"
                placeholder="Aciklama"
              />
              <input
                value={form.document_path}
                onChange={(event) => setForm((current) => ({ ...current, document_path: event.target.value }))}
                className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-accent"
                placeholder="Belge yolu veya URL"
              />
              <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-black text-slate-700">
                <Upload className="h-4 w-4" /> Belge yukle
                <input
                  type="file"
                  className="hidden"
                  disabled={busy === "upload"}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (file) void uploadDocument(file);
                  }}
                />
              </label>
              <button type="submit" disabled={busy === "internship"} className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-black text-white disabled:opacity-50">
                <Plus className="h-4 w-4" /> {editingId ? "Guncelle" : "Kaydet"}
              </button>
            </div>
          </form>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm font-semibold text-slate-500">Bu ekranda goruntuleme yetkiniz var; staj duzenleme aksiyonlari gizlendi.</div>
        )}
      </aside>
    </div>
  );
}
function PergelFamilyContent({
  payload,
  canManage,
  periodId,
  onReload,
}: {
  payload: FamilyPanelResponse;
  canManage: boolean;
  periodId: string | null;
  onReload: () => void;
}) {
  const projectId = payload.selected_project?.id;
  const mentors = arrayData<PergelMentor>(payload.data.mentors);
  const participants = arrayData<PergelParticipant>(payload.data.participants);
  const [mentorForm, setMentorForm] = useState({ name: "", expertise: "", bio: "" });
  const [assignmentForm, setAssignmentForm] = useState({ mentor_id: "", participant_id: "", note: "" });
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function submitMentor(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectId || !mentorForm.name.trim()) return;
    setBusy("mentor");
    setFeedback(null);

    try {
      await api.post(`/panel/projects/${projectId}/special-modules/mentors`, {
        name: mentorForm.name,
        expertise: mentorForm.expertise || null,
        bio: mentorForm.bio || null,
      });
      setMentorForm({ name: "", expertise: "", bio: "" });
      setFeedback("Mentor kaydedildi.");
      onReload();
    } catch (error) {
      setFeedback(apiMessage(error, "Mentor kaydedilemedi."));
    } finally {
      setBusy(null);
    }
  }

  async function deleteMentor(mentorId: number) {
    if (!projectId) return;
    setBusy(`mentor-${mentorId}`);
    setFeedback(null);

    try {
      await api.delete(`/panel/projects/${projectId}/special-modules/mentors/${mentorId}`);
      setFeedback("Mentor silindi.");
      onReload();
    } catch (error) {
      setFeedback(apiMessage(error, "Mentor silinemedi."));
    } finally {
      setBusy(null);
    }
  }

  async function assignParticipant(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectId || !assignmentForm.mentor_id || !assignmentForm.participant_id) return;
    setBusy("assignment");
    setFeedback(null);

    try {
      await api.post(`/panel/projects/${projectId}/special-modules/mentors/${assignmentForm.mentor_id}/participants`, {
        participant_id: Number(assignmentForm.participant_id),
        period_id: periodId ? Number(periodId) : undefined,
        note: assignmentForm.note || null,
      });
      setAssignmentForm({ mentor_id: assignmentForm.mentor_id, participant_id: "", note: "" });
      setFeedback("Katilimci mentor ile eslendi.");
      onReload();
    } catch (error) {
      setFeedback(apiMessage(error, "Eslestirme kaydedilemedi."));
    } finally {
      setBusy(null);
    }
  }

  async function unassignParticipant(mentorId: number, participantId: number) {
    if (!projectId) return;
    setBusy(`unassign-${mentorId}-${participantId}`);
    setFeedback(null);

    try {
      await api.delete(`/panel/projects/${projectId}/special-modules/mentors/${mentorId}/participants/${participantId}`);
      setFeedback("Eslestirme kaldirildi.");
      onReload();
    } catch (error) {
      setFeedback(apiMessage(error, "Eslestirme kaldirilamadi."));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <div>
          <h2 className="text-lg font-black text-slate-900">Mentorler</h2>
          <p className="mt-1 text-sm text-muted-foreground">{payload.selected_project?.name ?? "Pergel"}</p>
        </div>
        <div className="mt-5 space-y-3">
          {mentors.length ? mentors.map((mentor) => (
            <div key={mentor.id} className="rounded-lg border border-slate-200 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="font-black text-slate-900">{mentor.name}</div>
                  <div className="mt-1 text-sm text-slate-500">{mentor.expertise || "Uzmanlik belirtilmemis"}</div>
                  {mentor.bio ? <p className="mt-2 text-sm leading-6 text-slate-600">{mentor.bio}</p> : null}
                </div>
                {canManage ? (
                  <button
                    type="button"
                    onClick={() => void deleteMentor(mentor.id)}
                    disabled={busy === `mentor-${mentor.id}`}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-600 disabled:opacity-50"
                    title="Mentoru sil"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
              <div className="mt-4 rounded-lg bg-slate-50 p-3">
                <div className="text-xs font-black uppercase tracking-widest text-slate-500">Eslestirmeler</div>
                <div className="mt-2 space-y-2">
                  {mentor.assigned_participants?.length ? mentor.assigned_participants.map((participant) => (
                    <div key={participant.id} className="flex items-center justify-between gap-3 text-sm">
                      <div>
                        <div className="font-bold text-slate-800">{participant.name || participant.email || `#${participant.id}`}</div>
                        {participant.note ? <div className="text-xs text-slate-500">{participant.note}</div> : null}
                      </div>
                      {canManage ? (
                        <button
                          type="button"
                          onClick={() => void unassignParticipant(mentor.id, participant.id)}
                          disabled={busy === `unassign-${mentor.id}-${participant.id}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-50"
                          title="Eslestirmeyi kaldir"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                  )) : (
                    <div className="text-sm font-semibold text-slate-500">Eslestirme yok.</div>
                  )}
                </div>
              </div>
            </div>
          )) : (
            <div className="rounded-lg border border-dashed border-slate-300 p-8 text-sm font-semibold text-slate-500">Mentor kaydi bulunamadi.</div>
          )}
        </div>
      </section>

      <aside className="space-y-4">
        {feedback ? <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm font-bold text-slate-700">{feedback}</div> : null}
        {canManage ? (
          <>
            <form onSubmit={(event) => void submitMentor(event)} className="rounded-lg border border-slate-200 bg-white p-5">
              <h3 className="text-base font-black text-slate-900">Mentor ekle</h3>
              <div className="mt-4 space-y-3">
                <input
                  value={mentorForm.name}
                  onChange={(event) => setMentorForm((form) => ({ ...form, name: event.target.value }))}
                  className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-accent"
                  placeholder="Ad soyad"
                />
                <input
                  value={mentorForm.expertise}
                  onChange={(event) => setMentorForm((form) => ({ ...form, expertise: event.target.value }))}
                  className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-accent"
                  placeholder="Uzmanlik"
                />
                <textarea
                  value={mentorForm.bio}
                  onChange={(event) => setMentorForm((form) => ({ ...form, bio: event.target.value }))}
                  className="min-h-24 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-accent"
                  placeholder="Kisa bio"
                />
                <button type="submit" disabled={busy === "mentor"} className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-black text-white disabled:opacity-50">
                  <Plus className="h-4 w-4" /> Kaydet
                </button>
              </div>
            </form>

            <form onSubmit={(event) => void assignParticipant(event)} className="rounded-lg border border-slate-200 bg-white p-5">
              <h3 className="text-base font-black text-slate-900">Eslestirme ekle</h3>
              <div className="mt-4 space-y-3">
                <select
                  value={assignmentForm.mentor_id}
                  onChange={(event) => setAssignmentForm((form) => ({ ...form, mentor_id: event.target.value }))}
                  className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-accent"
                >
                  <option value="">Mentor sec</option>
                  {mentors.map((mentor) => <option key={mentor.id} value={mentor.id}>{mentor.name}</option>)}
                </select>
                <select
                  value={assignmentForm.participant_id}
                  onChange={(event) => setAssignmentForm((form) => ({ ...form, participant_id: event.target.value }))}
                  className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-accent"
                >
                  <option value="">Katilimci sec</option>
                  {participants.map((participant) => <option key={participant.id} value={participant.id}>{participant.name || participant.email || `#${participant.id}`}</option>)}
                </select>
                <textarea
                  value={assignmentForm.note}
                  onChange={(event) => setAssignmentForm((form) => ({ ...form, note: event.target.value }))}
                  className="min-h-20 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-accent"
                  placeholder="Not"
                />
                <button type="submit" disabled={busy === "assignment"} className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-black text-white disabled:opacity-50">
                  <UserPlus className="h-4 w-4" /> Eslestir
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm font-semibold text-slate-500">Bu ekranda goruntuleme yetkiniz var; mentor duzenleme aksiyonlari gizlendi.</div>
        )}
      </aside>
    </div>
  );
}
export function Diplomasi360PanelPage() {
  return <ProjectFamilyPanelPage familyKey="diplomasi360" />;
}

export function PergelPanelPage() {
  return <ProjectFamilyPanelPage familyKey="pergel" />;
}

export function EurodeskPanelPage() {
  return <ProjectFamilyPanelPage familyKey="eurodesk" />;
}

export function KademePlusPanelPage() {
  return <ProjectFamilyPanelPage familyKey="kademe_plus" />;
}

export function ZirveKademePanelPage() {
  return <ProjectFamilyPanelPage familyKey="zirve_kademe" />;
}
