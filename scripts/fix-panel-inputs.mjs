import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.join(__dirname, "../src/app");
const roots = ["admin", "coordinator", "staff", "student", "alumni"].map((d) =>
  path.join(appRoot, d)
);

const pairs = [
  ["border border-white/10 bg-black/40", "border border-slate-200 bg-white"],
  ["border-white/10 bg-black/40", "border-slate-200 bg-white"],
];

function processFile(file) {
  let s = fs.readFileSync(file, "utf8");
  const before = s;
  for (const [a, b] of pairs) {
    s = s.split(a).join(b);
  }
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
