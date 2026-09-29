type ConsentReceipt = {
  consent_text_snapshot?: string | null;
  consent_accepted_at?: string | null;
};

export function VolunteerApplicationConsentField({ text, checked, onChange }: {
  text: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="rounded-2xl border border-amber-300/60 bg-amber-50 p-4 text-sm text-amber-950">
      <p className="font-bold">Başvuru koşulları ve uyarılar</p>
      <p className="mt-2 whitespace-pre-line leading-relaxed">{text}</p>
      <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-amber-300/60 bg-white p-3 font-semibold">
        <input type="checkbox" required checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-1" />
        <span>Başvuru koşullarını, uyarıları ve yaptırımları okudum, kabul ediyorum.</span>
      </label>
    </div>
  );
}

export function VolunteerApplicationConsentReceipt({ application }: { application: ConsentReceipt }) {
  return (
    <details className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
      <summary className="cursor-pointer font-semibold">Başvuru koşulu onayı</summary>
      {application.consent_accepted_at && application.consent_text_snapshot ? (
        <div className="mt-2 space-y-2">
          <p>Kabul zamanı: {new Date(application.consent_accepted_at).toLocaleString("tr-TR")}</p>
          <p className="whitespace-pre-line">{application.consent_text_snapshot}</p>
        </div>
      ) : (
        <p className="mt-2">Bu eski başvuru için onay kaydı bulunmuyor.</p>
      )}
    </details>
  );
}
