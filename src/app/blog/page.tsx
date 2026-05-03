"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Calendar, User, ArrowRight, Loader2, Search } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api/axios";

interface Blog {
  id: number;
  title: string;
  slug: string;
  summary: string;
  cover_image: string | null;
  published_at: string;
}

interface Paginated<T> {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
}

export default function BlogPage() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetchBlogs = async () => {
      setLoading(true);
      try {
        const response = await api.get<{ blogs: Paginated<Blog> }>("/blogs", {
          params: {
            page,
            per_page: 12,
            search: searchTerm.trim() || undefined,
          },
        });
        setBlogs(response.data.blogs.data ?? []);
        setLastPage(response.data.blogs.last_page ?? 1);
        setTotal(response.data.blogs.total ?? 0);
      } catch (error) {
        console.error("Bloglar çekilemedi", error);
        setBlogs([]);
        setLastPage(1);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    };

    const timer = window.setTimeout(() => {
      void fetchBlogs();
    }, 250);

    return () => window.clearTimeout(timer);
  }, [page, searchTerm]);

  return (
    <div className="min-h-screen bg-background pb-24 pt-12">
      <div className="container mx-auto px-6">
        <div className="mb-16 text-center">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary">
            <BookOpen className="h-4 w-4" /> KADEME Rehberi
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-6 text-4xl font-black text-foreground md:text-6xl">
            Blog & Haberler
          </motion.h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Geleceğin yetenekleri için hazırladığımız makaleleri ve KADEME dünyasındaki son gelişmeleri takip edin.
          </p>
        </div>

        <div className="mx-auto mb-10 max-w-2xl">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setPage(1);
              }}
              placeholder="Blog yazisi ara..."
              className="w-full rounded-2xl border border-border bg-input py-4 pl-12 pr-6 outline-none transition-all duration-300 focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {blogs.map((blog, index) => (
              <motion.div
                key={blog.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="glass-panel flex flex-col overflow-hidden rounded-[32px] border border-border/60 shadow-sm transition-all hover:border-primary/40"
              >
                <div className="relative h-56 overflow-hidden bg-muted">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20"></div>
                </div>
                <div className="flex flex-1 flex-col p-8">
                  <div className="mb-4 flex items-center gap-4 text-xs font-bold uppercase tracking-tighter text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {new Date(blog.published_at).toLocaleDateString("tr-TR")}
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" /> KADEME Ekibi
                    </div>
                  </div>

                  <h3 className="mb-4 text-2xl font-bold leading-tight text-foreground transition-colors group-hover:text-primary">{blog.title}</h3>
                  <p className="mb-8 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{blog.summary}</p>

                  <div className="mt-auto flex items-center justify-between border-t border-border/60 pt-6">
                    <Link href={`/blog/${blog.slug}`} className="flex items-center gap-2 text-sm font-bold text-foreground transition-colors group-hover:text-primary">
                      Devamını Oku <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {!loading && total > 0 ? (
          <div className="mt-10 flex flex-col items-center justify-between gap-4 rounded-2xl border border-border bg-card/60 p-4 text-sm text-muted-foreground sm:flex-row">
            <span>{total.toLocaleString("tr-TR")} yazi icinden {blogs.length} kayit gosteriliyor.</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(current - 1, 1))}
                disabled={page <= 1}
                className="rounded-xl border border-border px-4 py-2 font-bold disabled:cursor-not-allowed disabled:opacity-50"
              >
                Onceki
              </button>
              <span className="px-3 font-bold text-foreground">{page} / {lastPage}</span>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(current + 1, lastPage))}
                disabled={page >= lastPage}
                className="rounded-xl border border-border px-4 py-2 font-bold disabled:cursor-not-allowed disabled:opacity-50"
              >
                Sonraki
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
