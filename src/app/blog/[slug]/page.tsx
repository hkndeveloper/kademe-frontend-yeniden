"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, Calendar, Loader2 } from "lucide-react";
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
      fetchBlog();
    }
  }, [params.slug, router]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!blog) return null;

  return (
    <div className="min-h-screen bg-background pb-24 pt-12">
      <div className="container mx-auto max-w-4xl px-6">
        <Link href="/blog" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-all duration-300 hover:gap-3 hover:text-primary">
          <ArrowLeft className="h-4 w-4" />
          {copy.detail_back_label}
        </Link>

        <div className="glass-panel rounded-[32px] border border-border/60 p-8 shadow-sm transition-all duration-300 hover:shadow-lg hover:shadow-slate-900/10 md:p-12">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary">
            <BookOpen className="h-4 w-4" />
            {copy.detail_badge_label}
          </div>

          {blog.cover_image && (
            <div className="mb-8 overflow-hidden rounded-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={blog.cover_image}
                alt={blog.title}
                className="h-auto w-full rounded-2xl object-cover shadow-md"
              />
            </div>
          )}

          <h1 className="mb-4 text-4xl font-black leading-tight md:text-5xl">{blog.title}</h1>

          <div className="mb-8 flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            {new Date(blog.published_at).toLocaleDateString("tr-TR")}
          </div>

          {blog.summary && (
            <p className="mb-8 rounded-2xl border border-primary/20 bg-primary/5 p-5 text-base leading-relaxed text-muted-foreground shadow-sm">
              {blog.summary}
            </p>
          )}

          <article className="prose prose-invert max-w-none whitespace-pre-line text-muted-foreground">
            {blog.content || copy.detail_empty_content}
          </article>
        </div>
      </div>
    </div>
  );
}
