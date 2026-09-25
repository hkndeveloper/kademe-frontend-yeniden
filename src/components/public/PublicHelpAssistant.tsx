"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowUpRight, Send, Sparkles, X } from "lucide-react";
import api from "@/lib/api/axios";
import { HelpMascot } from "./HelpMascot";
import styles from "./PublicHelpAssistant.module.css";

type Faq = { id: number; question: string; answer: string };
type Message = { role: "assistant" | "user"; text: string; link?: { href: string; label: string } };
const welcome: Message = { role: "assistant", text: "Merhaba, ben Kado! 👋 KADEME yolculuğunda sana eşlik edeyim. Neyi keşfetmek istersin?" };
const topics = ["Nasıl başvurabilirim?", "Projeleri keşfet", "Etkinlikler", "İletişim"];
const normalize = (value: string) => value.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i");

function answerFor(question: string, faqs: Faq[]): Message {
  const query = normalize(question);
  const routes = [
    { test: /basvur|kayit|uye/, text: "Başvuru yolculuğuna kayıt sayfasından başlayabilirsin. Projeye özel koşulları ve dönem bilgilerini ilgili proje sayfasından kontrol et.", href: "/auth/register", label: "Başvuruya git" },
    { test: /proje|program|diplomasi|eurodesk|pergel/, text: "KADEME projelerini, gelişim alanlarını ve proje detaylarını birlikte keşfedelim.", href: "/projects", label: "Projeleri keşfet" },
    { test: /etkinlik|faaliyet|takvim/, text: "Yayınlanan faaliyetlerin tarih, konum ve detaylarına faaliyetler sayfasından ulaşabilirsin.", href: "/activities", label: "Faaliyetleri gör" },
    { test: /iletisim|telefon|adres|ulas/, text: "Ekiple doğrudan görüşmek için güncel iletişim bilgilerini ve iletişim formunu kullanabilirsin.", href: "/contact", label: "İletişime geç" },
    { test: /sertifika|belge/, text: "Sertifika doğrulama kodunu sorgulama ekranına girerek belgeni kontrol edebilirsin.", href: "/certificates/verify", label: "Sertifika sorgula" },
    { test: /sifre|parola/, text: "Şifreni yenilemek için şifremi unuttum sayfasına gidebilirsin. Şifreni burada paylaşmana gerek yok.", href: "/auth/forgot-password", label: "Şifremi yenile" },
  ];
  const words = query.split(/[^a-z0-9]+/).filter(word => word.length > 3);
  const matches = faqs.map(faq => ({ faq, score: words.filter(word => normalize(faq.question).includes(word)).length })).sort((a, b) => b.score - a.score);
  if (matches[0]?.score >= 2) return { role: "assistant", text: `SSS'de ilgili olabilecek bilgi:\n\n${matches[0].faq.question}\n${matches[0].faq.answer}`, link: { href: "/faq", label: "Sık sorulan sorular" } };
  const route = routes.find(item => item.test.test(query));
  if (route) return { role: "assistant", text: route.text, link: { href: route.href, label: route.label } };
  return { role: "assistant", text: "Bu soruya hazır bir yanıt bulamadım. Başvuru, projeler, etkinlikler veya iletişim konusunda seni yönlendirebilirim. Diğer sorular için ekibimizden destek alabilirsin.", link: { href: "/contact", label: "Ekibe ulaş" } };
}

export function PublicHelpAssistant() {
  const [open, setOpen] = useState(false);
  const [hint, setHint] = useState(true);
  const [messages, setMessages] = useState<Message[]>([welcome]);
  const [input, setInput] = useState("");
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [faqStatus, setFaqStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const launcher = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const log = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    closeButton.current?.focus();
    const controller = new AbortController();
    api.get<{ faqs: Record<string, Faq[]> }>("/faqs", { signal: controller.signal, timeout: 10000 })
      .then(({ data }) => { if (!controller.signal.aborted) { setFaqs(Object.values(data.faqs ?? {}).flat()); setFaqStatus("ready"); } })
      .catch(() => { if (!controller.signal.aborted) setFaqStatus("error"); });
    return () => controller.abort();
  }, [open]);

  useEffect(() => { if (log.current) log.current.scrollTop = log.current.scrollHeight; }, [messages, open]);

  function close() { setOpen(false); launcher.current?.focus(); }
  function openHelp() { setFaqStatus("loading"); setOpen(true); setHint(false); }
  function send(text: string) {
    const trimmed = text.trim().slice(0, 500);
    if (!trimmed) return;
    setMessages(current => [...current, { role: "user" as const, text: trimmed }, answerFor(trimmed, faqs)].slice(-40));
    setInput("");
  }
  function submit(event: FormEvent) { event.preventDefault(); send(input); }

  return <div className={styles.widget} data-smooth-scroll-ignore>
    {open ? <section className={styles.panel} role="dialog" aria-labelledby="kado-title" onKeyDown={event => { if (event.key === "Escape") { event.stopPropagation(); close(); } }}>
      <header className={styles.header}>
        <div className={styles.avatar}><HelpMascot /></div>
        <div><h2 id="kado-title">Kado <Sparkles size={14} aria-hidden="true" /></h2><p>KADEME keşif arkadaşın</p></div>
        <button ref={closeButton} type="button" onClick={close} className={styles.close} aria-label="Yardımı kapat"><X size={19} /></button>
      </header>
      <div className={styles.intro}><span /> Küçük bir merak, büyük bir başlangıç.</div>
      <div ref={log} className={styles.log} role="log" aria-live="polite" aria-label="Yardım konuşması" tabIndex={0}>
        {messages.map((message, index) => <div key={index} className={message.role === "user" ? styles.userMessage : styles.reply}>
          {message.role === "assistant" ? <span className={styles.author}>KADO</span> : null}<p>{message.text}</p>
          {message.link ? <Link href={message.link.href} onClick={() => setOpen(false)}>{message.link.label}<ArrowUpRight size={15} aria-hidden="true" /></Link> : null}
        </div>)}
      </div>
      <div className={styles.topics}>{topics.map(topic => <button type="button" key={topic} onClick={() => send(topic)}>{topic}<ArrowUpRight size={12} aria-hidden="true" /></button>)}</div>
      <form onSubmit={submit} className={styles.form}><label className="sr-only" htmlFor="kado-message">Kado’ya sor</label><input id="kado-message" value={input} onChange={event => setInput(event.target.value)} maxLength={500} autoComplete="off" placeholder="Birlikte ne keşfedelim?" /><button type="submit" disabled={!input.trim()} aria-label="Mesajı gönder"><Send size={17} /></button></form>
      <p className={styles.disclaimer}>{faqStatus === "error" ? "SSS yüklenemedi; sayfa rehberi kullanılabilir." : faqStatus === "loading" ? "Güncel SSS içerikleri yükleniyor…" : "SSS ve sayfa rehberi · Yapay zekâ yanıtı üretmez."}</p>
    </section> : null}
    {!open && hint ? <div className={styles.hint}><button type="button" onClick={openHelp}>Merhaba! Yardım edeyim mi? <span>Ben Kado, keşif arkadaşın.</span></button><button type="button" className={styles.dismissHint} onClick={() => setHint(false)} aria-label="Karşılama mesajını gizle"><X size={12} /></button></div> : null}
    <button ref={launcher} type="button" className={styles.launcher} aria-label={open ? "Kado yardımını kapat" : "Kado yardımını aç"} aria-expanded={open} onClick={() => { if (open) close(); else openHelp(); }}><HelpMascot tracking /><span className={styles.launcherLabel}>{open ? "Kapat" : "Bir sorun mu var?"}</span></button>
  </div>;
}
