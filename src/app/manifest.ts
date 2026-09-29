import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KADEME — Keşfet, Öğren, Geliş",
    short_name: "KADEME",
    description: "KADEME ile projeleri keşfet, öğren ve geleceğini şekillendir.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f7f3ea",
    theme_color: "#f7f3ea",
    lang: "tr",
    categories: ["education", "productivity"],
    icons: [
      {
        src: "/branding/kademe-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/branding/kademe-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/branding/kademe-icon-maskable.png",
        sizes: "512x512",
        type: "image/png",
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
        description: "Yaklaşan faaliyetleri gör",
        url: "/activities",
      },
    ],
  };
}
