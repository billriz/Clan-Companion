import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import sharp from "sharp";

const SOURCE_ICON = join(process.cwd(), "public", "brand", "gravytime-icon.png");
const OUTPUT_DIR = join(process.cwd(), "public");
const SAGE = { r: 109, g: 139, b: 116, alpha: 1 };

function icoFromPngBuffer(pngBuffer) {
  const iconDir = Buffer.alloc(6);
  iconDir.writeUInt16LE(0, 0);
  iconDir.writeUInt16LE(1, 2);
  iconDir.writeUInt16LE(1, 4);

  const directoryEntry = Buffer.alloc(16);
  directoryEntry[0] = 32;
  directoryEntry[1] = 32;
  directoryEntry[2] = 0;
  directoryEntry[3] = 0;
  directoryEntry.writeUInt16LE(1, 4);
  directoryEntry.writeUInt16LE(32, 6);
  directoryEntry.writeUInt32LE(pngBuffer.length, 8);
  directoryEntry.writeUInt32LE(iconDir.length + directoryEntry.length, 12);

  return Buffer.concat([iconDir, directoryEntry, pngBuffer]);
}

async function writeAnyIcon(filename, size) {
  await sharp(SOURCE_ICON)
    .resize(size, size, {
      fit: "cover",
      position: "centre",
    })
    .png({ compressionLevel: 9 })
    .toFile(join(OUTPUT_DIR, filename));

  console.log(`Generated ${filename} (${size}x${size})`);
}

async function writeMaskableIcon(filename, size) {
  const insetSize = Math.round(size * 0.82);
  const offset = Math.floor((size - insetSize) / 2);

  const insetIcon = await sharp(SOURCE_ICON)
    .resize(insetSize, insetSize, {
      fit: "cover",
      position: "centre",
    })
    .png({ compressionLevel: 9 })
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: SAGE,
    },
  })
    .composite([{ input: insetIcon, left: offset, top: offset }])
    .png({ compressionLevel: 9 })
    .toFile(join(OUTPUT_DIR, filename));

  console.log(`Generated ${filename} (${size}x${size}, maskable)`);
}

async function writeFavicons() {
  const faviconPng = await sharp(SOURCE_ICON)
    .resize(32, 32, {
      fit: "cover",
      position: "centre",
    })
    .png({ compressionLevel: 9 })
    .toBuffer();

  writeFileSync(join(OUTPUT_DIR, "favicon.png"), faviconPng);
  writeFileSync(join(OUTPUT_DIR, "favicon.ico"), icoFromPngBuffer(faviconPng));

  console.log("Generated favicon.png (32x32)");
  console.log("Generated favicon.ico (32x32)");
}

async function run() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  await Promise.all([
    writeAnyIcon("icon-192.png", 192),
    writeAnyIcon("icon-512.png", 512),
    writeAnyIcon("apple-touch-icon.png", 180),
    writeMaskableIcon("icon-maskable-192.png", 192),
    writeMaskableIcon("icon-maskable-512.png", 512),
  ]);

  await writeFavicons();
}

run().catch((error) => {
  console.error("Could not generate PWA icons:", error);
  process.exitCode = 1;
});
