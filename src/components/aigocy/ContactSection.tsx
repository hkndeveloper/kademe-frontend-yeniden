"use client";
import { useRef, useState, type FormEvent } from "react";
import { isAxiosError } from "axios";
import { ArrowUpRight, Loader2 } from "lucide-react";
import api from "@/lib/api/axios";
import { useAuth } from "@/store/useAuth";
import type { SiteSettingsPayload } from "@/lib/site-config";
import type { ThemeProject } from "./usePublicContent";
import { Heading, Reveal } from "./Primitives";
import { safeHref } from "@/lib/aigocy";

export function ContactForm({ projects }: { projects: ThemeProject[] }) {
  const { isAuthenticated } = useAuth();
  const [pending, setPending] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const [category, setCategory] = useState("general");
  const formRef = useRef<HTMLFormElement>(null);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    setPending(true);
    setMessage("");
    setError("");
    if (!data.get("project_id")) data.delete("project_id");
    const file = data.get("attachment");
    if (file instanceof File && !file.size) data.delete("attachment");
    try {
      await api.post(isAuthenticated ? "/tickets" : "/contact", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMessage(
        isAuthenticated
          ? "Mesajınız destek talebi olarak alındı."
          : "Mesajınız başarıyla alındı.",
      );
      formRef.current?.reset();
      setCategory("general");
    } catch (error) {
      if (isAxiosError(error)) {
        const errors = error.response?.data?.errors as
          Record<string, string[]> | undefined;
        setError(
          errors
            ? Object.values(errors).flat().join(" ")
            : error.response?.data?.message ||
                "Mesaj gönderilemedi. Lütfen tekrar deneyin.",
        );
      } else setError("Mesaj gönderilemedi. Lütfen tekrar deneyin.");
    } finally {
      setPending(false);
    }
  };
  return (
    <form
      className="form-contact theme-contact-form"
      ref={formRef}
      onSubmit={(e) => void submit(e)}
    >
      <h3 className="fw-semibold">Bize mesaj gönderin</h3>
      <div className="theme-form-grid">
        {!isAuthenticated && (
          <>
            <label>
              Ad soyad
              <input
                required
                name="name"
                maxLength={255}
                autoComplete="name"
                placeholder="Adınız soyadınız"
              />
            </label>
            <label>
              E-posta
              <input
                required
                type="email"
                name="email"
                maxLength={255}
                autoComplete="email"
                placeholder="E-posta adresiniz"
              />
            </label>
          </>
        )}
        <label className="full">
          Başlık
          <input
            required
            name="subject"
            maxLength={255}
            placeholder="Mesajınızın konusu"
          />
        </label>
        <label>
          Kategori
          <select
            name="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {Object.entries({
              general: "Genel bilgi",
              applications: "Başvurular hakkında",
              official_document: "Resmî evrak talebi",
              technical: "Hata bildirimi",
              accommodation: "Konaklama / ulaşım",
              other: "Diğer",
            }).map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          İlgili proje
          <select name="project_id">
            <option value="">Genel iletişim</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
        <label className="full">
          Mesajınız
          <textarea
            required
            name="message"
            minLength={10}
            maxLength={10000}
            placeholder="Size nasıl yardımcı olabiliriz?"
          />
        </label>
        <label className="full">
          Dosya eki{" "}
          {category === "official_document" ? "(zorunlu)" : "(isteğe bağlı)"}
          <input
            type="file"
            name="attachment"
            required={category === "official_document"}
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          />
          <small>PDF, Word veya görsel ekleyebilirsiniz.</small>
        </label>
      </div>
      <button type="submit" disabled={pending} className="tf-btn">
        {pending ? (
          <Loader2 className="animate-spin" size={18} />
        ) : (
          <ArrowUpRight size={18} />
        )}{" "}
        {pending ? "Gönderiliyor…" : "Mesajı gönder"}
      </button>
      {message && (
        <p className="theme-form-status" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="theme-form-status theme-form-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
export function ContactSection({
  settings,
  projects,
}: {
  settings: SiteSettingsPayload;
  projects: ThemeProject[];
}) {
  const contact = settings.contact;
  const socials = Object.entries(settings.social_media).filter(
    ([key, value]) =>
      key !== "sharing_webhook_url" && value && /^(https?:\/\/)/.test(value),
  );
  return (
    <section className="theme-contact section-contact flat-spacing">
      <div className="container">
        <div className="theme-contact-grid">
          <Reveal>
            <Heading
              badge="İletişim"
              title="Birlikte yeni bir adım atalım"
              description="Başvuru, proje ve destek talepleriniz için bize ulaşabilirsiniz."
            />
            <dl className="theme-contact-details">
              <div>
                <dt>E-posta</dt>
                <dd>
                  <a href={`mailto:${contact.contact_email}`}>
                    {contact.contact_email}
                  </a>
                </dd>
              </div>
              <div>
                <dt>Telefon</dt>
                <dd>
                  <a
                    href={`tel:${contact.contact_phone.split(/\(|dahili/i)[0].replace(/\D/g, "")}`}
                  >
                    {contact.contact_phone}
                  </a>
                </dd>
              </div>
              <div>
                <dt>Adres</dt>
                <dd>{contact.contact_address}</dd>
              </div>
            </dl>
            <div className="theme-contact-socials">
              {socials.map(([name, url]) => (
                <a
                  key={name}
                  href={safeHref(url)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {(
                    {
                      instagram_url: "Instagram",
                      twitter_url: "X",
                      youtube_url: "YouTube",
                      linkedin_url: "LinkedIn",
                      facebook_url: "Facebook",
                    } as Record<string, string>
                  )[name] || name}
                  <ArrowUpRight size={16} />
                </a>
              ))}
            </div>
          </Reveal>
          <Reveal>
            <ContactForm projects={projects} />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

export function ContactInfo({ settings }: { settings: SiteSettingsPayload }) {
  const contact = settings.contact;
  return (
    <section className="flat-spacing pt-0">
      <div className="container">
        <div className="row">
          {[
            {
              title: "E-posta",
              value: contact.contact_email,
              href: `mailto:${contact.contact_email}`,
              icon: "envelope-solid",
            },
            {
              title: "Telefon",
              value: contact.contact_phone,
              href: `tel:${contact.contact_phone.split(/\(|dahili/i)[0].replace(/\D/g, "")}`,
              icon: "headset-solid",
            },
            {
              title: "Adres",
              value: contact.contact_address,
              href: undefined,
              icon: "map-marker-solid",
            },
          ].map((item, index) => (
            <Reveal
              key={item.title}
              className="col-md-4 mb-24"
              delay={index * 0.1}
            >
              <article className="box-contact-item text-center h-100">
                <i className={`icon icon-${item.icon}`} aria-hidden="true" />
                <h2 className="title h6 fw-semibold">{item.title}</h2>
                {item.href ? (
                  <a className="text" href={item.href}>
                    {item.value}
                  </a>
                ) : (
                  <p className="text">{item.value}</p>
                )}
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
