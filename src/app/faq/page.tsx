"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, HelpCircle, Loader2, MessageCircle } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api/axios";
import { defaultSiteSettings, type SiteSettingsResponse } from "@/lib/site-config";

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
  const [copy, setCopy] = useState(defaultSiteSettings.faq_page);

  useEffect(() => {
    const fetchFaqs = async () => {
      try {
        const [faqResponse, settingsResponse] = await Promise.all([
          api.get<{ faqs: FaqGroups }>("/faqs"),
          api.get<SiteSettingsResponse>("/site-config").catch(() => ({ data: { settings: defaultSiteSettings } })),
        ]);
        setFaqs(faqResponse.data.faqs ?? {});
        setCopy(settingsResponse.data.settings?.faq_page ?? defaultSiteSettings.faq_page);
      } catch (error) {
        console.error("SSS verileri cekilemedi", error);
      } finally {
        setLoading(false);
      }
    };

    void fetchFaqs();
  }, []);

  return (
    <div className="min-h-screen bg-background pb-16 pt-8 sm:pb-24 sm:pt-12">
      <div className="container mx-auto max-w-4xl px-4 sm:px-6">
        <div className="mb-10 text-center sm:mb-16">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm sm:mb-6 sm:h-16 sm:w-16">
            <HelpCircle className="h-7 w-7 sm:h-8 sm:w-8" />
          </motion.div>
          <h1 className="mb-3 text-3xl font-black text-foreground sm:mb-4 md:text-5xl">{copy.title}</h1>
          <p className="text-sm leading-6 text-muted-foreground sm:text-lg">{copy.description}</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-8 sm:space-y-12">
            {Object.keys(faqs).length === 0 ? (
              <div className="rounded-2xl border border-border bg-card/60 p-8 text-center text-sm text-muted-foreground">
                {copy.empty_text}
              </div>
            ) : Object.keys(faqs).map((category, catIndex) => (
              <div key={category} className="space-y-4">
                <h2 className="border-l-4 border-primary pl-2 text-base font-bold uppercase tracking-widest text-primary sm:text-xl">{category}</h2>
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
                        <button onClick={() => setOpenIndex(isOpen ? null : uniqueId)} className="flex w-full items-center justify-between gap-3 p-4 text-left sm:gap-4 sm:p-6">
                          <span className="font-bold text-foreground md:text-lg">{faq.question}</span>
                          <ChevronDown className={`h-5 w-5 text-primary transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
                        </button>

                        <div className={`px-4 pb-4 text-sm leading-relaxed text-muted-foreground sm:px-6 sm:pb-6 md:text-base ${isOpen ? "block" : "hidden"}`}>
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

        <div className="mt-12 rounded-2xl border border-primary/25 bg-primary/5 p-5 text-center shadow-sm sm:mt-20 sm:rounded-3xl sm:p-8">
          <h3 className="mb-2 text-xl font-bold text-foreground">{copy.contact_title}</h3>
          <p className="mb-6 text-sm text-muted-foreground">{copy.contact_description}</p>
          <Link href={copy.contact_cta_href || "/contact"} className="mx-auto inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3 font-bold text-primary-foreground shadow-md shadow-primary/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/30">
            <MessageCircle className="h-5 w-5" />
            {copy.contact_cta_label}
          </Link>
        </div>
      </div>
    </div>
  );
}
