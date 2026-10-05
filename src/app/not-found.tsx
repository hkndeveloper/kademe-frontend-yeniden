import { Reveal, ThemeButton } from "@/components/aigocy/Primitives";
export default function NotFound() {
  return (
    <section className="section-404 flat-spacing">
      <div className="container text-center">
        <Reveal effect="zoom">
          <h1 className="title fw-semibold text-display-1 text-gradient-1">
            404 — Sayfa bulunamadı
          </h1>
          <p className="desc text-body-1">
            Bu bağlantı değişmiş veya sayfa kaldırılmış olabilir.
            <br />
            Ana sayfadan keşfetmeye devam edebilirsiniz.
          </p>
          <ThemeButton href="/">Ana sayfaya dön</ThemeButton>
        </Reveal>
      </div>
    </section>
  );
}
