import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KADEME Yonetim Sistemi",
    short_name: "KADEME",
    description: "KADEME ogrenci, mezun ve panel yonetim platformu.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#0f172a",
    lang: "tr",
    categories: ["education", "productivity"],
    icons: [
      {
        src: "/branding/kademe-logo-turuncu.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/branding/kademe-logo-turuncu.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Panel",
        short_name: "Panel",
        description: "KADEME paneline git",
        url: "/panel",
      },
      {
        name: "Faaliyetler",
        short_name: "Faaliyetler",
        description: "Yaklasan faaliyetleri gor",
        url: "/activities",
      },
    ],
  };
}
