"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * /alumni/portfolio → /alumni/bohca adresine kalici yonlendirme.
 * Portfolyo ve Dijital Bohca birlestirilerek tek sayfa uzerinden sunulmaktadir.
 */
export default function AlumniPortfolioRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/alumni/bohca");
  }, [router]);

  return null;
}
