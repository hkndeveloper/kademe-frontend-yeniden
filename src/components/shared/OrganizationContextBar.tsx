"use client";

import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { BriefcaseBusiness, Network } from "lucide-react";
import { useAuth } from "@/store/useAuth";
import {
  activeOrganizationMembership,
  projectIdsForModuleInActiveUnit,
} from "@/lib/organization-context";
import { homePathForUser } from "@/lib/role-home";

export function OrganizationContextBar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const activeUnitId = useAuth((state) => state.activeUnitId);
  const activeProjectId = useAuth((state) => state.activeProjectId);
  const setActiveUnitId = useAuth((state) => state.setActiveUnitId);
  const setActiveProjectId = useAuth((state) => state.setActiveProjectId);
  const isContextSwitching = useAuth((state) => state.isContextSwitching);
  const panelModules = useAuth((state) => state.panelModules);
  const context = user?.organization_context;
  const memberships = context?.unit_memberships ?? [];

  if (memberships.length === 0) return null;

  const activeMembership = activeOrganizationMembership(user, activeUnitId);
  if (!activeMembership) return null;

  const activeModule = panelModules
    .filter((module) => module.panel_type === "authority" && module.href)
    .sort((first, second) => (second.href?.length ?? 0) - (first.href?.length ?? 0))
    .find((module) => pathname === module.href || pathname.startsWith(`${module.href}/`));
  const moduleProjectIds = projectIdsForModuleInActiveUnit(activeModule, user, activeUnitId);
  const projects = (context?.projects ?? []).filter((project) => moduleProjectIds.includes(project.id));
  const selectedProjectId = projects.some((project) => project.id === activeProjectId) ? activeProjectId : null;

  const handleUnitChange = async (unitId: number) => {
    await setActiveUnitId(unitId);
    const currentUser = useAuth.getState().user;
    if (currentUser) router.replace(homePathForUser(currentUser));
  };

  return (
    <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className={`rounded-xl p-2.5 ${activeMembership.unit_kind === "project" ? "bg-violet-100 text-violet-700" : "bg-blue-100 text-blue-700"}`}>
            {activeMembership.unit_kind === "project" ? <BriefcaseBusiness className="h-5 w-5" /> : <Network className="h-5 w-5" />}
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Aktif görev bağlamı</p>
            <p className="truncate text-sm font-black text-slate-900">{activeMembership.unit_name}</p>
            <p className="text-xs text-slate-500">{activeMembership.position === "coordinator" ? "Koordinatör" : "Personel"}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {memberships.length > 1 ? (
            <label className="flex items-center gap-2 text-xs font-bold text-slate-500">
              Birim
              <select aria-label="Birim" disabled={isContextSwitching} value={activeMembership.unit_id} onChange={(event) => void handleUnitChange(Number(event.target.value))} className="min-w-52 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-primary disabled:cursor-wait disabled:opacity-60">
                {memberships.map((membership) => <option key={membership.membership_id} value={membership.unit_id}>{membership.unit_name} — {membership.position === "coordinator" ? "Koordinatör" : "Personel"}</option>)}
              </select>
            </label>
          ) : null}
          {projects.length > 0 ? (
            <label className="flex items-center gap-2 text-xs font-bold text-slate-500">
              Proje
              <select aria-label="Proje" disabled={isContextSwitching} value={selectedProjectId ?? ""} onChange={(event) => setActiveProjectId(event.target.value ? Number(event.target.value) : null)} className="min-w-44 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-primary disabled:cursor-wait disabled:opacity-60">
                <option value="">Tüm yetkili projeler</option>
                {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
              </select>
            </label>
          ) : null}
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${context?.authoritative ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
            {isContextSwitching ? "Bağlam yenileniyor" : context?.authoritative ? "Aktif yetki bağlamı" : `${context?.authorization_mode ?? "legacy"} hazırlık`}
          </span>
        </div>
      </div>
      {!context?.authoritative ? <p className="mt-2 border-t border-slate-100 pt-2 text-[11px] leading-5 text-slate-500">Bu seçim şu anda yalnız arayüz bağlamını hazırlar; backend erişim kararını mevcut legacy yetki sistemi vermeye devam eder.</p> : null}
    </div>
  );
}
