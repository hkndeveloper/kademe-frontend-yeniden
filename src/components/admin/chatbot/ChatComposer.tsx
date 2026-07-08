import { type FormEvent } from "react";
import { Loader2, Send } from "lucide-react";

interface ChatComposerProps {
  value: string;
  loading: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

export function ChatComposer({ value, loading, onChange, onSubmit }: ChatComposerProps) {
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={submit} className="border-t border-slate-200 bg-white p-3 md:p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Örn: Diplomasi360 program listesi son 30 gün"
          className="min-h-[46px] flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900/10"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !value.trim()}
          className="inline-flex min-h-[46px] shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-40"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Gönder
        </button>
      </div>
    </form>
  );
}