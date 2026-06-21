"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  BookOpen,
  BrainCircuit,
  FileText,
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
  university: string;
  department: string;
  class_year: string;
  hometown: string;
  motivation_message: string;
  linkedin_url: string;
  github_url: string;
  instagram_url: string;
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
  university: "",
  department: "",
  class_year: "",
  hometown: "",
  motivation_message: "",
  linkedin_url: "",
  github_url: "",
  instagram_url: "",
};

const emptyPassword: PasswordForm = {
  current_password: "",
  password: "",
  password_confirmation: "",
};

const quickLinks: ProfileQuickLink[] = [
  { href: "/student/dashboard", label: "Panel ozet", description: "Kredi ve ozet", icon: LayoutDashboard },
  { href: "/student/applications", label: "Basvurularim", description: "Kabul / red durumu", icon: FileText },
  { href: "/student/certificates", label: "Sertifikalarim", description: "Katilim ve basari belgeleri", icon: Award },
  { href: "/student/bohca", label: "Dijital bohca", description: "Proje materyalleri", icon: BookOpen },
  { href: "/student/inbox", label: "Mesaj kutusu", description: "Sistem ici iletisim", icon: Megaphone },
];

export default function StudentProfilePage() {
  const { user, fetchProfile } = useAuth();
  const [form, setForm] = useState<ProfileForm>(emptyProfile);
  const [passwordForm, setPasswordForm] = useState<PasswordForm>(emptyPassword);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [profileTone, setProfileTone] = useState<"success" | "error" | "neutral">("neutral");
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
          university: nextUser.university ?? "",
          department: nextUser.department ?? "",
          class_year: nextUser.class_year ?? "",
          hometown: nextUser.hometown ?? "",
          motivation_message: nextUser.profile?.motivation_message ?? "",
          linkedin_url: nextUser.profile?.linkedin_url ?? "",
          github_url: nextUser.profile?.github_url ?? "",
          instagram_url: nextUser.profile?.instagram_url ?? "",
        });
      } catch (error) {
        console.error("Profil bilgileri yuklenemedi", error);
        setProfileMessage("Profil bilgileri yuklenirken bir hata olustu.");
        setProfileTone("error");
      } finally {
        setLoading(false);
      }
    };

    void loadProfile();
  }, []);

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingProfile(true);
    setProfileMessage("");
    setProfileTone("neutral");

    try {
      await api.put("/user/profile", form);
      await fetchProfile();
      setProfileMessage("Profil bilgileri basariyla guncellendi.");
      setProfileTone("success");
    } catch (error) {
      console.error("Profil kaydedilemedi", error);
      setProfileMessage("Profil kaydedilirken bir hata olustu.");
      setProfileTone("error");
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
      setPasswordMessage("Sifreniz basariyla guncellendi.");
      setPasswordTone("success");
    } catch (error) {
      console.error("Sifre degistirilemedi", error);
      setPasswordMessage("Sifre degistirilirken bir hata olustu.");
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
    <div className="space-y-8 pb-10">
      <ProfileHero
        title="Profilim"
        subtitle="Kisisel ve akademik bilgiler; sosyal baglantilar ve motivasyon metni. Sartname Madde 4.2 ozet verileri asagidaki modullerde toplanir."
        icon={UserCircle}
        accent="orange"
      />

      <ProfileQuickLinks items={quickLinks} title="Sartname ile hizali moduller" />

      {profileMessage ? <ProfileMessageBanner type={profileTone}>{profileMessage}</ProfileMessageBanner> : null}

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
        <form onSubmit={handleProfileSubmit} className="space-y-8 xl:col-span-2">
          <ProfileCard
            title="Kisisel ve akademik"
            description={`Hesap: ${user?.name ?? ""} ${user?.surname ?? ""} (${user?.email ?? ""})`}
          >
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <p className="text-sm text-slate-500">
                Telefon, adres ve akademik alanlar <code className="rounded bg-slate-100 px-1 text-xs">users</code>{" "}
                tablosunda; sosyal link ve motivasyon{" "}
                <code className="rounded bg-slate-100 px-1 text-xs">user_profiles</code> icindedir.
              </p>
              <ProfileVerificationPills tc={verification.tc} yok={verification.yok} yokLabel="YOK (ogrenci)" />
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
                <ProfileFieldLabel label="Universite" />
                <input
                  value={form.university}
                  onChange={(e) => setForm((prev) => ({ ...prev, university: e.target.value }))}
                  className={profileInputClass}
                  placeholder="Universite"
                />
              </div>
              <div>
                <ProfileFieldLabel label="Bolum" />
                <input
                  value={form.department}
                  onChange={(e) => setForm((prev) => ({ ...prev, department: e.target.value }))}
                  className={profileInputClass}
                  placeholder="Bolum"
                />
              </div>
              <div>
                <ProfileFieldLabel label="Sinif / mezuniyet yili" />
                <input
                  value={form.class_year}
                  onChange={(e) => setForm((prev) => ({ ...prev, class_year: e.target.value }))}
                  className={profileInputClass}
                  placeholder="Ornek: 3 veya 2026"
                />
              </div>
              <div>
                <ProfileFieldLabel label="Memleket / sehir" />
                <input
                  value={form.hometown}
                  onChange={(e) => setForm((prev) => ({ ...prev, hometown: e.target.value }))}
                  className={profileInputClass}
                  placeholder="Sehir"
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
                label="YOK ogrenci bilgisi"
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
              <ProfileFieldLabel label="Motivasyon notu" hint="Dashboard veya iletisim metinlerinde kullanilabilir." />
              <textarea
                value={form.motivation_message}
                onChange={(e) => setForm((prev) => ({ ...prev, motivation_message: e.target.value }))}
                className={`${profileInputClass} min-h-[120px]`}
                placeholder="Kisa motivasyon notun"
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
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#FF6B00] px-6 py-3 text-sm font-semibold text-white shadow-md shadow-[#FF6B00]/25 disabled:opacity-60"
            >
              {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Profili kaydet
            </button>
          </ProfileCard>
        </form>

        <div className="space-y-8">
          <form onSubmit={handlePasswordSubmit}>
            <ProfileCard title="Sifre guncelle" description="Guvenli sifre icin en az 8 karakter ve tekrar alani zorunludur.">
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

          <ProfileCard
            title="Kisilik analizi"
            description="Sartname ve KPD akislariyla uyumlu; sonuclar yetkili ekiple paylasilabilir."
          >
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 p-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#FF6B00]/15 text-[#FF6B00]">
                <BrainCircuit className="h-8 w-8" aria-hidden />
              </div>
              <h3 className="mb-2 font-bold text-slate-900">Analiz testini tamamla</h3>
              <p className="mb-6 text-xs text-slate-600">
                Kariyer planlamani desteklemek icin hazirlanan sorulari doldur. Veriler{" "}
                <code className="rounded bg-white px-1 text-[11px]">user_profiles.personality_test_data</code>{" "}
                alaninda saklanir.
              </p>
              <Link
                href="/student/personality"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF6B00] py-3 text-sm font-semibold text-white transition hover:bg-[#e65f00]"
              >
                Teste git <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
            <p className="mt-4 text-center text-[10px] text-slate-500">
              TC ve YOK alanlari kullanici tarafindan degistirilemez; dogrulama entegrasyonlariyla guncellenir.
            </p>
          </ProfileCard>
        </div>
      </div>
    </div>
  );
}
