"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BriefcaseBusiness, Edit2, Gift, Handshake, Loader2, Plus, Save, Trash2, Upload, Users, X } from "lucide-react";
import api from "@/lib/api/axios";
import { PermissionGate } from "@/components/shared/PermissionGate";

type AccessMap = Record<string, boolean>;

type Participant = {
  id: number;
  name: string;
  email?: string | null;
};

type Internship = {
  id: number;
  company_name: string;
  position: string;
  start_date: string;
  end_date?: string | null;
  description?: string | null;
  document_path?: string | null;
  participant?: { user?: { name?: string; surname?: string } | null } | null;
};

type Mentor = {
  id: number;
  name: string;
  expertise?: string | null;
  bio?: string | null;
  photo_path?: string | null;
};

type EurodeskProject = {
  id: number;
  title: string;
  partner_organizations?: string[] | null;
  grant_amount?: string | number | null;
  grant_status: string;
  start_date?: string | null;
  end_date?: string | null;
};

type RewardTier = {
  id: number;
  project_id?: number | null;
  name: string;
  min_badges: number;
  min_credits: number;
  description?: string | null;
  reward_description: string;
};

type RewardEligibleParticipant = {
  participant_id: number;
  name: string;
  email?: string | null;
  badge_count: number;
  credit: number;
  eligible_rewards: Array<{ id: number; name: string; reward_description: string }>;
};

type RewardAward = {
  id: number;
  name?: string | null;
  email?: string | null;
  reward_name: string;
  status: string;
  awarded_at?: string | null;
};

type ResponsePayload = {
  project: { id: number; name: string; type?: string | null };
  access: AccessMap;
  applicable_modules?: string[];
  participants: Participant[];
  internships: Internship[];
  mentors: Mentor[];
  eurodesk_projects: EurodeskProject[];
  reward_tiers: RewardTier[];
  reward_eligible_participants?: RewardEligibleParticipant[];
  reward_awards?: RewardAward[];
};

const initialInternship = { participant_id: "", company_name: "", position: "", start_date: "", end_date: "", description: "", document_path: "" };
const initialMentor = { name: "", expertise: "", bio: "", photo_path: "" };
const initialEurodesk = { title: "", partner_organizations: "", grant_amount: "", grant_status: "applied", start_date: "", end_date: "" };
const initialReward = { name: "", description: "", min_badges: "0", min_credits: "0", reward_description: "" };
const initialRewardAward = { participant_id: "", reward_tier_id: "", reward_name: "", status: "given", note: "" };
const inputClass = "rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none focus:border-accent";
const buttonClass = "inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-bold text-white";
const editableEndpoints = new Set(["internships", "mentors", "eurodesk-projects", "reward-tiers"]);

export default function PanelProjectSpecialModulesPage() {
  const params = useParams();
  const rawId = params?.id;
  const projectId = typeof rawId === "string" ? Number(rawId) : Number(Array.isArray(rawId) ? rawId[0] : NaN);
  const invalidProjectId = !Number.isFinite(projectId) || projectId <= 0;

  const [data, setData] = useState<ResponsePayload | null>(null);
  const [loading, setLoading] = useState(!invalidProjectId);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [internshipForm, setInternshipForm] = useState(initialInternship);
  const [mentorForm, setMentorForm] = useState(initialMentor);
  const [eurodeskForm, setEurodeskForm] = useState(initialEurodesk);
  const [rewardForm, setRewardForm] = useState(initialReward);
  const [rewardAwardForm, setRewardAwardForm] = useState(initialRewardAward);
  const [editing, setEditing] = useState<{ endpoint: string; id: number } | null>(null);

  const loadData = useCallback(async () => {
    if (invalidProjectId) return;
    setLoading(true);
    try {
      const response = await api.get<ResponsePayload>(`/panel/projects/${projectId}/special-modules`);
      setData(response.data);
    } catch (error) {
      console.error("Ozel modul verileri yuklenemedi", error);
      setFeedback("Ozel modul verileri yuklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [invalidProjectId, projectId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadData]);

  const access = useMemo(() => data?.access ?? {}, [data?.access]);
  const canManageAny = useMemo(
    () =>
      access["projects.internships.manage"] ||
      access["projects.mentors.manage"] ||
      access["projects.eurodesk.manage"] ||
      access["projects.rewards.manage"],
    [access]
  );

  function resetEditing(reset?: () => void) {
    setEditing(null);
    reset?.();
  }

  async function submit(endpoint: string, payload: unknown, reset: () => void) {
    setFeedback(null);
    try {
      const isEditing = editing?.endpoint === endpoint && editableEndpoints.has(endpoint);
      if (isEditing) {
        await api.put(`/panel/projects/${projectId}/special-modules/${endpoint}/${editing.id}`, payload);
      } else {
        await api.post(`/panel/projects/${projectId}/special-modules/${endpoint}`, payload);
      }
      reset();
      setEditing(null);
      await loadData();
      setFeedback(isEditing ? "Kayit guncellendi." : "Kayit eklendi.");
    } catch (error) {
      console.error("Ozel modul kaydi kaydedilemedi", error);
      setFeedback("Kayit kaydedilemedi. Alanlari ve yetkileri kontrol edin.");
    }
  }

  async function uploadFile(file: File, folder: string, onPath: (path: string) => void) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);

    setUploadingField(folder);
    setFeedback(null);
    try {
      const response = await api.post<{ path: string; url?: string }>("/panel/media/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onPath(response.data.path);
      setFeedback("Dosya yuklendi.");
    } catch (error) {
      console.error("Dosya yuklenemedi", error);
      setFeedback("Dosya yuklenemedi. Yetki, dosya turu veya R2 ayarlarini kontrol edin.");
    } finally {
      setUploadingField(null);
    }
  }

  async function destroy(endpoint: string, id: number) {
    setFeedback(null);
    try {
      await api.delete(`/panel/projects/${projectId}/special-modules/${endpoint}/${id}`);
      await loadData();
      setFeedback("Kayit silindi.");
    } catch (error) {
      console.error("Ozel modul kaydi silinemedi", error);
      setFeedback("Kayit silinemedi.");
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (invalidProjectId || !data) {
    return <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-8 text-red-100">Proje modulleri acilamadi.</div>;
  }

  return (
    <PermissionGate
      permissions={[
        "projects.internships.view",
        "projects.internships.manage",
        "projects.mentors.view",
        "projects.mentors.manage",
        "projects.eurodesk.view",
        "projects.eurodesk.manage",
        "projects.rewards.view",
        "projects.rewards.manage",
      ]}
      require="any"
      fallback={<div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 p-8 text-amber-100">Projeye ozel modul yetkiniz yok.</div>}
    >
      <div className="space-y-8">
        <Link href={`/panel/projects/${projectId}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Proje detayina don
        </Link>

        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-accent">{data.project.type || "Proje"}</div>
          <h1 className="mt-2 text-3xl font-black text-white">{data.project.name} - Ozel Moduller</h1>
          <p className="mt-2 text-sm text-muted-foreground">Staj, mentor, Eurodesk hibe ve Kademe Plus hediye kademelerini tek panelden yonetin.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {(data.applicable_modules ?? ["digital_bohca"]).map((module) => (
              <span key={module} className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                {module.replaceAll("_", " ")}
              </span>
            ))}
          </div>
        </div>

        {feedback ? <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-4 text-sm text-white">{feedback}</div> : null}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {access["projects.internships.view"] || access["projects.internships.manage"] ? (
            <ModuleCard icon={<BriefcaseBusiness className="h-5 w-5" />} title="Diplomasi360 Staj Bilgileri">
              {access["projects.internships.manage"] ? (
                <form
                  className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2"
                  onSubmit={(event: FormEvent) => {
                    event.preventDefault();
                    void submit("internships", {
                      ...internshipForm,
                      participant_id: Number(internshipForm.participant_id),
                      end_date: internshipForm.end_date || null,
                      description: internshipForm.description || null,
                      document_path: internshipForm.document_path || null,
                    }, () => setInternshipForm(initialInternship));
                  }}
                >
                  <select value={internshipForm.participant_id} onChange={(event) => setInternshipForm((current) => ({ ...current, participant_id: event.target.value }))} className={inputClass} required>
                    <option value="">Katilimci sec</option>
                    {data.participants.map((participant) => <option key={participant.id} value={participant.id}>{participant.name}</option>)}
                  </select>
                  <input value={internshipForm.company_name} onChange={(event) => setInternshipForm((current) => ({ ...current, company_name: event.target.value }))} placeholder="Firma" className={inputClass} required />
                  <input value={internshipForm.position} onChange={(event) => setInternshipForm((current) => ({ ...current, position: event.target.value }))} placeholder="Pozisyon" className={inputClass} required />
                  <input type="date" value={internshipForm.start_date} onChange={(event) => setInternshipForm((current) => ({ ...current, start_date: event.target.value }))} className={inputClass} required />
                  <input type="date" value={internshipForm.end_date} onChange={(event) => setInternshipForm((current) => ({ ...current, end_date: event.target.value }))} className={inputClass} />
                  <input value={internshipForm.document_path} onChange={(event) => setInternshipForm((current) => ({ ...current, document_path: event.target.value }))} placeholder="Belge yolu veya URL" className={inputClass} />
                  <label className={`${inputClass} flex cursor-pointer items-center justify-between gap-3`}>
                    <span className="truncate">{internshipForm.document_path ? "Belge yuklendi" : "Staj belgesi yukle"}</span>
                    {uploadingField === "internship-documents" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,image/jpeg,image/png,image/webp"
                      className="sr-only"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void uploadFile(file, "internship-documents", (path) => setInternshipForm((current) => ({ ...current, document_path: path })));
                        event.target.value = "";
                      }}
                    />
                  </label>
                  <FormActions isEditing={editing?.endpoint === "internships"} onCancel={() => resetEditing(() => setInternshipForm(initialInternship))} label="Staj" />
                </form>
              ) : null}
              <RecordList
                items={data.internships}
                render={(item) => `${item.company_name} - ${item.position}`}
                onEdit={access["projects.internships.manage"] ? (item) => {
                  setEditing({ endpoint: "internships", id: item.id });
                  setInternshipForm({
                    participant_id: "",
                    company_name: item.company_name,
                    position: item.position,
                    start_date: toDateInput(item.start_date),
                    end_date: toDateInput(item.end_date),
                    description: item.description ?? "",
                    document_path: item.document_path ?? "",
                  });
                } : undefined}
                onDelete={access["projects.internships.manage"] ? (id) => destroy("internships", id) : undefined}
              />
            </ModuleCard>
          ) : null}

          {access["projects.mentors.view"] || access["projects.mentors.manage"] ? (
            <ModuleCard icon={<Users className="h-5 w-5" />} title="Pergel Mentor Bilgileri">
              {access["projects.mentors.manage"] ? (
                <SimpleForm isEditing={editing?.endpoint === "mentors"} label="Mentor" onCancel={() => resetEditing(() => setMentorForm(initialMentor))} onSubmit={() => submit("mentors", mentorForm, () => setMentorForm(initialMentor))}>
                  <input value={mentorForm.name} onChange={(event) => setMentorForm((current) => ({ ...current, name: event.target.value }))} placeholder="Mentor adi" className={inputClass} required />
                  <input value={mentorForm.expertise} onChange={(event) => setMentorForm((current) => ({ ...current, expertise: event.target.value }))} placeholder="Uzmanlik" className={inputClass} />
                  <input value={mentorForm.photo_path} onChange={(event) => setMentorForm((current) => ({ ...current, photo_path: event.target.value }))} placeholder="Foto yolu veya URL" className={inputClass} />
                  <label className={`${inputClass} flex cursor-pointer items-center justify-between gap-3`}>
                    <span className="truncate">{mentorForm.photo_path ? "Foto yuklendi" : "Mentor fotografi yukle"}</span>
                    {uploadingField === "mentor-photos" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void uploadFile(file, "mentor-photos", (path) => setMentorForm((current) => ({ ...current, photo_path: path })));
                        event.target.value = "";
                      }}
                    />
                  </label>
                  <textarea value={mentorForm.bio} onChange={(event) => setMentorForm((current) => ({ ...current, bio: event.target.value }))} placeholder="Kisa bio" className={`${inputClass} md:col-span-2`} />
                </SimpleForm>
              ) : null}
              <RecordList
                items={data.mentors}
                render={(item) => `${item.name}${item.expertise ? ` - ${item.expertise}` : ""}`}
                onEdit={access["projects.mentors.manage"] ? (item) => {
                  setEditing({ endpoint: "mentors", id: item.id });
                  setMentorForm({
                    name: item.name,
                    expertise: item.expertise ?? "",
                    bio: item.bio ?? "",
                    photo_path: item.photo_path ?? "",
                  });
                } : undefined}
                onDelete={access["projects.mentors.manage"] ? (id) => destroy("mentors", id) : undefined}
              />
            </ModuleCard>
          ) : null}

          {access["projects.eurodesk.view"] || access["projects.eurodesk.manage"] ? (
            <ModuleCard icon={<Handshake className="h-5 w-5" />} title="Eurodesk Hibe ve Ortakliklar">
              {access["projects.eurodesk.manage"] ? (
                <SimpleForm isEditing={editing?.endpoint === "eurodesk-projects"} label="Eurodesk proje" onCancel={() => resetEditing(() => setEurodeskForm(initialEurodesk))} onSubmit={() => submit("eurodesk-projects", {
                  ...eurodeskForm,
                  partner_organizations: eurodeskForm.partner_organizations.split(",").map((item) => item.trim()).filter(Boolean),
                  grant_amount: eurodeskForm.grant_amount ? Number(eurodeskForm.grant_amount) : null,
                  start_date: eurodeskForm.start_date || null,
                  end_date: eurodeskForm.end_date || null,
                }, () => setEurodeskForm(initialEurodesk))}>
                  <input value={eurodeskForm.title} onChange={(event) => setEurodeskForm((current) => ({ ...current, title: event.target.value }))} placeholder="Proje adi" className={inputClass} required />
                  <input value={eurodeskForm.partner_organizations} onChange={(event) => setEurodeskForm((current) => ({ ...current, partner_organizations: event.target.value }))} placeholder="Ortaklar, virgulle" className={inputClass} />
                  <input type="number" value={eurodeskForm.grant_amount} onChange={(event) => setEurodeskForm((current) => ({ ...current, grant_amount: event.target.value }))} placeholder="Hibe tutari" className={inputClass} />
                  <select value={eurodeskForm.grant_status} onChange={(event) => setEurodeskForm((current) => ({ ...current, grant_status: event.target.value }))} className={inputClass}>
                    <option value="applied">Basvuruldu</option>
                    <option value="approved">Onaylandi</option>
                    <option value="rejected">Reddedildi</option>
                    <option value="completed">Tamamlandi</option>
                  </select>
                </SimpleForm>
              ) : null}
              <RecordList
                items={data.eurodesk_projects}
                render={(item) => `${item.title} - ${item.grant_status}${item.grant_amount ? ` - ${item.grant_amount}` : ""}`}
                onEdit={access["projects.eurodesk.manage"] ? (item) => {
                  setEditing({ endpoint: "eurodesk-projects", id: item.id });
                  setEurodeskForm({
                    title: item.title,
                    partner_organizations: (item.partner_organizations ?? []).join(", "),
                    grant_amount: item.grant_amount ? String(item.grant_amount) : "",
                    grant_status: item.grant_status,
                    start_date: toDateInput(item.start_date),
                    end_date: toDateInput(item.end_date),
                  });
                } : undefined}
                onDelete={access["projects.eurodesk.manage"] ? (id) => destroy("eurodesk-projects", id) : undefined}
              />
            </ModuleCard>
          ) : null}

          {access["projects.rewards.view"] || access["projects.rewards.manage"] ? (
            <ModuleCard icon={<Gift className="h-5 w-5" />} title="Kademe Plus Rozet ve Hediye Kademeleri">
              {access["projects.rewards.manage"] ? (
                <SimpleForm isEditing={editing?.endpoint === "reward-tiers"} label="Hediye kademesi" onCancel={() => resetEditing(() => setRewardForm(initialReward))} onSubmit={() => submit("reward-tiers", {
                  ...rewardForm,
                  min_badges: Number(rewardForm.min_badges),
                  min_credits: Number(rewardForm.min_credits),
                  description: rewardForm.description || null,
                }, () => setRewardForm(initialReward))}>
                  <input value={rewardForm.name} onChange={(event) => setRewardForm((current) => ({ ...current, name: event.target.value }))} placeholder="Kademe adi" className={inputClass} required />
                  <input value={rewardForm.reward_description} onChange={(event) => setRewardForm((current) => ({ ...current, reward_description: event.target.value }))} placeholder="Hediye" className={inputClass} required />
                  <input type="number" value={rewardForm.min_badges} onChange={(event) => setRewardForm((current) => ({ ...current, min_badges: event.target.value }))} placeholder="Min rozet" className={inputClass} />
                  <input type="number" value={rewardForm.min_credits} onChange={(event) => setRewardForm((current) => ({ ...current, min_credits: event.target.value }))} placeholder="Min kredi" className={inputClass} />
                </SimpleForm>
              ) : null}
              <RecordList
                items={data.reward_tiers}
                render={(item) => `${item.name} - ${item.reward_description} (${item.min_badges} rozet / ${item.min_credits} kredi)`}
                canEdit={(item) => item.project_id === data.project.id}
                canDelete={(item) => item.project_id === data.project.id}
                onEdit={access["projects.rewards.manage"] ? (item) => {
                  setEditing({ endpoint: "reward-tiers", id: item.id });
                  setRewardForm({
                    name: item.name,
                    description: item.description ?? "",
                    min_badges: String(item.min_badges),
                    min_credits: String(item.min_credits),
                    reward_description: item.reward_description,
                  });
                } : undefined}
                onDelete={access["projects.rewards.manage"] ? (id) => destroy("reward-tiers", id) : undefined}
              />
              <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <h3 className="mb-3 text-sm font-black uppercase tracking-widest text-muted-foreground">Hediye hakki kazananlar</h3>
                {(data.reward_eligible_participants ?? []).length === 0 ? (
                  <div className="text-sm text-muted-foreground">Su an kosullari saglayan katilimci yok.</div>
                ) : (
                  <div className="space-y-2">
                    {(data.reward_eligible_participants ?? []).map((participant) => (
                      <div key={participant.participant_id} className="rounded-lg bg-black/10 p-3 text-sm text-white">
                        <div className="font-bold">{participant.name || participant.email || "Katilimci"}</div>
                        <div className="text-xs text-muted-foreground">
                          {participant.badge_count} rozet / {participant.credit} kredi - {participant.eligible_rewards.map((reward) => reward.reward_description).join(", ")}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {access["projects.rewards.manage"] ? (
                <form
                  className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void submit("reward-awards", {
                      participant_id: Number(rewardAwardForm.participant_id),
                      reward_tier_id: rewardAwardForm.reward_tier_id ? Number(rewardAwardForm.reward_tier_id) : null,
                      reward_name: rewardAwardForm.reward_name,
                      status: rewardAwardForm.status,
                      note: rewardAwardForm.note || null,
                    }, () => setRewardAwardForm(initialRewardAward));
                  }}
                >
                  <select value={rewardAwardForm.participant_id} onChange={(event) => setRewardAwardForm((current) => ({ ...current, participant_id: event.target.value }))} className={inputClass} required>
                    <option value="">Katilimci sec</option>
                    {data.participants.map((participant) => <option key={participant.id} value={participant.id}>{participant.name}</option>)}
                  </select>
                  <select value={rewardAwardForm.reward_tier_id} onChange={(event) => {
                    const tier = data.reward_tiers.find((item) => String(item.id) === event.target.value);
                    setRewardAwardForm((current) => ({ ...current, reward_tier_id: event.target.value, reward_name: tier?.reward_description || current.reward_name }));
                  }} className={inputClass}>
                    <option value="">Kademe secmeden</option>
                    {data.reward_tiers.map((tier) => <option key={tier.id} value={tier.id}>{tier.name}</option>)}
                  </select>
                  <input value={rewardAwardForm.reward_name} onChange={(event) => setRewardAwardForm((current) => ({ ...current, reward_name: event.target.value }))} placeholder="Verilen hediye" className={inputClass} required />
                  <select value={rewardAwardForm.status} onChange={(event) => setRewardAwardForm((current) => ({ ...current, status: event.target.value }))} className={inputClass}>
                    <option value="given">Verildi</option>
                    <option value="planned">Planlandi</option>
                    <option value="cancelled">Iptal</option>
                  </select>
                  <input value={rewardAwardForm.note} onChange={(event) => setRewardAwardForm((current) => ({ ...current, note: event.target.value }))} placeholder="Not" className={`${inputClass} md:col-span-2`} />
                  <button className={`${buttonClass} md:col-span-2`}><Gift className="h-4 w-4" /> Hediye kaydi ekle</button>
                </form>
              ) : null}
              <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <h3 className="mb-3 text-sm font-black uppercase tracking-widest text-muted-foreground">Verilen hediyeler</h3>
                {(data.reward_awards ?? []).length === 0 ? (
                  <div className="text-sm text-muted-foreground">Hediye kaydi yok.</div>
                ) : (
                  <RecordList items={data.reward_awards ?? []} render={(item) => `${item.name || item.email || "Katilimci"} - ${item.reward_name} (${item.status})`} onDelete={access["projects.rewards.manage"] ? (id) => destroy("reward-awards", id) : undefined} />
                )}
              </div>
            </ModuleCard>
          ) : null}
        </div>

        {!canManageAny ? <div className="text-sm text-muted-foreground">Bu ekranda goruntuleme yetkiniz var; yeni kayit eklemek icin ilgili manage action&apos;i gerekir.</div> : null}
      </div>
    </PermissionGate>
  );
}

function ModuleCard({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="mb-5 flex items-center gap-2 text-lg font-black text-white">
        <span className="text-accent">{icon}</span>
        {title}
      </div>
      {children}
    </section>
  );
}

function SimpleForm({ children, isEditing, label, onCancel, onSubmit }: { children: ReactNode; isEditing?: boolean; label?: string; onCancel?: () => void; onSubmit: () => Promise<void> }) {
  return (
    <form
      className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit();
      }}
    >
      {children}
      <div className="flex flex-wrap gap-2 md:col-span-2">
        <button className={buttonClass}>
          {isEditing ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {isEditing ? `${label ?? "Kayit"} guncelle` : "Kaydet"}
        </button>
        {isEditing && onCancel ? (
          <button type="button" onClick={onCancel} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-muted-foreground hover:bg-white/[0.06] hover:text-white">
            <X className="h-4 w-4" />
            Vazgec
          </button>
        ) : null}
      </div>
    </form>
  );
}

function FormActions({ isEditing, label, onCancel }: { isEditing?: boolean; label: string; onCancel: () => void }) {
  return (
    <div className="flex flex-wrap gap-2 md:col-span-2">
      <button className={buttonClass}>
        {isEditing ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        {isEditing ? `${label} guncelle` : `${label} ekle`}
      </button>
      {isEditing ? (
        <button type="button" onClick={onCancel} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-muted-foreground hover:bg-white/[0.06] hover:text-white">
          <X className="h-4 w-4" />
          Vazgec
        </button>
      ) : null}
    </div>
  );
}

function RecordList<T extends { id: number }>({
  items,
  render,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: {
  items: T[];
  render: (item: T) => string;
  canEdit?: (item: T) => boolean;
  canDelete?: (item: T) => boolean;
  onEdit?: (item: T) => void;
  onDelete?: (id: number) => void;
}) {
  if (items.length === 0) return <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-muted-foreground">Kayit yok.</div>;

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="text-sm font-semibold text-white">{render(item)}</div>
          <div className="flex shrink-0 items-center gap-2">
            {onEdit && (canEdit ? canEdit(item) : true) ? (
              <button type="button" onClick={() => onEdit(item)} className="rounded-lg border border-white/10 p-2 text-muted-foreground hover:bg-white/[0.06] hover:text-white" title="Duzenle">
                <Edit2 className="h-4 w-4" />
              </button>
            ) : null}
            {onDelete && (canDelete ? canDelete(item) : true) ? (
              <button type="button" onClick={() => onDelete(item.id)} className="rounded-lg border border-red-500/20 p-2 text-red-300 hover:bg-red-500/10" title="Sil">
                <Trash2 className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function toDateInput(value?: string | null): string {
  if (!value) return "";
  return value.slice(0, 10);
}
