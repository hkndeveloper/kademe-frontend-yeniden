import AigocyHome from "@/components/aigocy/HomePage";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "KADEME — hareketli ana sayfa" };
export default function Page() {
  return <AigocyHome variant="2" />;
}
