"use client";

import { Download, FileBox, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import api from "@/lib/api/axios";

interface ExportButtonsProps {
  endpoint: string;
  filename?: string;
  params?: Record<string, string | number | undefined>;
  buttonLabel?: string;
}

type ExportFormat = "xlsx" | "pdf" | "csv" | "docx";

export function ExportButtons({
  endpoint,
  filename = "data_export",
  params = {},
  buttonLabel = "Disa Aktar",
}: ExportButtonsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loadingFormat, setLoadingFormat] = useState<ExportFormat | null>(null);

  const exportTypes = useMemo(
    () => [
      { format: "xlsx" as const, label: "Excel (.xlsx)", icon: FileSpreadsheet, color: "text-green-500", bg: "bg-green-500/10" },
      { format: "docx" as const, label: "Word (.docx)", icon: FileText, color: "text-indigo-500", bg: "bg-indigo-500/10" },
      { format: "pdf" as const, label: "PDF Belgesi", icon: FileText, color: "text-red-500", bg: "bg-red-500/10" },
      { format: "csv" as const, label: "CSV Metni", icon: FileBox, color: "text-blue-500", bg: "bg-blue-500/10" },
    ],
    []
  );

  const handleExport = async (format: ExportFormat) => {
    setLoadingFormat(format);

    try {
      const response = await api.get(endpoint, {
        params: {
          ...params,
          format,
        },
        responseType: "blob",
      });

      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${filename}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setIsOpen(false);
    } catch (error) {
      console.error("Export islemi basarisiz", error);
    } finally {
      setLoadingFormat(null);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-white transition-all hover:bg-white/10"
      >
        <Download className="h-4 w-4" /> {buttonLabel}
      </button>

      <AnimatePresence>
        {isOpen ? (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 top-full z-50 mt-2 w-56 origin-top-right overflow-hidden rounded-2xl border border-white/10 bg-[#121218] p-2 shadow-2xl"
            >
              {exportTypes.map((type) => (
                <button
                  key={type.label}
                  onClick={() => void handleExport(type.format)}
                  disabled={loadingFormat !== null}
                  className="group flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all hover:bg-white/5 disabled:opacity-50"
                >
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${type.bg} ${type.color}`}>
                    {loadingFormat === type.format ? <Loader2 className="h-4 w-4 animate-spin" /> : <type.icon className="h-4 w-4" />}
                  </div>
                  <span className="text-xs font-bold text-muted-foreground transition-colors group-hover:text-white">{type.label}</span>
                </button>
              ))}
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
