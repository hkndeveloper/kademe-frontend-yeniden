"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, HelpCircle, Loader2, MessageCircle } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api/axios";

interface Faq {
  id: number;
  question: string;
  answer: string;
}

type FaqGroups = Record<string, Faq[]>;

export default function FaqPage() {
  const [faqs, setFaqs] = useState<FaqGroups>({});
  const [loading, setLoading] = useState(true);
  const [openIndex, setOpenIndex] = useState<string | null>(null);

  useEffect(() => {
    const fetchFaqs = async () => {
      try {
        const response = await api.get<{ faqs: FaqGroups }>("/faqs");
        setFaqs(response.data.faqs ?? {});
      } catch (error) {
        console.error("SSS verileri cekilemedi", error);
      } finally {
        setLoading(false);
      }
    };

    void fetchFaqs();
  }, []);

  return (
    <div className="min-h-screen bg-background pt-12 pb-24">
      <div className="container mx-auto max-w-4xl px-6">
        <div className="mb-16 text-center">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm">
            <HelpCircle className="h-8 w-8" />
          </motion.div>
          <h1 className="mb-4 text-4xl font-black text-foreground md:text-5xl">Sik Sorulan Sorular</h1>
          <p className="text-lg text-muted-foreground">KADEME surecleri hakkinda merak ettiginiz temel konular burada toplanir.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-12">
            {Object.keys(faqs).map((category, catIndex) => (
              <div key={category} className="space-y-4">
                <h2 className="border-l-4 border-primary pl-2 text-xl font-bold uppercase tracking-widest text-primary">{category}</h2>
                <div className="space-y-3">
                  {faqs[category].map((faq, index) => {
                    const uniqueId = `${catIndex}-${index}`;
                    const isOpen = openIndex === uniqueId;
                    return (
                      <motion.div
                        key={faq.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`glass-panel overflow-hidden rounded-2xl border border-border/50 transition-all duration-300 ${isOpen ? "border-primary/40 bg-muted/30 shadow-md shadow-primary/10" : "hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md"}`}
                      >
                        <button onClick={() => setOpenIndex(isOpen ? null : uniqueId)} className="flex w-full items-center justify-between gap-4 p-6 text-left">
                          <span className="font-bold text-foreground md:text-lg">{faq.question}</span>
                          <ChevronDown className={`h-5 w-5 text-primary transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
                        </button>

                        <div className={`px-6 pb-6 text-sm leading-relaxed text-muted-foreground md:text-base ${isOpen ? "block" : "hidden"}`}>
                          <div className="border-t border-border/60 pt-4">{faq.answer}</div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-20 rounded-3xl border border-primary/25 bg-primary/5 p-8 text-center shadow-sm">
          <h3 className="mb-2 text-xl font-bold text-foreground">Baska bir sorunuz mu var?</h3>
          <p className="mb-6 text-sm text-muted-foreground">Aradiginiz cevabi bulamadiysaniz iletisim veya destek kanalina gecebilirsiniz.</p>
          <Link href="/contact" className="mx-auto inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3 font-bold text-primary-foreground shadow-md shadow-primary/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/30">
            <MessageCircle className="h-5 w-5" />
            Iletisime Gec
          </Link>
        </div>
      </div>
    </div>
  );
}
