"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Download, FileCode, FileText, FileVideo, Loader2, Search } from "lucide-react";
import api from "@/lib/api/axios";
import { downloadBlobResponse } from "@/lib/download";

interface BohcaItem {
  id: number;
  title: string;
  file_path?: string | null;
  file_url?: string | null;
  download_url?: string | null;
  file_type?: string | null;
  created_at: string;
  uploader?: {
    name: string;
    surname: string;
  };
}

export default function AlumniBohcaPage() {
  const [items, setItems] = useState<BohcaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchBohca = async () => {
      try {
        const response = await api.get<{ materials: BohcaItem[] }>("/digital-bohca");
        setItems(response.data.materials || []);
      } catch (error) {
        console.error("Mezun bohca verileri cekilemedi", error);
      } finally {
        setLoading(false);
      }
    };
    void fetchBohca();
  }, []);

  const filteredItems = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase("tr-TR");
    if (!query) return items;

    return items.filter((item) =>
      [item.title, item.file_type, item.uploader?.name, item.uploader?.surname]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("tr-TR")
        .includes(query)
    );
  }, [items, searchTerm]);

  const downloadItem = async (item: BohcaItem) => {
    if (item.file_url) {
      window.open(item.file_url, "_blank", "noopener,noreferrer");
      return;
    }

    const endpoint = item.download_url ?? `/digital-bohca/${item.id}/download`;
    const response = await api.get(endpoint, { responseType: "blob" });
    await downloadBlobResponse(response.data, response.headers, item.title);
  };

  const fileTypeCounts = {
    pdf: items.filter((item) => item.file_type?.includes("pdf")).length,
    video: items.filter((item) => item.file_type?.includes("video") || item.file_type?.includes("mp4")).length,
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-primary">
            <BookOpen className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900">Dijital Bohca</h1>
            <p className="mt-1 text-sm font-bold uppercase tracking-widest text-muted-foreground">Mezun olarak erisebildigin materyaller</p>
          </div>
        </div>

        <div className="relative w-full lg:max-w-sm">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Dosya, tur veya yukleyen ara"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-2xl border border-border bg-background py-3 pl-10 pr-4 text-sm outline-none focus:border-primary"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard label="Toplam Materyal" value={items.length} />
        <SummaryCard label="PDF / Dokuman" value={fileTypeCounts.pdf} />
        <SummaryCard label="Video" value={fileTypeCounts.video} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="glass-panel col-span-full rounded-3xl border border-dashed border-border p-20 text-center">
          <BookOpen className="mx-auto mb-4 h-12 w-12 text-primary/30" />
          <p className="font-bold text-slate-900">Materyal bulunamadi</p>
          <p className="mt-1 text-sm text-muted-foreground">Aramana uygun veya paylasilmis bir dosya gorunmuyor.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredItems.map((item, index) => {
            const Icon = getFileIcon(item.file_type);
            const extension = item.file_type?.split("/")[1]?.toUpperCase() || "DOSYA";

            return (
              <motion.article
                key={item.id}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.04 }}
                className="glass-panel flex h-full flex-col overflow-hidden rounded-3xl p-0 transition-all hover:border-primary/40"
              >
                <div className="flex items-start justify-between border-b border-border bg-background/50 p-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="rounded-full bg-muted px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{extension}</span>
                </div>

                <div className="flex flex-1 flex-col p-5">
                  <h3 className="line-clamp-2 text-lg font-black text-slate-900">{item.title}</h3>
                  <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                    <p>Yukleyen: {item.uploader ? `${item.uploader.name} ${item.uploader.surname}` : "Sistem"}</p>
                    <p>Tarih: {new Date(item.created_at).toLocaleDateString("tr-TR")}</p>
                  </div>

                  <div className="mt-auto pt-5">
                    {item.file_url || item.download_url || item.file_path ? (
                      <button
                        onClick={() => void downloadItem(item)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
                      >
                        <Download className="h-4 w-4" />
                        Indir
                      </button>
                    ) : (
                      <div className="rounded-xl border border-dashed border-border py-3 text-center text-sm text-muted-foreground">Dosya baglantisi yok</div>
                    )}
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function getFileIcon(type?: string | null) {
  if (!type) return FileCode;
  if (type.includes("pdf")) return FileText;
  if (type.includes("video") || type.includes("mp4")) return FileVideo;
  return FileCode;
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-background/70 p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
    </div>
  );
}
