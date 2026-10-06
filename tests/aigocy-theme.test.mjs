import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";

test("public header has no account actions and filters CMS login/register links", () => {
  const header = readFileSync(new URL("../src/components/aigocy/ThemeHeader.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(header, /theme-login|theme-register|useAuth|homePathForUser/);
  assert.doesNotMatch(header, /href="\/auth\/(login|register)"/);
  assert.ok(header.includes("(login|register)(?:[/?#]|$)"));
  assert.match(header, /aria-label="Menüyü aç"/);
  assert.match(header, /aria-label="Mobil menü"/);
});

test("template resets stay layered so existing application utilities remain effective", () => {
  const vendor = readFileSync(
    new URL("../src/components/aigocy/vendor.css", import.meta.url),
    "utf8",
  );
  assert.match(vendor, /^@layer components\s*\{/);
  const builder = readFileSync(
    new URL("../scripts/build-aigocy-css.cjs", import.meta.url),
    "utf8",
  );
  assert.match(builder, /@layer components/);
});

test("continuous strips repeat equal groups without a half-gap jump", () => {
  const css = readFileSync(
    new URL("../src/components/aigocy/theme.css", import.meta.url),
    "utf8",
  );
  const track = css.match(/\.theme-marquee-track\s*\{([^}]+)\}/)?.[1];
  assert.ok(track);
  assert.doesNotMatch(track, /\bgap:/);
  assert.match(css, /\.theme-marquee-group\s*\{[^}]+padding-right:\s*48px/s);
  assert.match(css, /\.theme-partner-group\s*\{[^}]+padding-right:\s*32px/s);
  assert.match(css, /translateX\(-50%\)/);
});

test("smooth scrolling includes the new shell and respects reduced motion", () => {
  const source = readFileSync(
    new URL("../src/components/public/PublicSmoothScroll.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /\.aigocy-site, \.kdm-public-shell/);
  assert.match(source, /prefers-reduced-motion: reduce/);
  assert.match(source, /\[pathname\]/);
});

test("icon inputs retain their text inset above the generic input rule", () => {
  const css = readFileSync(
    new URL("../src/components/aigocy/theme.css", import.meta.url),
    "utf8",
  );
  assert.match(css, /input:not\(\[type="checkbox"\], \[type="radio"\], \[type="file"\]\)/);
  assert.match(css, /\.kdm-public-shell input\.pl-12\s*\{\s*padding-left:\s*48px/);
});

test("home uses the full original featured works and split process layouts", () => {
  const home = readFileSync(new URL("../src/components/aigocy/HomePage.tsx", import.meta.url), "utf8");
  const sections = readFileSync(new URL("../src/components/aigocy/HomeTemplateSections.tsx", import.meta.url), "utf8");
  assert.match(home, /FeaturedProjectShowcase\s+settings=\{settings\}\s+projects=\{featuredProjects\}/);
  assert.match(home, /homeLayout/);
  for (const originalClass of ["featured-works-list", "grid-text", "process-heading", "process-slide", "nav-next-swiper"])
    assert.ok(sections.includes(originalClass));
  assert.match(sections, /project\.active_period\?\.name/);
  assert.match(sections, /project\.is_application_open/);
  assert.match(sections, /section\.items\.map/);
  assert.match(sections, /prefers-reduced-motion: reduce/);
});

test("home features retain the original animated connectors and all CMS items", () => {
  const source = readFileSync(new URL("../src/components/aigocy/HomeTemplateSections.tsx", import.meta.url), "utf8");
  for (const originalClass of ["features-wrap", "features-col", "features-center", "side-line-main", "simu-electric"])
    assert.ok(source.includes(originalClass));
  assert.match(source, /section\.items\.slice\(0, middle\)/);
  assert.match(source, /section\.items\.slice\(middle\)/);
  assert.match(source, /kademe-logo-beyaz\.svg/);
});

const defaultsUrl = new URL("../src/lib/aigocy-defaults.json", import.meta.url);
const source = readFileSync(
  new URL("../src/lib/aigocy.ts", import.meta.url),
  "utf8",
).replace(
  /import defaults from ['"]\.\/aigocy-defaults\.json['"];?/,
  `import defaults from '${defaultsUrl.href}' with {type:'json'};`,
);
const javascript = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const { resolveTheme, safeHref, plain, formatPublicDate, defaultTheme } =
  await import(
    `data:text/javascript;base64,${Buffer.from(javascript).toString("base64")}`
  );

test("default theme provides every home slot and all ten editable template groups", () => {
  assert.equal(defaultTheme.home_variant, "1");
  assert.equal(defaultTheme.home_block_order.length, 22);
  assert.equal(defaultTheme.sections.length, 10);
  for (const id of ["partners", "team", "awards", "testimonials"])
    assert.deepEqual(
      defaultTheme.sections.find((section) => section.id === id).items,
      [],
    );
});
test("partial CMS saves preserve sections and complete a unique known home order", () => {
  const theme = resolveTheme({
    home_block_order: ["projects", "projects", "invalid", "hero"],
    sections: [
      {
        id: "team",
        title: "Ekibimiz",
        enabled: false,
        description: "",
        items: [],
      },
    ],
  });
  assert.deepEqual(theme.home_block_order.slice(0, 2), ["projects", "hero"]);
  assert.equal(new Set(theme.home_block_order).size, 22);
  assert.equal(
    theme.sections.find((section) => section.id === "team").enabled,
    false,
  );
  assert.equal(
    theme.sections.find((section) => section.id === "process").items.length,
    3,
  );
});
test("CMS links reject executable and protocol-relative schemes", () => {
  for (const value of [
    "javascript:alert(1)",
    "data:text/html,x",
    "//external.test",
    "",
  ])
    assert.equal(safeHref(value), "/contact");
  assert.equal(safeHref("/projects/kademe"), "/projects/kademe");
  assert.equal(
    safeHref("https://example.test/image.png"),
    "https://example.test/image.png",
  );
});
test("Turkish copy and deterministic Istanbul dates remain intact", () => {
  assert.equal(plain("<p>Doğrula ş ç ı İ ö ü</p>"), "Doğrula ş ç ı İ ö ü");
  assert.equal(formatPublicDate("invalid"), "Tarih duyurulacak");
  assert.equal(formatPublicDate("2026-09-24T22:30:00Z"), "25 Eylül 2026");
});
test("contact file uploads explicitly use multipart instead of the JSON API default", () => {
  const source = readFileSync(
    new URL("../src/components/aigocy/ContactSection.tsx", import.meta.url),
    "utf8",
  );
  assert.match(
    source,
    /["']Content-Type["']\s*:\s*["']multipart\/form-data["']/,
  );
  assert.match(source, /official_document/);
});

test("malformed or nullable old CMS values do not break controlled inputs", () => {
  const theme = resolveTheme({
    home_variant: "unknown",
    hero_background_url: null,
    video_url: null,
    home_block_order: "invalid",
    sections: [
      {
        id: "team",
        title: "Ekip",
        enabled: false,
        description: null,
        items: null,
      },
    ],
  });
  assert.equal(theme.home_variant, "1");
  assert.equal(theme.hero_background_url, "");
  assert.equal(theme.video_url, "");
  assert.equal(
    theme.sections.find((section) => section.id === "team").description,
    "",
  );
  assert.deepEqual(
    theme.sections.find((section) => section.id === "team").items,
    [],
  );
});
test("integration map covers every purchased template page", () => {
  const mapping = JSON.parse(
    readFileSync(
      new URL("../src/components/aigocy/integration-map.json", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(mapping.pages.length, 13);
  assert.equal(new Set(mapping.pages.map((page) => page.source)).size, 13);
  assert.ok(mapping.pages.some((page) => page.route === "/home-animated"));
});
test("application dialog uses one scroll region with a persistent submit action", () => {
  const source = readFileSync(new URL("../src/app/projects/[slug]/page.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../src/components/aigocy/theme.css", import.meta.url), "utf8");
  assert.ok(source.includes('id="candidate-application-form"'));
  assert.ok(source.includes('type="submit" form="candidate-application-form"'));
  assert.ok(source.includes('id="application-email" required type="email"'));
  assert.ok(source.includes('autoComplete="one-time-code"'));
  assert.ok(source.includes('project?.trainings?.find'));
  assert.ok(css.includes('max-height:calc(100dvh - 48px)'));
  assert.ok(css.includes('min-height:0; overflow-y:auto'));
});
