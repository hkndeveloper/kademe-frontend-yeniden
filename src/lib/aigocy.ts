import defaults from "./aigocy-defaults.json";

export type ThemeSectionId =
  | "partners"
  | "services"
  | "process"
  | "benefits"
  | "features"
  | "tools"
  | "team"
  | "awards"
  | "testimonials"
  | "pricing";
export type ThemeItem = {
  id: string;
  title: string;
  description?: string;
  image_url?: string;
  href?: string;
  label?: string;
  subtitle?: string;
  value?: string;
  icon?: string;
  details?: string[];
};
export type ThemeSection = {
  id: ThemeSectionId;
  title: string;
  description: string;
  enabled: boolean;
  items: ThemeItem[];
};
export type ThemeSettings = {
  home_variant: "1" | "2";
  hero_background_url: string;
  video_url: string;
  home_block_order: string[];
  sections: ThemeSection[];
};
export const defaultTheme = defaults as ThemeSettings;
export function resolveTheme(value?: Partial<ThemeSettings>): ThemeSettings {
  const order = Array.isArray(value?.home_block_order)
    ? value.home_block_order
    : [];
  const sections = Array.isArray(value?.sections) ? value.sections : [];
  return {
    ...defaultTheme,
    ...value,
    home_variant: value?.home_variant === "2" ? "2" : "1",
    hero_background_url:
      typeof value?.hero_background_url === "string"
        ? value.hero_background_url
        : "",
    video_url: typeof value?.video_url === "string" ? value.video_url : "",
    home_block_order: [
      ...new Set([
        ...order.filter((id) => defaultTheme.home_block_order.includes(id)),
        ...defaultTheme.home_block_order,
      ]),
    ],
    sections: defaultTheme.sections.map((section) => {
      const incoming = sections.find((item) => item && item.id === section.id);
      return {
        ...section,
        ...incoming,
        description:
          typeof incoming?.description === "string"
            ? incoming.description
            : incoming
              ? ""
              : section.description,
        enabled: incoming ? incoming.enabled === true : section.enabled,
        items: incoming
          ? Array.isArray(incoming.items)
            ? incoming.items
                .filter((item) => item && typeof item.title === "string")
                .map((item, index) => ({
                  ...item,
                  id:
                    typeof item.id === "string"
                      ? item.id
                      : `${section.id}-${index}`,
                }))
            : []
          : section.items,
      };
    }),
  };
}
// CMS links can be local routes or absolute HTTP(S) URLs, never executable schemes.
export function safeHref(value?: string, fallback = "/contact") {
  return typeof value === "string" &&
    !/[\\\u0000-\u001f\u007f]/.test(value) &&
    /^(?:https?:\/\/|\/(?!\/))/.test(value)
    ? value
    : fallback;
}
export function plain(value?: string | null) {
  return (value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
export function formatPublicDate(value?: string | null) {
  if (!value) return "Tarih duyurulacak";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Tarih duyurulacak"
    : date.toLocaleDateString("tr-TR", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Europe/Istanbul",
      });
}
