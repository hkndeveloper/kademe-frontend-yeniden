import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";

// Compile isolated pure modules without Next's alias loader.
function load(relativePath, requireModule) {
  const source = readFileSync(new URL(relativePath, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const loadedModule = { exports: {} };
  runInNewContext(compiled, { module: loadedModule, exports: loadedModule.exports, require: requireModule });
  return loadedModule.exports;
}
const defaults = load("../src/lib/site-config.ts");
const { normalizeKnownPublicCopy: normalize } = load("../src/lib/public-copy.ts", () => defaults);

test("legacy public copy gets Turkish characters without changing casing", () => {
  assert.equal(normalize("Sertifika Dogrula"), "Sertifika Doğrula");
  assert.equal(normalize("Dogrulama Ekranina Git"), "Doğrulama Ekranına Git");
  assert.equal(normalize("Iletisim"), "İletişim");
  assert.equal(normalize("Aktif Ogrenci"), "Aktif Öğrenci");
  assert.equal(normalize("Projelerimiz"), "Projelerimiz");
  assert.equal(normalize("YAYINLANAN BLOG"), "YAYINLANAN BLOG");
});

test("custom editorial copy, links, codes and original payload remain untouched", () => {
  const original = { label: "Sertifika Dogrula", href: "/Dogrula", code: "Iletisim", value: 11 };
  const result = normalize(original);
  assert.equal(result.label, "Sertifika Doğrula");
  assert.equal(result.href, original.href);
  assert.equal(result.code, original.code);
  assert.equal(result.value, 11);
  assert.equal(original.label, "Sertifika Dogrula");
  assert.equal(normalize("Ozel marka adi"), "Ozel marka adi");
});
