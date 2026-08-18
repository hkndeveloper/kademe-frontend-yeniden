"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BrainCircuit,
  ChevronDown,
  CheckCircle2,
  FileText,
  HelpCircle,
  LayoutList,
  Loader2,
  Pencil,
  Plus,
  Save,
  Search,
  Share2,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import api from "@/lib/api/axios";
import { ExportButtons } from "@/components/shared/ExportButtons";
import { useAuth } from "@/store/useAuth";
import { usePermissions } from "@/hooks/usePermissions";

interface BlogCategory {
  id: number;
  name: string;
}

interface ContentProject {
  id: number;
  name: string;
}

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt?: string | null;
  content: string;
  cover_image_path?: string | null;
  category_id?: number | null;
  category?: BlogCategory | null;
  project_id?: number | null;
  project?: ContentProject | null;
  status: "draft" | "published";
  published_at?: string | null;
}

interface FaqItem {
  id: number;
  question: string;
  answer: string;
  category: string;
  order: number;
}

interface ContentResponse {
  blogs: BlogPost[];
  categories: BlogCategory[];
  faqs: FaqItem[];
  projects?: ContentProject[];
  content_scope?: {
    global: boolean;
    project_ids: number[];
  };
}

interface PersonalityQuestion {
  id?: number;
  question_key: string;
  category: string;
  text: string;
  sort_order: number;
}

interface PersonalityResultRange {
  id?: number;
  category: string;
  summary: string;
}

interface PersonalityTemplate {
  id: number;
  name: string;
  description?: string | null;
  is_active: boolean;
  questions: PersonalityQuestion[];
  result_ranges?: PersonalityResultRange[];
  resultRanges?: PersonalityResultRange[];
}

interface PersonalityTemplatesResponse {
  templates: PersonalityTemplate[];
}

const emptyBlog = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  cover_image_path: "",
  category_id: "",
  project_id: "",
  status: "draft" as "draft" | "published",
  published_at: "",
};

const emptyFaq = {
  question: "",
  answer: "",
  category: "",
  order: 0,
};

const emptyPersonalityQuestion = (): PersonalityQuestion => ({
  question_key: "",
  category: "",
  text: "",
  sort_order: 1,
});

const emptyPersonalityRange = (): PersonalityResultRange => ({
  category: "",
  summary: "",
});

const emptyPersonalityForm = {
  name: "",
  description: "",
  is_active: false,
  questions: [emptyPersonalityQuestion()],
  result_ranges: [emptyPersonalityRange()],
};

type PersonalityForm = typeof emptyPersonalityForm;

type ContentModuleId = "blog" | "faq" | "personality";

const fieldBase =
  "w-full rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500";
const labelClass = "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500";
const panelShell = "rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-sm md:p-6";

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <span className={labelClass}>{label}</span>
      {children}
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

const CONTENT_MODULES: Array<{
  id: ContentModuleId;
  label: string;
  description: string;
  icon: typeof FileText;
}> = [
  { id: "blog", label: "Blog", description: "Yazilar ve kategoriler", icon: FileText },
  { id: "faq", label: "SSS", description: "Sık sorulan sorular", icon: HelpCircle },
  { id: "personality", label: "Kisilik analizi", description: "Ogrenci ve mezun test sablonu", icon: BrainCircuit },
];

export default function AdminContentPage() {
  const { hasPermission } = useAuth();
  const { hasGlobalScope, hasScopedPermission } = usePermissions();
  const canViewContent = hasPermission("content.view") && hasScopedPermission("content.view");

  const canBlogCreate = hasPermission("content.blog.create") && hasScopedPermission("content.blog.create");
  const canBlogUpdate = hasPermission("content.blog.update") && hasScopedPermission("content.blog.update");
  const canBlogDelete = hasPermission("content.blog.delete") && hasScopedPermission("content.blog.delete");
  const canCreateGlobalBlog = hasGlobalScope("content.blog.create");
  const canUpdateGlobalBlog = hasGlobalScope("content.blog.update");
  const canSocialShare =
    (hasPermission("content.blog.update") && hasGlobalScope("content.blog.update")) ||
    (hasPermission("announcements.create") && hasGlobalScope("announcements.create"));
  const canFaqCreate = hasPermission("content.faq.create") && hasGlobalScope("content.faq.create");
  const canFaqUpdate = hasPermission("content.faq.update") && hasGlobalScope("content.faq.update");
  const canFaqDelete = hasPermission("content.faq.delete") && hasGlobalScope("content.faq.delete");
  const canPersonalityView =
    (hasPermission("content.personality.view") && hasGlobalScope("content.personality.view")) ||
    (hasPermission("content.view") && hasGlobalScope("content.view")) ||
    (hasPermission("settings.view") && hasGlobalScope("settings.view"));
  const canPersonalityManage =
    (hasPermission("content.personality.manage") && hasGlobalScope("content.personality.manage")) ||
    (hasPermission("content.site_settings.update") && hasGlobalScope("content.site_settings.update")) ||
    (hasPermission("settings.update") && hasGlobalScope("settings.update"));

  const [activeModule, setActiveModule] = useState<ContentModuleId>("blog");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [blogSearch, setBlogSearch] = useState("");
  const [faqSearch, setFaqSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [contentProjects, setContentProjects] = useState<ContentProject[]>([]);
  const [contentScopeGlobal, setContentScopeGlobal] = useState(false);
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [personalityTemplates, setPersonalityTemplates] = useState<PersonalityTemplate[]>([]);
  const [blogForm, setBlogForm] = useState(emptyBlog);
  const [faqForm, setFaqForm] = useState(emptyFaq);
  const [personalityForm, setPersonalityForm] = useState<PersonalityForm>(emptyPersonalityForm);
  const [editingBlogId, setEditingBlogId] = useState<number | null>(null);
  const [editingFaqId, setEditingFaqId] = useState<number | null>(null);
  const [editingPersonalityId, setEditingPersonalityId] = useState<number | null>(null);
  const [uploadingBlogCover, setUploadingBlogCover] = useState(false);
  const [sharingBlogId, setSharingBlogId] = useState<number | null>(null);

  const blogFieldsDisabled = !(editingBlogId ? canBlogUpdate : canBlogCreate);
  const faqFieldsDisabled = !(editingFaqId ? canFaqUpdate : canFaqCreate);
  const personalityFieldsDisabled = !canPersonalityManage;

  useEffect(() => {
    if (!canViewContent) {
      return;
    }

    const loadContent = async () => {
      try {
        const response = await api.get<ContentResponse>("/panel/content");
        setBlogs(Array.isArray(response.data.blogs) ? response.data.blogs : []);
        setCategories(Array.isArray(response.data.categories) ? response.data.categories : []);
        setContentProjects(Array.isArray(response.data.projects) ? response.data.projects : []);
        setContentScopeGlobal(Boolean(response.data.content_scope?.global));
        setFaqs(Array.isArray(response.data.faqs) ? response.data.faqs : []);
        if (canPersonalityView) {
          const templateResponse = await api.get<PersonalityTemplatesResponse>("/panel/personality-test-templates");
          setPersonalityTemplates(Array.isArray(templateResponse.data.templates) ? templateResponse.data.templates : []);
        }
      } catch (error) {
        console.error("Icerik verileri yuklenemedi", error);
        setErrorMessage("Icerik verileri yuklenemedi.");
      } finally {
        setLoading(false);
      }
    };

    void loadContent();
  }, [canPersonalityView, canViewContent]);

  const loadContent = async () => {
    try {
      const response = await api.get<ContentResponse>("/panel/content");
      setBlogs(Array.isArray(response.data.blogs) ? response.data.blogs : []);
      setCategories(Array.isArray(response.data.categories) ? response.data.categories : []);
      setContentProjects(Array.isArray(response.data.projects) ? response.data.projects : []);
      setContentScopeGlobal(Boolean(response.data.content_scope?.global));
      setFaqs(Array.isArray(response.data.faqs) ? response.data.faqs : []);
      if (canPersonalityView) {
        const templateResponse = await api.get<PersonalityTemplatesResponse>("/panel/personality-test-templates");
        setPersonalityTemplates(Array.isArray(templateResponse.data.templates) ? templateResponse.data.templates : []);
      }
    } catch (error) {
      console.error("Icerik verileri yuklenemedi", error);
      setErrorMessage("Icerik verileri yuklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  const faqGroups = useMemo(() => {
    return faqs.reduce<Record<string, FaqItem[]>>((acc, faq) => {
      (acc[faq.category] = acc[faq.category] || []).push(faq);
      return acc;
    }, {});
  }, [faqs]);

  const filteredBlogs = useMemo(() => {
    const q = blogSearch.trim().toLocaleLowerCase("tr-TR");
    if (!q) return blogs;
    return blogs.filter(
      (b) =>
        b.title.toLocaleLowerCase("tr-TR").includes(q) ||
        b.slug.toLocaleLowerCase("tr-TR").includes(q) ||
        (b.excerpt ?? "").toLocaleLowerCase("tr-TR").includes(q),
    );
  }, [blogs, blogSearch]);

  const filteredFaqGroups = useMemo(() => {
    const q = faqSearch.trim().toLocaleLowerCase("tr-TR");
    if (!q) return faqGroups;
    const next: Record<string, FaqItem[]> = {};
    for (const [cat, items] of Object.entries(faqGroups)) {
      const hit = items.filter(
        (f) =>
          f.question.toLocaleLowerCase("tr-TR").includes(q) ||
          f.answer.toLocaleLowerCase("tr-TR").includes(q) ||
          cat.toLocaleLowerCase("tr-TR").includes(q),
      );
      if (hit.length) next[cat] = hit;
    }
    return next;
  }, [faqGroups, faqSearch]);

  const handleBlogSave = async () => {
    const permission = editingBlogId ? "content.blog.update" : "content.blog.create";
    if (!hasPermission(permission) || !hasScopedPermission(permission)) {
      setErrorMessage("Blog icerigi icin yetki ve kapsam gerekir.");
      return;
    }

    const canUseGlobal = editingBlogId ? canUpdateGlobalBlog : canCreateGlobalBlog;
    if (!canUseGlobal && !blogForm.project_id) {
      setErrorMessage("Proje kapsamli blog icin proje secimi zorunludur.");
      return;
    }

    setSaving(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      if (editingBlogId) {
        await api.put(`/panel/content/blogs/${editingBlogId}`, {
          ...blogForm,
          category_id: blogForm.category_id ? Number(blogForm.category_id) : null,
          project_id: blogForm.project_id ? Number(blogForm.project_id) : null,
          published_at: blogForm.published_at || null,
        });
        setMessage("Blog yazisi guncellendi.");
      } else {
        await api.post("/panel/content/blogs", {
          ...blogForm,
          category_id: blogForm.category_id ? Number(blogForm.category_id) : null,
          project_id: blogForm.project_id ? Number(blogForm.project_id) : null,
          published_at: blogForm.published_at || null,
        });
        setMessage("Blog yazisi olusturuldu.");
      }

      setBlogForm(emptyBlog);
      setEditingBlogId(null);
      await loadContent();
    } catch (error) {
      console.error("Blog kaydedilemedi", error);
      setErrorMessage("Blog kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  };

  const handleBlogCoverUpload = async (file: File | null) => {
    if (!file || blogFieldsDisabled) return;

    setUploadingBlogCover(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "blog-covers");

      const response = await api.post<{ path: string; url?: string }>("/panel/media/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setBlogForm((current) => ({ ...current, cover_image_path: response.data.path }));
      setMessage("Kapak gorseli yuklendi.");
    } catch (error) {
      console.error("Kapak gorseli yuklenemedi", error);
      setErrorMessage("Kapak gorseli yuklenemedi. Yetki, dosya turu veya R2 ayarlarini kontrol edin.");
    } finally {
      setUploadingBlogCover(false);
    }
  };

  const handleFaqSave = async () => {
    const permission = editingFaqId ? "content.faq.update" : "content.faq.create";
    if (!hasPermission(permission) || !hasGlobalScope(permission)) {
      setErrorMessage("Bu global icerik islemi icin tum sistem kapsami gerekir.");
      return;
    }

    setSaving(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      if (editingFaqId) {
        await api.put(`/panel/content/faqs/${editingFaqId}`, faqForm);
        setMessage("SSS maddesi guncellendi.");
      } else {
        await api.post("/panel/content/faqs", faqForm);
        setMessage("SSS maddesi olusturuldu.");
      }

      setFaqForm(emptyFaq);
      setEditingFaqId(null);
      await loadContent();
    } catch (error) {
      console.error("SSS kaydedilemedi", error);
      setErrorMessage("SSS kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  };

  const normalizePersonalityTemplate = (template: PersonalityTemplate): PersonalityForm => ({
    name: template.name,
    description: template.description ?? "",
    is_active: Boolean(template.is_active),
    questions: (Array.isArray(template.questions) && template.questions.length > 0 ? template.questions : [emptyPersonalityQuestion()]).map(
      (question, index) => ({
        question_key: question.question_key,
        category: question.category,
        text: question.text,
        sort_order: question.sort_order || index + 1,
      }),
    ),
    result_ranges: (template.result_ranges ?? template.resultRanges ?? []).map((range) => ({
      category: range.category,
      summary: range.summary,
    })),
  });

  const resetPersonalityForm = () => {
    setEditingPersonalityId(null);
    setPersonalityForm({
      ...emptyPersonalityForm,
      questions: [emptyPersonalityQuestion()],
      result_ranges: [emptyPersonalityRange()],
    });
  };

  const handlePersonalitySave = async () => {
    if (!canPersonalityManage) {
      setErrorMessage("Kisilik analizi sablonu icin global content.personality.manage veya ayar guncelleme yetkisi gerekir.");
      return;
    }

    const payload = {
      ...personalityForm,
      questions: personalityForm.questions.map((question, index) => ({
        ...question,
        sort_order: Number(question.sort_order) || index + 1,
      })),
      result_ranges: personalityForm.result_ranges.filter((range) => range.category.trim() && range.summary.trim()),
    };

    setSaving(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      if (editingPersonalityId) {
        await api.put(`/panel/personality-test-templates/${editingPersonalityId}`, payload);
        setMessage("Kisilik analizi sablonu guncellendi.");
      } else {
        await api.post("/panel/personality-test-templates", payload);
        setMessage("Kisilik analizi sablonu olusturuldu.");
      }

      resetPersonalityForm();
      await loadContent();
    } catch (error) {
      console.error("Kisilik analizi sablonu kaydedilemedi", error);
      setErrorMessage("Kisilik analizi sablonu kaydedilemedi. Zorunlu alanlari ve soru anahtarlarini kontrol edin.");
    } finally {
      setSaving(false);
    }
  };

  const editBlog = (blog: BlogPost) => {
    setEditingBlogId(blog.id);
    setBlogForm({
      title: blog.title,
      slug: blog.slug,
      excerpt: blog.excerpt ?? "",
      content: blog.content,
      cover_image_path: blog.cover_image_path ?? "",
      category_id: blog.category_id ? String(blog.category_id) : "",
      project_id: blog.project_id ? String(blog.project_id) : "",
      status: blog.status,
      published_at: blog.published_at ? blog.published_at.slice(0, 10) : "",
    });
  };

  const editFaq = (faq: FaqItem) => {
    setEditingFaqId(faq.id);
    setFaqForm({
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
      order: faq.order,
    });
  };

  const editPersonalityTemplate = (template: PersonalityTemplate) => {
    setEditingPersonalityId(template.id);
    setPersonalityForm(normalizePersonalityTemplate(template));
    setActiveModule("personality");
  };

  const deleteBlog = async (id: number) => {
    if (!canBlogDelete) {
      setErrorMessage("Blog silmek icin content.blog.delete izni ve kapsam gerekir.");
      return;
    }
    try {
      await api.delete(`/panel/content/blogs/${id}`);
      setMessage("Blog yazisi silindi.");
      await loadContent();
    } catch (error) {
      console.error("Blog silinemedi", error);
      setErrorMessage("Blog silinemedi.");
    }
  };

  const shareBlog = async (blog: BlogPost) => {
    if (!canSocialShare) {
      setErrorMessage("Sosyal paylasim icin global icerik duzenleme veya duyuru olusturma yetkisi gerekir.");
      return;
    }

    setSharingBlogId(blog.id);
    setMessage(null);
    setErrorMessage(null);

    const url = `${window.location.origin}/blog/${blog.slug}`;
    const imageUrl = blog.cover_image_path?.startsWith("http") ? blog.cover_image_path : undefined;

    try {
      const response = await api.post<{ message: string; shared: boolean }>("/panel/social-sharing/post", {
        text: [blog.title, blog.excerpt].filter(Boolean).join("\n\n"),
        url,
        image_url: imageUrl,
        platforms: ["instagram", "twitter", "linkedin"],
      });

      if (response.data.shared) {
        setMessage(response.data.message);
      } else {
        setErrorMessage(response.data.message);
      }
    } catch (error) {
      console.error("Sosyal paylasim gonderilemedi", error);
      setErrorMessage("Sosyal paylasim gonderilemedi. Webhook ayarini ve ag baglantisini kontrol edin.");
    } finally {
      setSharingBlogId(null);
    }
  };

  const deleteFaq = async (id: number) => {
    if (!canFaqDelete) {
      setErrorMessage("SSS silmek icin content.faq.delete izninin tum sistem kapsaminda olmasi gerekir.");
      return;
    }
    try {
      await api.delete(`/panel/content/faqs/${id}`);
      setMessage("SSS maddesi silindi.");
      await loadContent();
    } catch (error) {
      console.error("SSS silinemedi", error);
      setErrorMessage("SSS silinemedi.");
    }
  };

  const activatePersonalityTemplate = async (id: number) => {
    if (!canPersonalityManage) {
      setErrorMessage("Sablon aktif etmek icin global kisilik analizi yonetim yetkisi gerekir.");
      return;
    }

    try {
      await api.post(`/panel/personality-test-templates/${id}/activate`);
      setMessage("Kisilik analizi sablonu aktif edildi.");
      await loadContent();
    } catch (error) {
      console.error("Kisilik analizi sablonu aktif edilemedi", error);
      setErrorMessage("Kisilik analizi sablonu aktif edilemedi.");
    }
  };

  const deletePersonalityTemplate = async (template: PersonalityTemplate) => {
    if (!canPersonalityManage) {
      setErrorMessage("Sablon silmek icin global kisilik analizi yonetim yetkisi gerekir.");
      return;
    }

    if (template.is_active) {
      setErrorMessage("Aktif kisilik analizi sablonu silinemez. Once baska bir sablonu aktif edin.");
      return;
    }

    try {
      await api.delete(`/panel/personality-test-templates/${template.id}`);
      setMessage("Kisilik analizi sablonu silindi.");
      if (editingPersonalityId === template.id) {
        resetPersonalityForm();
      }
      await loadContent();
    } catch (error) {
      console.error("Kisilik analizi sablonu silinemedi", error);
      setErrorMessage("Kisilik analizi sablonu silinemedi.");
    }
  };

  const activeModuleLabel = CONTENT_MODULES.find((m) => m.id === activeModule)?.label ?? "";

  if (!canViewContent) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-600 shadow-sm">
        Icerik yonetimi icin{" "}
        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">content.view</code> izni ve kullanilabilir scope gerekir.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      <header className="flex flex-col gap-4 border-b border-slate-200/80 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/25">
            <LayoutList className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Icerik yonetimi</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Public blog kayitlari global veya proje sahipligiyle yonetilir. SSS ve site geneli icerikler global scope ister.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {hasPermission("content.blog.export") && hasScopedPermission("content.blog.export") ? (
            <ExportButtons endpoint="/panel/content/blogs/export" filename="blog_yazilari" buttonLabel="Bloglari disa aktar" />
          ) : null}
          {hasPermission("content.faq.export") && hasGlobalScope("content.faq.export") ? (
            <ExportButtons endpoint="/panel/content/faqs/export" filename="sss_listesi" buttonLabel="SSSleri disa aktar" />
          ) : null}
        </div>
      </header>

      {message ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{message}</div>
      ) : null}
      {errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{errorMessage}</div>
      ) : null}

      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setMobileNavOpen((o) => !o)}
          className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-900 shadow-sm"
        >
          <span>Modul: {activeModuleLabel}</span>
          <ChevronDown className={`h-5 w-5 text-slate-500 transition ${mobileNavOpen ? "rotate-180" : ""}`} />
        </button>
        {mobileNavOpen ? (
          <div className="mt-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            <nav className="flex flex-col gap-1" aria-label="Icerik modulleri">
              {CONTENT_MODULES.map((mod) => {
                const Icon = mod.icon;
                const active = activeModule === mod.id;
                return (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => {
                      setActiveModule(mod.id);
                      setMobileNavOpen(false);
                    }}
                    className={`flex w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                      active
                        ? "border-indigo-300 bg-indigo-50 shadow-sm"
                        : "border-transparent hover:border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                        active ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span>
                      <span className={`block text-sm font-semibold ${active ? "text-indigo-950" : "text-slate-800"}`}>
                        {mod.label}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500">{mod.description}</span>
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-4 rounded-2xl border border-slate-200/80 bg-white p-2 shadow-sm">
            <nav className="flex flex-col gap-1" aria-label="Icerik modulleri">
              {CONTENT_MODULES.map((mod) => {
                const Icon = mod.icon;
                const active = activeModule === mod.id;
                return (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => setActiveModule(mod.id)}
                    className={`flex w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                      active
                        ? "border-indigo-300 bg-indigo-50 shadow-sm"
                        : "border-transparent hover:border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                        active ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className={`block text-sm font-semibold ${active ? "text-indigo-950" : "text-slate-800"}`}>
                        {mod.label}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500">{mod.description}</span>
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        <div className="min-w-0 flex-1 space-y-8">
          {activeModule === "blog" ? (
            <>
              <div className={`${panelShell} space-y-5`}>
                <div className="flex items-center gap-3">
                  <FileText className="h-6 w-6 text-indigo-600" />
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Blog formu</h2>
                    <p className="text-xs text-slate-500">Yeni yazi veya secili yazinin guncellenmesi.</p>
                  </div>
                </div>
                {blogFieldsDisabled ? (
                  <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    Form alanlari kilitli: olusturmak icin <code className="text-[11px]">content.blog.create</code>, duzenlemek icin{" "}
                    <code className="text-[11px]">content.blog.update</code> izni ve kullanilabilir scope gerekir.
                  </p>
                ) : null}
                <Field label="Baslik">
                  <input
                    disabled={blogFieldsDisabled}
                    value={blogForm.title}
                    onChange={(e) => setBlogForm((c) => ({ ...c, title: e.target.value }))}
                    className={fieldBase}
                    placeholder="Baslik"
                  />
                </Field>
                <Field label="Slug" hint="Bos birakilirsa backend genelde otomatik uretir.">
                  <input
                    disabled={blogFieldsDisabled}
                    value={blogForm.slug}
                    onChange={(e) => setBlogForm((c) => ({ ...c, slug: e.target.value }))}
                    className={fieldBase}
                    placeholder="ornek-yazi"
                  />
                </Field>
                <Field label="Kapak gorsel URL">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      disabled={blogFieldsDisabled}
                      value={blogForm.cover_image_path}
                      onChange={(e) => setBlogForm((c) => ({ ...c, cover_image_path: e.target.value }))}
                      className={fieldBase}
                    />
                    <label className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-800 transition hover:bg-indigo-100 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50">
                      {uploadingBlogCover ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      R2&apos;ye yukle
                      <input
                        type="file"
                        disabled={blogFieldsDisabled || uploadingBlogCover}
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => void handleBlogCoverUpload(e.target.files?.[0] ?? null)}
                      />
                    </label>
                  </div>
                </Field>
                <Field label="Ozet">
                  <textarea
                    disabled={blogFieldsDisabled}
                    value={blogForm.excerpt}
                    onChange={(e) => setBlogForm((c) => ({ ...c, excerpt: e.target.value }))}
                    rows={3}
                    className={fieldBase}
                  />
                </Field>
                <Field label="Icerik">
                  <textarea
                    disabled={blogFieldsDisabled}
                    value={blogForm.content}
                    onChange={(e) => setBlogForm((c) => ({ ...c, content: e.target.value }))}
                    rows={10}
                    className={fieldBase}
                  />
                </Field>
                <div className="grid gap-4 md:grid-cols-4">
                  <Field label="Sahiplik">
                    <select
                      disabled={blogFieldsDisabled}
                      value={blogForm.project_id}
                      onChange={(e) => setBlogForm((c) => ({ ...c, project_id: e.target.value }))}
                      className={fieldBase}
                    >
                      {(editingBlogId ? canUpdateGlobalBlog : canCreateGlobalBlog) ? <option value="">Global blog</option> : null}
                      {contentProjects.map((project) => (
                        <option key={project.id} value={String(project.id)}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Kategori">
                    <select
                      disabled={blogFieldsDisabled}
                      value={blogForm.category_id}
                      onChange={(e) => setBlogForm((c) => ({ ...c, category_id: e.target.value }))}
                      className={fieldBase}
                    >
                      <option value="">Secin</option>
                      {categories.map((category) => (
                        <option key={category.id} value={String(category.id)}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Durum">
                    <select
                      disabled={blogFieldsDisabled}
                      value={blogForm.status}
                      onChange={(e) => setBlogForm((c) => ({ ...c, status: e.target.value as "draft" | "published" }))}
                      className={fieldBase}
                    >
                      <option value="draft">Taslak</option>
                      <option value="published">Yayinda</option>
                    </select>
                  </Field>
                  <Field label="Yayin tarihi">
                    <input
                      disabled={blogFieldsDisabled}
                      type="date"
                      value={blogForm.published_at}
                      onChange={(e) => setBlogForm((c) => ({ ...c, published_at: e.target.value }))}
                      className={fieldBase}
                    />
                  </Field>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleBlogSave()}
                    disabled={
                      saving ||
                      !(editingBlogId ? hasPermission("content.blog.update") : hasPermission("content.blog.create")) ||
                      !(editingBlogId ? hasScopedPermission("content.blog.update") : hasScopedPermission("content.blog.create"))
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingBlogId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    {editingBlogId ? "Guncelle" : "Olustur"}
                  </button>
                  {editingBlogId ? (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingBlogId(null);
                        setBlogForm(emptyBlog);
                      }}
                      className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800"
                    >
                      Iptal
                    </button>
                  ) : null}
                </div>
              </div>

              <div className={`${panelShell} space-y-4`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-lg font-bold text-slate-900">Mevcut bloglar</h2>
                  <div className="relative max-w-md flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={blogSearch}
                      onChange={(e) => setBlogSearch(e.target.value)}
                      placeholder="Baslik, slug veya ozet ara..."
                      className={`${fieldBase} pl-9`}
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  {filteredBlogs.length === 0 ? (
                    <p className="text-sm text-slate-500">Sonuc yok.</p>
                  ) : null}
                  {filteredBlogs.map((blog) => (
                    <div
                      key={blog.id}
                      className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 sm:flex-row sm:items-start sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900">{blog.title}</div>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                          <span className="rounded-full bg-white px-2 py-0.5 ring-1 ring-slate-200">{blog.category?.name || "Kategori yok"}</span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700 ring-1 ring-slate-200">
                            {blog.project?.name || "Global"}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 ring-1 ${
                              blog.status === "published" ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-blue-50 text-blue-800 ring-blue-200"
                            }`}
                          >
                            {blog.status}
                          </span>
                          <span className="truncate text-slate-400">/{blog.slug}</span>
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        {canSocialShare && blog.status === "published" ? (
                          <button
                            type="button"
                            onClick={() => void shareBlog(blog)}
                            disabled={sharingBlogId === blog.id}
                            className="rounded-xl border border-indigo-200 bg-indigo-50 p-2 text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
                            aria-label="Sosyal medyada paylas"
                          >
                            {sharingBlogId === blog.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
                          </button>
                        ) : null}
                        {canBlogUpdate && (canUpdateGlobalBlog || blog.project_id != null) ? (
                          <button
                            type="button"
                            onClick={() => editBlog(blog)}
                            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-800 shadow-sm hover:bg-slate-50"
                            aria-label="Duzenle"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        ) : null}
                        {canBlogDelete && (hasGlobalScope("content.blog.delete") || blog.project_id != null) ? (
                          <button
                            type="button"
                            onClick={() => void deleteBlog(blog.id)}
                            className="rounded-xl border border-red-200 bg-red-50 p-2 text-red-700 hover:bg-red-100"
                            aria-label="Sil"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : null}

          {activeModule === "faq" ? (
            <>
              <div className={`${panelShell} space-y-5`}>
                <div className="flex items-center gap-3">
                  <HelpCircle className="h-6 w-6 text-indigo-600" />
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">SSS formu</h2>
                    <p className="text-xs text-slate-500">Kategori ile gruplanir; sira alani listeleme duzenini etkiler.</p>
                  </div>
                </div>
                {faqFieldsDisabled ? (
                  <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    Form alanlari kilitli: <code className="text-[11px]">content.faq.create</code> veya{" "}
                    <code className="text-[11px]">content.faq.update</code> (all) gerekir.
                  </p>
                ) : null}
                <Field label="Kategori">
                  <input
                    disabled={faqFieldsDisabled}
                    value={faqForm.category}
                    onChange={(e) => setFaqForm((c) => ({ ...c, category: e.target.value }))}
                    className={fieldBase}
                    placeholder="Ornek: Basvuru"
                  />
                </Field>
                <Field label="Soru">
                  <input
                    disabled={faqFieldsDisabled}
                    value={faqForm.question}
                    onChange={(e) => setFaqForm((c) => ({ ...c, question: e.target.value }))}
                    className={fieldBase}
                  />
                </Field>
                <Field label="Cevap">
                  <textarea
                    disabled={faqFieldsDisabled}
                    value={faqForm.answer}
                    onChange={(e) => setFaqForm((c) => ({ ...c, answer: e.target.value }))}
                    rows={6}
                    className={fieldBase}
                  />
                </Field>
                <Field label="Sira">
                  <input
                    disabled={faqFieldsDisabled}
                    type="number"
                    value={faqForm.order}
                    onChange={(e) => setFaqForm((c) => ({ ...c, order: Number(e.target.value) }))}
                    className={fieldBase}
                  />
                </Field>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleFaqSave()}
                    disabled={
                      saving ||
                      !(editingFaqId ? hasPermission("content.faq.update") : hasPermission("content.faq.create")) ||
                      !(editingFaqId ? hasGlobalScope("content.faq.update") : hasGlobalScope("content.faq.create"))
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingFaqId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    {editingFaqId ? "Guncelle" : "Ekle"}
                  </button>
                  {editingFaqId ? (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingFaqId(null);
                        setFaqForm(emptyFaq);
                      }}
                      className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800"
                    >
                      Iptal
                    </button>
                  ) : null}
                </div>
              </div>

              <div className={`${panelShell} space-y-4`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-lg font-bold text-slate-900">Mevcut SSS</h2>
                  <div className="relative max-w-md flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={faqSearch}
                      onChange={(e) => setFaqSearch(e.target.value)}
                      placeholder="Soru, cevap veya kategori ara..."
                      className={`${fieldBase} pl-9`}
                    />
                  </div>
                </div>
                <div className="space-y-6">
                  {Object.keys(filteredFaqGroups).length === 0 ? (
                    <p className="text-sm text-slate-500">Sonuc yok.</p>
                  ) : null}
                  {Object.entries(filteredFaqGroups).map(([category, items]) => (
                    <div key={category}>
                      <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-indigo-600">{category}</h3>
                      <div className="space-y-3">
                        {items.map((faq) => (
                          <div
                            key={faq.id}
                            className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 sm:flex-row sm:items-start sm:justify-between"
                          >
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900">{faq.question}</div>
                              <div className="mt-1 text-xs text-slate-500">Sira: {faq.order}</div>
                            </div>
                            <div className="flex shrink-0 gap-2">
                              {canFaqUpdate ? (
                                <button
                                  type="button"
                                  onClick={() => editFaq(faq)}
                                  className="rounded-xl border border-slate-200 bg-white p-2 text-slate-800 shadow-sm hover:bg-slate-50"
                                  aria-label="Duzenle"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                              ) : null}
                              {canFaqDelete ? (
                                <button
                                  type="button"
                                  onClick={() => void deleteFaq(faq.id)}
                                  className="rounded-xl border border-red-200 bg-red-50 p-2 text-red-700 hover:bg-red-100"
                                  aria-label="Sil"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : null}

          {activeModule === "personality" ? (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]">
              <div className={`${panelShell} space-y-4`}>
                <div className="flex items-center gap-3">
                  <BrainCircuit className="h-6 w-6 text-indigo-600" />
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Kisilik analizi sablonlari</h2>
                    <p className="text-xs text-slate-500">Aktif sablon ogrenci ve mezun panelindeki testi besler.</p>
                  </div>
                </div>
                {personalityTemplates.length === 0 ? (
                  <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">Henuz sablon yok.</p>
                ) : null}
                <div className="space-y-3">
                  {personalityTemplates.map((template) => (
                    <div key={template.id} className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-slate-900">{template.name}</h3>
                            {template.is_active ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Aktif
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs text-slate-500">{template.description || "Aciklama yok."}</p>
                          <div className="mt-2 text-xs text-slate-500">
                            {template.questions?.length ?? 0} soru / {(template.result_ranges ?? template.resultRanges ?? []).length} sonuc metni
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          {canPersonalityManage && !template.is_active ? (
                            <button
                              type="button"
                              onClick={() => void activatePersonalityTemplate(template.id)}
                              className="rounded-xl border border-emerald-200 bg-emerald-50 p-2 text-emerald-700 hover:bg-emerald-100"
                              aria-label="Aktif et"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => editPersonalityTemplate(template)}
                            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-800 shadow-sm hover:bg-slate-50"
                            aria-label="Duzenle"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          {canPersonalityManage ? (
                            <button
                              type="button"
                              onClick={() => void deletePersonalityTemplate(template)}
                              disabled={template.is_active}
                              className="rounded-xl border border-red-200 bg-red-50 p-2 text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                              aria-label="Sil"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`${panelShell} space-y-5`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-center gap-3">
                    <BrainCircuit className="h-6 w-6 text-indigo-600" />
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">
                        {editingPersonalityId ? "Sablonu duzenle" : "Yeni sablon"}
                      </h2>
                      <p className="text-xs text-slate-500">Soru anahtarlari kucuk harf, rakam ve alt cizgi kullanmali.</p>
                    </div>
                  </div>
                  {editingPersonalityId ? (
                    <button
                      type="button"
                      onClick={resetPersonalityForm}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800"
                    >
                      <X className="h-4 w-4" />
                      Temizle
                    </button>
                  ) : null}
                </div>

                {personalityFieldsDisabled ? (
                  <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    Form alanlari kilitli: <code className="text-[11px]">content.personality.manage</code>,{" "}
                    <code className="text-[11px]">content.site_settings.update</code> veya <code className="text-[11px]">settings.update</code>{" "}
                    izninin all kapsaminda olmasi gerekir.
                  </p>
                ) : null}

                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
                  <Field label="Sablon adi">
                    <input
                      disabled={personalityFieldsDisabled}
                      value={personalityForm.name}
                      onChange={(e) => setPersonalityForm((c) => ({ ...c, name: e.target.value }))}
                      className={fieldBase}
                      placeholder="KADEME Kisilik Analizi"
                    />
                  </Field>
                  <label className="flex items-center gap-2 self-end rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      disabled={personalityFieldsDisabled}
                      checked={personalityForm.is_active}
                      onChange={(e) => setPersonalityForm((c) => ({ ...c, is_active: e.target.checked }))}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    Aktif sablon
                  </label>
                </div>
                <Field label="Aciklama">
                  <textarea
                    disabled={personalityFieldsDisabled}
                    value={personalityForm.description}
                    onChange={(e) => setPersonalityForm((c) => ({ ...c, description: e.target.value }))}
                    rows={3}
                    className={fieldBase}
                  />
                </Field>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-bold text-slate-900">Sorular</h3>
                    <button
                      type="button"
                      disabled={personalityFieldsDisabled}
                      onClick={() =>
                        setPersonalityForm((c) => ({
                          ...c,
                          questions: [...c.questions, { ...emptyPersonalityQuestion(), sort_order: c.questions.length + 1 }],
                        }))
                      }
                      className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Plus className="h-4 w-4" />
                      Soru ekle
                    </button>
                  </div>
                  {personalityForm.questions.map((question, index) => (
                    <div key={`${question.question_key || "question"}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="grid gap-3 md:grid-cols-[minmax(0,0.8fr)_minmax(0,0.8fr)_80px_auto]">
                        <input
                          disabled={personalityFieldsDisabled}
                          value={question.question_key}
                          onChange={(e) =>
                            setPersonalityForm((c) => ({
                              ...c,
                              questions: c.questions.map((item, i) => (i === index ? { ...item, question_key: e.target.value } : item)),
                            }))
                          }
                          className={fieldBase}
                          placeholder="anahtar"
                        />
                        <input
                          disabled={personalityFieldsDisabled}
                          value={question.category}
                          onChange={(e) =>
                            setPersonalityForm((c) => ({
                              ...c,
                              questions: c.questions.map((item, i) => (i === index ? { ...item, category: e.target.value } : item)),
                            }))
                          }
                          className={fieldBase}
                          placeholder="kategori"
                        />
                        <input
                          disabled={personalityFieldsDisabled}
                          type="number"
                          value={question.sort_order}
                          onChange={(e) =>
                            setPersonalityForm((c) => ({
                              ...c,
                              questions: c.questions.map((item, i) => (i === index ? { ...item, sort_order: Number(e.target.value) } : item)),
                            }))
                          }
                          className={fieldBase}
                          aria-label="Sira"
                        />
                        <button
                          type="button"
                          disabled={personalityFieldsDisabled || personalityForm.questions.length <= 1}
                          onClick={() =>
                            setPersonalityForm((c) => ({
                              ...c,
                              questions: c.questions.filter((_, i) => i !== index),
                            }))
                          }
                          className="rounded-xl border border-red-200 bg-red-50 p-2 text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label="Soruyu sil"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <textarea
                        disabled={personalityFieldsDisabled}
                        value={question.text}
                        onChange={(e) =>
                          setPersonalityForm((c) => ({
                            ...c,
                            questions: c.questions.map((item, i) => (i === index ? { ...item, text: e.target.value } : item)),
                          }))
                        }
                        rows={2}
                        className={`${fieldBase} mt-3`}
                        placeholder="Soru metni"
                      />
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-bold text-slate-900">Sonuc metinleri</h3>
                    <button
                      type="button"
                      disabled={personalityFieldsDisabled}
                      onClick={() =>
                        setPersonalityForm((c) => ({
                          ...c,
                          result_ranges: [...c.result_ranges, emptyPersonalityRange()],
                        }))
                      }
                      className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Plus className="h-4 w-4" />
                      Metin ekle
                    </button>
                  </div>
                  {personalityForm.result_ranges.map((range, index) => (
                    <div key={`${range.category || "range"}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex gap-3">
                        <input
                          disabled={personalityFieldsDisabled}
                          value={range.category}
                          onChange={(e) =>
                            setPersonalityForm((c) => ({
                              ...c,
                              result_ranges: c.result_ranges.map((item, i) => (i === index ? { ...item, category: e.target.value } : item)),
                            }))
                          }
                          className={fieldBase}
                          placeholder="kategori"
                        />
                        <button
                          type="button"
                          disabled={personalityFieldsDisabled || personalityForm.result_ranges.length <= 1}
                          onClick={() =>
                            setPersonalityForm((c) => ({
                              ...c,
                              result_ranges: c.result_ranges.filter((_, i) => i !== index),
                            }))
                          }
                          className="shrink-0 rounded-xl border border-red-200 bg-red-50 p-2 text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label="Sonuc metnini sil"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <textarea
                        disabled={personalityFieldsDisabled}
                        value={range.summary}
                        onChange={(e) =>
                          setPersonalityForm((c) => ({
                            ...c,
                            result_ranges: c.result_ranges.map((item, i) => (i === index ? { ...item, summary: e.target.value } : item)),
                          }))
                        }
                        rows={3}
                        className={`${fieldBase} mt-3`}
                        placeholder="Bu kategori one ciktiginda gosterilecek metin"
                      />
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handlePersonalitySave()}
                    disabled={saving || personalityFieldsDisabled}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingPersonalityId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    {editingPersonalityId ? "Guncelle" : "Olustur"}
                  </button>
                  <button
                    type="button"
                    onClick={resetPersonalityForm}
                    className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800"
                  >
                    Iptal
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
