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
    sharing_webhook_url?: string;
  };
  navigation: {
    header_links: Array<{ label: string; href: string }>;
    header_login_label: string;
    header_register_label: string;
    footer_quick_links: Array<{ label: string; href: string }>;
    footer_project_links: Array<{ label: string; href: string }>;
  };
  homepage: {
    block_order: Array<"hero" | "intro" | "stats" | "projects" | "activities" | "about" | "blog" | "newsletter" | "certificate_verify">;
    block_visibility: {
      hero: boolean;
      intro: boolean;
      stats: boolean;
      projects: boolean;
      activities: boolean;
      about: boolean;
      blog: boolean;
      newsletter: boolean;
      certificate_verify: boolean;
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
    certificate_verify_title: string;
    certificate_verify_description: string;
    certificate_verify_cta_label: string;
    certificate_verify_cta_href: string;
    footer_description: string;
    footer_copyright: string;
    stats: Array<{ label: string; value: string; icon: string }>;
    monthly_motivation_message: string;
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
  blog_page: {
    badge_label: string;
    title: string;
    description: string;
    search_placeholder: string;
    empty_text: string;
    read_more_label: string;
    detail_badge_label: string;
    detail_back_label: string;
    detail_empty_content: string;
  };
  faq_page: {
    title: string;
    description: string;
    empty_text: string;
    contact_title: string;
    contact_description: string;
    contact_cta_label: string;
    contact_cta_href: string;
  };
}

export interface SiteSettingsResponse {
  settings: SiteSettingsPayload;
  computed_homepage_stats?: Array<{ label: string; value: string; icon: string }>;
}

export const defaultSiteSettings: SiteSettingsPayload = {
  general: {
    site_name: "KADEME",
    site_tagline: "Geleceğin Liderlik Okulu",
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
    sharing_webhook_url: "",
  },
  navigation: {
    header_links: [
      { label: "Ana Sayfa", href: "/" },
      { label: "Hakkımızda", href: "/about" },
      { label: "Faaliyetler", href: "/activities" },
      { label: "Blog", href: "/blog" },
      { label: "SSS", href: "/faq" },
      { label: "İletişim", href: "/contact" },
      { label: "Sertifika Sorgula", href: "/certificates/verify" },
    ],
    header_login_label: "Giriş Yap",
    header_register_label: "Başvur",
    footer_quick_links: [
      { label: "Hakkımızda", href: "/about" },
      { label: "Projelerimiz", href: "/projects" },
      { label: "SSS", href: "/faq" },
      { label: "İletişim", href: "/contact" },
    ],
    footer_project_links: [],
  },
  homepage: {
    block_order: ["hero", "intro", "stats", "projects", "activities", "about", "blog", "newsletter", "certificate_verify"],
    block_visibility: {
      hero: true,
      intro: true,
      stats: true,
      projects: true,
      activities: true,
      about: true,
      blog: true,
      newsletter: true,
      certificate_verify: true,
    },
    hero_badge: "KADEME: Geleceğin Liderlik Okulu",
    hero_title_line_1: "YETENEĞİNİ",
    hero_title_line_2: "KEŞFET",
    hero_title_line_3: "GELECEĞİ",
    hero_title_line_4: "YÖNET",
    hero_description: "T3 Vakfı bünyesinde, Türkiye ekosisteminde kapsamlı kariyer ve yetenek gelişim programlarına dahil olun.",
    hero_background_image_url: "",
    hero_primary_label: "Hemen Başvur",
    hero_primary_href: "/auth/register",
    hero_secondary_label: "Giriş Yap",
    hero_secondary_href: "/auth/login",
    intro_cards: [
      {
        title: "Kariyer ve Liderlik Gelişimi",
        description: "KADEME, öğrencilerin ve mezunların farklı proje akışları içinde yeteneklerini geliştirebildiği çok katmanlı bir ekosistem sunar.",
        image_url: "",
        cta_label: "Hakkımızda",
        cta_href: "/about",
      },
      {
        title: "Proje Bazlı Yolculuk",
        description: "Diplomasi360, KADEME+, Pergel Fellowship, KPD ve Eurodesk gibi alan odaklı projeler tek merkezden yönetilir.",
        image_url: "",
        cta_label: "Projeleri İncele",
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
    certificate_verify_title: "Sertifika Dogrula",
    certificate_verify_description: "KADEME tarafindan verilen sertifikalari dogrulama kodu ile kamusal olarak sorgulayabilirsiniz.",
    certificate_verify_cta_label: "Dogrulama Ekranina Git",
    certificate_verify_cta_href: "/certificates/verify",
    footer_description: "T3 Vakfi Kariyer Gelisim Merkezi. Gelecegin liderlerini bugunden yetistiriyoruz.",
    footer_copyright: "© 2026 KADEME YÖNETİM SİSTEMİ | T3 VAKFI. TÜM HAKLARI SAKLIDIR.",
    stats: [
      { label: "Aktif Ogrenci", value: "2,500+", icon: "users" },
      { label: "Tamamlanan Proje", value: "450+", icon: "trophy" },
      { label: "Yillik Etkinlik", value: "1,200+", icon: "calendar" },
      { label: "Sehir", value: "81", icon: "globe" },
    ],
    monthly_motivation_message: "Gelecek, bugunden ona hazirlananlara aittir. KADEME'deki her adim, seni daha guclu bir vizyona tasir.",
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
    faq_teaser_text: "Sık sorulan sorular ve içerik akışı public tarafta erişilebilir.",
    blog_teaser_title: "Blog Yazilari",
    blog_teaser_text: "KADEME dünyasından seçili yazılar ve güncel içerikler burada yer alır.",
    activities_teaser_title: "Faaliyetler",
    activities_teaser_text: "Program ve etkinlik akislarimiz proje bazli ilerler.",
    journey_title: "Gelisim Yolculugu",
    journey_text: "Projeler, faaliyetler, blog, SSS ve iletişim akışları birlikte KADEME'nin public katmanını oluşturur.",
  },
  blog_page: {
    badge_label: "KADEME Rehberi",
    title: "Blog & Haberler",
    description: "Geleceğin yetenekleri için hazırladığımız makaleleri ve KADEME dünyasındaki son gelişmeleri takip edin.",
    search_placeholder: "Blog yazısı ara...",
    empty_text: "Seçili arama kriterleriyle blog yazısı bulunamadı.",
    read_more_label: "Devamını Oku",
    detail_badge_label: "Blog Detayı",
    detail_back_label: "Tüm blog yazılarına dön",
    detail_empty_content: "Bu yazı için henüz içerik eklenmemiş.",
  },
  faq_page: {
    title: "Sıkça Sorulan Sorular",
    description: "KADEME süreçleri hakkında merak ettiğiniz temel konular burada toplanır.",
    empty_text: "Henüz soru-cevap eklenmemiş.",
    contact_title: "Başka bir sorunuz mu var?",
    contact_description: "Aradığınız cevabı bulamadıysanız iletişim veya destek kanalına geçebilirsiniz.",
    contact_cta_label: "İletişime Geç",
    contact_cta_href: "/contact",
  },
};
