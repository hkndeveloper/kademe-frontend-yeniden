"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Award,
  BadgeCheck,
  BriefcaseBusiness,
  Download,
  FileText,
  GraduationCap,
  Link2,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Trash2,
  User,
} from "lucide-react";
import api from "@/lib/api/axios";
import { useAuth } from "@/store/useAuth";

type CvMode = "student" | "alumni";

interface DigitalCvProfile {
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  university?: string | null;
  department?: string | null;
  class_year?: string | null;
  summary?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  instagram_url?: string | null;
}

interface ApprovedCv {
  title?: string;
  generated_at?: string;
  total_credit?: number;
  completed_project_count?: number;
  badge_count?: number;
  certificate_count?: number;
}

interface CvProject {
  id: number;
  name: string;
  type?: string | null;
  description?: string | null;
  period?: string | null;
  graduation_status?: string | null;
  status?: string | null;
  credit?: number | null;
  graduated_at?: string | null;
}

interface CvBadge {
  id: number;
  name: string;
  description?: string | null;
  title_label?: string | null;
  tier?: string | null;
  project?: string | null;
  awarded_at?: string | null;
}

interface CvCertificate {
  id: number;
  type?: string | null;
  project?: string | null;
  period?: string | null;
  verification_code?: string | null;
  issued_at?: string | null;
}

interface CvCreditLog {
  amount: number;
  type?: string | null;
  reason?: string | null;
  project?: string | null;
  program?: string | null;
  created_at?: string | null;
}

interface DigitalCvPayload {
  profile?: DigitalCvProfile;
  approved?: ApprovedCv;
  projects?: CvProject[];
  badges?: CvBadge[];
  certificates?: CvCertificate[];
  credit_history?: CvCreditLog[];
}

interface ManualItem {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  description: string;
}

interface CvForm {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  summary: string;
  university: string;
  department: string;
  classYear: string;
  linkedin: string;
  github: string;
  instagram: string;
  skills: string;
  languages: string;
  experience: ManualItem[];
  education: ManualItem[];
  projects: ManualItem[];
  certificates: ManualItem[];
}

const emptyItem = (): ManualItem => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  title: "",
  subtitle: "",
  date: "",
  description: "",
});

const emptyForm: CvForm = {
  fullName: "",
  email: "",
  phone: "",
  location: "",
  summary: "",
  university: "",
  department: "",
  classYear: "",
  linkedin: "",
  github: "",
  instagram: "",
  skills: "",
  languages: "",
  experience: [emptyItem()],
  education: [],
  projects: [],
  certificates: [],
};

const localKey = (mode: CvMode, userId?: number | string | null) => `kademe-digital-cv-${mode}-${userId ?? "guest"}`;

const splitList = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const formatDate = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("tr-TR", { year: "numeric", month: "long" });
};

const sanitizeFileName = (value: string) =>
  value
    .toLocaleLowerCase("tr-TR")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "") || "kademe-dijital-cv";

interface CvExportContext {
  form: CvForm;
  approved: ApprovedCv;
  verifiedProjects: CvProject[];
  badges: CvBadge[];
  certificates: CvCertificate[];
  creditHistory: CvCreditLog[];
  skills: string[];
  languages: string[];
}

export function DigitalCvBuilder({ mode }: { mode: CvMode }) {
  const { user, fetchProfile } = useAuth();
  const [form, setForm] = useState<CvForm>(emptyForm);
  const [payload, setPayload] = useState<DigitalCvPayload>({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<"profile" | "experience" | "education" | "manual">("profile");
  const userId = user?.id;

  const loadData = useCallback(async () => {
    setLoading(true);
    setMessage(null);

    try {
      await fetchProfile();
      const response = await api.get<DigitalCvPayload>("/dashboard/digital-cv");
      const nextPayload = response.data ?? {};
      const profile = nextPayload.profile ?? {};
      const stored = window.localStorage.getItem(localKey(mode, userId));
      const storedForm = stored ? (JSON.parse(stored) as Partial<CvForm>) : {};

      setPayload(nextPayload);
      setForm({
        ...emptyForm,
        ...storedForm,
        fullName: storedForm.fullName ?? profile.full_name ?? "",
        email: storedForm.email ?? profile.email ?? "",
        phone: storedForm.phone ?? profile.phone ?? "",
        location: storedForm.location ?? profile.location ?? "",
        summary: storedForm.summary ?? profile.summary ?? "",
        university: storedForm.university ?? profile.university ?? "",
        department: storedForm.department ?? profile.department ?? "",
        classYear: storedForm.classYear ?? profile.class_year ?? "",
        linkedin: storedForm.linkedin ?? profile.linkedin_url ?? "",
        github: storedForm.github ?? profile.github_url ?? "",
        instagram: storedForm.instagram ?? profile.instagram_url ?? "",
        experience: storedForm.experience?.length ? storedForm.experience : [emptyItem()],
        education: storedForm.education ?? [],
        projects: storedForm.projects ?? [],
        certificates: storedForm.certificates ?? [],
      });
    } catch (error) {
      console.error("Dijital CV verileri yuklenemedi", error);
      setMessage("Dijital CV verileri yuklenemedi. Formu manuel doldurabilirsiniz.");
    } finally {
      setLoading(false);
    }
  }, [fetchProfile, mode, userId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadData]);

  const skills = useMemo(() => splitList(form.skills), [form.skills]);
  const languages = useMemo(() => splitList(form.languages), [form.languages]);
  const approved = payload.approved ?? {};
  const verifiedProjects = payload.projects ?? [];
  const badges = payload.badges ?? [];
  const certificates = payload.certificates ?? [];
  const creditHistory = payload.credit_history ?? [];

  const updateItem = (section: "experience" | "education" | "projects" | "certificates", id: string, field: keyof ManualItem, value: string) => {
    setForm((prev) => ({
      ...prev,
      [section]: prev[section].map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    }));
  };

  const addItem = (section: "experience" | "education" | "projects" | "certificates") => {
    setForm((prev) => ({ ...prev, [section]: [...prev[section], emptyItem()] }));
  };

  const removeItem = (section: "experience" | "education" | "projects" | "certificates", id: string) => {
    setForm((prev) => ({ ...prev, [section]: prev[section].filter((item) => item.id !== id) }));
  };

  const saveDraft = () => {
    window.localStorage.setItem(localKey(mode, userId), JSON.stringify(form));
    setMessage("CV taslagi bu cihazda kaydedildi.");
  };

  const syncProfile = async () => {
    try {
      await api.put("/user/profile", {
        phone: form.phone,
        hometown: form.location,
        university: form.university,
        department: form.department,
        class_year: form.classYear,
        motivation_message: form.summary,
        linkedin_url: form.linkedin || null,
        github_url: form.github || null,
        instagram_url: form.instagram || null,
      });
      setMessage("Profil alanlari guncellendi, CV verileri senkronize edildi.");
    } catch (error) {
      console.error("CV profil senkronizasyonu basarisiz", error);
      setMessage("Profil senkronizasyonu yapilamadi.");
    }
  };

  const exportPdf = () => {
    saveDraft();
    printCvDocument(buildCvHtmlDocument({
      form,
      approved,
      verifiedProjects,
      badges,
      certificates,
      creditHistory,
      skills,
      languages,
    }));
  };

  const exportWord = () => {
    saveDraft();
    const html = buildCvHtmlDocument({
      form,
      approved,
      verifiedProjects,
      badges,
      certificates,
      creditHistory,
      skills,
      languages,
    });
    const blob = new Blob(["\ufeff", html], { type: "application/msword;charset=utf-8" });
    downloadBlob(blob, `${sanitizeFileName(form.fullName)}-kademe-cv.doc`);
  };

  const exportText = () => {
    const lines = buildAtsText({
      form,
      approved,
      verifiedProjects,
      badges,
      certificates,
      creditHistory,
      skills,
      languages,
    });
    const blob = new Blob([lines], { type: "text/plain;charset=utf-8" });
    downloadBlob(blob, `${sanitizeFileName(form.fullName)}-ats-cv.txt`);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 cv-page">
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 14mm;
          }

          body * {
            visibility: hidden !important;
          }

          #cv-print-root,
          #cv-print-root * {
            visibility: visible !important;
          }

          #cv-print-root {
            position: absolute !important;
            inset: 0 auto auto 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            box-shadow: none !important;
            border: 0 !important;
          }

          .cv-no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="cv-no-print flex flex-col justify-between gap-5 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600/15 text-indigo-600">
            <FileText className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-950">Ozgecmis Hazirla</h1>
            <p className="mt-1 text-sm font-bold uppercase tracking-widest text-slate-500">
              KADEME onayli dijital CV ve ATS uyumlu export
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={saveDraft} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 hover:bg-slate-50">
            <Save className="h-4 w-4" />
            Taslagi Kaydet
          </button>
          <button onClick={() => void syncProfile()} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 hover:bg-slate-50">
            <BadgeCheck className="h-4 w-4" />
            Profille Esitle
          </button>
          <button onClick={exportText} className="inline-flex items-center gap-2 rounded-lg border border-slate-900 bg-white px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-slate-50">
            <FileText className="h-4 w-4" />
            ATS Metin
          </button>
          <button onClick={exportWord} className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-white px-4 py-2.5 text-sm font-bold text-indigo-700 hover:bg-indigo-50">
            <Download className="h-4 w-4" />
            Word CV
          </button>
          <button onClick={exportPdf} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700">
            <Download className="h-4 w-4" />
            ATS PDF Indir
          </button>
        </div>
      </div>

      {message && <div className="cv-no-print rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-700">{message}</div>}

      <div className="cv-no-print grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric label="Onayli proje" value={approved.completed_project_count ?? verifiedProjects.length} />
        <Metric label="Toplam kredi" value={approved.total_credit ?? 0} />
        <Metric label="Rozet" value={approved.badge_count ?? badges.length} />
        <Metric label="Sertifika" value={approved.certificate_count ?? certificates.length} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,520px)_minmax(0,1fr)]">
        <div className="cv-no-print space-y-4">
          <div className="flex gap-2 overflow-x-auto rounded-lg border border-slate-200 bg-white p-1">
            {[
              ["profile", "Profil"],
              ["experience", "Deneyim"],
              ["education", "Egitim"],
              ["manual", "Ekler"],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveSection(key as typeof activeSection)}
                className={`min-w-24 rounded-md px-3 py-2 text-sm font-bold ${activeSection === key ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100"}`}
              >
                {label}
              </button>
            ))}
          </div>

          {activeSection === "profile" && (
            <FormPanel title="Kisisel Bilgiler" icon={<User className="h-5 w-5" />}>
              <Input label="Ad Soyad" value={form.fullName} onChange={(value) => setForm((prev) => ({ ...prev, fullName: value }))} />
              <Input label="E-posta" value={form.email} onChange={(value) => setForm((prev) => ({ ...prev, email: value }))} />
              <Input label="Telefon" value={form.phone} onChange={(value) => setForm((prev) => ({ ...prev, phone: value }))} />
              <Input label="Sehir" value={form.location} onChange={(value) => setForm((prev) => ({ ...prev, location: value }))} />
              <Textarea label="Profesyonel Ozet" value={form.summary} onChange={(value) => setForm((prev) => ({ ...prev, summary: value }))} />
              <Input label="Yetkinlikler (virgulle ayirin)" value={form.skills} onChange={(value) => setForm((prev) => ({ ...prev, skills: value }))} />
              <Input label="Diller (virgulle ayirin)" value={form.languages} onChange={(value) => setForm((prev) => ({ ...prev, languages: value }))} />
              <Input label="LinkedIn" value={form.linkedin} onChange={(value) => setForm((prev) => ({ ...prev, linkedin: value }))} />
              <Input label="GitHub / Portfolyo" value={form.github} onChange={(value) => setForm((prev) => ({ ...prev, github: value }))} />
            </FormPanel>
          )}

          {activeSection === "experience" && (
            <FormPanel title="Deneyim" icon={<BriefcaseBusiness className="h-5 w-5" />} onAdd={() => addItem("experience")}>
              {form.experience.map((item) => (
                <ItemEditor key={item.id} item={item} onChange={(field, value) => updateItem("experience", item.id, field, value)} onRemove={() => removeItem("experience", item.id)} />
              ))}
            </FormPanel>
          )}

          {activeSection === "education" && (
            <FormPanel title="Egitim" icon={<GraduationCap className="h-5 w-5" />} onAdd={() => addItem("education")}>
              <Input label="Universite" value={form.university} onChange={(value) => setForm((prev) => ({ ...prev, university: value }))} />
              <Input label="Bolum" value={form.department} onChange={(value) => setForm((prev) => ({ ...prev, department: value }))} />
              <Input label="Sinif / Mezuniyet" value={form.classYear} onChange={(value) => setForm((prev) => ({ ...prev, classYear: value }))} />
              {form.education.map((item) => (
                <ItemEditor key={item.id} item={item} onChange={(field, value) => updateItem("education", item.id, field, value)} onRemove={() => removeItem("education", item.id)} />
              ))}
            </FormPanel>
          )}

          {activeSection === "manual" && (
            <div className="space-y-4">
              <FormPanel title="Manuel Projeler" icon={<Sparkles className="h-5 w-5" />} onAdd={() => addItem("projects")}>
                {form.projects.map((item) => (
                  <ItemEditor key={item.id} item={item} onChange={(field, value) => updateItem("projects", item.id, field, value)} onRemove={() => removeItem("projects", item.id)} />
                ))}
              </FormPanel>
              <FormPanel title="Manuel Sertifikalar" icon={<Award className="h-5 w-5" />} onAdd={() => addItem("certificates")}>
                {form.certificates.map((item) => (
                  <ItemEditor key={item.id} item={item} onChange={(field, value) => updateItem("certificates", item.id, field, value)} onRemove={() => removeItem("certificates", item.id)} />
                ))}
              </FormPanel>
            </div>
          )}
        </div>

        <CvPreview
          form={form}
          approved={approved}
          verifiedProjects={verifiedProjects}
          badges={badges}
          certificates={certificates}
          creditHistory={creditHistory}
          skills={skills}
          languages={languages}
        />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <div className="text-2xl font-black text-slate-950">{value}</div>
      <div className="text-xs font-bold uppercase tracking-widest text-slate-500">{label}</div>
    </div>
  );
}

function FormPanel({ title, icon, children, onAdd }: { title: string; icon: ReactNode; children: ReactNode; onAdd?: () => void }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-base font-black text-slate-950">
          <span className="text-indigo-600">{icon}</span>
          {title}
        </div>
        {onAdd && (
          <button onClick={onAdd} className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950 text-white hover:bg-slate-800" title="Yeni alan ekle">
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-indigo-500" />
    </label>
  );
}

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} className="min-h-28 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-indigo-500" />
    </label>
  );
}

function ItemEditor({ item, onChange, onRemove }: { item: ManualItem; onChange: (field: keyof ManualItem, value: string) => void; onRemove: () => void }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="mb-3 flex justify-end">
        <button onClick={onRemove} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-red-50 hover:text-red-600" title="Sil">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Baslik" value={item.title} onChange={(value) => onChange("title", value)} />
        <Input label="Kurum / Rol" value={item.subtitle} onChange={(value) => onChange("subtitle", value)} />
      </div>
      <div className="mt-3">
        <Input label="Tarih" value={item.date} onChange={(value) => onChange("date", value)} />
      </div>
      <div className="mt-3">
        <Textarea label="Aciklama" value={item.description} onChange={(value) => onChange("description", value)} />
      </div>
    </div>
  );
}

function CvPreview({
  form,
  approved,
  verifiedProjects,
  badges,
  certificates,
  creditHistory,
  skills,
  languages,
}: {
  form: CvForm;
  approved: ApprovedCv;
  verifiedProjects: CvProject[];
  badges: CvBadge[];
  certificates: CvCertificate[];
  creditHistory: CvCreditLog[];
  skills: string[];
  languages: string[];
}) {
  const manualExperience = form.experience.filter((item) => item.title || item.subtitle || item.description);
  const manualEducation = form.education.filter((item) => item.title || item.subtitle || item.description);
  const manualProjects = form.projects.filter((item) => item.title || item.subtitle || item.description);
  const manualCertificates = form.certificates.filter((item) => item.title || item.subtitle || item.description);

  return (
    <article id="cv-print-root" className="rounded-lg border border-slate-200 bg-white p-8 text-slate-950 shadow-sm print:rounded-none print:p-0">
      <header className="border-b border-slate-300 pb-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black tracking-normal text-slate-950">{form.fullName || "Ad Soyad"}</h2>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-700">
              {[form.email, form.phone, form.location].filter(Boolean).map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </div>
          <div className="rounded-md border border-slate-300 px-3 py-2 text-right">
            <div className="text-xs font-black uppercase tracking-widest text-slate-500">KADEME Onayli</div>
            <div className="text-sm font-bold text-slate-950">Dijital CV</div>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-700">
          {[form.linkedin, form.github, form.instagram].filter(Boolean).map((item) => (
            <span key={item} className="inline-flex items-center gap-1">
              <Link2 className="h-3 w-3 cv-no-print" />
              {item}
            </span>
          ))}
        </div>
      </header>

      <div className="mt-5 space-y-5">
        <CvSection title="Profesyonel Ozet">
          <p>{form.summary || "KADEME programlari, proje deneyimleri ve manuel eklemelerle olusturulan ATS uyumlu dijital CV."}</p>
        </CvSection>

        <CvSection title="KADEME Onayli Kazanimlar">
          <div className="grid gap-2 text-sm sm:grid-cols-4 print:grid-cols-4">
            <strong>{approved.completed_project_count ?? verifiedProjects.length} proje</strong>
            <strong>{approved.total_credit ?? 0} kredi</strong>
            <strong>{approved.badge_count ?? badges.length} rozet</strong>
            <strong>{approved.certificate_count ?? certificates.length} sertifika</strong>
          </div>
        </CvSection>

        <CvSection title="Egitim">
          <Entry title={form.university || "Universite"} subtitle={form.department} date={form.classYear} />
          {manualEducation.map((item) => (
            <Entry key={item.id} title={item.title} subtitle={item.subtitle} date={item.date} description={item.description} />
          ))}
        </CvSection>

        {manualExperience.length > 0 && (
          <CvSection title="Deneyim">
            {manualExperience.map((item) => (
              <Entry key={item.id} title={item.title} subtitle={item.subtitle} date={item.date} description={item.description} />
            ))}
          </CvSection>
        )}

        <CvSection title="Tamamlanan / Katilinan KADEME Projeleri">
          {verifiedProjects.length === 0 ? (
            <p>Kayitli KADEME proje katilimi bulunamadi.</p>
          ) : (
            verifiedProjects.map((project) => (
              <Entry
                key={project.id}
                title={project.name}
                subtitle={[project.type, project.period, project.graduation_status || project.status].filter(Boolean).join(" | ")}
                date={formatDate(project.graduated_at)}
                description={[project.description, project.credit != null ? `Kredi: ${project.credit}` : null].filter(Boolean).join(" ")}
              />
            ))
          )}
          {manualProjects.map((item) => (
            <Entry key={item.id} title={item.title} subtitle={item.subtitle} date={item.date} description={item.description} />
          ))}
        </CvSection>

        {(skills.length > 0 || languages.length > 0) && (
          <CvSection title="Yetkinlikler ve Diller">
            {skills.length > 0 && <p><strong>Yetkinlikler:</strong> {skills.join(", ")}</p>}
            {languages.length > 0 && <p><strong>Diller:</strong> {languages.join(", ")}</p>}
          </CvSection>
        )}

        {(badges.length > 0 || certificates.length > 0 || manualCertificates.length > 0) && (
          <CvSection title="Rozetler ve Sertifikalar">
            {badges.map((badge) => (
              <Entry key={`badge-${badge.id}`} title={badge.title_label || badge.name} subtitle={[badge.project, badge.tier].filter(Boolean).join(" | ")} date={formatDate(badge.awarded_at)} description={badge.description ?? ""} />
            ))}
            {certificates.map((certificate) => (
              <Entry key={`certificate-${certificate.id}`} title={certificate.type || "Sertifika"} subtitle={[certificate.project, certificate.period].filter(Boolean).join(" | ")} date={formatDate(certificate.issued_at)} description={certificate.verification_code ? `Dogrulama kodu: ${certificate.verification_code}` : ""} />
            ))}
            {manualCertificates.map((item) => (
              <Entry key={item.id} title={item.title} subtitle={item.subtitle} date={item.date} description={item.description} />
            ))}
          </CvSection>
        )}

        {creditHistory.length > 0 && (
          <CvSection title="Kredi Gecmisi Ozeti">
            {creditHistory.slice(0, 8).map((log, index) => (
              <Entry key={`${log.created_at}-${index}`} title={`${log.amount > 0 ? "+" : ""}${log.amount} kredi`} subtitle={[log.project, log.program, log.type].filter(Boolean).join(" | ")} date={formatDate(log.created_at)} description={log.reason ?? ""} />
            ))}
          </CvSection>
        )}
      </div>
    </article>
  );
}

function CvSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="break-inside-avoid text-sm leading-relaxed text-slate-800">
      <h3 className="mb-2 border-b border-slate-200 pb-1 text-xs font-black uppercase tracking-widest text-slate-950">{title}</h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Entry({ title, subtitle, date, description }: { title?: string | null; subtitle?: string | null; date?: string | null; description?: string | null }) {
  return (
    <div className="break-inside-avoid">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-bold text-slate-950">{title || "-"}</div>
          {subtitle && <div className="text-slate-700">{subtitle}</div>}
        </div>
        {date && <div className="shrink-0 text-right text-xs font-semibold text-slate-500">{date}</div>}
      </div>
      {description && <p className="mt-1 whitespace-pre-line text-slate-700">{description}</p>}
    </div>
  );
}

function escapeHtml(value?: string | number | null) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function htmlParagraph(value?: string | null) {
  return escapeHtml(value).replace(/\n/g, "<br />");
}

function exportEntry({ title, subtitle, date, description }: { title?: string | null; subtitle?: string | null; date?: string | null; description?: string | null }) {
  if (!title && !subtitle && !date && !description) return "";

  return `
    <div class="entry">
      <div class="entry-head">
        <div>
          <strong>${escapeHtml(title || "-")}</strong>
          ${subtitle ? `<div class="muted">${escapeHtml(subtitle)}</div>` : ""}
        </div>
        ${date ? `<span class="date">${escapeHtml(date)}</span>` : ""}
      </div>
      ${description ? `<p>${htmlParagraph(description)}</p>` : ""}
    </div>
  `;
}

function exportSection(title: string, content: string) {
  if (!content.trim()) return "";

  return `
    <section>
      <h2>${escapeHtml(title)}</h2>
      ${content}
    </section>
  `;
}

function buildCvHtmlDocument({
  form,
  approved,
  verifiedProjects,
  badges,
  certificates,
  creditHistory,
  skills,
  languages,
}: CvExportContext) {
  const manualExperience = form.experience.filter((item) => item.title || item.subtitle || item.description);
  const manualEducation = form.education.filter((item) => item.title || item.subtitle || item.description);
  const manualProjects = form.projects.filter((item) => item.title || item.subtitle || item.description);
  const manualCertificates = form.certificates.filter((item) => item.title || item.subtitle || item.description);
  const fullName = form.fullName || "Ad Soyad";
  const contact = [form.email, form.phone, form.location].filter(Boolean).map(escapeHtml).join(" | ");
  const links = [form.linkedin, form.github, form.instagram].filter(Boolean).map(escapeHtml).join(" | ");

  const sections = [
    exportSection("Profesyonel Ozet", `<p>${htmlParagraph(form.summary || "KADEME programlari, proje deneyimleri ve manuel eklemelerle olusturulan ATS uyumlu dijital CV.")}</p>`),
    exportSection(
      "KADEME Onayli Kazanimlar",
      `
        <div class="metrics">
          <span><strong>${escapeHtml(approved.completed_project_count ?? verifiedProjects.length)}</strong> proje</span>
          <span><strong>${escapeHtml(approved.total_credit ?? 0)}</strong> kredi</span>
          <span><strong>${escapeHtml(approved.badge_count ?? badges.length)}</strong> rozet</span>
          <span><strong>${escapeHtml(approved.certificate_count ?? certificates.length)}</strong> sertifika</span>
        </div>
      `,
    ),
    exportSection(
      "Egitim",
      [
        exportEntry({ title: form.university || "Universite", subtitle: form.department, date: form.classYear }),
        ...manualEducation.map((item) => exportEntry(item)),
      ].join(""),
    ),
    exportSection("Deneyim", manualExperience.map((item) => exportEntry(item)).join("")),
    exportSection(
      "Tamamlanan / Katilinan KADEME Projeleri",
      [
        verifiedProjects.length === 0 ? "<p>Kayitli KADEME proje katilimi bulunamadi.</p>" : "",
        ...verifiedProjects.map((project) =>
          exportEntry({
            title: project.name,
            subtitle: [project.type, project.period, project.graduation_status || project.status].filter(Boolean).join(" | "),
            date: formatDate(project.graduated_at),
            description: [project.description, project.credit != null ? `Kredi: ${project.credit}` : null].filter(Boolean).join(" "),
          }),
        ),
        ...manualProjects.map((item) => exportEntry(item)),
      ].join(""),
    ),
    exportSection(
      "Yetkinlikler ve Diller",
      [
        skills.length > 0 ? `<p><strong>Yetkinlikler:</strong> ${skills.map(escapeHtml).join(", ")}</p>` : "",
        languages.length > 0 ? `<p><strong>Diller:</strong> ${languages.map(escapeHtml).join(", ")}</p>` : "",
      ].join(""),
    ),
    exportSection(
      "Rozetler ve Sertifikalar",
      [
        ...badges.map((badge) =>
          exportEntry({
            title: badge.title_label || badge.name,
            subtitle: [badge.project, badge.tier].filter(Boolean).join(" | "),
            date: formatDate(badge.awarded_at),
            description: badge.description ?? "",
          }),
        ),
        ...certificates.map((certificate) =>
          exportEntry({
            title: certificate.type || "Sertifika",
            subtitle: [certificate.project, certificate.period].filter(Boolean).join(" | "),
            date: formatDate(certificate.issued_at),
            description: certificate.verification_code ? `Dogrulama kodu: ${certificate.verification_code}` : "",
          }),
        ),
        ...manualCertificates.map((item) => exportEntry(item)),
      ].join(""),
    ),
    exportSection(
      "Kredi Gecmisi Ozeti",
      creditHistory
        .slice(0, 8)
        .map((log) =>
          exportEntry({
            title: `${log.amount > 0 ? "+" : ""}${log.amount} kredi`,
            subtitle: [log.project, log.program, log.type].filter(Boolean).join(" | "),
            date: formatDate(log.created_at),
            description: log.reason ?? "",
          }),
        )
        .join(""),
    ),
  ].join("");

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(fullName)} - KADEME Dijital CV</title>
    <style>
      @page { size: A4; margin: 14mm; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        background: #ffffff;
        color: #0f172a;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 11pt;
        line-height: 1.45;
      }
      article { width: 100%; max-width: 190mm; margin: 0 auto; }
      header {
        display: flex;
        justify-content: space-between;
        gap: 18px;
        border-bottom: 1px solid #cbd5e1;
        padding-bottom: 14px;
        margin-bottom: 18px;
      }
      h1 { margin: 0 0 7px; font-size: 24pt; line-height: 1.1; }
      h2 {
        margin: 0 0 8px;
        border-bottom: 1px solid #e2e8f0;
        padding-bottom: 4px;
        color: #111827;
        font-size: 10pt;
        letter-spacing: 1.6px;
        text-transform: uppercase;
      }
      section { break-inside: avoid; margin: 0 0 16px; }
      p { margin: 4px 0 0; color: #334155; }
      .muted, .date, .contact, .links { color: #475569; }
      .badge {
        border: 1px solid #cbd5e1;
        padding: 7px 10px;
        text-align: right;
        white-space: nowrap;
      }
      .badge small {
        display: block;
        color: #64748b;
        font-size: 8pt;
        font-weight: 700;
        letter-spacing: 1.4px;
        text-transform: uppercase;
      }
      .metrics {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 8px;
      }
      .metrics span {
        border: 1px solid #e2e8f0;
        padding: 8px;
      }
      .metrics strong { display: block; font-size: 15pt; }
      .entry { break-inside: avoid; margin-bottom: 10px; }
      .entry-head {
        display: flex;
        justify-content: space-between;
        gap: 16px;
      }
      .date {
        flex: 0 0 auto;
        font-size: 9pt;
        font-weight: 700;
        text-align: right;
      }
      @media print {
        html, body { background: #ffffff !important; }
      }
    </style>
  </head>
  <body>
    <article>
      <header>
        <div>
          <h1>${escapeHtml(fullName)}</h1>
          ${contact ? `<div class="contact">${contact}</div>` : ""}
          ${links ? `<div class="links">${links}</div>` : ""}
        </div>
        <div class="badge">
          <small>KADEME Onayli</small>
          <strong>Dijital CV</strong>
        </div>
      </header>
      ${sections}
    </article>
  </body>
</html>`;
}

function printCvDocument(html: string) {
  const iframe = document.createElement("iframe");
  let printed = false;

  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.left = "-10000px";
  iframe.style.top = "0";
  iframe.style.width = "210mm";
  iframe.style.height = "297mm";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const frameWindow = iframe.contentWindow;
  const frameDocument = iframe.contentDocument ?? frameWindow?.document;

  if (!frameWindow || !frameDocument) {
    iframe.remove();
    window.print();
    return;
  }

  const cleanup = () => window.setTimeout(() => iframe.remove(), 500);
  const runPrint = () => {
    if (printed) return;
    printed = true;
    frameWindow.focus();
    frameWindow.print();
    cleanup();
  };

  frameWindow.onafterprint = cleanup;
  iframe.onload = runPrint;
  frameDocument.open();
  frameDocument.write(html);
  frameDocument.close();
  window.setTimeout(runPrint, 250);
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function buildAtsText({
  form,
  approved,
  verifiedProjects,
  badges,
  certificates,
  creditHistory,
  skills,
  languages,
}: {
  form: CvForm;
  approved: ApprovedCv;
  verifiedProjects: CvProject[];
  badges: CvBadge[];
  certificates: CvCertificate[];
  creditHistory: CvCreditLog[];
  skills: string[];
  languages: string[];
}) {
  const sections: string[] = [];
  sections.push([
    form.fullName || "Ad Soyad",
    [form.email, form.phone, form.location].filter(Boolean).join(" | "),
    [form.linkedin, form.github, form.instagram].filter(Boolean).join(" | "),
  ].filter(Boolean).join("\n"));
  sections.push(`PROFESYONEL OZET\n${form.summary || ""}`);
  sections.push(`KADEME ONAYLI DIJITAL CV\nOnayli proje: ${approved.completed_project_count ?? verifiedProjects.length}\nToplam kredi: ${approved.total_credit ?? 0}\nRozet: ${approved.badge_count ?? badges.length}\nSertifika: ${approved.certificate_count ?? certificates.length}`);
  sections.push(`EGITIM\n${[form.university, form.department, form.classYear].filter(Boolean).join(" | ")}`);
  sections.push(`DENEYIM\n${form.experience.filter((item) => item.title || item.description).map((item) => `${item.title}\n${[item.subtitle, item.date].filter(Boolean).join(" | ")}\n${item.description}`).join("\n\n")}`);
  sections.push(`KADEME PROJELERI\n${verifiedProjects.map((project) => `${project.name}\n${[project.type, project.period, project.graduation_status || project.status].filter(Boolean).join(" | ")}\n${project.description || ""}\nKredi: ${project.credit ?? 0}`).join("\n\n")}`);
  sections.push(`YETKINLIKLER\n${skills.join(", ")}`);
  sections.push(`DILLER\n${languages.join(", ")}`);
  sections.push(`ROZETLER\n${badges.map((badge) => [badge.title_label || badge.name, badge.project, badge.tier, formatDate(badge.awarded_at)].filter(Boolean).join(" | ")).join("\n")}`);
  sections.push(`SERTIFIKALAR\n${certificates.map((certificate) => [certificate.type || "Sertifika", certificate.project, certificate.period, certificate.verification_code].filter(Boolean).join(" | ")).join("\n")}`);
  sections.push(`KREDI GECMISI\n${creditHistory.map((log) => [`${log.amount > 0 ? "+" : ""}${log.amount} kredi`, log.project, log.program, log.reason, formatDate(log.created_at)].filter(Boolean).join(" | ")).join("\n")}`);
  return sections.join("\n\n");
}
