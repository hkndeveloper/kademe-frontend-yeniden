// Regenerate raster fallbacks from the single vector favicon source.
import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const root = new URL("../", import.meta.url);
const svg = await readFile(new URL("src/app/icon.svg", root));
const render = (size) => sharp(svg).resize(size, size).png().toBuffer();
await Promise.all([
  [180, "src/app/apple-icon.png"],
  [192, "public/branding/kademe-icon-192.png"],
  [512, "public/branding/kademe-icon-512.png"],
].map(async ([size, path]) => writeFile(new URL(path, root), await render(size))));

// Keep the entire mark inside the circular safe zone for Android masks.
await sharp({ create: { width: 512, height: 512, channels: 4, background: "#f7f3ea" } })
  .composite([{ input: await render(352), gravity: "centre" }])
  .png().toFile(new URL("public/branding/kademe-icon-maskable.png", root).pathname);

const sizes = [16, 32, 48];
const images = await Promise.all(sizes.map(render));
const header = Buffer.alloc(6 + images.length * 16);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(images.length, 4);
let offset = header.length;
images.forEach((image, index) => {
  const entry = 6 + index * 16;
  header[entry] = sizes[index];
  header[entry + 1] = sizes[index];
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(image.length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += image.length;
});
await writeFile(new URL("src/app/favicon.ico", root), Buffer.concat([header, ...images]));
