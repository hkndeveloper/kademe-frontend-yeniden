"use client";

import { useEffect, useState } from "react";
import { BookOpen, Download, FileCode, FileText, FileVideo, Loader2, Search } from "lucide-react";
import api from "@/lib/api/axios";

interface BohcaItem {
  id: number;
  title: string;
  file_path?: string | null;
  file_type?: string | null;
  created_at: string;
  uploader?: {
    name: string;
    surname: string;
  };
}

export default function AlumniPortfolioPage() {
  const [items, setItems] = useState<BohcaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const fetchBohca = async () => {
      try {
        const response = await api.get<{ materials: BohcaItem[] }>("/digital-bohca");
        setItems(response.data.materials ?? []);
      } catch (error) {
        console.error("Alumni bohca verileri cekilemedi", error);
        setErrorMessage("Bu hesap icin dijital bohca verisi getirilemedi.");
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

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-600/20 text-purple-400">
            <BookOpen className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900">Dijital Bohca</h1>
            <p className="mt-1 text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Mezun hesapta erisilebilen dosyalar `/digital-bohca` endpointinden geliyor
            </p>
          </div>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Dosya ara..."
            className="w-full rounded-xl border border-border bg-input py-3 pl-12 pr-4 text-sm outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {errorMessage && <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">{errorMessage}</div>}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredItems.length === 0 ? (
          <div className="glass-panel col-span-full rounded-3xl p-16 text-center text-muted-foreground">
            Mezun hesap icin goruntulenebilir dosya bulunmuyor.
          </div>
        ) : (
          filteredItems.map((item) => {
            const Icon = getFileIcon(item.file_type);
            return (
              <div key={item.id} className="glass-panel flex flex-col rounded-3xl p-6">
                <div className="mb-6 flex items-start justify-between">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-muted-foreground">
                    <Icon className="h-8 w-8" />
                  </div>
                  <div className="rounded bg-white/5 px-2 py-1 text-[10px] font-bold uppercase tracking-tighter text-muted-foreground">
                    {item.file_type?.split("/")[1]?.toUpperCase() || "DOSYA"}
                  </div>
                </div>

                <h3 className="mb-2 text-lg font-bold text-slate-900">{item.title}</h3>
                <p className="mb-6 text-xs text-muted-foreground">
                  {item.uploader ? `${item.uploader.name} ${item.uploader.surname}` : "Sistem"} - {new Date(item.created_at).toLocaleDateString("tr-TR")}
                </p>

                <div className="mt-auto">
                  {item.file_path ? (
                    <button
                      onClick={() => window.open(item.file_path || "", "_blank")}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 py-3 text-sm font-bold text-white transition-colors hover:bg-purple-500"
                    >
                      <Download className="h-4 w-4" />
                      Dosyayi Ac
                    </button>
                  ) : (
                    <div className="rounded-xl bg-white/5 py-3 text-center text-sm text-muted-foreground">Dosya baglantisi yok</div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
