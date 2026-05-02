"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, HelpCircle, Loader2, Pencil, Plus, Save, Trash2 } from "lucide-react";
import api from "@/lib/api/axios";
import { ExportButtons } from "@/components/shared/ExportButtons";
import { useAuth } from "@/store/useAuth";
import { usePermissions } from "@/hooks/usePermissions";

interface BlogCategory {
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
}

const emptyBlog = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  cover_image_path: "",
  category_id: "",
  status: "draft" as "draft" | "published",
  published_at: "",
};

const emptyFaq = {
  question: "",
  answer: "",
  category: "",
  order: 0,
};

export default function AdminContentPage() {
  const { hasPermission } = useAuth();
  const { hasGlobalScope } = usePermissions();
  const canViewContent = hasPermission("content.view") && hasGlobalScope("content.view");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [blogForm, setBlogForm] = useState(emptyBlog);
  const [faqForm, setFaqForm] = useState(emptyFaq);
  const [editingBlogId, setEditingBlogId] = useState<number | null>(null);
  const [editingFaqId, setEditingFaqId] = useState<number | null>(null);

  useEffect(() => {
    if (!canViewContent) {
      return;
    }

    const loadContent = async () => {
      try {
        const response = await api.get<ContentResponse>("/panel/content");
        setBlogs(response.data.blogs ?? []);
        setCategories(response.data.categories ?? []);
        setFaqs(response.data.faqs ?? []);
      } catch (error) {
        console.error("Icerik verileri yuklenemedi", error);
        setErrorMessage("Icerik verileri yuklenemedi.");
      } finally {
        setLoading(false);
      }
    };

    loadContent().catch((error) => {
      console.error("Icerik verileri yuklenemedi", error);
      setErrorMessage("Icerik verileri yuklenemedi.");
      setLoading(false);
    });
  }, [canViewContent]);

  const loadContent = async () => {
    try {
      const response = await api.get<ContentResponse>("/panel/content");
      setBlogs(response.data.blogs ?? []);
      setCategories(response.data.categories ?? []);
      setFaqs(response.data.faqs ?? []);
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

  const handleBlogSave = async () => {
    const permission = editingBlogId ? "content.blog.update" : "content.blog.create";
    if (!hasPermission(permission) || !hasGlobalScope(permission)) {
      setErrorMessage("Bu global icerik islemi icin tum sistem kapsami gerekir.");
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
          published_at: blogForm.published_at || null,
        });
        setMessage("Blog yazisi guncellendi.");
      } else {
        await api.post("/panel/content/blogs", {
          ...blogForm,
          category_id: blogForm.category_id ? Number(blogForm.category_id) : null,
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

  const editBlog = (blog: BlogPost) => {
    setEditingBlogId(blog.id);
    setBlogForm({
      title: blog.title,
      slug: blog.slug,
      excerpt: blog.excerpt ?? "",
      content: blog.content,
      cover_image_path: blog.cover_image_path ?? "",
      category_id: blog.category_id ? String(blog.category_id) : "",
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

  const deleteBlog = async (id: number) => {
    try {
      await api.delete(`/panel/content/blogs/${id}`);
      setMessage("Blog yazisi silindi.");
      await loadContent();
    } catch (error) {
      console.error("Blog silinemedi", error);
      setErrorMessage("Blog silinemedi.");
    }
  };

  const deleteFaq = async (id: number) => {
    try {
      await api.delete(`/panel/content/faqs/${id}`);
      setMessage("SSS maddesi silindi.");
      await loadContent();
    } catch (error) {
      console.error("SSS silinemedi", error);
      setErrorMessage("SSS silinemedi.");
    }
  };

  if (!canViewContent) {
    return (
      <div className="glass-panel rounded-3xl p-10 text-center text-sm text-muted-foreground">
        Global icerik yonetimi icin content.view izninin tum sistem kapsaminda verilmesi gerekir.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Icerik Yonetimi</h1>
          <p className="mt-2 text-sm text-muted-foreground">Homepage ve public sayfalarda gorunen blog ve SSS iceriklerini buradan yonetebilirsin.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {hasPermission("content.blog.export") && hasGlobalScope("content.blog.export") ? (
            <ExportButtons endpoint="/panel/content/blogs/export" filename="blog_yazilari" buttonLabel="Bloglari Disa Aktar" />
          ) : null}
          {hasPermission("content.faq.export") && hasGlobalScope("content.faq.export") ? (
            <ExportButtons endpoint="/panel/content/faqs/export" filename="sss_listesi" buttonLabel="SSSleri Disa Aktar" />
          ) : null}
        </div>
      </div>

      {message ? <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-5 text-sm text-emerald-200">{message}</div> : null}
      {errorMessage ? <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-200">{errorMessage}</div> : null}

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        <div className="glass-panel space-y-4 rounded-3xl p-8">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-indigo-400" />
            <h2 className="text-xl font-bold text-slate-900">Blog Yonetimi</h2>
          </div>
          <input value={blogForm.title} onChange={(event) => setBlogForm((current) => ({ ...current, title: event.target.value }))} placeholder="Baslik" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900" />
          <input value={blogForm.slug} onChange={(event) => setBlogForm((current) => ({ ...current, slug: event.target.value }))} placeholder="Slug (bos birakirsan otomatik uretilir)" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900" />
          <input value={blogForm.cover_image_path} onChange={(event) => setBlogForm((current) => ({ ...current, cover_image_path: event.target.value }))} placeholder="Kapak gorsel URL" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900" />
          <textarea value={blogForm.excerpt} onChange={(event) => setBlogForm((current) => ({ ...current, excerpt: event.target.value }))} rows={3} placeholder="Ozet" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900" />
          <textarea value={blogForm.content} onChange={(event) => setBlogForm((current) => ({ ...current, content: event.target.value }))} rows={8} placeholder="Icerik" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <select value={blogForm.category_id} onChange={(event) => setBlogForm((current) => ({ ...current, category_id: event.target.value }))} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900">
              <option value="">Kategori secin</option>
              {categories.map((category) => (
                <option key={category.id} value={String(category.id)}>
                  {category.name}
                </option>
              ))}
            </select>
            <select value={blogForm.status} onChange={(event) => setBlogForm((current) => ({ ...current, status: event.target.value as "draft" | "published" }))} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900">
              <option value="draft">Taslak</option>
              <option value="published">Yayinda</option>
            </select>
            <input type="date" value={blogForm.published_at} onChange={(event) => setBlogForm((current) => ({ ...current, published_at: event.target.value }))} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900" />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => void handleBlogSave()}
              disabled={
                saving ||
                !(editingBlogId ? hasPermission("content.blog.update") : hasPermission("content.blog.create"))
                || !(editingBlogId ? hasGlobalScope("content.blog.update") : hasGlobalScope("content.blog.create"))
              }
              className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 font-bold text-white disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingBlogId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {editingBlogId ? "Blogu Guncelle" : "Blog Olustur"}
            </button>
            {editingBlogId ? (
              <button onClick={() => { setEditingBlogId(null); setBlogForm(emptyBlog); }} className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-bold text-slate-900">
                Iptal
              </button>
            ) : null}
          </div>
        </div>

        <div className="glass-panel space-y-4 rounded-3xl p-8">
          <div className="flex items-center gap-3">
            <HelpCircle className="h-6 w-6 text-indigo-400" />
            <h2 className="text-xl font-bold text-slate-900">SSS Yonetimi</h2>
          </div>
          <input value={faqForm.category} onChange={(event) => setFaqForm((current) => ({ ...current, category: event.target.value }))} placeholder="Kategori" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900" />
          <input value={faqForm.question} onChange={(event) => setFaqForm((current) => ({ ...current, question: event.target.value }))} placeholder="Soru" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900" />
          <textarea value={faqForm.answer} onChange={(event) => setFaqForm((current) => ({ ...current, answer: event.target.value }))} rows={6} placeholder="Cevap" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900" />
          <input type="number" value={faqForm.order} onChange={(event) => setFaqForm((current) => ({ ...current, order: Number(event.target.value) }))} placeholder="Sira" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900" />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => void handleFaqSave()}
              disabled={
                saving ||
                !(editingFaqId ? hasPermission("content.faq.update") : hasPermission("content.faq.create"))
                || !(editingFaqId ? hasGlobalScope("content.faq.update") : hasGlobalScope("content.faq.create"))
              }
              className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 font-bold text-white disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingFaqId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {editingFaqId ? "SSS Guncelle" : "SSS Ekle"}
            </button>
            {editingFaqId ? (
              <button onClick={() => { setEditingFaqId(null); setFaqForm(emptyFaq); }} className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-bold text-slate-900">
                Iptal
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        <div className="glass-panel rounded-3xl p-8">
          <h2 className="mb-6 text-xl font-bold text-slate-900">Mevcut Bloglar</h2>
          <div className="space-y-4">
            {blogs.map((blog) => (
              <div key={blog.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-bold text-slate-900">{blog.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{blog.category?.name || "Kategori yok"} • {blog.status}</div>
                  </div>
                  <div className="flex gap-2">
                    {hasPermission("content.blog.update") && hasGlobalScope("content.blog.update") ? (
                      <button type="button" onClick={() => editBlog(blog)} className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-900">
                        <Pencil className="h-4 w-4" />
                      </button>
                    ) : null}
                    {hasPermission("content.blog.delete") && hasGlobalScope("content.blog.delete") ? (
                      <button type="button" onClick={() => void deleteBlog(blog.id)} className="rounded-xl border border-red-500/20 bg-red-500/10 p-2 text-red-200">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel rounded-3xl p-8">
          <h2 className="mb-6 text-xl font-bold text-slate-900">Mevcut SSS</h2>
          <div className="space-y-6">
            {Object.entries(faqGroups).map(([category, items]) => (
              <div key={category}>
                <h3 className="mb-3 text-sm font-bold uppercase tracking-widest text-indigo-300">{category}</h3>
                <div className="space-y-3">
                  {items.map((faq) => (
                    <div key={faq.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-sm font-bold text-slate-900">{faq.question}</div>
                          <div className="mt-1 text-xs text-muted-foreground">Sira: {faq.order}</div>
                        </div>
                        <div className="flex gap-2">
                          {hasPermission("content.faq.update") && hasGlobalScope("content.faq.update") ? (
                            <button type="button" onClick={() => editFaq(faq)} className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-900">
                              <Pencil className="h-4 w-4" />
                            </button>
                          ) : null}
                          {hasPermission("content.faq.delete") && hasGlobalScope("content.faq.delete") ? (
                            <button type="button" onClick={() => void deleteFaq(faq.id)} className="rounded-xl border border-red-500/20 bg-red-500/10 p-2 text-red-200">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
