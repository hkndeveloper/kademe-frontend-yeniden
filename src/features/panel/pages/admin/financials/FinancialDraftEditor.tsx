"use client";

import { useState, type FormEvent } from "react";
import { FileText, Loader2, X } from "lucide-react";
import api from "@/lib/api/axios";
import { downloadBlobResponse } from "@/lib/download";

interface TransactionDraft {
  id: number;
  project?: { name: string };
  period?: { name: string };
  category: string;
  category_note?: string | null;
  spending_unit?: string | null;
  payee_name: string;
  amount: number;
  invoice_no?: string | null;
  invoice_revisions_count?: number;
}

interface InvoiceRevision {
  id: number;
  replaced_at: string;
  replacer?: { name: string; surname: string } | null;
}

export function FinancialDraftEditor({
  transaction,
  editable,
  categoryLabels,
  onClose,
  onSaved,
}: {
  transaction: TransactionDraft;
  editable: boolean;
  categoryLabels: Record<string, string>;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [category, setCategory] = useState(transaction.category);
  const [categoryNote, setCategoryNote] = useState(transaction.category_note ?? "");
  const [spendingUnit, setSpendingUnit] = useState(transaction.spending_unit ?? "");
  const [payee, setPayee] = useState(transaction.payee_name);
  const [amount, setAmount] = useState(String(transaction.amount));
  const [invoiceNo, setInvoiceNo] = useState(transaction.invoice_no ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showHistory, setShowHistory] = useState(!editable);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [revisions, setRevisions] = useState<InvoiceRevision[] | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const loadHistory = async () => {
    setShowHistory(true);
    setHistoryLoading(true);
    setError("");
    try {
      const response = await api.get<{ invoice_revisions: InvoiceRevision[] }>(
        `/panel/financials/${transaction.id}/invoice-revisions`,
      );
      setRevisions(response.data.invoice_revisions);
    } catch (requestError) {
      console.error("Fatura geçmişi yüklenemedi", requestError);
      setError("Fatura geçmişi yüklenemedi.");
    } finally {
      setHistoryLoading(false);
    }
  };

  const downloadRevision = async (revisionId: number) => {
    setDownloadingId(revisionId);
    setError("");
    try {
      const response = await api.get(`/panel/financials/${transaction.id}/invoice-revisions/${revisionId}/download`, {
        responseType: "blob",
      });
      if (String(response.headers["content-type"] ?? "").includes("application/json")) {
        const payload = JSON.parse(await (response.data as Blob).text()) as { download_url?: string };
        const url = payload.download_url ? new URL(payload.download_url) : null;
        if (!url || !["http:", "https:"].includes(url.protocol)) throw new Error("Fatura bağlantısı geçersiz.");
        const link = document.createElement("a");
        link.href = url.toString();
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.click();
        return;
      }
      await downloadBlobResponse(response.data, response.headers, `fatura_${transaction.id}_surum_${revisionId}`);
    } catch (requestError) {
      console.error("Eski fatura indirilemedi", requestError);
      setError("Eski fatura indirilemedi.");
    } finally {
      setDownloadingId(null);
    }
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editable || saving) return;
    if (category === "other" && !categoryNote.trim()) {
      setError("Diğer kategori için açıklama zorunludur.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const form = new FormData();
      form.append("_method", "PUT");
      form.append("category", category);
      form.append("category_note", category === "other" ? categoryNote.trim() : "");
      form.append("spending_unit", spendingUnit.trim());
      form.append("payee_name", payee.trim());
      form.append("amount", amount);
      form.append("invoice_no", invoiceNo.trim());
      if (file) form.append("invoice", file);
      await api.post(`/panel/financials/${transaction.id}`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await onSaved();
      onClose();
    } catch (requestError) {
      console.error("Bekleyen mali kayıt güncellenemedi", requestError);
      setError("Kayıt güncellenemedi. Yetkiyi, dönemi ve alanları kontrol edin.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label={editable ? "Mali kaydı düzenle" : "Fatura geçmişi"}>
      <div className="panel-modal-card flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden">
        <div className="panel-modal-header">
          <div>
            <h2 className="text-lg font-black text-slate-900">{editable ? "Bekleyen mali kaydı düzenle" : "Fatura geçmişi"}</h2>
            <p className="text-xs text-muted-foreground">{transaction.project?.name ?? "Projesiz kayıt"}{transaction.period?.name ? ` · ${transaction.period.name}` : ""} · #{transaction.id}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Kapat" className="rounded-full p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="panel-modal-body space-y-5 overflow-y-auto">
          {error ? <div role="alert" className="panel-notice panel-notice-error">{error}</div> : null}
          {editable ? (
            <form id="financial-draft-edit-form" onSubmit={(event) => void save(event)} className="space-y-4">
              <p className="text-xs text-muted-foreground">Proje, dönem, işlem türü ve onay durumu bu ekrandan değiştirilemez.</p>
              <div className="panel-form-grid">
                <div className="panel-field">
                  <label htmlFor="draft-category" className="panel-label">Kategori</label>
                  <select id="draft-category" value={category} onChange={(event) => setCategory(event.target.value)} className="panel-control" required>
                    {!categoryLabels[category] ? <option value={category}>{category}</option> : null}
                    {Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </div>
                <div className="panel-field">
                  <label htmlFor="draft-unit" className="panel-label">Harcamayı yapan birim</label>
                  <input id="draft-unit" value={spendingUnit} onChange={(event) => setSpendingUnit(event.target.value)} className="panel-control" maxLength={150} />
                </div>
              </div>
              {category === "other" ? (
                <div className="panel-field">
                  <label htmlFor="draft-category-note" className="panel-label">Diğer kategori açıklaması</label>
                  <textarea id="draft-category-note" value={categoryNote} onChange={(event) => setCategoryNote(event.target.value)} className="panel-control" maxLength={500} required />
                </div>
              ) : null}
              <div className="panel-form-grid">
                <div className="panel-field">
                  <label htmlFor="draft-payee" className="panel-label">Ödeme yapılacak kişi/firma</label>
                  <input id="draft-payee" value={payee} onChange={(event) => setPayee(event.target.value)} className="panel-control" maxLength={255} required />
                </div>
                <div className="panel-field">
                  <label htmlFor="draft-invoice-no" className="panel-label">Fatura no</label>
                  <input id="draft-invoice-no" value={invoiceNo} onChange={(event) => setInvoiceNo(event.target.value)} className="panel-control" maxLength={100} />
                </div>
              </div>
              <div className="panel-field">
                <label htmlFor="draft-amount" className="panel-label">Tutar (TL)</label>
                <input id="draft-amount" type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} className="panel-control" required />
              </div>
              <div className="panel-field">
                <label htmlFor="draft-invoice" className="panel-label">Faturayı değiştir (isteğe bağlı)</label>
                <input id="draft-invoice" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="panel-file-input" />
                <p className="text-xs text-muted-foreground">Yeni dosya yüklenirse önceki sürüm geçmişte saklanır. En fazla 10 MB.</p>
              </div>
            </form>
          ) : null}
          {(transaction.invoice_revisions_count ?? 0) > 0 ? (
            <div className="space-y-3 border-t border-slate-200 pt-4">
              {!showHistory ? <button type="button" onClick={() => void loadHistory()} className="panel-button panel-button-secondary">Eski fatura sürümlerini göster ({transaction.invoice_revisions_count})</button> : null}
              {showHistory && revisions === null && !historyLoading ? <button type="button" onClick={() => void loadHistory()} className="panel-button panel-button-secondary">Geçmişi yükle</button> : null}
              {historyLoading ? <Loader2 className="h-5 w-5 animate-spin text-indigo-600" /> : null}
              {revisions?.map((revision) => (
                <div key={revision.id} className="panel-card-muted flex items-center justify-between gap-3">
                  <div className="text-sm text-slate-700">
                    <div>{new Date(revision.replaced_at).toLocaleString("tr-TR")}</div>
                    {revision.replacer ? <div className="text-xs text-muted-foreground">Değiştiren: {revision.replacer.name} {revision.replacer.surname}</div> : null}
                  </div>
                  <button type="button" disabled={downloadingId !== null} onClick={() => void downloadRevision(revision.id)} className="panel-table-action panel-table-action-info"><FileText className="h-4 w-4" /> İndir</button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <div className="panel-modal-footer flex justify-end gap-2">
          <button type="button" onClick={onClose} className="panel-button panel-button-secondary">Kapat</button>
          {editable ? <button type="submit" form="financial-draft-edit-form" disabled={saving} className="panel-button panel-button-primary">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Kaydet</button> : null}
        </div>
      </div>
    </div>
  );
}
