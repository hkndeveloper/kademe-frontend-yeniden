"use client";

import { Download, FileBox, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import api from "@/lib/api/axios";

interface ExportButtonsProps {
  endpoint: string;
  filename?: string;
  params?: Record<string, string | number | undefined>;
  buttonLabel?: string;
}

type ExportFormat = "xlsx" | "pdf" | "csv" | "docx";
type MenuPlacement = "top" | "bottom";

const MENU_WIDTH = 224;
const MENU_ESTIMATED_HEIGHT = 236;
const MENU_GAP = 8;
const VIEWPORT_PADDING = 12;

export function ExportButtons({
  endpoint,
  filename = "data_export",
  params = {},
  buttonLabel = "Dışa Aktar",
}: ExportButtonsProps) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [loadingFormat, setLoadingFormat] = useState<ExportFormat | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ left: number; top: number; placement: MenuPlacement }>({
    left: 0,
    top: 0,
    placement: "bottom",
  });

  const exportTypes = useMemo(
    () => [
      { format: "xlsx" as const, label: "Excel (.xlsx)", icon: FileSpreadsheet, color: "text-green-500", bg: "bg-green-500/10" },
      { format: "docx" as const, label: "Word (.docx)", icon: FileText, color: "text-indigo-500", bg: "bg-indigo-500/10" },
      { format: "pdf" as const, label: "PDF Belgesi", icon: FileText, color: "text-red-500", bg: "bg-red-500/10" },
      { format: "csv" as const, label: "CSV Metni", icon: FileBox, color: "text-blue-500", bg: "bg-blue-500/10" },
    ],
    []
  );

  const updateMenuPosition = useCallback(() => {
    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const availableBelow = viewportHeight - rect.bottom - VIEWPORT_PADDING;
    const availableAbove = rect.top - VIEWPORT_PADDING;
    const opensUpward = availableBelow < MENU_ESTIMATED_HEIGHT && availableAbove > availableBelow;

    const left = Math.min(
      Math.max(VIEWPORT_PADDING, rect.right - MENU_WIDTH),
      Math.max(VIEWPORT_PADDING, viewportWidth - MENU_WIDTH - VIEWPORT_PADDING),
    );
    const top = opensUpward
      ? Math.max(VIEWPORT_PADDING, rect.top - MENU_ESTIMATED_HEIGHT - MENU_GAP)
      : Math.min(rect.bottom + MENU_GAP, viewportHeight - VIEWPORT_PADDING);

    setMenuPosition({ left, top, placement: opensUpward ? "top" : "bottom" });
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [isOpen, updateMenuPosition]);

  const handleToggle = () => {
    if (!isOpen) {
      updateMenuPosition();
    }
    setIsOpen((current) => !current);
  };

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
      console.error("Export işlemi başarısız", error);
    } finally {
      setLoadingFormat(null);
    }
  };

  return (
    <div className="relative inline-flex">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className="panel-button panel-button-secondary whitespace-nowrap text-xs uppercase tracking-wider"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <Download className="h-4 w-4 shrink-0" /> {buttonLabel}
      </button>

      {mounted
        ? createPortal(
            <AnimatePresence>
              {isOpen ? (
                <>
                  <div key="export-overlay" className="fixed inset-0 z-[999]" onClick={() => setIsOpen(false)} aria-hidden />
                  <motion.div
                    key="export-menu"
                    initial={{ opacity: 0, y: menuPosition.placement === "top" ? -6 : 6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: menuPosition.placement === "top" ? -6 : 6, scale: 0.97 }}
                    transition={{ duration: 0.16, ease: "easeOut" }}
                    style={{ left: menuPosition.left, top: menuPosition.top, width: MENU_WIDTH }}
                    className="fixed z-[1000] overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 text-slate-900 shadow-2xl shadow-slate-900/20"
                    role="menu"
                  >
                    {exportTypes.map((type) => (
                      <button
                        key={type.label}
                        type="button"
                        onClick={() => void handleExport(type.format)}
                        disabled={loadingFormat !== null}
                        className="group flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors hover:bg-slate-50 disabled:opacity-50"
                        role="menuitem"
                      >
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${type.bg} ${type.color}`}>
                          {loadingFormat === type.format ? <Loader2 className="h-4 w-4 animate-spin" /> : <type.icon className="h-4 w-4" />}
                        </div>
                        <span className="text-xs font-bold text-slate-600 transition-colors group-hover:text-slate-900">
                          {type.label}
                        </span>
                      </button>
                    ))}
                  </motion.div>
                </>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </div>
  );
}