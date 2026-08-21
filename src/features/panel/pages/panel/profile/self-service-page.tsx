"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Calendar, ExternalLink, Loader2, Lock, Save, Send, UserCircle } from "lucide-react";
import api from "@/lib/api/axios";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { useAuth } from "@/store/useAuth";
import {
  ProfileCard,
  ProfileFieldLabel,
  ProfileHero,
  ProfileMessageBanner,
  profileInputClass,
} from "@/components/profile/profile-page-ui";

interface ProfileForm {
  phone: string;
  address: string;
  birth_date: string;
  hometown: string;
  university: string;
  department: string;
}

interface PasswordForm {
  current_password: string;
  password: string;
  password_confirmation: string;
}

interface LeaveRequest {
  id: number;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  approver?: { name: string; surname: string };
}

const emptyProfile: ProfileForm = {
  phone: "",
  address: "",
  birth_date: "",
  hometown: "",
  university: "",
  department: "",
};

const emptyPassword: PasswordForm = {
  current_password: "",
  password: "",
  password_confirmation: "",
};

export default function ProfileSelfServicePage() {
  const { user, fetchProfile, hasPermission } = useAuth();
  const [form, setForm] = useState<ProfileForm>(emptyProfile);
  const [passwordForm, setPasswordForm] = useState<PasswordForm>(emptyPassword);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error" | "neutral">("neutral");

  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [leaveForm, setLeaveForm] = useState({ start_date: "", end_date: "", reason: "" });
  const [savingLeave, setSavingLeave] = useState(false);
  const [leaveMessage, setLeaveMessage] = useState("");
  const [leaveTone, setLeaveTone] = useState<"success" | "error" | "neutral">("neutral");
  const [passwordMessageTone, setPasswordMessageTone] = useState<"success" | "error" | "neutral">("neutral");

  const loadLeaves = useCallback(async () => {
    try {
      const response = await api.get("/my-leave-requests");
      setLeaves(Array.isArray(response.data.leave_requests) ? response.data.leave_requests : []);
    } catch (error) {
      console.error("Izinler yuklenemedi", error);
    }
  }, []);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await api.get("/user/profile");
        const nextUser = response.data.user;
        setForm({
          phone: nextUser.phone ?? "",
          address: nextUser.address ?? "",
          birth_date: nextUser.birth_date ?? "",
          hometown: nextUser.hometown ?? "",
          university: nextUser.university ?? "",
          department: nextUser.department ?? "",
        });
      } catch (error) {
        console.error("Profil yuklenemedi", error);
        setMessage("Profil bilgileri yuklenemedi.");
        setMessageTone("error");
      } finally {
        setLoading(false);
      }
    };

    void loadProfile();
  }, []);

  useEffect(() => {
    if (!hasPermission("staff.leave.request")) return;

    const timer = window.setTimeout(() => void loadLeaves(), 0);
    return () => window.clearTimeout(timer);
  }, [hasPermission, loadLeaves]);

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
      console.error("Profil kaydedilemedi", error);
      setMessage("Profil bilgileri kaydedilemedi.");
      setMessageTone("error");
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmitInner = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingPassword(true);
    setPasswordMessage("");
    setPasswordMessageTone("neutral");

    try {
      await api.post("/user/change-password", passwordForm);
      setPasswordForm(emptyPassword);
      setPasswordMessage("Sifre guncellendi.");
      setPasswordMessageTone("success");
    } catch (error) {
      console.error("Sifre guncellenemedi", error);
      setPasswordMessage("Sifre guncellenemedi.");
      setPasswordMessageTone("error");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLeaveSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingLeave(true);
    setLeaveMessage("");
    setLeaveTone("neutral");

    try {
      const response = await api.post("/leave-requests", leaveForm);
      setLeaves((prev) => [response.data.leave_request, ...prev]);
      setLeaveForm({ start_date: "", end_date: "", reason: "" });
      setLeaveMessage("Izin talebi olusturuldu.");
      setLeaveTone("success");
    } catch (error) {
      console.error("Izin talebi olusturulamadi", error);
      setLeaveMessage("Izin talebi olusturulamadi. Tarihleri kontrol edin.");
      setLeaveTone("error");
    } finally {
      setSavingLeave(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      <ProfileHero
        title="Profilim"
        subtitle="Kisisel iletisim bilgileri, sifre ve yetkiniz varsa izin talepleri. Panel yetkileri action + scope ile yonetilir; bu sayfa dogrudan kullanici kaydini gunceller."
        icon={UserCircle}
        accent="amber"
        actions={
          <a
            href="https://kademepuantaj.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-900 shadow-sm transition hover:bg-blue-100"
          >
            <Calendar className="h-4 w-4" aria-hidden />
            Aylik puantaj
            <ExternalLink className="h-3.5 w-3.5 opacity-70" aria-hidden />
          </a>
        }
      />

      {message ? <ProfileMessageBanner type={messageTone}>{message}</ProfileMessageBanner> : null}

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
        <form onSubmit={handleProfileSubmit} className="xl:col-span-2">
          <ProfileCard
            title="Temel bilgiler"
            description={`${user?.name ?? ""} ${user?.surname ?? ""} · ${user?.email ?? ""}`}
          >
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                Hesap aktif
              </span>
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
                <ProfileFieldLabel label="Birim / rol alani" hint="Personel kartindaki departman bilgisinden farkli olabilir." />
                <input
                  value={form.department}
                  onChange={(e) => setForm((prev) => ({ ...prev, department: e.target.value }))}
                  className={profileInputClass}
                  placeholder="Birim"
                />
              </div>
              <div>
                <ProfileFieldLabel label="Sehir / memleket" />
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
            </div>

            <div className="mt-5">
              <ProfileFieldLabel label="Adres" />
              <textarea
                value={form.address}
                onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                className={`${profileInputClass} min-h-[120px]`}
                placeholder="Acik adres"
              />
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-amber-500/25 disabled:opacity-60"
            >
              {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Profili kaydet
            </button>
          </ProfileCard>
        </form>

        <form onSubmit={handlePasswordSubmitInner}>
          <ProfileCard title="Sifre guncelle" description="Mevcut sifrenizi dogrulayarak yeni sifre belirleyin.">
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
                <ProfileMessageBanner type={passwordMessageTone}>{passwordMessage}</ProfileMessageBanner>
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
      </div>

      <PermissionGate
        permission="staff.leave.request"
        fallback={
          <ProfileMessageBanner type="neutral">
            Izin talebi olusturma yetkiniz yok (<code className="text-xs">staff.leave.request</code>).
          </ProfileMessageBanner>
        }
      >
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
          <form onSubmit={handleLeaveSubmit} className="xl:col-span-1">
            <ProfileCard title="Izin talep et" description="Talebiniz ayni birimdeki koordinatore ve sistem yoneticilerine iletilir.">
              <div className="space-y-4">
                <div>
                  <ProfileFieldLabel label="Baslangic" />
                  <input
                    type="date"
                    required
                    value={leaveForm.start_date}
                    onChange={(e) => setLeaveForm((prev) => ({ ...prev, start_date: e.target.value }))}
                    className={profileInputClass}
                  />
                </div>
                <div>
                  <ProfileFieldLabel label="Bitis" />
                  <input
                    type="date"
                    required
                    value={leaveForm.end_date}
                    onChange={(e) => setLeaveForm((prev) => ({ ...prev, end_date: e.target.value }))}
                    className={profileInputClass}
                  />
                </div>
                <div>
                  <ProfileFieldLabel label="Gerekce (istege bagli)" />
                  <textarea
                    value={leaveForm.reason}
                    onChange={(e) => setLeaveForm((prev) => ({ ...prev, reason: e.target.value }))}
                    className={`${profileInputClass} min-h-[96px]`}
                    placeholder="Izin gerekcesi..."
                  />
                </div>
              </div>
              {leaveMessage ? (
                <div className="mt-4">
                  <ProfileMessageBanner type={leaveTone}>{leaveMessage}</ProfileMessageBanner>
                </div>
              ) : null}
              <button
                type="submit"
                disabled={savingLeave}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-3 text-sm font-semibold text-white shadow-md disabled:opacity-60"
              >
                {savingLeave ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Talep gonder
              </button>
            </ProfileCard>
          </form>

          <div className="xl:col-span-2">
            <ProfileCard title="Izin taleplerim" description="Son talepler listenin basinda; sonucu buradan takip edebilirsiniz.">
              {leaves.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-500">
                  Gecmis izin talebiniz bulunmuyor.
                </p>
              ) : (
                <div className="space-y-3">
                  {leaves.map((leave) => (
                    <div
                      key={leave.id}
                      className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <div className="font-semibold text-slate-900">
                          {new Date(leave.start_date).toLocaleDateString("tr-TR")} –{" "}
                          {new Date(leave.end_date).toLocaleDateString("tr-TR")}
                        </div>
                        <div className="mt-1 max-w-xl truncate text-xs text-slate-500" title={leave.reason ?? ""}>
                          {leave.reason || "Gerekce belirtilmemis"}
                        </div>
                      </div>
                      <div className="flex flex-col items-start gap-1 md:items-end">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${
                            leave.status === "pending"
                              ? "bg-blue-100 text-blue-900"
                              : leave.status === "approved"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-red-100 text-red-800"
                          }`}
                        >
                          {leave.status === "pending" ? "Bekliyor" : leave.status === "approved" ? "Onaylandi" : "Reddedildi"}
                        </span>
                        {leave.approver ? (
                          <span className="text-[10px] text-slate-500">
                            Islem: {leave.approver.name} {leave.approver.surname}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ProfileCard>
          </div>
        </div>
      </PermissionGate>
    </div>
  );
}
