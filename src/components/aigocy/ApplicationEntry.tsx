"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, X } from "lucide-react";
import api from "@/lib/api/axios";
import { safeHref } from "@/lib/aigocy";

export type ApplicationTarget = {
  project_id: number; project_name: string; slug: string; period_name: string;
  training_id: number | null; title: string; href: string; ends_at?: string | null;
};

export function ApplicationEntry({ label = "Başvur", projectId }: { label?: string; projectId?: number }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [targets, setTargets] = useState<ApplicationTarget[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  useEffect(() => {
    if (open) dialog.current?.showModal(); else dialog.current?.close();
  }, [open]);

  const start = async () => {
    setBusy(true); setError("");
    try {
      const response = await api.get<{ targets: ApplicationTarget[] }>("/application-targets", { timeout: 10000 });
      const list = response.data.targets.filter(target => !projectId || target.project_id === projectId);
      if (list.length === 1) { router.push(safeHref(list[0].href, "/projects")); return; }
      setTargets(list);
      setSelectedProject(new Set(list.map(target => target.project_id)).size === 1 ? list[0].project_id : null);
      setOpen(true);
    } catch {
      setError("Açık başvurular şu anda alınamadı. Lütfen tekrar deneyin.");
    } finally { setBusy(false); }
  };
  const projects = [...new Map(targets.map(target => [target.project_id, target])).values()];
  const options = selectedProject ? targets.filter(target => target.project_id === selectedProject) : [];
  return <>
    <button type="button" className="tf-btn" onClick={() => void start()} disabled={busy} aria-haspopup="dialog">
      {busy ? "Başvurular kontrol ediliyor…" : label}<ArrowUpRight size={18} aria-hidden="true" />
    </button>
    {error && <p role="alert" className="theme-application-error">{error}</p>}
    <dialog ref={dialog} className="theme-application-dialog" aria-labelledby="application-choice-title"
      onCancel={() => setOpen(false)} onClose={() => setOpen(false)} onClick={event => { if (event.target === event.currentTarget) setOpen(false); }}>
      <div className="theme-application-dialog-inner">
        <div className="theme-application-dialog-heading"><h2 id="application-choice-title">{selectedProject ? "Eğitimini seç" : "Projeni seç"}</h2>
          <button type="button" aria-label="Başvuru seçimini kapat" onClick={() => setOpen(false)}><X size={24} /></button></div>
        {!targets.length ? <p>Şu anda başvurusu açık proje veya eğitim bulunmuyor. Yeni dönemleri proje sayfalarından takip edebilirsiniz.</p> : <>
          <p>Hesap oluşturman gerekmez. Başvurun kabul edildiğinde hesabın açılır.</p>
          {selectedProject ? <>
            {projects.length > 1 && <button type="button" onClick={() => setSelectedProject(null)}>← Proje seçimine dön</button>}
            {options.map(target => <Link className="theme-application-option" key={`${target.project_id}-${target.training_id}`} href={safeHref(target.href, "/projects")} onClick={() => setOpen(false)}>
              <span><strong>{target.title}</strong><small>{target.project_name} · {target.period_name}</small></span><ArrowUpRight size={20} />
            </Link>)}
          </> : projects.map(project => {
            const group = targets.filter(target => target.project_id === project.project_id);
            return group.length === 1 ? <Link className="theme-application-option" key={project.project_id} href={safeHref(group[0].href, "/projects")} onClick={() => setOpen(false)}>
              <span><strong>{project.project_name}</strong><small>{group[0].training_id ? group[0].title : project.period_name}</small></span><ArrowUpRight size={20} />
            </Link> : <button className="theme-application-option" key={project.project_id} type="button" onClick={() => setSelectedProject(project.project_id)}>
              <span><strong>{project.project_name}</strong><small>{group.length} açık eğitim</small></span><ArrowUpRight size={20} />
            </button>;
          })}
        </>}
      </div>
    </dialog>
  </>;
}
