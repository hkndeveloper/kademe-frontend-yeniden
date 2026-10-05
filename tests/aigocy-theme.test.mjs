import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";

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
