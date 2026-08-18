import type { ChangeEventHandler } from "react";

type VolunteerTextAreaFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: ChangeEventHandler<HTMLTextAreaElement>;
  placeholder: string;
  maxLength: number;
  rows: number;
  required?: boolean;
  minLength?: number;
  helperText?: string;
};

export function VolunteerTextAreaField({
  id,
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  rows,
  required = false,
  minLength,
  helperText,
}: VolunteerTextAreaFieldProps) {
  const helperId = `${id}-helper`;

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="flex flex-wrap items-center justify-between gap-2 text-sm font-bold text-slate-900">
        <span className="flex items-center gap-2">
          {label}
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
              required
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-slate-200 bg-slate-100 text-slate-600"
            }`}
          >
            {required ? "Zorunlu" : "İsteğe bağlı"}
          </span>
        </span>
        <span className="text-xs font-semibold text-slate-500">{value.length}/{maxLength}</span>
      </label>
      <textarea
        id={id}
        value={value}
        onChange={onChange}
        rows={rows}
        minLength={minLength}
        maxLength={maxLength}
        required={required}
        aria-required={required}
        aria-describedby={helperId}
        placeholder={placeholder}
        className="w-full rounded-2xl border-2 border-slate-300 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
      />
      <p id={helperId} className="text-xs leading-5 text-slate-500">
        {helperText ?? (required ? "Bu alanı doldurmanız gerekiyor." : "Bu alanı boş bırakabilirsiniz.")}
      </p>
    </div>
  );
}
