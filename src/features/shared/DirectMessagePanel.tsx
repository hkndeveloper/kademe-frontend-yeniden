"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { isAxiosError } from "axios";
import api from "@/lib/api/axios";

type Project = { id: number; name: string };
type Recipient = { id: number; name: string; role: string };
type Thread = {
  id: number;
  subject: string;
  project: Project | null;
  other_user: { id: number; name: string } | null;
  last_message_at: string | null;
  unread_count: number;
};
type Message = {
  id: number;
  body: string;
  sender: { id: number; name: string } | null;
  is_mine: boolean;
  attachment_name: string | null;
  read_at: string | null;
  created_at: string | null;
};
type ThreadDetail = { thread: Thread; messages: Message[]; has_more: boolean };
const roleLabels: Record<string, string> = {
  super_admin: "Üst admin", coordinator: "Koordinatör", staff: "Personel", student: "Öğrenci", alumni: "Mezun",
};

function errorText(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as { message?: string; errors?: Record<string, string[]> } | undefined;
    return Object.values(data?.errors ?? {}).flat()[0] || data?.message || fallback;
  }
  return fallback;
}

export function DirectMessagePanel({ panel = false }: { panel?: boolean }) {
  const base = panel ? "/panel/inbox/direct" : "/inbox/direct";
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [recipientId, setRecipientId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [nextPage, setNextPage] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selected, setSelected] = useState<ThreadDetail | null>(null);
  const [reply, setReply] = useState("");
  const [replyAttachment, setReplyAttachment] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showComposer, setShowComposer] = useState(false);

  const refreshThreads = useCallback(async () => {
    const response = await api.get<{ threads: Thread[]; next_page: number | null }>(`${base}/threads`);
    setThreads(response.data.threads ?? []);
    setNextPage(response.data.next_page ?? null);
  }, [base]);

  const loadMoreThreads = async () => {
    if (!nextPage) return;
    try {
      const response = await api.get<{ threads: Thread[]; next_page: number | null }>(`${base}/threads`, { params: { page: nextPage } });
      setThreads((current) => [...current, ...(response.data.threads ?? []).filter((thread) => !current.some((item) => item.id === thread.id))]);
      setNextPage(response.data.next_page ?? null);
    } catch (requestError) {
      setError(errorText(requestError, "Eski konuşmalar yüklenemedi."));
    }
  };

  const openThread = useCallback(async (id: number) => {
    setError(null);
    try {
      const response = await api.get<ThreadDetail>(`${base}/threads/${id}`);
      setSelected(response.data);
      setSelectedId(id);
      await refreshThreads();
    } catch (requestError) {
      setError(errorText(requestError, "Konuşma açılamadı."));
    }
  }, [base, refreshThreads]);

  const loadEarlier = async () => {
    const firstId = selected?.messages[0]?.id;
    if (!selected || !selected.has_more || !firstId) return;
    try {
      const response = await api.get<ThreadDetail>(`${base}/threads/${selected.thread.id}`, { params: { before_id: firstId } });
      setSelected((current) => current && current.thread.id === selected.thread.id
        ? { ...current, messages: [...response.data.messages, ...current.messages], has_more: response.data.has_more }
        : current);
    } catch (requestError) {
      setError(errorText(requestError, "Eski mesajlar yüklenemedi."));
    }
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [options, list] = await Promise.all([
          api.get<{ projects: Project[] }>(`${base}/recipients`),
          api.get<{ threads: Thread[]; next_page: number | null }>(`${base}/threads`),
        ]);
        if (!active) return;
        setProjects(options.data.projects ?? []);
        setThreads(list.data.threads ?? []);
        setNextPage(list.data.next_page ?? null);
        setProjectId((value) => value || String(options.data.projects?.[0]?.id ?? ""));
      } catch (requestError) {
        if (active) setError(errorText(requestError, "Mesajlar yüklenemedi."));
      }
    };
    void load();
    return () => { active = false; };
  }, [base]);

  useEffect(() => {
    if (!projectId) {
      return;
    }
    let active = true;
    void api.get<{ recipients: Recipient[] }>(`${base}/recipients`, { params: { project_id: Number(projectId) } })
      .then((response) => {
        if (!active) return;
        setRecipients(response.data.recipients ?? []);
        setRecipientId("");
      })
      .catch((requestError) => {
        if (active) setError(errorText(requestError, "Alıcılar yüklenemedi."));
      });
    return () => { active = false; };
  }, [base, projectId]);

  const validateFile = (file: File | null): boolean => {
    if (file && file.size > 5 * 1024 * 1024) {
      setError("Ek dosya en fazla 5 MB olabilir.");
      return false;
    }
    return true;
  };

  const createThread = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (!projectId || !recipientId || !subject.trim() || !body.trim() || !validateFile(attachment)) return;
    const data = new FormData();
    data.append("project_id", projectId);
    data.append("recipient_id", recipientId);
    data.append("subject", subject.trim());
    data.append("body", body.trim());
    if (attachment) data.append("attachment", attachment);
    setBusy(true);
    try {
      const result = await api.post<{ thread_id: number }>(`${base}/threads`, data);
      setSubject(""); setBody(""); setAttachment(null); setRecipientId("");
      setShowComposer(false);
      setNotice("Mesaj gönderildi.");
      await refreshThreads();
      await openThread(result.data.thread_id);
    } catch (requestError) {
      setError(errorText(requestError, "Mesaj gönderilemedi."));
    } finally {
      setBusy(false);
    }
  };

  const sendReply = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedId || !reply.trim() || !validateFile(replyAttachment)) return;
    setBusy(true); setError(null); setNotice(null);
    const data = new FormData();
    data.append("body", reply.trim());
    if (replyAttachment) data.append("attachment", replyAttachment);
    try {
      await api.post(`${base}/threads/${selectedId}/replies`, data);
      setReply(""); setReplyAttachment(null);
      setNotice("Yanıt gönderildi.");
      await openThread(selectedId);
    } catch (requestError) {
      setError(errorText(requestError, "Yanıt gönderilemedi."));
    } finally {
      setBusy(false);
    }
  };

  const downloadAttachment = async (threadId: number, message: Message) => {
    setError(null);
    try {
      const response = await api.get<Blob>(`${base}/threads/${threadId}/messages/${message.id}/attachment`, { responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = message.attachment_name || "ek";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (requestError) {
      setError(errorText(requestError, "Ek indirilemedi."));
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Kişisel mesajlar</h2>
          <p className="mt-1 text-sm text-muted-foreground">Projenizdeki yetkili kişilerle doğrudan görüşün. Destek talepleri ayrı bölümden takip edilir.</p>
        </div>
        <button type="button" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" onClick={() => setShowComposer((value) => !value)} disabled={projects.length === 0}>
          {showComposer ? "Vazgeç" : "Yeni mesaj"}
        </button>
      </div>
      {error && <p role="alert" className="mt-3 rounded-lg bg-red-500/10 p-3 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="mt-3 rounded-lg bg-green-500/10 p-3 text-sm text-green-700">{notice}</p>}
      {showComposer && (
        <form onSubmit={(event) => void createThread(event)} className="mt-5 grid gap-3 rounded-xl border border-border p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium">Proje
              <select required value={projectId} onChange={(event) => { setProjectId(event.target.value); setRecipients([]); setRecipientId(""); }} className="mt-1 w-full rounded-lg border border-border bg-background p-2">
                {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium">Alıcı
              <select required value={recipientId} onChange={(event) => setRecipientId(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background p-2">
                <option value="">Alıcı seçin</option>
                {recipients.map((recipient) => <option key={recipient.id} value={recipient.id}>{recipient.name} ({roleLabels[recipient.role] ?? recipient.role})</option>)}
              </select>
            </label>
          </div>
          <label className="text-sm font-medium">Konu
            <input required maxLength={150} value={subject} onChange={(event) => setSubject(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background p-2" />
          </label>
          <label className="text-sm font-medium">Mesaj
            <textarea required maxLength={10000} rows={4} value={body} onChange={(event) => setBody(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background p-2" />
          </label>
          <label className="text-sm font-medium">Ek (isteğe bağlı; PDF, Word veya görsel, en fazla 5 MB)
            <input type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" onChange={(event) => setAttachment(event.target.files?.[0] ?? null)} className="mt-1 block w-full text-sm" />
          </label>
          <button type="submit" disabled={busy || !recipientId} className="w-fit rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">Gönder</button>
        </form>
      )}
      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
        <div className="space-y-2" aria-label="Konuşmalar">
          {threads.length === 0 && <p className="text-sm text-muted-foreground">Henüz kişisel konuşma yok.</p>}
          {threads.map((thread) => (
            <button key={thread.id} type="button" onClick={() => void openThread(thread.id)} className={`w-full rounded-xl border p-3 text-left text-sm ${selectedId === thread.id ? "border-primary bg-primary/10" : "border-border"}`}>
              <span className="block font-semibold">{thread.subject}</span>
              <span className="mt-1 block text-xs text-muted-foreground">{thread.other_user?.name} · {thread.project?.name}</span>
              <span className="mt-1 block text-xs text-muted-foreground">{thread.last_message_at ? new Date(thread.last_message_at).toLocaleString("tr-TR") : ""}{thread.unread_count > 0 ? ` · ${thread.unread_count} okunmamış` : ""}</span>
            </button>
          ))}
          {nextPage && <button type="button" onClick={() => void loadMoreThreads()} className="text-sm font-semibold text-primary underline">Daha eski konuşmalar</button>}
        </div>
        <div className="min-w-0 rounded-xl border border-border p-4">
          {!selected && <p className="text-sm text-muted-foreground">Mesajları görmek için bir konuşma seçin.</p>}
          {selected && (
            <>
              <h3 className="font-semibold">{selected.thread.subject}</h3>
              <p className="text-xs text-muted-foreground">{selected.thread.other_user?.name} · {selected.thread.project?.name}</p>
              <div className="mt-4 max-h-96 space-y-3 overflow-y-auto">
                {selected.has_more && <button type="button" onClick={() => void loadEarlier()} className="text-xs font-semibold text-primary underline">Daha eski mesajlar</button>}
                {selected.messages.map((message) => (
                  <div key={message.id} className={`rounded-xl p-3 text-sm ${message.is_mine ? "bg-primary/10" : "bg-muted"}`}>
                    <p className="text-xs font-semibold">{message.sender?.name} · {message.created_at ? new Date(message.created_at).toLocaleString("tr-TR") : ""}</p>
                    <p className="mt-2 whitespace-pre-wrap break-words">{message.body}</p>
                    {message.is_mine && <p className="mt-1 text-xs text-muted-foreground">{message.read_at ? "Okundu" : "Gönderildi"}</p>}
                    {message.attachment_name && <button type="button" className="mt-2 text-xs font-semibold text-primary underline" onClick={() => void downloadAttachment(selected.thread.id, message)}>Eki indir: {message.attachment_name}</button>}
                  </div>
                ))}
              </div>
              <form onSubmit={(event) => void sendReply(event)} className="mt-4 space-y-3 border-t border-border pt-4">
                <label className="block text-sm font-medium">Yanıt
                  <textarea required maxLength={10000} rows={3} value={reply} onChange={(event) => setReply(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background p-2" />
                </label>
                <input type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" aria-label="Yanıt eki" onChange={(event) => setReplyAttachment(event.target.files?.[0] ?? null)} className="block w-full text-sm" />
                <button type="submit" disabled={busy || !reply.trim()} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">Yanıtla</button>
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
