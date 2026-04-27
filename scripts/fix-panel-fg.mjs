import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.join(__dirname, "../src/app");
const roots = ["admin", "coordinator", "staff", "student", "alumni"].map((d) =>
  path.join(appRoot, d)
);

/** Ayni satirda renkli zemin uzerinde kalan beyaz metin (buton/rozeti bozma) */
function shouldKeepTextWhite(line) {
  if (/bg-\[#FF6B00\]|bg-\[#e85f|bg-\[#f36d/.test(line)) return true;
  if (/(?:^|[^a-z-])bg-(indigo|amber|sky|primary|red|green|emerald|purple|blue|rose|violet|orange|black|zinc)-(?:\d+|(?:\[))/.test(line)) return true;
  if (/(?:^|[^a-z-])bg-(indigo|amber|sky|primary|red|green|emerald|purple|blue)-\d+\/\d+/.test(line)) return true;
  if (/from-primary|to-transparent|from-amber|gradient-to/.test(line) && /text-white/.test(line)) return true;
  if (/\b(?:Kabul Et|Reddet|tone:).*\btext-white/.test(line)) return true;
  if (/text-white.*(?:Kabul|shadow-(?:lg|green|amber|indigo|purple))/.test(line)) return true;
  if (/className=\{.*bg-(?:indigo|amber|green|red|emerald|purple|primary|sky)/.test(line) && /text-white/.test(line)) return true;
  return false;
}

function processFile(file) {
  let s = fs.readFileSync(file, "utf8");
  const before = s;
  const out = s.split("\n").map((line) => {
    if (!line.includes("text-white")) return line;
    if (shouldKeepTextWhite(line)) return line;
    return line.replaceAll("text-white", "text-slate-900");
  });
  s = out.join("\n");
  if (s !== before) {
    fs.writeFileSync(file, s);
    return 1;
  }
  return 0;
}

function walk(dir) {
  let n = 0;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) n += walk(p);
    else if (name.endsWith(".tsx")) n += processFile(p);
  }
  return n;
}

let total = 0;
for (const r of roots) {
  if (fs.existsSync(r)) total += walk(r);
}
console.log("files updated:", total);
