import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const COLORS = {
  cream: [246, 243, 238, 255],
  sage: [109, 139, 116, 255],
  terracotta: [217, 123, 102, 255],
};

function createImage(size, color) {
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = color[0];
    data[i + 1] = color[1];
    data[i + 2] = color[2];
    data[i + 3] = color[3];
  }

  return { size, data };
}

function setPixel(image, x, y, color) {
  const { size, data } = image;
  if (x < 0 || y < 0 || x >= size || y >= size) {
    return;
  }

  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const idx = (yi * size + xi) * 4;
  data[idx] = color[0];
  data[idx + 1] = color[1];
  data[idx + 2] = color[2];
  data[idx + 3] = color[3];
}

function fillCircle(image, cx, cy, radius, color) {
  const minX = Math.max(0, Math.floor(cx - radius));
  const maxX = Math.min(image.size - 1, Math.ceil(cx + radius));
  const minY = Math.max(0, Math.floor(cy - radius));
  const maxY = Math.min(image.size - 1, Math.ceil(cy + radius));
  const rr = radius * radius;

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= rr) {
        setPixel(image, x, y, color);
      }
    }
  }
}

function fillRoundedRect(image, x, y, width, height, radius, color) {
  const maxX = x + width;
  const maxY = y + height;
  const rr = radius * radius;

  for (let py = Math.floor(y); py < Math.ceil(maxY); py += 1) {
    for (let px = Math.floor(x); px < Math.ceil(maxX); px += 1) {
      const inLeft = px < x + radius;
      const inRight = px > maxX - radius;
      const inTop = py < y + radius;
      const inBottom = py > maxY - radius;

      if ((inLeft || inRight) && (inTop || inBottom)) {
        const cx = inLeft ? x + radius : maxX - radius;
        const cy = inTop ? y + radius : maxY - radius;
        const dx = px - cx;
        const dy = py - cy;

        if (dx * dx + dy * dy > rr) {
          continue;
        }
      }

      setPixel(image, px, py, color);
    }
  }
}

function drawThickLine(image, x1, y1, x2, y2, thickness, color) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) * 2));
  const radius = thickness / 2;

  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const x = x1 + dx * t;
    const y = y1 + dy * t;
    fillCircle(image, x, y, radius, color);
  }
}

function drawIcon(size, { maskable = false } = {}) {
  const image = createImage(size, maskable ? COLORS.sage : COLORS.cream);
  const cardInset = size * (maskable ? 0.17 : 0.12);
  const cardSize = size - cardInset * 2;
  const cardRadius = size * (maskable ? 0.16 : 0.18);
  const cardColor = maskable ? COLORS.cream : COLORS.sage;
  const plateOuter = maskable ? COLORS.sage : COLORS.cream;
  const plateInner = maskable ? COLORS.cream : COLORS.sage;

  fillRoundedRect(image, cardInset, cardInset, cardSize, cardSize, cardRadius, cardColor);

  const centerX = size / 2;
  const centerY = size / 2;

  fillCircle(image, centerX, centerY, size * 0.235, plateOuter);
  fillCircle(image, centerX, centerY, size * 0.162, plateInner);
  fillCircle(image, centerX, centerY, size * 0.058, plateOuter);

  const forkX = centerX + size * 0.108;
  drawThickLine(
    image,
    forkX,
    centerY - size * 0.075,
    forkX,
    centerY + size * 0.116,
    size * 0.038,
    COLORS.terracotta,
  );

  const tineTop = centerY - size * 0.125;
  const tineBottom = centerY - size * 0.07;
  const tineOffset = size * 0.026;

  drawThickLine(image, forkX - tineOffset, tineTop, forkX - tineOffset, tineBottom, size * 0.015, COLORS.terracotta);
  drawThickLine(image, forkX, tineTop, forkX, tineBottom, size * 0.015, COLORS.terracotta);
  drawThickLine(image, forkX + tineOffset, tineTop, forkX + tineOffset, tineBottom, size * 0.015, COLORS.terracotta);

  drawThickLine(
    image,
    centerX - size * 0.075,
    centerY + size * 0.03,
    centerX - size * 0.02,
    centerY + size * 0.086,
    size * 0.03,
    COLORS.terracotta,
  );
  drawThickLine(
    image,
    centerX - size * 0.02,
    centerY + size * 0.086,
    centerX + size * 0.086,
    centerY - size * 0.03,
    size * 0.03,
    COLORS.terracotta,
  );

  return image;
}

const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i += 1) {
  let c = i;
  for (let j = 0; j < 8; j += 1) {
    c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[i] = c >>> 0;
}

function crc32(buffer) {
  let c = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    c = CRC_TABLE[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32BE(data.length, 0);

  const crcBuffer = Buffer.concat([typeBuffer, data]);
  const crc = crc32(crcBuffer);
  const crcValueBuffer = Buffer.alloc(4);
  crcValueBuffer.writeUInt32BE(crc, 0);

  return Buffer.concat([lengthBuffer, typeBuffer, data, crcValueBuffer]);
}

function encodePng(image) {
  const { size, data } = image;
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const bytesPerRow = size * 4;
  const raw = Buffer.alloc((bytesPerRow + 1) * size);

  for (let y = 0; y < size; y += 1) {
    const rowOffset = y * (bytesPerRow + 1);
    raw[rowOffset] = 0;
    const sourceStart = y * bytesPerRow;
    const sourceEnd = sourceStart + bytesPerRow;
    Buffer.from(data.subarray(sourceStart, sourceEnd)).copy(raw, rowOffset + 1);
  }

  const compressed = deflateSync(raw, { level: 9 });

  return Buffer.concat([
    signature,
    createChunk("IHDR", ihdr),
    createChunk("IDAT", compressed),
    createChunk("IEND", Buffer.alloc(0)),
  ]);
}

function writeIcon(filename, size, options = {}) {
  const icon = drawIcon(size, options);
  const png = encodePng(icon);
  const outputPath = join(process.cwd(), "public", filename);
  writeFileSync(outputPath, png);
  console.log(`Generated ${outputPath}`);
}

function writeFavicon() {
  const png = encodePng(drawIcon(32));
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
  directoryEntry.writeUInt32LE(png.length, 8);
  directoryEntry.writeUInt32LE(iconDir.length + directoryEntry.length, 12);

  const outputPath = join(process.cwd(), "public", "favicon.ico");
  writeFileSync(outputPath, Buffer.concat([iconDir, directoryEntry, png]));
  console.log(`Generated ${outputPath}`);
}

mkdirSync(join(process.cwd(), "public"), { recursive: true });

writeIcon("icon-192.png", 192);
writeIcon("icon-512.png", 512);
writeIcon("apple-touch-icon.png", 180);
writeIcon("icon-maskable-192.png", 192, { maskable: true });
writeIcon("icon-maskable-512.png", 512, { maskable: true });
writeFavicon();
