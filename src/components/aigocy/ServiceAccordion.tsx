"use client";
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { safeHref, type ThemeItem } from "@/lib/aigocy";
import { Heading, Reveal, ThemeImage } from "./Primitives";

export function ServiceAccordion({
  items,
  title,
  description,
}: {
  items: ThemeItem[];
  title: string;
  description: string;
}) {
  const [selected, setSelected] = useState(0);
  const reduced = useReducedMotion();
  return (
    <section className="section-services flat-spacing">
      <div className="container">
        <div className="row justify-content-between">
          <div className="col-lg-5">
            <Heading
              badge="Gelişim alanları"
              title={title}
              description={description}
            />
            <Reveal className="theme-service-picture">
              <ThemeImage
                src={items[selected]?.image_url}
                alt={items[selected]?.title || title}
              />
            </Reveal>
          </div>
          <div className="col-lg-6">
            <div className="accordion-faq_list">
              {items.map((item, index) => (
                <Reveal key={item.id} delay={index * 0.04}>
                  <article className="accordion-faq_item">
                    <h3>
                      <button
                        type="button"
                        className={`accordion-action services-image-btn ${selected === index ? "active-img" : "collapsed"}`}
                        aria-expanded={selected === index}
                        aria-controls={`service-${item.id}`}
                        onClick={() =>
                          setSelected(selected === index ? -1 : index)
                        }
                      >
                        <span className="accordion-title">
                          {item.title}
                          <span className="text-body-1 num">
                            ({String(index + 1).padStart(2, "0")})
                          </span>
                        </span>
                      </button>
                    </h3>
                    <AnimatePresence initial={false}>
                      {selected === index && (
                        <motion.div
                          id={`service-${item.id}`}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: reduced ? 0 : 0.3 }}
                          style={{ overflow: "hidden" }}
                        >
                          <div className="accordion-content">
                            <p className="text-body-3 text-secondary text">
                              {item.description}
                            </p>
                            <div className="list-tags">
                              {(item.details || []).map((detail) => (
                                <span
                                  className="tags-item fw-semibold"
                                  key={detail}
                                >
                                  {detail}
                                </span>
                              ))}
                            </div>
                            <Link
                              href={safeHref(item.href)}
                              className="theme-inline-link"
                            >
                              {item.label || "Detayları incele"}
                              <ArrowUpRight size={18} />
                            </Link>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
