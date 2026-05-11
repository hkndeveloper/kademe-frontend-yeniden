"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ExternalLink, Handshake, Loader2 } from "lucide-react";
import api from "@/lib/api/axios";

export type OpportunityItem = {
  id: number;
  title: string;
  kind: string;
  summary?: string | null;
  body?: string | null;
  link_url?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  published_at?: string | null;
  project?: { id: number; name: string } | null;
};

const KIND_LABEL: Record<string, string> = {
  internship: "Staj",
  network: "Ag / Network",
  event: "Etkinlik",
  other: "Diger",
};

export function OpportunitiesPortalPage() {
  const [items, setItems] = useState<OpportunityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get<{ opportunities: OpportunityItem[] }>("/alumni-opportunities");
        setItems(res.data.opportunities ?? []);
      } catch (e) {
        console.error("Firsatlar yuklenemedi", e);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-primary">
          <Handshake className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Kariyer ve ag firsatlari</h1>
          <p className="text-sm text-muted-foreground">
            KADEME ve proje kapsaminda paylasilan staj, etkinlik ve network duyurulari.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {items.length === 0 ? (
          <div className="glass-panel rounded-3xl p-20 text-center text-muted-foreground">
            <Handshake className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
            Su an goruntulenebilir bir firsat kaydi bulunmuyor.
          </div>
        ) : (
          items.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="glass-panel rounded-3xl p-6 transition-colors hover:bg-white/5"
            >
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className="mb-1 inline-block rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {KIND_LABEL[item.kind] ?? item.kind}
                  </span>
                  <h3 className="text-xl font-bold text-slate-900">{item.title}</h3>
                  {item.project?.name ? (
                    <p className="mt-1 text-xs text-muted-foreground">Proje: {item.project.name}</p>
                  ) : null}
                </div>
                {item.link_url ? (
                  <a
                    href={item.link_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/20"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Detay / Baglanti
                  </a>
                ) : null}
              </div>
              {item.summary ? (
                <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">{item.summary}</p>
              ) : null}
              {item.body ? (
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">{item.body}</p>
              ) : null}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
