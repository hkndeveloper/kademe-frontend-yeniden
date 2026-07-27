"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, Calendar, Loader2, User } from "lucide-react";
import { PublicBadge, PublicButton, PublicCard } from "@/components/public";
import api from "@/lib/api/axios";
import { defaultSiteSettings, type SiteSettingsResponse } from "@/lib/site-config";

interface BlogDetail {
  id: number;
  title: string;
  slug: string;
  summary: string | null;
  content: string | null;
  cover_image: string | null;
  published_at: string;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Tarih yok";
  return date.toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" });
}

export default function BlogDetailPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const [blog, setBlog] = useState<BlogDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [copy, setCopy] = useState(defaultSiteSettings.blog_page);

  useEffect(() => {
    const fetchBlog = async () => {
      try {
        const [blogResponse, settingsResponse] = await Promise.all([
          api.get(`/blogs/${params.slug}`),
          api.get<SiteSettingsResponse>("/site-config").catch(() => ({ data: { settings: defaultSiteSettings } })),
        ]);
        setBlog(blogResponse.data.blog);
        setCopy(settingsResponse.data.settings?.blog_page ?? defaultSiteSettings.blog_page);
      } catch (error) {
        console.error("Blog detayı yüklenemedi", error);
        router.push("/blog");
      } finally {
        setLoading(false);
      }
    };

    if (params.slug) {
      void fetchBlog();
    }
  }, [params.slug, router]);

  if (loading) {
    return (
      <main className="kdm-public-shell flex min-h-[70vh] items-center justify-center bg-[#edecec] pt-24">
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-slate-200 bg-white/80 px-8 py-7 shadow-xl shadow-slate-900/5 backdrop-blur">
          <Loader2 className="h-10 w-10 animate-spin text-orange-600" />
          <span className="text-sm font-bold text-slate-600">Blog detayı yükleniyor...</span>
        </div>
      </main>
    );
  }

  if (!blog) return null;

  return (
    <main className="kdm-public-shell relative min-h-screen overflow-hidden bg-[#edecec] pb-24">
      <section className="relative isolate overflow-hidden px-4 pb-12 pt-36 sm:px-6 sm:pt-40 lg:pt-44">
        <div className="kdm-public-detail-hero-bg absolute inset-x-4 bottom-0 top-4 -z-10 overflow-hidden sm:inset-x-6 lg:inset-x-10">
          <Image src="/aigocy/images/section/hero-1.jpg" alt="" fill priority className="object-cover opacity-55" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_24%,rgba(255,255,255,0.9),transparent_20rem),radial-gradient(circle_at_82%_18%,rgba(253,58,37,0.15),transparent_17rem),linear-gradient(180deg,rgba(255,255,255,0.38),rgba(231,231,228,0.88))]" />
        </div>

        <div className="container relative z-10 mx-auto">
          <div className="mx-auto flex max-w-5xl flex-col items-center text-center">
            <PublicButton href="/blog" variant="secondary" size="sm" icon={<ArrowLeft className="h-4 w-4" />} iconPosition="left" className="mb-6">
              {copy.detail_back_label}
            </PublicButton>
            <PublicBadge className="mb-6 border-white/80 bg-white/90 text-[#fd3a25] shadow-[0_4px_12px_rgba(9,9,11,0.10)]">
              <BookOpen className="h-3.5 w-3.5" />
              {copy.detail_badge_label}
            </PublicBadge>
            <h1 className="max-w-5xl text-balance text-5xl font-semibold leading-[0.95] tracking-normal text-[#2f3437] sm:text-6xl lg:text-8xl">
              {blog.title}
            </h1>
            <div className="mt-8 flex flex-wrap justify-center gap-3 text-[11px] font-black uppercase tracking-[0.12em] text-slate-600">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white/86 px-4 py-3 shadow-sm backdrop-blur">
                <Calendar className="h-3.5 w-3.5 text-orange-600" />
                {formatDate(blog.published_at)}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white/86 px-4 py-3 shadow-sm backdrop-blur">
                <User className="h-3.5 w-3.5 text-orange-600" />
                KADEME Ekibi
              </span>
            </div>

          </div>

          <div className="kdm-public-media-frame relative mx-auto mt-12 max-w-6xl overflow-hidden rounded-[2rem] border-[10px] border-[#09090b] bg-[#09090b] kdm-public-dark-gradient shadow-[0_34px_90px_rgba(9,9,11,0.22)]">
            <div className="relative aspect-[16/8] min-h-[280px]">
              {blog.cover_image ? (
                <img src={blog.cover_image} alt={blog.title} className="h-full w-full object-cover" />
              ) : (
                <Image src="/aigocy/images/blog/blog-1.jpg" alt={blog.title} fill className="object-cover" sizes="(min-width: 1024px) 1100px, 100vw" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#09090b]/70 via-transparent to-transparent" />
              <div className="absolute bottom-5 left-5 right-5 flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-white/20 bg-white/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-white backdrop-blur">Blog Detayı</span>
                <span className="rounded-full bg-[#fd3a25] px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-white shadow-[0_12px_28px_rgba(253,58,37,0.35)]">KADEME</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-14 sm:px-6 lg:py-20">
        <article className="mx-auto max-w-5xl">
          <PublicCard className="p-6 sm:p-8 lg:p-10">
            {blog.summary ? (
              <div className="mb-8 rounded-[1.5rem] border border-orange-100 bg-orange-50/80 p-5 text-base font-semibold leading-8 text-slate-700">
                {blog.summary}
              </div>
            ) : null}

            <div className="prose max-w-none prose-headings:text-slate-950 prose-p:leading-8 prose-p:text-slate-700 prose-a:text-orange-700 prose-strong:text-slate-950 prose-li:text-slate-700">
              <div className="whitespace-pre-line text-base leading-8 text-slate-700">{blog.content || copy.detail_empty_content}</div>
            </div>
          </PublicCard>

          <div className="mt-8 flex justify-center">
            <Link href="/blog" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-600 shadow-sm transition hover:text-orange-700">
              <ArrowLeft className="h-4 w-4" />
              {copy.detail_back_label}
            </Link>
          </div>
        </article>
      </section>
    </main>
  );
}



