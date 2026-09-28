"use client";

import { useEffect, useState } from "react";
import { AlertCircle, HeartHandshake, Loader2, Send } from "lucide-react";
import { isAxiosError } from "axios";
import api from "@/lib/api/axios";
import { VolunteerTextAreaField } from "@/components/shared/VolunteerTextAreaField";
import { VolunteerApplicationConsentField, VolunteerApplicationConsentReceipt } from "@/components/shared/VolunteerApplicationConsent";
import { statusBadgeClass } from "@/lib/status-style";

interface Project {
  id: number;
  name: string;
  slug: string;
  type: string;
}

interface VolunteerApplication {
  id: number;
  status: "pending" | "accepted" | "waitlisted" | "rejected";
  motivation_text: string;
  notes?: string | null;
  evaluation_note?: string | null;
  consent_text_snapshot?: string | null;
  consent_accepted_at?: string | null;
  receipt_email_status?: "pending" | "sent" | "failed" | "unknown" | null;
  created_at?: string;
  opportunity?: {
    id: number;
    title: string;
    project?: Project | null;
  } | null;
}

interface VolunteerOpportunity {
  id: number;
  title: string;
  description: string;
  application_consent_text: string;
  location?: string | null;
  start_at?: string | null;
  end_at?: string | null;
  quota?: number | null;
  status: "open" | "closed" | "archived";
  project?: Project | null;
  my_application?: VolunteerApplication | null;
}

interface VolunteerResponse {
  opportunities: VolunteerOpportunity[];
  my_applications: VolunteerApplication[];
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Tarih belirtilmedi";
  }

  return new Date(value).toLocaleString("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

const MOTIVATION_MAX = 4000;
const NOTES_MAX = 2000;

function getStatusLabel(status: VolunteerApplication["status"]) {
  switch (status) {
    case "pending":
      return "Beklemede";
    case "accepted":
      return "Kabul edildi";
    case "waitlisted":
      return "Yedek";
    case "rejected":
      return "Reddedildi";
    default:
      return status;
  }
}

export default function StudentVolunteerPage() {
  const [opportunities, setOpportunities] = useState<VolunteerOpportunity[]>([]);
  const [applications, setApplications] = useState<VolunteerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<number | null>(null);
  const [motivationText, setMotivationText] = useState("");
  const [notes, setNotes] = useState("");
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackIsWarning, setFeedbackIsWarning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadVolunteerData = async () => {
      try {
        const response = await api.get<VolunteerResponse>("/volunteer/opportunities");
        setOpportunities(response.data.opportunities ?? []);
        setApplications(response.data.my_applications ?? []);
      } catch (error) {
        console.error("Gonulluluk kapsami yuklenemedi", error);
        setErrorMessage("Gonulluluk ilanlari yuklenemedi.");
      } finally {
        setLoading(false);
      }
    };

    void loadVolunteerData();
  }, []);

  const selectedOpportunity =
    selectedOpportunityId === null ? null : opportunities.find((opportunity) => opportunity.id === selectedOpportunityId) ?? null;

  const handleApply = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedOpportunityId) {
      setErrorMessage("Lutfen basvuru yapmak istedigin gonullu ilanini sec.");
      return;
    }

    if (!consentAccepted || !selectedOpportunity?.application_consent_text) {
      setErrorMessage("Başvuru koşullarını okuyup onaylamalısın.");
      return;
    }

    setSaving(true);
    setFeedback(null);
    setErrorMessage(null);

    try {
      const response = await api.post<{ message: string; application: VolunteerApplication; follow_up?: { receipt_email_sent?: boolean } }>(
        `/volunteer/opportunities/${selectedOpportunityId}/apply`,
        {
          motivation_text: motivationText,
          notes: notes.trim() || null,
          accepted_terms: true,
          expected_consent_text: selectedOpportunity.application_consent_text,
        },
      );

      const nextApplication = response.data.application;

      setApplications((current) => [nextApplication, ...current]);
      setOpportunities((current) =>
        current.map((opportunity) =>
          opportunity.id === selectedOpportunityId ? { ...opportunity, my_application: nextApplication } : opportunity,
        ),
      );
      setFeedback(response.data.message);
      setFeedbackIsWarning(response.data.follow_up?.receipt_email_sent === false);
      setMotivationText("");
      setNotes("");
      setConsentAccepted(false);
    } catch (error) {
      console.error("Gonullu basvurusu gonderilemedi", error);
      if (isAxiosError(error) && error.response?.data?.errors?.expected_consent_text) {
        try {
          const latest = await api.get<VolunteerResponse>("/volunteer/opportunities");
          setOpportunities(latest.data.opportunities ?? []);
          setApplications(latest.data.my_applications ?? []);
        } catch {
          setErrorMessage("Başvuru koşulları değişti. Güncel bilgileri görmek için sayfayı yenile.");
          setConsentAccepted(false);
          return;
        }
        setConsentAccepted(false);
        setErrorMessage("Başvuru koşulları değişti. Güncel metni yeniden okuyup onayla.");
        return;
      }
      setErrorMessage(
        isAxiosError(error) && typeof error.response?.data?.message === "string"
          ? error.response.data.message
          : "Basvuru gonderilemedi. Aciklama alanini kontrol edip tekrar dene.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-primary">
          <HeartHandshake className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-900">Gonullu Basvurusu</h1>
          <p className="mt-1 text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Acilan ilanlari incele, uygun olana dogrudan basvur
          </p>
        </div>
      </div>

      {applications.length > 0 ? (
        <div className="glass-panel rounded-3xl p-6">
          <h2 className="text-lg font-bold text-slate-900">Gönüllülük başvurularım</h2>
          <div className="mt-4 space-y-3">
            {applications.map((application) => (
              <div key={application.id} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">{application.opportunity?.title || "Gönüllülük ilanı"}</span>
                  <span className={`rounded-full border px-3 py-1 text-xs ${statusBadgeClass(application.status)}`}>{getStatusLabel(application.status)}</span>
                </div>
                {application.receipt_email_status === "failed" ? <p className="mt-2 text-xs text-amber-700">Başvurun kayıtlı; alındı e-postası gönderilemedi.</p> : null}
                {application.receipt_email_status === "unknown" || application.receipt_email_status === "pending" ? <p className="mt-2 text-xs text-amber-700">Başvurun kayıtlı; e-posta gönderimi kontrol edilmeli.</p> : null}
                <VolunteerApplicationConsentReceipt application={application} />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="glass-panel rounded-3xl p-8 text-sm text-muted-foreground">
        {feedback ? (
          <div className={`mb-6 rounded-2xl border p-5 ${feedbackIsWarning ? "border-amber-500/30 bg-amber-500/10 text-amber-700" : "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"}`}>{feedback}</div>
        ) : null}

        {errorMessage ? (
          <div className="mb-6 flex items-start gap-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-red-200">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <p>{errorMessage}</p>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1fr]">
          <div>
            <p className="mb-4">Acik gonulluluk ilanlari:</p>
            {loading ? (
              <div className="flex min-h-32 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : opportunities.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-5">
                Su an acik gonulluluk ilani bulunmuyor.
              </div>
            ) : (
              <div className="space-y-4">
                {opportunities.map((opportunity) => (
                  <button
                    key={opportunity.id}
                    type="button"
                    onClick={() => { setSelectedOpportunityId(opportunity.id); setConsentAccepted(false); }}
                    className={`w-full rounded-2xl border p-5 text-left transition ${
                      selectedOpportunityId === opportunity.id
                        ? "border-primary bg-primary/10"
                        : "border-white/5 bg-white/5 hover:border-primary/30"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-lg font-bold text-slate-900">{opportunity.title}</div>
                        <div className="mt-1 text-xs uppercase tracking-[0.3em] text-muted-foreground">
                          {opportunity.project?.name || "Genel"}
                        </div>
                      </div>
                      {opportunity.my_application ? (
                        <span className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${statusBadgeClass(opportunity.my_application.status)}`}>
                          {getStatusLabel(opportunity.my_application.status)}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{opportunity.description}</p>
                    <div className="mt-4 grid grid-cols-1 gap-2 text-xs text-muted-foreground md:grid-cols-2">
                      <div>Baslangic: {formatDate(opportunity.start_at)}</div>
                      <div>Bitis: {formatDate(opportunity.end_at)}</div>
                      <div>Konum: {opportunity.location || "Belirtilmedi"}</div>
                      <div>Kontenjan: {opportunity.quota ?? "Sinirsiz"}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            {loading ? (
              <div className="flex min-h-32 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : selectedOpportunity ? (
              <div className="space-y-5 rounded-2xl border border-white/5 bg-white/5 p-5">
                <div>
                  <div className="text-xl font-bold text-slate-900">{selectedOpportunity.title}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {selectedOpportunity.project?.name || "Genel gonulluluk"} - {selectedOpportunity.location || "Konum belirtilecek"}
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">{selectedOpportunity.description}</p>

                {selectedOpportunity.my_application ? (
                  <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4">
                    <div className="text-sm font-semibold text-slate-900">Bu ilana zaten basvurdun.</div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <span>Durum:</span>
                      <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${statusBadgeClass(selectedOpportunity.my_application.status)}`}>
                        {getStatusLabel(selectedOpportunity.my_application.status)}
                      </span>
                    </div>
                    {selectedOpportunity.my_application.evaluation_note ? (
                      <div className="mt-2 text-sm text-muted-foreground">
                        Degerlendirme notu: {selectedOpportunity.my_application.evaluation_note}
                      </div>
                    ) : null}
                    <VolunteerApplicationConsentReceipt application={selectedOpportunity.my_application} />
                  </div>
                ) : (
                  <form className="space-y-4" onSubmit={handleApply}>
                    <VolunteerTextAreaField
                      id="student-volunteer-motivation"
                      label="Neden bu gönüllülük ilanına başvuruyorsun?"
                      value={motivationText}
                      onChange={(event) => setMotivationText(event.target.value)}
                      rows={6}
                      minLength={20}
                      maxLength={MOTIVATION_MAX}
                      required
                      helperText="Başvuruyu gönderebilmek için en az 20 karakter yazmalısın."
                      placeholder="Motivasyonunu, bu çalışmaya nasıl katkı vereceğini ve neden uygun olduğunu yaz."
                    />

                    <VolunteerTextAreaField
                      id="student-volunteer-notes"
                      label="Ek not"
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      rows={3}
                      maxLength={NOTES_MAX}
                      placeholder="Varsa eklemek istediğin detayları yaz."
                    />

                    <VolunteerApplicationConsentField text={selectedOpportunity.application_consent_text} checked={consentAccepted} onChange={setConsentAccepted} />

                    <button
                      type="submit"
                      disabled={saving || motivationText.trim().length < 20 || !consentAccepted}
                      className="inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 font-bold text-primary-foreground shadow-lg shadow-primary/20 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                      Basvuruyu Gonder
                    </button>
                  </form>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/5 bg-white/5 p-5">
                  <div className="text-3xl font-black text-slate-900">{opportunities.length}</div>
                  <div className="mt-2 text-sm text-muted-foreground">Acik gonulluluk ilani sayisi</div>
                </div>
                <div className="rounded-2xl border border-white/5 bg-white/5 p-5">
                  <div className="text-3xl font-black text-slate-900">{applications.length}</div>
                  <div className="mt-2 text-sm text-muted-foreground">Gonderdigin gonullu basvuru sayisi</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
