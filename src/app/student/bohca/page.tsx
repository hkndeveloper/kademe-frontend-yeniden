"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Download, FileText, FileVideo, FileCode, Search, Loader2 } from "lucide-react";
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

export default function StudentBohcaPage() {
  const [items, setItems] = useState<BohcaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchBohca = async () => {
      try {
        const response = await api.get<{ materials: BohcaItem[] }>("/digital-bohca");
        setItems(response.data.materials || []);
      } catch (error) {
        console.error("Bohça verileri çekilemedi", error);
      } finally {
        setLoading(false);
      }
    };
    void fetchBohca();
  }, []);

  const getFileIcon = (type?: string | null) => {
    if (!type) return FileCode;
    if (type.includes("pdf")) return FileText;
    if (type.includes("video") || type.includes("mp4")) return FileVideo;
    return FileCode;
  };

  const filteredItems = items.filter((item) => item.title.toLowerCase().includes(searchTerm.toLowerCase()));

  const downloadItem = async (item: BohcaItem) => {
    if (item.file_url) {
      window.open(item.file_url, "_blank", "noopener,noreferrer");
      return;
    }

    const endpoint = item.download_url ?? `/digital-bohca/${item.id}/download`;
    const response = await api.get(endpoint, { responseType: "blob" });
    await downloadBlobResponse(response.data, response.headers, item.title);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-primary">
            <BookOpen className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Dijital Bohça</h1>
            <p className="text-sm text-muted-foreground">Size özel paylaşılan eğitim materyalleri ve dökümanlar.</p>
          </div>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Dosya ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-border bg-input py-2.5 pr-4 pl-10 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredItems.length === 0 ? (
            <div className="glass-panel col-span-full rounded-3xl p-20 text-center">
              <p className="text-muted-foreground">Aradığınız kriterde veya paylaşılan bir dosya bulunamadı.</p>
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const Icon = getFileIcon(item.file_type);
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="glass-panel flex h-full flex-col rounded-3xl p-6 transition-all group hover:border-primary/40"
                >
                  <div className="mb-6 flex items-start justify-between">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                      <Icon className="h-8 w-8" />
                    </div>
                    <div className="rounded bg-muted px-2 py-1 text-[10px] font-bold uppercase tracking-tighter">
                      {item.file_type?.split("/")[1]?.toUpperCase() || "DOSYA"}
                    </div>
                  </div>

                  <h3 className="mb-2 line-clamp-1 text-lg font-bold">{item.title}</h3>
                  <p className="mb-6 text-xs text-muted-foreground">
                    {item.uploader ? `${item.uploader.name} ${item.uploader.surname}` : "Sistem yüklemesi"} •{" "}
                    {new Date(item.created_at).toLocaleDateString("tr-TR")}
                  </p>

                  <div className="mt-auto">
                    {item.file_url || item.download_url || item.file_path ? (
                      <button
                        onClick={() => void downloadItem(item)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-lg transition-all hover:shadow-primary/30"
                      >
                        <Download className="h-4 w-4" />
                        İndir
                      </button>
                    ) : (
                      <div className="rounded-xl bg-white/5 py-3 text-center text-sm text-muted-foreground">Dosya bağlantısı yok</div>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
