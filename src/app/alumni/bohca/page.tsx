"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Download, FileText, FileVideo, FileCode, Search, Loader2 } from "lucide-react";
import api from "@/lib/api/axios";

interface BohcaItem {
  id: number;
  title: string;
  file_path?: string | null;
  file_url?: string | null;
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
        console.error("Bohca verileri çekilemedi", error);
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

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-400">
            <BookOpen className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dijital Bohça</h1>
            <p className="text-sm text-muted-foreground">Mezun olarak erişim yetkiniz olan tüm materyaller.</p>
          </div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Döküman ara..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-black/20 py-4 pl-12 pr-4 text-slate-900 outline-none focus:border-primary"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="glass-panel flex flex-col items-center justify-center rounded-3xl py-20 text-center">
          <BookOpen className="mb-4 h-12 w-12 text-muted-foreground opacity-20" />
          <p className="text-lg font-bold text-slate-900">Materyal Bulunamadı</p>
          <p className="text-sm text-muted-foreground">Aradığınız kriterlerde bir materyal yok veya bohçanız boş.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredItems.map((item, index) => {
            const Icon = getFileIcon(item.file_type);
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="glass-panel flex flex-col justify-between rounded-3xl p-6 transition-all hover:-translate-y-1"
              >
                <div className="mb-6 flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground">
                    {new Date(item.created_at).toLocaleDateString("tr-TR")}
                  </span>
                </div>
                <div>
                  <h3 className="mb-2 text-lg font-bold text-slate-900">{item.title}</h3>
                  <p className="mb-6 text-xs text-muted-foreground">
                    Yükleyen: {item.uploader ? `${item.uploader.name} ${item.uploader.surname}` : "Sistem"}
                  </p>
                </div>
                {item.file_url || item.file_path ? (
                  <a
                    href={item.file_url || item.file_path || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 rounded-xl bg-white/5 py-3 text-sm font-bold text-slate-900 transition-colors hover:bg-primary"
                  >
                    <Download className="h-4 w-4" />
                    İndir
                  </a>
                ) : (
                  <button disabled className="flex items-center justify-center gap-2 rounded-xl bg-white/5 py-3 text-sm font-bold text-muted-foreground opacity-50 cursor-not-allowed">
                    Dosya Yok
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
