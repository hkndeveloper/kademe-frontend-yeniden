import type { Metadata } from "next";
import PanelShell from "./panel-shell";

export const metadata: Metadata = {
  title: "Mezun Paneli",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <PanelShell>{children}</PanelShell>;
}
