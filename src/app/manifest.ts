import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KADEME Yönetim Sistemi",
    short_name: "KADEME",
    description: "KADEME ogrenci, mezun ve panel yonetim platformu.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#111827",
    lang: "tr",
    icons: [
      {
        src: "/next.svg",
        sizes: "192x192",
        type: "image/svg+xml",
      },
      {
        src: "/next.svg",
        sizes: "512x512",
        type: "image/svg+xml",
      },
    ],
  };
}
