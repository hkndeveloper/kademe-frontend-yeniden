"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    navigator.serviceWorker.register("/service-worker.js").catch(() => {
      // Sessiz gec: PWA kaydi kritik akisi bloklamasin.
    });
  }, []);

  return null;
}
