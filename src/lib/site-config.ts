export interface SiteSettingsPayload {
  general: {
    site_name: string;
    site_tagline: string;
  };
  contact: {
    contact_email: string;
    contact_phone: string;
    contact_address: string;
  };
  social_media: {
    instagram_url: string;
    twitter_url: string;
    youtube_url: string;
    linkedin_url: string;
  };
  navigation: {
    header_links: Array<{ label: string; href: string }>;
    header_login_label: string;
    header_register_label: string;
    footer_quick_links: Array<{ label: string; href: string }>;
    footer_project_links: Array<{ label: string; href: string }>;
  };
  homepage: {
    block_order: Array<"hero" | "intro" | "stats" | "projects" | "activities" | "about" | "blog" | "newsletter">;
    block_visibility: {
      hero: boolean;
      intro: boolean;
      stats: boolean;
      projects: boolean;
      activities: boolean;
      about: boolean;
      blog: boolean;
      newsletter: boolean;
    };
    hero_badge: string;
    hero_title_line_1: string;
    hero_title_line_2: string;
    hero_title_line_3: string;
    hero_title_line_4: string;
    hero_description: string;
    hero_background_image_url: string;
    hero_primary_label: string;
    hero_primary_href: string;
    hero_secondary_label: string;
    hero_secondary_href: string;
    intro_cards: Array<{
      title: string;
      description: string;
      image_url: string;
      cta_label: string;
      cta_href: string;
    }>;
    projects_title: string;
    projects_description: string;
    activities_title: string;
    activities_description: string;
    featured_activity_ids: number[];
    about_teaser_title: string;
    about_teaser_description: string;
    about_teaser_image_url: string;
    blog_title: string;
    blog_description: string;
    stats_mode: "auto" | "manual";
    featured_project_slugs: string[];
    featured_blog_slugs: string[];
    newsletter_title: string;
    newsletter_description: string;
    footer_description: string;
    footer_copyright: string;
    stats: Array<{ label: string; value: string; icon: string }>;
  };
  about: {
    hero_title: string;
    hero_description: string;
    mission_title: string;
    mission_text: string;
    vision_title: string;
    vision_text: string;
    ecosystem_title: string;
    ecosystem_description: string;
    faq_teaser_title: string;
    faq_teaser_text: string;
    blog_teaser_title: string;
    blog_teaser_text: string;
    activities_teaser_title: string;
    activities_teaser_text: string;
    journey_title: string;
    journey_text: string;
  };
}

export interface SiteSettingsResponse {
  settings: SiteSettingsPayload;
  computed_homepage_stats?: Array<{ label: string; value: string; icon: string }>;
}

export const defaultSiteSettings: SiteSettingsPayload = {
  general: {
    site_name: "KADEME",
    site_tagline: "Gelecegin Liderlik Okulu",
  },
  contact: {
    contact_email: "info@kademe.org",
    contact_phone: "0212 XXX XX XX",
    contact_address: "T3 Vakfi Genel Merkezi, Istanbul, Turkiye",
  },
  social_media: {
    instagram_url: "",
    twitter_url: "",
    youtube_url: "",
    linkedin_url: "",
  },
  navigation: {
    header_links: [
      { label: "Ana Sayfa", href: "/" },
      { label: "Hakkimizda", href: "/about" },
      { label: "Faaliyetler", href: "/activities" },
      { label: "SSS", href: "/faq" },
      { label: "Iletisim", href: "/contact" },
    ],
    header_login_label: "Giris Yap",
    header_register_label: "Basvur",
    footer_quick_links: [
      { label: "Hakkimizda", href: "/about" },
      { label: "Projelerimiz", href: "/projects" },
      { label: "SSS", href: "/faq" },
      { label: "Iletisim", href: "/contact" },
    ],
    footer_project_links: [],
  },
  homepage: {
    block_order: ["hero", "intro", "stats", "projects", "activities", "about", "blog", "newsletter"],
    block_visibility: {
      hero: true,
      intro: true,
      stats: true,
      projects: true,
      activities: true,
      about: true,
      blog: true,
      newsletter: true,
    },
    hero_badge: "KADEME: Gelecegin Liderlik Okulu",
    hero_title_line_1: "YETENEGINI",
    hero_title_line_2: "KESFET",
    hero_title_line_3: "GELECEGI",
    hero_title_line_4: "YONET",
    hero_description: "T3 Vakfi bunyesinde, Turkiye ekosisteminde kapsamli kariyer ve yetenek gelisim programlarina dahil olun.",
    hero_background_image_url: "",
    hero_primary_label: "Hemen Basvur",
    hero_primary_href: "/auth/register",
    hero_secondary_label: "Giris Yap",
    hero_secondary_href: "/auth/login",
    intro_cards: [
      {
        title: "Kariyer ve Liderlik Gelisimi",
        description: "KADEME, ogrencilerin ve mezunlarin farkli proje akislari icinde yeteneklerini gelistirebildigi cok katmanli bir ekosistem sunar.",
        image_url: "",
        cta_label: "Hakkimizda",
        cta_href: "/about",
      },
      {
        title: "Proje Bazli Yolculuk",
        description: "Diplomasi360, KADEME+, Pergel Fellowship, KPD ve Eurodesk gibi alan odakli projeler tek merkezden yonetilir.",
        image_url: "",
        cta_label: "Projeleri Incele",
        cta_href: "/projects",
      },
      {
        title: "Etkinlik ve Basvuru Akisi",
        description: "Yaklasan faaliyetler, blog yazilari, duyurular ve basvuru surecleri ayni dijital deneyim icinde sunulur.",
        image_url: "",
        cta_label: "Faaliyetlere Git",
        cta_href: "/activities",
      },
    ],
    projects_title: "PROJELERIMIZ",
    projects_description: "KADEME catisi altinda farkli alanlara ozel gelisim programlari.",
    activities_title: "FAALIYETLERIMIZ",
    activities_description: "Yaklasan etkinlikler, programlar ve proje bazli faaliyet ozeti.",
    featured_activity_ids: [],
    about_teaser_title: "KADEME VE PROJE EKOSISTEMI",
    about_teaser_description: "Mentorluk, psikolojik danismanlik, rozet sistemi, dijital bohca ve proje bazli etkinlik akislariyla cok katmanli bir gelisim yapisi sunuyoruz.",
    about_teaser_image_url: "",
    blog_title: "GUNCEL BLOG",
    blog_description: "KADEME dunyasindan son haberler ve makaleler.",
    stats_mode: "auto",
    featured_project_slugs: [],
    featured_blog_slugs: [],
    newsletter_title: "KADEME E-Bultenine Katil",
    newsletter_description: "Yeni faaliyetler, proje duyurulari ve blog icerikleri yayinlandiginda ilk sen haberdar ol.",
    footer_description: "T3 Vakfi Kariyer Gelisim Merkezi. Gelecegin liderlerini bugunden yetistiriyoruz.",
    footer_copyright: "© 2026 KADEME YONETIM SISTEMI | T3 VAKFI. TUM HAKLARI SAKLIDIR.",
    stats: [
      { label: "Aktif Ogrenci", value: "2,500+", icon: "users" },
      { label: "Tamamlanan Proje", value: "450+", icon: "trophy" },
      { label: "Yillik Etkinlik", value: "1,200+", icon: "calendar" },
      { label: "Sehir", value: "81", icon: "globe" },
    ],
  },
  about: {
    hero_title: "Biz Kimiz?",
    hero_description: "KADEME, T3 Vakfi bunyesinde yetenek, kariyer ve liderlik gelisimi odakli bir ekosistemdir. Ogrenciler, mezunlar ve profesyoneller icin surekli gelisim alanlari uretir.",
    mission_title: "Misyonumuz",
    mission_text: "Genc yeteneklerin potansiyelini ortaya cikarmak, onlara cagimizin gerektirdigi bilgi ve becerileri kazandirmak ve uzun vadeli bir gelisim yolculugu sunmak.",
    vision_title: "Vizyonumuz",
    vision_text: "Turkiye'nin ihtiyac duydugu nitelikli insan kaynagini destekleyen, projeleriyle fark yaratan ve katilimcilarina gercek bir gelisim agi sunan oncu bir merkez olmak.",
    ecosystem_title: "KADEME ve Proje Ekosistemi",
    ecosystem_description: "Diplomasi, mentorluk, psikolojik danismanlik, rozet sistemi, dijital bohca ve proje bazli etkinlik akislariyla farkli alanlara dokunan cok katmanli bir yapi kuruyoruz.",
    faq_teaser_title: "SSS ve Blog",
    faq_teaser_text: "Sik sorulan sorular ve icerik akisi public tarafta erisilebilir.",
    blog_teaser_title: "Blog Yazilari",
    blog_teaser_text: "KADEME dunyasindan secili yazilar ve guncel icerikler burada yer alir.",
    activities_teaser_title: "Faaliyetler",
    activities_teaser_text: "Program ve etkinlik akislarimiz proje bazli ilerler.",
    journey_title: "Gelisim Yolculugu",
    journey_text: "Projeler, faaliyetler, blog, SSS ve iletisim akislari birlikte KADEME'nin public katmanini olusturur.",
  },
};
