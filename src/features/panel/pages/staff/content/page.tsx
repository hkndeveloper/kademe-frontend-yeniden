"use client";

import { useEffect, useState } from "react";
import { FileText, MessageSquare, Newspaper, ShieldAlert } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api/axios";
import { PermissionGate } from "@/components/shared/PermissionGate";

interface BlogItem {
  id: number;
  title: string;
  slug: string;
  excerpt?: string | null;
  created_at?: string;
}

interface FaqItem {
  id: number;
  question: string;
  answer: string;
  category?: string | null;
}

export default function StaffContentPage() {
  const [activeTab, setActiveTab] = useState<"blog" | "faq">("blog");
  const [blogs, setBlogs] = useState<BlogItem[]>([]);
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const loadData = async () => {
        try {
          const [blogResponse, faqResponse] = await Promise.all([api.get("/blogs"), api.get("/faqs")]);
          const blogItems = Array.isArray(blogResponse.data?.blogs?.data)
            ? blogResponse.data.blogs.data
            : Array.isArray(blogResponse.data?.blogs)
              ? blogResponse.data.blogs
              : [];
          const faqItems = Array.isArray(faqResponse.data?.faqs) ? faqResponse.data.faqs : [];
          setBlogs(blogItems);
          setFaqs(faqItems);
        } catch (error) {
          console.error("Staff icerik verileri yuklenemedi", error);
        } finally {
          setLoading(false);
        }
      };

      void loadData();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <PermissionGate
      permission="content.view"
      fallback={
        <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 px-6 py-8 text-center text-sm text-amber-100">
          Icerik modulunu goruntuleme yetkiniz bulunmuyor.
        </div>
      }
    >
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-400">
            <Newspaper className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Icerik Yonetimi</h1>
            <p className="text-sm text-muted-foreground">
              Mevcut public icerigi takip et, yayinlanan blog ve SSS akisini izle.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 p-6 text-sm text-amber-200">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
          <p>
            Personel hesabiyla dogrudan icerik CRUD yetkisi bulunmuyor. Bu ekran, canli public icerigi takip etmek ve
            editorluk ihtiyaclarini koordinator veya admin ekibine dogru iletmek icin read-only calisir.
          </p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveTab("blog")}
          className={`flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-bold transition-colors ${
            activeTab === "blog"
              ? "bg-indigo-600 text-white"
              : "bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-slate-900"
          }`}
        >
          <FileText className="h-4 w-4" />
          Blog Yazilari
        </button>
        <button
          onClick={() => setActiveTab("faq")}
          className={`flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-bold transition-colors ${
            activeTab === "faq"
              ? "bg-indigo-600 text-white"
              : "bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-slate-900"
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          SSS
        </button>
      </div>

      <div className="glass-panel rounded-3xl p-8">
        {loading ? (
          <div className="text-center text-sm text-muted-foreground">Icerikler yukleniyor...</div>
        ) : activeTab === "blog" ? (
          blogs.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground">Yayinlanmis blog yazisi bulunmuyor.</div>
          ) : (
            <div className="space-y-4">
              {blogs.slice(0, 8).map((blog) => (
                <Link
                  key={blog.id}
                  href={`/blog/${blog.slug}`}
                  className="block rounded-2xl border border-white/5 bg-white/5 p-4 transition-colors hover:bg-white/10"
                >
                  <div className="text-lg font-bold text-slate-900">{blog.title}</div>
                  <div className="mt-2 text-sm text-muted-foreground">{blog.excerpt || "Ozet metni bulunmuyor."}</div>
                  {blog.created_at && (
                    <div className="mt-3 text-[10px] uppercase tracking-widest text-indigo-400">
                      {new Date(blog.created_at).toLocaleDateString("tr-TR")}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )
        ) : faqs.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground">Kayitli soru-cevap bulunmuyor.</div>
        ) : (
          <div className="space-y-4">
            {faqs.slice(0, 8).map((faq) => (
              <div key={faq.id} className="rounded-2xl border border-white/5 bg-white/5 p-4">
                <div className="text-sm font-bold text-slate-900">{faq.question}</div>
                <div className="mt-2 text-sm text-muted-foreground">{faq.answer}</div>
                {faq.category && (
                  <div className="mt-3 text-[10px] uppercase tracking-widest text-indigo-400">{faq.category}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    </PermissionGate>
  );
}
