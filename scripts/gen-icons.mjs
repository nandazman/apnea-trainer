// Generates PWA icons (abyss bg + bioluminescent orb) as PNGs — no dependencies.
// ponytail: placeholder art good enough to install; replace with real artwork anytime.
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, rgb) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // truecolor
  const raw = Buffer.alloc(size * (size * 3 + 1));
  let p = 0;
  for (let y = 0; y < size; y++) {
    raw[p++] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b] = rgb(x, y);
      raw[p++] = r;
      raw[p++] = g;
      raw[p++] = b;
    }
  }
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const lerp = (a, b, t) => Math.round(a + (b - a) * t);
function icon(size, glowScale) {
  const cx = size / 2;
  const cy = size * 0.47;
  const R = size * glowScale;
  return png(size, (x, y) => {
    const d = Math.hypot(x - cx, y - cy);
    const g = Math.max(0, 1 - d / R) ** 1.6;
    // abyss #060b14 -> bio-soft #5ac8fa
    return [lerp(6, 90, g), lerp(11, 200, g), lerp(20, 250, g)];
  });
}

mkdirSync(new URL("../public/icons/", import.meta.url), { recursive: true });
const out = (name) => new URL(`../public/icons/${name}`, import.meta.url);
writeFileSync(out("icon-192.png"), icon(192, 0.42));
writeFileSync(out("icon-512.png"), icon(512, 0.42));
writeFileSync(out("icon-maskable.png"), icon(512, 0.62)); // bigger safe-area fill
console.log("icons written to public/icons/");
