"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, HelpCircle, Loader2, MessageCircle, Search } from "lucide-react";
import { PublicBadge, PublicButton, PublicCard, PublicCounter, PublicHeroSection, PublicIconBadge } from "@/components/public";
import api from "@/lib/api/axios";
import { defaultSiteSettings, type SiteSettingsResponse } from "@/lib/site-config";
import { cn } from "@/lib/utils";

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
        console.error("SSS verileri çekilemedi", error);
      } finally {
        setLoading(false);
      }
    };

    void fetchFaqs();
  }, []);

  const faqCategoryEntries = Object.entries(faqs);
  const faqCount = faqCategoryEntries.reduce((sum, [, items]) => sum + items.length, 0);

  return (
    <main className="kdm-public-shell relative min-h-screen overflow-hidden bg-[#edecec] pb-24">
      <PublicHeroSection
        align="left"
        badge={
          <PublicBadge>
            <HelpCircle className="h-3.5 w-3.5" />
            Sık Sorulan Sorular
          </PublicBadge>
        }
        title={
          <h1 className="kdm-public-heading-title max-w-4xl text-balance" style={{ animation: "kdm-fade-rotate-x 0.65s cubic-bezier(0.22,1,0.36,1) both", letterSpacing: '-0.02em' }}>
            {copy.title}
          </h1>
        }
        description={
          <p className="mt-7 max-w-2xl text-base leading-8 text-[#3f4653] sm:text-lg">{copy.description}</p>
        }
        aside={
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.08 }} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:justify-self-end">
            <div className="kdm-public-stat-card">
              <div className="text-3xl font-black text-[#09090b]" style={{ fontFamily: 'Urbanist, sans-serif', letterSpacing: '0' }}><PublicCounter value={faqCount} /></div>
              <div className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#71717a]">Soru</div>
            </div>
            <div className="kdm-public-stat-card">
              <div className="text-3xl font-black text-[#fd3a25]" style={{ fontFamily: 'Urbanist, sans-serif', letterSpacing: '0' }}><PublicCounter value={faqCategoryEntries.length} /></div>
              <div className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#71717a]">Kategori</div>
            </div>
            <div className="kdm-public-stat-card col-span-2 sm:col-span-1">
              <div className="flex justify-center text-[#fd3a25]"><Search className="h-8 w-8" /></div>
              <div className="mt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#71717a]">Rehber</div>
            </div>
          </motion.div>
        }
      />

      <section className="container mx-auto px-4 py-14 sm:px-6 lg:py-20">
        <div className="mx-auto max-w-5xl">

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="flex flex-col items-center gap-4 rounded-3xl border border-slate-200 bg-white/80 px-8 py-7 shadow-xl shadow-slate-900/5 backdrop-blur">
                <Loader2 className="h-10 w-10 animate-spin text-orange-600" />
                <span className="text-sm font-bold text-slate-600">SSS verileri yükleniyor...</span>
              </div>
            </div>
          ) : faqCategoryEntries.length === 0 ? (
            <PublicCard className="py-16 text-center text-slate-600">{copy.empty_text}</PublicCard>
          ) : (
            <div className="space-y-6">
              {faqCategoryEntries.map(([category, items], catIndex) => (
                <section
                  key={category}
                  className="overflow-hidden rounded-[2rem] border bg-white"
                  style={{ borderColor: 'rgba(212,212,216,0.8)', boxShadow: '0px 7.77px 2.21px 0px rgba(0,0,0,0.06), 0px 3px 3px 0px rgba(0,0,0,0.10), 0px -4px 0px 0px rgba(0,0,0,0.04) inset, 0px 2px 0px 0px rgba(255,255,255,0.7) inset' }}
                >
                  {/* Category header */}
                  <div
                    className="border-b px-5 py-4 sm:px-7"
                    style={{ borderColor: 'rgba(212,212,216,0.5)', background: 'radial-gradient(62.56% 62.56% at 28.14% -10.42%, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 100%), #F9F9F9' }}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="h-5 w-1.5 rounded-full" style={{ background: 'linear-gradient(180deg, #FF3B26 0%, #EA2B16 100%)', boxShadow: '0px 4px 10px rgba(253,58,37,0.35)' }} />
                        <h2 style={{ fontFamily: 'Urbanist, sans-serif', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#09090B' }}>{category}</h2>
                      </div>
                      <span
                        className="text-[11px] font-bold"
                        style={{
                          padding: '5px 14px',
                          borderRadius: '99px',
                          background: 'linear-gradient(180deg, #fafafa 0%, #f5f5f5 100%)',
                          boxShadow: '0 -2px 0 #e4e4e7 inset, 0 1px 0 rgba(255,255,255,0.9) inset, 0 8px 16px rgba(9,9,11,0.06)',
                          color: '#FD3A25',
                          fontWeight: 900
                        }}
                      >{items.length} soru</span>
                    </div>
                  </div>
                  {/* FAQ items */}
                  <div className="divide-y" style={{ borderColor: 'rgba(212,212,216,0.4)' }}>
                    {items.map((faq, index) => {
                      const uniqueId = `${catIndex}-${index}`;
                      const isOpen = openIndex === uniqueId;
                      return (
                        <motion.div
                          key={faq.id}
                          initial={{ opacity: 0, y: 10 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: Math.min(index * 0.04, 0.2) }}
                          className="overflow-hidden transition-all duration-300"
                          style={isOpen ? { background: 'rgba(253,58,37,0.015)', borderLeft: '3px solid #FD3A25' } : {}}
                        >
                          <button type="button" onClick={() => setOpenIndex(isOpen ? null : uniqueId)} className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left sm:px-7">
                            <span style={{ fontFamily: 'Urbanist, sans-serif', fontSize: '16px', fontWeight: 600, color: isOpen ? '#FD3A25' : '#09090B', lineHeight: '24px' }}>{faq.question}</span>
                            <span
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-300"
                              style={isOpen
                                ? { background: 'linear-gradient(180deg, #FF3B26 0%, #EA2B16 100%)', boxShadow: '0px -2px 0px #B81E0D inset, 0px 4px 10px rgba(253,58,37,0.30)' }
                                : { background: '#F5F5F5', boxShadow: '0px -2px 0px #E9E9E9 inset' }
                              }
                            >
                              <ChevronDown className="h-4 w-4 transition-transform duration-300" style={{ color: isOpen ? 'white' : '#71717A', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                            </span>
                          </button>
                          {/* AnimatePresence ile smooth açılma/kapanma */}
                          <AnimatePresence initial={false}>
                          {isOpen ? (
                            <motion.div
                              key="content"
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                              className="overflow-hidden"
                            >
                              <div
                                className="px-5 pb-6 pt-3 sm:px-7"
                                style={{ borderTop: '1px solid rgba(253,58,37,0.08)', fontFamily: 'Urbanist, sans-serif', fontSize: '15px', lineHeight: '28px', color: '#52525B' }}
                              >
                                {faq.answer}
                              </div>
                            </motion.div>
                          ) : null}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>

        <div className="mx-auto mt-12 max-w-5xl">
          <PublicCard tone="dark" className="overflow-hidden p-7 text-center sm:p-9">
            <PublicIconBadge className="mx-auto mb-5 bg-orange-600">
              <MessageCircle className="h-6 w-6" />
            </PublicIconBadge>
            <h3 className="text-2xl font-black text-white">{copy.contact_title}</h3>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-300">{copy.contact_description}</p>
            <PublicButton href={copy.contact_cta_href || "/contact"} variant="primary" className="mt-7" icon={<MessageCircle className="h-5 w-5" />} iconPosition="left">
              {copy.contact_cta_label}
            </PublicButton>
          </PublicCard>
        </div>
      </section>
    </main>
  );
}



