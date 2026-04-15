import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

function crc32(buf) {
  let crc = ~0;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return ~crc >>> 0;
}

function u32be(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n >>> 0, 0);
  return b;
}

function chunk(type, data) {
  const t = Buffer.from(type, "ascii");
  const d = Buffer.from(data);
  const len = u32be(d.length);
  const crc = u32be(crc32(Buffer.concat([t, d])));
  return Buffer.concat([len, t, d, crc]);
}

function makeSolidPng(width, height, rgba) {
  const [r, g, b, a] = rgba;
  const bytesPerPixel = 4;
  const stride = width * bytesPerPixel;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    for (let x = 0; x < width; x++) {
      const o = y * (stride + 1) + 1 + x * 4;
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
      raw[o + 3] = a;
    }
  }

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([signature, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

const outDir = join(process.cwd(), "public", "icons");
mkdirSync(outDir, { recursive: true });

const blue = [37, 99, 235, 255];
writeFileSync(join(outDir, "icon-192.png"), makeSolidPng(192, 192, blue));
writeFileSync(join(outDir, "icon-512.png"), makeSolidPng(512, 512, blue));

console.log("Generated PWA icons:", join(outDir, "icon-192.png"), join(outDir, "icon-512.png"));

