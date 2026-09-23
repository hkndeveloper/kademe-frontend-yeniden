"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { isAxiosError } from "axios";
import {
  Archive,
  BriefcaseBusiness,
  CheckCircle2,
  GitCompareArrows,
  Loader2,
  Network,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  UserRoundCog,
  Users,
} from "lucide-react";
import api from "@/lib/api/axios";
import { usePermissions } from "@/hooks/usePermissions";

type UnitKind = "project" | "service";
type UnitStatus = "active" | "passive";
type Position = "coordinator" | "staff";

interface ProjectOption {
  id: number;
  name: string;
  slug: string;
  status?: string;
}

interface UserOption {
  id: number;
  name: string;
  surname?: string;
  email: string;
  role: string;
  status?: string;
}

interface Membership {
  id: number;
  unit_id: number;
  position: Position;
  is_primary: boolean;
  status: UnitStatus;
  starts_at?: string | null;
  ends_at?: string | null;
  user: { id: number; name: string; email: string; role: string; status: string } | null;
}

interface Responsibility {
  id: number;
  unit_id: number;
  project_id: number;
  service_domain: string;
  is_primary: boolean;
  status: UnitStatus;
  project: ProjectOption | null;
}

interface PermissionRule {
  id: number;
  unit_id: number;
  position: Position;
  permission_name: string;
  effect: "allow";
  scope_source: string;
  service_domain?: string | null;
  scope_payload: Record<string, unknown>;
  status: UnitStatus;
}

interface CoordinationUnit {
  id: number;
  code: string;
  name: string;
  kind: UnitKind;
  status: UnitStatus;
  description?: string | null;
  project: ProjectOption | null;
  memberships: Membership[];
  responsibilities: Responsibility[];
  permission_rules?: PermissionRule[];
}

interface UnitOptions {
  projects: ProjectOption[];
  users: UserOption[];
  service_domains: Record<string, string>;
  permission_groups?: Record<string, string[]>;
  scope_sources?: string[];
  positions: Position[];
}

interface UnitIndexResponse {
  units: CoordinationUnit[];
  options: UnitOptions;
  authorization_mode: "legacy" | "shadow" | "enforce";
}

interface AuthorizationSide {
  effective_permissions: string[];
  scopes: Record<string, unknown>;
  contexts: Record<string, unknown>;
}

interface AuthorizationPreview {
  user: { id: number; name: string; email: string; role: string };
  configured_mode: string;
  legacy: AuthorizationSide;
  coordination_units: AuthorizationSide;
  diff: {
    legacy_only_permissions: string[];
    unit_only_permissions: string[];
    scope_differences: string[];
  };
}

type Tab = "summary" | "members" | "responsibilities" | "permissions" | "preview";

const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10";
const primaryButton = "inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButton = "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

const positionLabels: Record<Position, string> = {
  coordinator: "Koordinatör",
  staff: "Personel",
};

const scopeLabels: Record<string, string> = {
  linked_project: "Bağlı proje",
  responsibility_projects: "Sorumlu olunan projeler",
  own_unit: "Kendi birimi",
  own_record: "Kendi kaydı",
  self: "Kendisi",
  all: "Tüm sistem",
};

function errorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as { message?: string; errors?: Record<string, string[]> } | undefined;
    const validationMessage = data?.errors ? Object.values(data.errors).flat()[0] : null;
    return validationMessage ?? data?.message ?? "İşlem tamamlanamadı.";
  }
  return "Beklenmeyen bir hata oluştu.";
}

function modeDescription(mode: string): string {
  if (mode === "shadow") return "Legacy kararları uygulanıyor; birim modeli arka planda karşılaştırılıyor.";
  if (mode === "enforce") return "Yetkili kullanıcıların erişimi aktif birim üyelikleri ve kurallarından çözülüyor.";
  return "Mevcut legacy yetki sistemi aktif. Birim kayıtları güvenli geçiş için hazırlanıyor.";
}

export default function PanelCoordinationUnitsPage() {
  const { hasGlobalScope } = usePermissions();
  const canView = hasGlobalScope("coordination_units.view");
  const canManage = hasGlobalScope("coordination_units.manage");
  const canManageMemberships = hasGlobalScope("coordination_units.memberships.manage");
  const canManageResponsibilities = hasGlobalScope("coordination_units.responsibilities.manage");
  const canViewPermissions = hasGlobalScope("coordination_units.permissions.view");
  const canManagePermissions = hasGlobalScope("coordination_units.permissions.manage");
  const canPreview = hasGlobalScope("coordination_units.authorization.preview");

  const [data, setData] = useState<UnitIndexResponse | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>("summary");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ code: "", name: "", kind: "project" as UnitKind, project_id: "", description: "" });
  const [memberForm, setMemberForm] = useState({ user_id: "", position: "staff" as Position, is_primary: false });
  const [responsibilityForm, setResponsibilityForm] = useState({ project_id: "", service_domain: "media", is_primary: true });
  const [ruleForm, setRuleForm] = useState({ position: "coordinator" as Position, permission_name: "", scope_source: "own_unit", service_domain: "" });
  const [previewUserId, setPreviewUserId] = useState("");
  const [preview, setPreview] = useState<AuthorizationPreview | null>(null);

  const selected = useMemo(
    () => data?.units.find((unit) => unit.id === selectedId) ?? data?.units[0] ?? null,
    [data, selectedId]
  );
  const permissionOptions = useMemo(
    () => Object.values(data?.options.permission_groups ?? {}).flat().sort((a, b) => a.localeCompare(b, "tr")),
    [data?.options.permission_groups]
  );

  const loadData = useCallback(async () => {
    if (!canView) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await api.get<UnitIndexResponse>("/panel/coordination-units");
      setData(response.data);
      setSelectedId((current) => current ?? response.data.units[0]?.id ?? null);
    } catch (error) {
      setNotice({ type: "error", text: errorMessage(error) });
    } finally {
      setLoading(false);
    }
  }, [canView]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  const runMutation = async (operation: () => Promise<unknown>, success: string) => {
    setSaving(true);
    setNotice(null);
    try {
      await operation();
      setNotice({ type: "success", text: success });
      await loadData();
      return true;
    } catch (error) {
      setNotice({ type: "error", text: errorMessage(error) });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const createUnit = async (event: FormEvent) => {
    event.preventDefault();
    const created = await runMutation(
      () => api.post("/panel/coordination-units", {
        code: createForm.code,
        name: createForm.name,
        kind: createForm.kind,
        project_id: createForm.kind === "project" ? Number(createForm.project_id) : null,
        description: createForm.description || null,
      }),
      "Koordinasyon birimi oluşturuldu."
    );
    if (created) {
      setCreateForm({ code: "", name: "", kind: "project", project_id: "", description: "" });
      setShowCreate(false);
    }
  };

  const updateUnitStatus = async () => {
    if (!selected) return;
    const nextStatus: UnitStatus = selected.status === "active" ? "passive" : "active";
    if (nextStatus === "passive" && !window.confirm("Birim pasifleştirilsin mi? Geçmiş kayıtlar korunacaktır.")) return;
    await runMutation(
      () => api.put(`/panel/coordination-units/${selected.id}`, { status: nextStatus }),
      nextStatus === "active" ? "Birim yeniden aktifleştirildi." : "Birim pasifleştirildi."
    );
  };

  const addMembership = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    const done = await runMutation(
      () => api.post(`/panel/coordination-units/${selected.id}/memberships`, {
        user_id: Number(memberForm.user_id),
        position: memberForm.position,
        is_primary: memberForm.is_primary,
      }),
      "Birim üyeliği kaydedildi."
    );
    if (done) setMemberForm({ user_id: "", position: "staff", is_primary: false });
  };

  const deactivateMembership = async (membership: Membership) => {
    if (!window.confirm(`${membership.user?.name ?? "Bu kullanıcı"} için üyelik pasifleştirilsin mi?`)) return;
    await runMutation(
      () => api.patch(`/panel/coordination-unit-memberships/${membership.id}/deactivate`),
      "Birim üyeliği pasifleştirildi."
    );
  };

  const addResponsibility = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    const done = await runMutation(
      () => api.post(`/panel/coordination-units/${selected.id}/responsibilities`, {
        project_id: Number(responsibilityForm.project_id),
        service_domain: responsibilityForm.service_domain,
        is_primary: responsibilityForm.is_primary,
      }),
      "Hizmet birimi proje sorumluluğu kaydedildi."
    );
    if (done) setResponsibilityForm((current) => ({ ...current, project_id: "" }));
  };

  const deactivateResponsibility = async (responsibility: Responsibility) => {
    if (!window.confirm("Bu proje sorumluluğu pasifleştirilsin mi?")) return;
    await runMutation(
      () => api.patch(`/panel/coordination-unit-responsibilities/${responsibility.id}/deactivate`),
      "Proje sorumluluğu pasifleştirildi."
    );
  };

  const addPermissionRule = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    const done = await runMutation(
      () => api.post(`/panel/coordination-units/${selected.id}/permission-rules`, {
        position: ruleForm.position,
        permission_name: ruleForm.permission_name,
        scope_source: ruleForm.scope_source,
        service_domain: ruleForm.scope_source === "responsibility_projects" ? ruleForm.service_domain : null,
      }),
      "Birim izin kuralı kaydedildi."
    );
    if (done) setRuleForm((current) => ({ ...current, permission_name: "" }));
  };

  const deactivatePermissionRule = async (rule: PermissionRule) => {
    if (!window.confirm("Bu izin kuralı pasifleştirilsin mi?")) return;
    await runMutation(
      () => api.patch(`/panel/coordination-unit-permission-rules/${rule.id}/deactivate`),
      "Birim izin kuralı pasifleştirildi."
    );
  };

  const loadPreview = async () => {
    if (!previewUserId) return;
    setSaving(true);
    setNotice(null);
    try {
      const response = await api.get<AuthorizationPreview>("/panel/coordination-units/authorization-preview", {
        params: { user_id: Number(previewUserId) },
      });
      setPreview(response.data);
    } catch (error) {
      setNotice({ type: "error", text: errorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  if (!canView) {
    return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-semibold text-amber-800">Koordinasyon birimlerini görüntülemek için tüm sistem kapsamı gerekir.</div>;
  }

  if (loading && !data) {
    return <div className="flex min-h-[55vh] items-center justify-center"><Loader2 className="h-9 w-9 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Organizasyon ve yetki altyapısı</p>
          <h1 className="mt-2 text-2xl font-black text-slate-950 md:text-3xl">Koordinasyon Birimleri</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Proje koordinatörlüklerini ve projeler arası hizmet koordinatörlüklerini tek yerden yönetin. Kayıtlar silinmez; görev değişiklikleri tarihçe korunarak pasifleştirilir.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => void loadData()} disabled={loading} className={secondaryButton}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Yenile</button>
          {canManage ? <button onClick={() => setShowCreate((value) => !value)} className={primaryButton}><Plus className="h-4 w-4" /> Yeni birim</button> : null}
        </div>
      </header>

      {data ? (
        <div className={`rounded-2xl border p-4 text-sm ${data.authorization_mode === "enforce" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : data.authorization_mode === "shadow" ? "border-blue-200 bg-blue-50 text-blue-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
          <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" /><div><strong className="uppercase">Yetkilendirme kipi: {data.authorization_mode}</strong><p className="mt-1 leading-6">{modeDescription(data.authorization_mode)}</p></div></div>
        </div>
      ) : null}

      {notice ? <div className={`rounded-xl border p-3 text-sm font-bold ${notice.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>{notice.text}</div> : null}

      {showCreate && data ? (
        <form onSubmit={createUnit} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2 xl:grid-cols-4">
          <div className="md:col-span-2 xl:col-span-4"><h2 className="font-black text-slate-950">Yeni koordinasyon birimi</h2><p className="mt-1 text-xs text-slate-500">Kod, tür ve proje bağlantısı oluşturulduktan sonra değişmez.</p></div>
          <input required value={createForm.name} onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))} placeholder="Birim adı" className={inputClass} />
          <input required pattern="[a-z0-9_]+" value={createForm.code} onChange={(event) => setCreateForm((current) => ({ ...current, code: event.target.value.toLowerCase().replaceAll(" ", "_") }))} placeholder="birim_kodu" className={inputClass} />
          <select value={createForm.kind} onChange={(event) => setCreateForm((current) => ({ ...current, kind: event.target.value as UnitKind, project_id: "" }))} className={inputClass}><option value="project">Proje koordinatörlüğü</option><option value="service">Hizmet koordinatörlüğü</option></select>
          {createForm.kind === "project" ? <select required value={createForm.project_id} onChange={(event) => setCreateForm((current) => ({ ...current, project_id: event.target.value }))} className={inputClass}><option value="">Proje seçin</option>{data.options.projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select> : <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5 text-xs leading-5 text-blue-700">Hizmet birimi projelere “sorumluluk” sekmesinden action alanına göre bağlanır.</div>}
          <textarea value={createForm.description} onChange={(event) => setCreateForm((current) => ({ ...current, description: event.target.value }))} placeholder="Açıklama" className={`${inputClass} md:col-span-2 xl:col-span-3`} />
          <button disabled={saving} className={primaryButton}><Save className="h-4 w-4" /> Birimi oluştur</button>
        </form>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[340px,minmax(0,1fr)]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-black text-slate-900">Birimler</h2><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-600">{data?.units.length ?? 0}</span></div>
          <div className="space-y-2">
            {data?.units.map((unit) => (
              <button key={unit.id} onClick={() => { setSelectedId(unit.id); setTab("summary"); setPreview(null); }} className={`w-full rounded-xl border p-3 text-left transition ${selected?.id === unit.id ? "border-primary bg-primary/5" : "border-slate-200 hover:bg-slate-50"}`}>
                <div className="flex items-start gap-3">
                  <span className={`mt-0.5 rounded-lg p-2 ${unit.kind === "project" ? "bg-violet-100 text-violet-700" : "bg-blue-100 text-blue-700"}`}>{unit.kind === "project" ? <BriefcaseBusiness className="h-4 w-4" /> : <Network className="h-4 w-4" />}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-black text-slate-900">{unit.name}</span><span className="mt-1 block text-[11px] text-slate-500">{unit.kind === "project" ? unit.project?.name ?? "Projesiz" : "Projeler arası hizmet"}</span></span>
                  <span className={`h-2.5 w-2.5 rounded-full ${unit.status === "active" ? "bg-emerald-500" : "bg-slate-300"}`} />
                </div>
              </button>
            ))}
            {!data?.units.length ? <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">Henüz birim yok.</div> : null}
          </div>
        </aside>

        <main className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm">
          {!selected ? <div className="flex min-h-96 items-center justify-center text-sm text-slate-500">Bir birim seçin veya oluşturun.</div> : (
            <>
              <div className="border-b border-slate-100 p-5 md:p-6">
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                  <div><div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-black text-slate-950">{selected.name}</h2><span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${selected.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{selected.status === "active" ? "AKTİF" : "PASİF"}</span></div><p className="mt-1 font-mono text-xs text-slate-400">{selected.code}</p></div>
                  {canManage ? <button onClick={() => void updateUnitStatus()} disabled={saving} className={secondaryButton}><Archive className="h-4 w-4" /> {selected.status === "active" ? "Pasifleştir" : "Aktifleştir"}</button> : null}
                </div>
                <nav className="mt-5 flex gap-2 overflow-x-auto pb-1">
                  {([
                    ["summary", "Özet"], ["members", "Üyeler"],
                    ...(selected.kind === "service" ? [["responsibilities", "Proje sorumlulukları"]] : []),
                    ...(canViewPermissions ? [["permissions", "İzin kuralları"]] : []),
                    ...(canPreview ? [["preview", "Yetki önizleme"]] : []),
                  ] as [Tab, string][]).map(([key, label]) => <button key={key} onClick={() => setTab(key)} className={`whitespace-nowrap rounded-xl px-3 py-2 text-xs font-bold ${tab === key ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{label}</button>)}
                </nav>
              </div>

              <div className="p-5 md:p-6">
                {tab === "summary" ? <SummaryTab unit={selected} serviceDomains={data?.options.service_domains ?? {}} /> : null}

                {tab === "members" ? (
                  <div className="space-y-5">
                    {canManageMemberships && data ? <form onSubmit={addMembership} className="grid gap-3 rounded-2xl bg-slate-50 p-4 md:grid-cols-4"><select required value={memberForm.user_id} onChange={(event) => setMemberForm((current) => ({ ...current, user_id: event.target.value }))} className={`${inputClass} md:col-span-2`}><option value="">Personel/koordinatör seçin</option>{data.options.users.map((user) => <option key={user.id} value={user.id}>{user.name} {user.surname} — {user.role}</option>)}</select><select value={memberForm.position} onChange={(event) => setMemberForm((current) => ({ ...current, position: event.target.value as Position }))} className={inputClass}><option value="coordinator">Koordinatör</option><option value="staff">Personel</option></select><button disabled={saving || selected.status !== "active"} className={primaryButton}><UserRoundCog className="h-4 w-4" /> Üyeliği kaydet</button><label className="flex items-center gap-2 text-xs font-semibold text-slate-600 md:col-span-4"><input type="checkbox" checked={memberForm.is_primary} onChange={(event) => setMemberForm((current) => ({ ...current, is_primary: event.target.checked }))} /> Kullanıcının ana birimi olsun (diğer aktif ana üyelik otomatik kaldırılır)</label></form> : null}
                    <RecordList empty="Bu birimde henüz üyelik bulunmuyor.">{selected.memberships.map((membership) => <RecordRow key={membership.id} title={membership.user?.name ?? "Silinmiş kullanıcı"} subtitle={`${membership.user?.email ?? ""} · ${positionLabels[membership.position]}${membership.is_primary ? " · Ana birim" : ""}`} status={membership.status} onDeactivate={canManageMemberships && membership.status === "active" ? () => void deactivateMembership(membership) : undefined} />)}</RecordList>
                  </div>
                ) : null}

                {tab === "responsibilities" && selected.kind === "service" ? (
                  <div className="space-y-5">
                    {canManageResponsibilities && data ? <form onSubmit={addResponsibility} className="grid gap-3 rounded-2xl bg-slate-50 p-4 md:grid-cols-3"><select required value={responsibilityForm.project_id} onChange={(event) => setResponsibilityForm((current) => ({ ...current, project_id: event.target.value }))} className={inputClass}><option value="">Proje seçin</option>{data.options.projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select><select value={responsibilityForm.service_domain} onChange={(event) => setResponsibilityForm((current) => ({ ...current, service_domain: event.target.value }))} className={inputClass}>{Object.entries(data.options.service_domains).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><button disabled={saving} className={primaryButton}><BriefcaseBusiness className="h-4 w-4" /> Sorumluluğu kaydet</button><label className="flex items-center gap-2 text-xs font-semibold text-slate-600 md:col-span-3"><input type="checkbox" checked={responsibilityForm.is_primary} onChange={(event) => setResponsibilityForm((current) => ({ ...current, is_primary: event.target.checked }))} /> Bu proje ve hizmet alanı için birincil sorumlu birim</label></form> : null}
                    <RecordList empty="Bu hizmet birimine proje sorumluluğu atanmamış.">{selected.responsibilities.map((responsibility) => <RecordRow key={responsibility.id} title={responsibility.project?.name ?? `Proje #${responsibility.project_id}`} subtitle={`${data?.options.service_domains[responsibility.service_domain] ?? responsibility.service_domain}${responsibility.is_primary ? " · Birincil" : ""}`} status={responsibility.status} onDeactivate={canManageResponsibilities && responsibility.status === "active" ? () => void deactivateResponsibility(responsibility) : undefined} />)}</RecordList>
                  </div>
                ) : null}

                {tab === "permissions" && canViewPermissions ? (
                  <div className="space-y-5">
                    {canManagePermissions && data ? <form onSubmit={addPermissionRule} className="grid gap-3 rounded-2xl bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-4"><select value={ruleForm.position} onChange={(event) => setRuleForm((current) => ({ ...current, position: event.target.value as Position }))} className={inputClass}><option value="coordinator">Koordinatör</option><option value="staff">Personel</option></select><select required value={ruleForm.permission_name} onChange={(event) => setRuleForm((current) => ({ ...current, permission_name: event.target.value }))} className={inputClass}><option value="">Action/permission seçin</option>{permissionOptions.map((permission) => <option key={permission} value={permission}>{permission}</option>)}</select><select value={ruleForm.scope_source} onChange={(event) => setRuleForm((current) => ({ ...current, scope_source: event.target.value }))} className={inputClass}>{data.options.scope_sources?.map((scope) => <option key={scope} value={scope}>{scopeLabels[scope] ?? scope}</option>)}</select>{ruleForm.scope_source === "responsibility_projects" ? <select required value={ruleForm.service_domain} onChange={(event) => setRuleForm((current) => ({ ...current, service_domain: event.target.value }))} className={inputClass}><option value="">Hizmet alanı seçin</option>{Object.entries(data.options.service_domains).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select> : <button disabled={saving} className={primaryButton}><ShieldCheck className="h-4 w-4" /> Kuralı kaydet</button>}{ruleForm.scope_source === "responsibility_projects" ? <button disabled={saving} className={`${primaryButton} xl:col-start-4`}><ShieldCheck className="h-4 w-4" /> Kuralı kaydet</button> : null}</form> : null}
                    <RecordList empty="Bu birim için izin kuralı bulunmuyor.">{(selected.permission_rules ?? []).map((rule) => <RecordRow key={rule.id} title={rule.permission_name} subtitle={`${positionLabels[rule.position]} · ${scopeLabels[rule.scope_source] ?? rule.scope_source}${rule.service_domain ? ` · ${data?.options.service_domains[rule.service_domain] ?? rule.service_domain}` : ""}`} status={rule.status} onDeactivate={canManagePermissions && rule.status === "active" ? () => void deactivatePermissionRule(rule) : undefined} />)}</RecordList>
                  </div>
                ) : null}

                {tab === "preview" && canPreview && data ? <PreviewTab users={data.options.users} selectedUserId={previewUserId} setSelectedUserId={(value) => { setPreviewUserId(value); setPreview(null); }} onLoad={() => void loadPreview()} loading={saving} preview={preview} /> : null}
              </div>
            </>
          )}
        </main>
      </section>
    </div>
  );
}

function SummaryTab({ unit, serviceDomains }: { unit: CoordinationUnit; serviceDomains: Record<string, string> }) {
  const activeMembers = unit.memberships.filter((item) => item.status === "active");
  const coordinators = activeMembers.filter((item) => item.position === "coordinator");
  const activeResponsibilities = unit.responsibilities.filter((item) => item.status === "active");
  return <div className="space-y-5"><div className="grid gap-3 sm:grid-cols-3"><SummaryCard icon={<Users className="h-5 w-5" />} label="Aktif üye" value={activeMembers.length} /><SummaryCard icon={<UserRoundCog className="h-5 w-5" />} label="Koordinatör" value={coordinators.length} /><SummaryCard icon={<BriefcaseBusiness className="h-5 w-5" />} label={unit.kind === "service" ? "Proje sorumluluğu" : "Bağlı proje"} value={unit.kind === "service" ? activeResponsibilities.length : unit.project ? 1 : 0} /></div><div className="rounded-2xl border border-slate-200 p-5"><h3 className="text-sm font-black text-slate-900">Yapısal kimlik</h3><dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-xs font-bold uppercase text-slate-400">Tür</dt><dd className="mt-1 font-semibold text-slate-800">{unit.kind === "project" ? "Proje koordinatörlüğü" : "Projeler arası hizmet koordinatörlüğü"}</dd></div><div><dt className="text-xs font-bold uppercase text-slate-400">Proje</dt><dd className="mt-1 font-semibold text-slate-800">{unit.project?.name ?? "Doğrudan proje bağlantısı yok"}</dd></div><div className="sm:col-span-2"><dt className="text-xs font-bold uppercase text-slate-400">Açıklama</dt><dd className="mt-1 leading-6 text-slate-600">{unit.description || "Açıklama girilmemiş."}</dd></div></dl></div>{unit.kind === "service" && activeResponsibilities.length > 0 ? <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-xs leading-6 text-blue-800">Bu birim yalnız burada tanımlanan proje + hizmet alanı çiftlerinde kapsam kazanır: {activeResponsibilities.map((item) => `${item.project?.name ?? item.project_id} / ${serviceDomains[item.service_domain] ?? item.service_domain}`).join(", ")}.</div> : null}</div>;
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-center justify-between text-slate-500"><span className="text-xs font-black uppercase tracking-wider">{label}</span>{icon}</div><div className="mt-3 text-3xl font-black text-slate-950">{value}</div></div>;
}

function RecordList({ children, empty }: { children: React.ReactNode[]; empty: string }) {
  return <div className="space-y-2">{children.length ? children : <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">{empty}</div>}</div>;
}

function RecordRow({ title, subtitle, status, onDeactivate }: { title: string; subtitle: string; status: UnitStatus; onDeactivate?: () => void }) {
  return <div className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-sm font-black text-slate-900">{title}</h3>{status === "active" ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700">AKTİF</span> : <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500">GEÇMİŞ</span>}</div><p className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</p></div>{onDeactivate ? <button onClick={onDeactivate} className="shrink-0 rounded-lg border border-amber-200 px-3 py-2 text-xs font-bold text-amber-700 hover:bg-amber-50">Pasifleştir</button> : null}</div>;
}

function PreviewTab({ users, selectedUserId, setSelectedUserId, onLoad, loading, preview }: { users: UserOption[]; selectedUserId: string; setSelectedUserId: (value: string) => void; onLoad: () => void; loading: boolean; preview: AuthorizationPreview | null }) {
  return <div className="space-y-5"><div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-800"><div className="flex gap-3"><GitCompareArrows className="mt-0.5 h-5 w-5 shrink-0" /><p>Bu araç hiçbir yetkiyi değiştirmez. Seçilen kişinin mevcut legacy sonucu ile birim modelinin üreteceği sonucu yan yana gösterir.</p></div></div><div className="flex flex-col gap-3 sm:flex-row"><select value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)} className={`${inputClass} flex-1`}><option value="">Kullanıcı seçin</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name} {user.surname} — {user.role}</option>)}</select><button onClick={onLoad} disabled={!selectedUserId || loading} className={primaryButton}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitCompareArrows className="h-4 w-4" />} Karşılaştır</button></div>{preview ? <div className="space-y-4"><div className="rounded-2xl border border-slate-200 p-4"><h3 className="font-black text-slate-950">{preview.user.name}</h3><p className="mt-1 text-xs text-slate-500">{preview.user.email} · {preview.user.role} · Aktif kip: {preview.configured_mode}</p></div><div className="grid gap-3 sm:grid-cols-3"><DiffCard label="Sadece legacy" values={preview.diff.legacy_only_permissions} tone="amber" /><DiffCard label="Sadece birim modeli" values={preview.diff.unit_only_permissions} tone="blue" /><DiffCard label="Kapsamı farklı" values={preview.diff.scope_differences} tone="violet" /></div><div className="grid gap-3 sm:grid-cols-2"><SummaryCard icon={<ShieldCheck className="h-5 w-5" />} label="Legacy effective action" value={preview.legacy.effective_permissions.length} /><SummaryCard icon={<Network className="h-5 w-5" />} label="Birim effective action" value={preview.coordination_units.effective_permissions.length} /></div></div> : null}</div>;
}

function DiffCard({ label, values, tone }: { label: string; values: string[]; tone: "amber" | "blue" | "violet" }) {
  const tones = { amber: "border-amber-200 bg-amber-50 text-amber-800", blue: "border-blue-200 bg-blue-50 text-blue-800", violet: "border-violet-200 bg-violet-50 text-violet-800" };
  return <div className={`rounded-2xl border p-4 ${tones[tone]}`}><div className="flex items-center justify-between"><h4 className="text-xs font-black uppercase tracking-wider">{label}</h4><span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-black">{values.length}</span></div><div className="mt-3 max-h-44 space-y-1 overflow-auto">{values.length ? values.map((value) => <div key={value} className="break-all rounded-lg bg-white/60 px-2 py-1.5 font-mono text-[11px]">{value}</div>) : <div className="flex items-center gap-2 text-xs font-semibold"><CheckCircle2 className="h-4 w-4" /> Fark yok</div>}</div></div>;
}
