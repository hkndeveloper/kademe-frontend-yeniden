"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, CheckCircle2, FileText, Loader2, Mail, MessageSquare, Send, Users, X } from "lucide-react";
import api from "@/lib/api/axios";
import { ExportButtons } from "@/components/shared/ExportButtons";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { useAuth } from "@/store/useAuth";

interface Project {
  id: number;
  name: string;
}

interface Announcement {
  id: number;
  title: string;
  content: string;
  category: string | null;
  target_roles: string[] | null;
  project?: { id: number; name: string } | null;
  creator?: { id: number; name: string; surname: string } | null;
  published_at: string;
}

const roleLabels: Record<string, string> = {
  super_admin: "Admin",
  coordinator: "Koordinator",
  staff: "Personel",
  student: "Ogrenci",
  alumni: "Mezun",
};

export default function CoordinatorAnnouncementsPage() {
  const { hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<"list" | "new">("list");
  const [projects, setProjects] = useState<Project[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("Program");
  const [projectId, setProjectId] = useState("");
  const [targetRoles, setTargetRoles] = useState<string[]>(["student"]);
  const [sendSms, setSendSms] = useState(false);
  const [sendEmail, setSendEmail] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const canViewAnnouncements = hasPermission("announcements.view");
  const canCreateAnnouncements = hasPermission("announcements.create");
  const canDeleteAnnouncements = hasPermission("announcements.delete");
  const canSendSms = hasPermission("announcements.send_sms");
  const canSendEmail = hasPermission("announcements.send_email");

  const loadAnnouncements = useCallback(async () => {
    setListLoading(true);
    setErrorMessage("");
    try {
      const res = await api.get("/admin/announcements");
      const items = Array.isArray(res.data?.announcements?.data) ? res.data.announcements.data : [];
      setAnnouncements(items);
    } catch (error) {
      console.error("Koordinator duyurulari yuklenemedi", error);
      setErrorMessage("Duyurular yuklenirken bir hata olustu.");
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const initData = async () => {
        setLoading(true);
        setErrorMessage("");
        try {
          const [projectRes] = await Promise.all([
            api.get<{ projects: Project[] }>("/projects"),
            loadAnnouncements(),
          ]);
          setProjects(projectRes.data.projects ?? []);
        } catch (error) {
          console.error("Koordinator duyuru verileri yuklenemedi", error);
          setErrorMessage("Sayfa verileri yuklenirken bir hata olustu.");
        } finally {
          setLoading(false);
        }
      };

      void initData();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadAnnouncements]);

  const resetForm = () => {
    setTitle("");
    setContent("");
    setCategory("Program");
    setProjectId("");
    setTargetRoles(["student"]);
    setSendSms(false);
    setSendEmail(true);
    setFile(null);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Duyuruyu silmek istediginize emin misiniz?")) return;

    setErrorMessage("");
    setSuccessMessage("");
    try {
      await api.delete(`/admin/announcements/${id}`);
      setSuccessMessage("Duyuru silindi.");
      await loadAnnouncements();
    } catch (error) {
      console.error("Koordinator duyuruyu silemedi", error);
      setErrorMessage("Duyuru silinirken bir hata olustu.");
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!title.trim() || !content.trim()) {
      setErrorMessage("Baslik ve icerik zorunludur.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("content", content.trim());
      formData.append("category", category.trim());
      if (projectId) formData.append("project_id", projectId);
      targetRoles.forEach((role, index) => formData.append(`target_roles[${index}]`, role));
      formData.append("send_sms", sendSms ? "1" : "0");
      formData.append("send_email", sendEmail ? "1" : "0");
      if (sendEmail && file) {
        formData.append("email_attachment", file);
      }

      await api.post("/admin/announcements", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      resetForm();
      setActiveTab("list");
      setSuccessMessage("Duyuru basariyla yayina alindi.");
      await loadAnnouncements();
    } catch (error) {
      console.error("Koordinator duyuru gonderemedi", error);
      setErrorMessage("Duyuru gonderilirken bir hata olustu.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleRole = (role: string) => {
    setTargetRoles((prev) => (prev.includes(role) ? prev.filter((item) => item !== role) : [...prev, role]));
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/20 text-accent">
            <Bell className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900">Duyurular</h1>
            <p className="mt-1 text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Proje bazli e-posta ve SMS gonderimleri
            </p>
          </div>
        </div>
        <PermissionGate permission="announcements.export">
          <ExportButtons endpoint="/admin/announcements/export" filename="koordinator_duyurulari" buttonLabel="Duyurulari Disa Aktar" />
        </PermissionGate>
      </div>

      {(successMessage || errorMessage) && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            errorMessage
              ? "border-red-500/20 bg-red-500/10 text-red-200"
              : "border-green-500/20 bg-green-500/10 text-green-200"
          }`}
        >
          {errorMessage || successMessage}
        </div>
      )}

      <PermissionGate permissions={["announcements.view", "announcements.create"]} require="any">
        <div className="flex space-x-1 rounded-2xl bg-black/40 p-1 md:w-max">
          <PermissionGate permission="announcements.view">
            <button
              onClick={() => setActiveTab("list")}
              className={`flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold transition-all ${
                activeTab === "list"
                  ? "bg-accent text-accent-foreground shadow-lg"
                  : "text-muted-foreground hover:bg-white/5 hover:text-slate-900"
              }`}
            >
              <FileText className="h-4 w-4" />
              Duyuru Gecmisi
            </button>
          </PermissionGate>
          <PermissionGate permission="announcements.create">
            <button
              onClick={() => setActiveTab("new")}
              className={`flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold transition-all ${
                activeTab === "new"
                  ? "bg-accent text-accent-foreground shadow-lg"
                  : "text-muted-foreground hover:bg-white/5 hover:text-slate-900"
              }`}
            >
              <Send className="h-4 w-4" />
              Yeni Gonderim
            </button>
          </PermissionGate>
        </div>
      </PermissionGate>

      <PermissionGate
        permissions={["announcements.view", "announcements.create"]}
        require="any"
        fallback={
        <div className="glass-panel rounded-3xl p-10 text-center text-sm text-muted-foreground">
          Bu modulu goruntulemek icin yetkiniz bulunmuyor.
        </div>
        }
      >
      {activeTab === "list" && canViewAnnouncements ? (
        <div className="glass-panel overflow-hidden rounded-3xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-muted-foreground">
              <thead className="border-b border-white/5 bg-white/5 text-xs font-bold uppercase tracking-widest text-slate-900">
                <tr>
                  <th className="px-6 py-4">Tarih</th>
                  <th className="px-6 py-4">Baslik</th>
                  <th className="px-6 py-4">Kategori / Proje</th>
                  <th className="px-6 py-4">Hedef Kitle</th>
                  <th className="px-6 py-4">Olusturan</th>
                  <th className="px-6 py-4 text-right">Islem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {listLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <Loader2 className="mx-auto h-8 w-8 animate-spin text-accent" />
                    </td>
                  </tr>
                ) : announcements.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                      Duyuru bulunamadi.
                    </td>
                  </tr>
                ) : (
                  announcements.map((announcement) => (
                    <tr key={announcement.id} className="transition-colors hover:bg-white/5">
                      <td className="px-6 py-4">{new Date(announcement.published_at).toLocaleDateString("tr-TR")}</td>
                      <td className="px-6 py-4">
                        <div className="line-clamp-1 font-bold text-slate-900">{announcement.title}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-slate-900">{announcement.category || "-"}</span>
                        <div className="text-[10px] uppercase text-accent">
                          {announcement.project?.name || "Tum Projeler"}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {announcement.target_roles?.length ? (
                            announcement.target_roles.map((role) => (
                              <span
                                key={role}
                                className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase text-slate-900"
                              >
                                {roleLabels[role] || role}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px]">Tumu</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {announcement.creator ? `${announcement.creator.name} ${announcement.creator.surname}` : "-"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {canDeleteAnnouncements && (
                          <button
                            onClick={() => void handleDelete(announcement.id)}
                            className="inline-flex items-center justify-center rounded-lg bg-white/5 p-2 text-gray-400 transition-colors hover:bg-red-600 hover:text-white"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {activeTab === "new" && canCreateAnnouncements && (
        <form onSubmit={handleSubmit} className="glass-panel rounded-3xl p-8 space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Duyuru Basligi</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-accent"
                placeholder="Orn: Haftalik program guncellemesi"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Kategori</label>
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-accent"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Icerik</label>
            <textarea
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-accent"
              placeholder="Duyuru metnini yazin..."
            />
          </div>

          <div className="grid grid-cols-1 gap-8 border-t border-white/5 pt-6 md:grid-cols-2">
            <div className="space-y-4">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Users className="h-4 w-4 text-accent" />
                Hedef Kitle
              </h3>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Proje</label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-accent"
                >
                  <option value="">Tum Projeler</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Roller</label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(roleLabels).map(([role, label]) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => toggleRole(role)}
                      className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition-all ${
                        targetRoles.includes(role)
                          ? "border-accent bg-accent/20 text-slate-900"
                          : "border-slate-200 bg-white text-muted-foreground hover:bg-white/5"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Send className="h-4 w-4 text-accent" />
                Gonderim Kanallari
              </h3>

              {canSendEmail && (
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/5 bg-white/5 p-4 transition-colors hover:bg-white/10">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-slate-900">E-posta</div>
                    <div className="text-xs text-muted-foreground">Dosya ekli toplu gonderim</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={sendEmail}
                    onChange={(e) => setSendEmail(e.target.checked)}
                    className="h-5 w-5 rounded border-gray-600 bg-black/40 text-accent focus:ring-accent"
                  />
                </label>
              )}

              {canSendEmail && sendEmail && (
                <div className="space-y-2 pl-14">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Ek Dosya</label>
                  <input
                    type="file"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="block w-full text-xs text-slate-400 file:mr-4 file:rounded-full file:border-0 file:bg-accent file:px-4 file:py-2 file:text-xs file:font-semibold file:text-accent-foreground"
                  />
                </div>
              )}

              {canSendSms && (
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/5 bg-white/5 p-4 transition-colors hover:bg-white/10">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-slate-900">SMS</div>
                    <div className="text-xs text-muted-foreground">Kisa hatirlatma ve acil duyurular</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={sendSms}
                    onChange={(e) => setSendSms(e.target.checked)}
                    className="h-5 w-5 rounded border-gray-600 bg-black/40 text-accent focus:ring-accent"
                  />
                </label>
              )}
            </div>
          </div>

          <div className="flex justify-end border-t border-white/5 pt-6">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-xl bg-accent px-8 py-3 text-sm font-bold uppercase tracking-widest text-accent-foreground shadow-lg shadow-accent/20 transition-all hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : successMessage ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <Send className="h-5 w-5" />
              )}
              {submitting ? "Isleniyor..." : "Duyuruyu Gonder"}
            </button>
          </div>
        </form>
      )}
      </PermissionGate>
    </div>
  );
}
