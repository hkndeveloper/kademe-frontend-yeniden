"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  BookOpen,
  BrainCircuit,
  CalendarDays,
  Handshake,
  LayoutDashboard,
  Loader2,
  Lock,
  Megaphone,
  Save,
  UserCircle,
} from "lucide-react";
import api from "@/lib/api/axios";
import { useAuth } from "@/store/useAuth";
import {
  ProfileCard,
  ProfileFieldLabel,
  ProfileHero,
  ProfileLockedField,
  ProfileMessageBanner,
  ProfileQuickLinks,
  ProfileVerificationPills,
  profileInputClass,
  type ProfileQuickLink,
} from "@/components/profile/profile-page-ui";

interface ProfileForm {
  phone: string;
  address: string;
  birth_date: string;
  hometown: string;
  university: string;
  department: string;
  linkedin_url: string;
  github_url: string;
  instagram_url: string;
  motivation_message: string;
}

interface PasswordForm {
  current_password: string;
  password: string;
  password_confirmation: string;
}

interface VerificationState {
  tc: boolean;
  yok: boolean;
}

const emptyProfile: ProfileForm = {
  phone: "",
  address: "",
  birth_date: "",
  hometown: "",
  university: "",
  department: "",
  linkedin_url: "",
  github_url: "",
  instagram_url: "",
  motivation_message: "",
};

const emptyPassword: PasswordForm = {
  current_password: "",
  password: "",
  password_confirmation: "",
};

const quickLinks: ProfileQuickLink[] = [
  { href: "/alumni/dashboard", label: "Mezun paneli", description: "Ozet ve duyurular", icon: LayoutDashboard },
  { href: "/alumni/programs", label: "Program gecmisim", description: "Sartname 15.3 gecmis programlar", icon: CalendarDays },
  { href: "/alumni/opportunities", label: "Kariyer firsatlari", description: "Mezuna ozel ilanlar", icon: Handshake },
  { href: "/alumni/certificates", label: "Sertifikalarim", description: "Dijital belgeler", icon: Award },
  { href: "/alumni/bohca", label: "Dijital bohca", description: "Icerikler", icon: BookOpen },
  { href: "/alumni/inbox", label: "Mesaj kutusu", description: "Sistem iletisim", icon: Megaphone },
];

export default function AlumniProfilePage() {
  const { user, fetchProfile } = useAuth();
  const [form, setForm] = useState<ProfileForm>(emptyProfile);
  const [passwordForm, setPasswordForm] = useState<PasswordForm>(emptyPassword);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error" | "neutral">("neutral");
  const [passwordTone, setPasswordTone] = useState<"success" | "error" | "neutral">("neutral");
  const [verification, setVerification] = useState<VerificationState>({ tc: false, yok: false });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await api.get("/user/profile");
        const nextUser = response.data.user;
        setVerification({
          tc: Boolean(nextUser.tc_verified),
          yok: Boolean(nextUser.yok_verified),
        });
        setForm({
          phone: nextUser.phone ?? "",
          address: nextUser.address ?? "",
          birth_date: nextUser.birth_date ?? "",
          hometown: nextUser.hometown ?? "",
          university: nextUser.university ?? "",
          department: nextUser.department ?? "",
          linkedin_url: nextUser.profile?.linkedin_url ?? "",
          github_url: nextUser.profile?.github_url ?? "",
          instagram_url: nextUser.profile?.instagram_url ?? "",
          motivation_message: nextUser.profile?.motivation_message ?? "",
        });
      } catch (error) {
        console.error("Alumni profile yuklenemedi", error);
        setMessage("Profil bilgileri yuklenemedi.");
        setMessageTone("error");
      } finally {
        setLoading(false);
      }
    };

    void loadProfile();
  }, []);

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingProfile(true);
    setMessage("");
    setMessageTone("neutral");

    try {
      await api.put("/user/profile", form);
      await fetchProfile();
      setMessage("Profil bilgileri guncellendi.");
      setMessageTone("success");
    } catch (error) {
      console.error("Alumni profile kaydedilemedi", error);
      setMessage("Profil bilgileri kaydedilemedi.");
      setMessageTone("error");
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingPassword(true);
    setPasswordMessage("");
    setPasswordTone("neutral");

    try {
      await api.post("/user/change-password", passwordForm);
      setPasswordForm(emptyPassword);
      setPasswordMessage("Sifre guncellendi.");
      setPasswordTone("success");
    } catch (error) {
      console.error("Alumni sifre guncellenemedi", error);
      setPasswordMessage("Sifre guncellenemedi.");
      setPasswordTone("error");
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#FF6B00]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-10">
      <ProfileHero
        title="Profilim"
        subtitle="Mezun iletisim ve kariyer bilgileri; sifre yonetimi. Gecmis programlar ve portal ozellikleri ayri menulerdedir (Madde 15)."
        icon={UserCircle}
        accent="orange"
      />

      <ProfileQuickLinks items={quickLinks} title="Mezun portal modulleri" />

      {message ? <ProfileMessageBanner type={messageTone}>{message}</ProfileMessageBanner> : null}

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
        <form onSubmit={handleProfileSubmit} className="space-y-8 xl:col-span-2">
          <ProfileCard
            title="Iletisim ve kariyer"
            description={`${user?.name ?? ""} ${user?.surname ?? ""} · ${user?.email ?? ""}`}
          >
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <p className="text-sm text-slate-500">
                Ayni ogrenci profili API&apos;si (<code className="rounded bg-slate-100 px-1 text-xs">/user/profile</code>
                ); mezun statusu kullanici rolunde yonetilir.
              </p>
              <ProfileVerificationPills tc={verification.tc} yok={verification.yok} yokLabel="YOK (mezun)" />
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <ProfileFieldLabel label="Telefon" />
                <input
                  value={form.phone}
                  onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                  className={profileInputClass}
                  placeholder="+90..."
                />
              </div>
              <div>
                <ProfileFieldLabel label="Dogum tarihi" />
                <input
                  value={form.birth_date}
                  onChange={(e) => setForm((prev) => ({ ...prev, birth_date: e.target.value }))}
                  type="date"
                  className={profileInputClass}
                />
              </div>
              <div>
                <ProfileFieldLabel label="Sehir" />
                <input
                  value={form.hometown}
                  onChange={(e) => setForm((prev) => ({ ...prev, hometown: e.target.value }))}
                  className={profileInputClass}
                  placeholder="Sehir"
                />
              </div>
              <div>
                <ProfileFieldLabel label="Universite" />
                <input
                  value={form.university}
                  onChange={(e) => setForm((prev) => ({ ...prev, university: e.target.value }))}
                  className={profileInputClass}
                  placeholder="Universite"
                />
              </div>
              <div className="md:col-span-2">
                <ProfileFieldLabel label="Bolum" />
                <input
                  value={form.department}
                  onChange={(e) => setForm((prev) => ({ ...prev, department: e.target.value }))}
                  className={profileInputClass}
                  placeholder="Bolum"
                />
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
              <ProfileLockedField
                label="T.C. Kimlik No"
                value={verification.tc ? "Sistemde dogrulandi" : "Dogrulama bekliyor"}
                verified={verification.tc}
              />
              <ProfileLockedField
                label="YOK mezun bilgisi"
                value={verification.yok ? "Sistemde dogrulandi" : "Dogrulama bekliyor"}
                verified={verification.yok}
              />
            </div>

            <div className="mt-5">
              <ProfileFieldLabel label="Adres" />
              <textarea
                value={form.address}
                onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                className={`${profileInputClass} min-h-[96px]`}
                placeholder="Acik adres"
              />
            </div>

            <div className="mt-5">
              <ProfileFieldLabel label="Kariyer ozeti" hint="Kisa profesyonel tanitim metni." />
              <textarea
                value={form.motivation_message}
                onChange={(e) => setForm((prev) => ({ ...prev, motivation_message: e.target.value }))}
                className={`${profileInputClass} min-h-[120px]`}
                placeholder="Kariyer ozeti..."
              />
            </div>

            <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
              <div>
                <ProfileFieldLabel label="LinkedIn" />
                <input
                  value={form.linkedin_url}
                  onChange={(e) => setForm((prev) => ({ ...prev, linkedin_url: e.target.value }))}
                  className={profileInputClass}
                  placeholder="https://"
                />
              </div>
              <div>
                <ProfileFieldLabel label="GitHub" />
                <input
                  value={form.github_url}
                  onChange={(e) => setForm((prev) => ({ ...prev, github_url: e.target.value }))}
                  className={profileInputClass}
                  placeholder="https://"
                />
              </div>
              <div>
                <ProfileFieldLabel label="Instagram" />
                <input
                  value={form.instagram_url}
                  onChange={(e) => setForm((prev) => ({ ...prev, instagram_url: e.target.value }))}
                  className={profileInputClass}
                  placeholder="https://"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#FF6B00] px-6 py-3 text-sm font-semibold text-white shadow-md disabled:opacity-60"
            >
              {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Profili kaydet
            </button>
          </ProfileCard>
        </form>

        <div className="space-y-8">
          <form onSubmit={handlePasswordSubmit}>
            <ProfileCard title="Sifre guncelle" description="Hesap guvenligi icin periyodik guncelleme onerilir.">
              <div className="space-y-4">
                <div>
                  <ProfileFieldLabel label="Mevcut sifre" />
                  <input
                    type="password"
                    value={passwordForm.current_password}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, current_password: e.target.value }))}
                    className={profileInputClass}
                    autoComplete="current-password"
                  />
                </div>
                <div>
                  <ProfileFieldLabel label="Yeni sifre" />
                  <input
                    type="password"
                    value={passwordForm.password}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, password: e.target.value }))}
                    className={profileInputClass}
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <ProfileFieldLabel label="Yeni sifre tekrar" />
                  <input
                    type="password"
                    value={passwordForm.password_confirmation}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, password_confirmation: e.target.value }))}
                    className={profileInputClass}
                    autoComplete="new-password"
                  />
                </div>
              </div>
              {passwordMessage ? (
                <div className="mt-4">
                  <ProfileMessageBanner type={passwordTone}>{passwordMessage}</ProfileMessageBanner>
                </div>
              ) : null}
              <button
                type="submit"
                disabled={savingPassword}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:opacity-60"
              >
                {savingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                Sifreyi guncelle
              </button>
            </ProfileCard>
          </form>

          <ProfileCard title="Kisilik analizi" description="Mezun panelinde de test verilerinize erisebilirsiniz.">
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 p-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 text-purple-700">
                <BrainCircuit className="h-8 w-8" aria-hidden />
              </div>
              <p className="mb-6 text-xs text-slate-600">
                Sonuclar <code className="rounded bg-white px-1 text-[11px]">user_profiles</code> uzerinde tutulur.
              </p>
              <Link
                href="/alumni/personality"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 py-3 text-sm font-semibold text-white transition hover:bg-purple-700"
              >
                Kisilik sayfasina git <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </ProfileCard>
        </div>
      </div>
    </div>
  );
}
