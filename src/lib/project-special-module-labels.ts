/**
 * Proje `Project.type` degeri ile panel "ozel moduller" kart basliklari.
 * Backend `ProjectSpecialModuleCatalog` ile ayni enum anahtarlari kullanilir.
 */

export function formatProjectTypeBadge(type: string | null | undefined): string {
  if (!type) return "Proje";
  const map: Record<string, string> = {
    diplomasi360: "Diplomasi360",
    pergel_fellowship: "Pergel Fellowship",
    kpd: "Kariyer Psikolojik Danismanlik (KPD)",
    kademe_plus: "KADEME+",
    zirve_kademe: "Zirve Kademe",
    eurodesk: "Eurodesk",
    other: "Diger",
  };
  return map[type] ?? type.replace(/_/g, " ");
}

export function internshipsSectionTitle(type: string | null | undefined): string {
  return type === "diplomasi360" ? "Diplomasi360 — Staj bilgileri" : "Staj bilgileri";
}

export function mentorsSectionTitle(type: string | null | undefined): string {
  return type === "pergel_fellowship" ? "Pergel Fellowship — Mentor bilgileri" : "Mentor bilgileri";
}

export function eurodeskSectionTitle(_type: string | null | undefined): string {
  return "Eurodesk — Hibe ve ortakliklar";
}

export function rewardsSectionTitle(type: string | null | undefined): string {
  if (type === "zirve_kademe") return "Zirve Kademe — Rozet ve hediye kademeleri";
  if (type === "kademe_plus") return "KADEME+ — Rozet ve hediye kademeleri";
  return "Rozet ve hediye kademeleri";
}

export function kademeModulesSectionTitle(type: string | null | undefined): string {
  if (type === "zirve_kademe") return "Zirve Kademe — Modul programi (kazanim, egitmen, SSS, uyari, kayit)";
  if (type === "kademe_plus") return "KADEME+ — Modul programi (kazanim, egitmen, SSS, uyari, kayit)";
  return "Modul programi (kazanim, egitmen, SSS, uyari, kayit)";
}

export function specialModulesIntroCopy(type: string | null | undefined): string {
  const badge = formatProjectTypeBadge(type);
  return `${badge} turune gore tanimli ozel modulleri buradan yonetirsiniz. Kartlar yetkiniz ve projeye acilan modul uclarina gore gorunur.`;
}
