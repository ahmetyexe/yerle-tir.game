/**
 * Generates PWA icons (192x192, 512x512) for the Neon Tetris app.
 * Uses the Jimp-like approach but with raw PNG generation via pngjs.
 * Actually we'll write SVG and use a simple canvas approach via node:
 * We'll use the built-in zlib + PNG spec to write a solid-color PNG,
 * then paint a Tetris icon with basic shapes.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import zlib from 'zlib';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '../public');

/**
 * Creates a minimal PNG file from raw RGBA pixel data.
 * @param {number} width
 * @param {number} height  
 * @param {Uint8Array} pixels - RGBA bytes, row by row
 * @returns {Buffer} PNG file buffer
 */
function createPNG(width, height, pixels) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type: RGB (no alpha for now)
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // We'll use RGBA color type (6)
  ihdr[9] = 6;

  // Raw image data with filter bytes
  const rawRows = [];
  for (let y = 0; y < height; y++) {
    rawRows.push(Buffer.from([0])); // filter type: None
    const row = Buffer.allocUnsafe(width * 4);
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      row[x * 4] = pixels[idx];     // R
      row[x * 4 + 1] = pixels[idx + 1]; // G
      row[x * 4 + 2] = pixels[idx + 2]; // B
      row[x * 4 + 3] = pixels[idx + 3]; // A
    }
    rawRows.push(row);
  }
  const rawData = Buffer.concat(rawRows);
  const compressed = zlib.deflateSync(rawData);

  function makeChunk(type, data) {
    const typeBytes = Buffer.from(type, 'ascii');
    const len = Buffer.allocUnsafe(4);
    len.writeUInt32BE(data.length, 0);
    const crcBuf = Buffer.concat([typeBytes, data]);
    const crc = crc32(crcBuf);
    const crcBytes = Buffer.allocUnsafe(4);
    crcBytes.writeUInt32BE(crc >>> 0, 0);
    return Buffer.concat([len, typeBytes, data, crcBytes]);
  }

  function crc32(buf) {
    let crc = 0xFFFFFFFF;
    const table = makeCRCTable();
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function makeCRCTable() {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[n] = c;
    }
    return table;
  }

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

/**
 * Draws the Neon Tetris icon into a pixel buffer.
 * @param {number} size - icon size (192 or 512)
 * @returns {Uint8Array} RGBA pixels
 */
function drawIcon(size) {
  const pixels = new Uint8Array(size * size * 4);

  function setPixel(x, y, r, g, b, a = 255) {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const idx = (y * size + x) * 4;
    pixels[idx] = r;
    pixels[idx + 1] = g;
    pixels[idx + 2] = b;
    pixels[idx + 3] = a;
  }

  function fillRect(x, y, w, h, r, g, b, a = 255) {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        setPixel(x + dx, y + dy, r, g, b, a);
      }
    }
  }

  function blendPixel(x, y, r, g, b, a) {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const idx = (y * size + x) * 4;
    const srcA = a / 255;
    const dstA = pixels[idx + 3] / 255;
    const outA = srcA + dstA * (1 - srcA);
    if (outA === 0) return;
    pixels[idx] = Math.round((r * srcA + pixels[idx] * dstA * (1 - srcA)) / outA);
    pixels[idx + 1] = Math.round((g * srcA + pixels[idx + 1] * dstA * (1 - srcA)) / outA);
    pixels[idx + 2] = Math.round((b * srcA + pixels[idx + 2] * dstA * (1 - srcA)) / outA);
    pixels[idx + 3] = Math.round(outA * 255);
  }

  // Background: dark navy gradient
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const t = y / size;
      const r = Math.round(10 + t * 5);
      const g = Math.round(11 + t * 5);
      const b = Math.round(16 + t * 20);
      setPixel(x, y, r, g, b, 255);
    }
  }

  // Rounded corner mask - clear outside rounded rectangle
  const radius = size * 0.2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let inCorner = false;
      if (x < radius && y < radius) {
        const dx = radius - x, dy = radius - y;
        inCorner = Math.sqrt(dx * dx + dy * dy) > radius;
      } else if (x > size - radius && y < radius) {
        const dx = x - (size - radius), dy = radius - y;
        inCorner = Math.sqrt(dx * dx + dy * dy) > radius;
      } else if (x < radius && y > size - radius) {
        const dx = radius - x, dy = y - (size - radius);
        inCorner = Math.sqrt(dx * dx + dy * dy) > radius;
      } else if (x > size - radius && y > size - radius) {
        const dx = x - (size - radius), dy = y - (size - radius);
        inCorner = Math.sqrt(dx * dx + dy * dy) > radius;
      }
      if (inCorner) setPixel(x, y, 0, 0, 0, 0);
    }
  }

  // Draw Tetris blocks grid (5x4 arrangement)
  const margin = size * 0.12;
  const grid = 4; // columns
  const rows = 5;
  const blockSize = (size - margin * 2) / grid;
  const gap = blockSize * 0.08;

  // Tetromino colors: cyan, purple, orange, green, red, blue, yellow
  const colors = [
    [0, 240, 240],   // I - cyan
    [160, 0, 240],   // T - purple  
    [240, 120, 0],   // L - orange
    [0, 200, 80],    // S - green
    [240, 60, 60],   // Z - red
    [0, 80, 240],    // J - blue
    [240, 200, 0],   // O - yellow
  ];

  // Layout: a simple arrangement of colorful Tetris-style blocks
  const layout = [
    [0, 0, 2, 2],
    [0, 0, 2, 3],
    [1, 4, 4, 3],
    [1, 5, 5, 6],
    [1, 5, 6, 6],
  ];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < grid; col++) {
      const colorIdx = layout[row][col];
      const [cr, cg, cb] = colors[colorIdx];

      const bx = Math.round(margin + col * blockSize + gap);
      const by = Math.round(margin + row * blockSize + gap);
      const bw = Math.round(blockSize - gap * 2);
      const bh = Math.round(blockSize - gap * 2);

      // Fill block
      fillRect(bx, by, bw, bh, cr, cg, cb, 255);

      // Add highlight (top-left inner glow)
      const hlSize = Math.round(bw * 0.4);
      for (let dy = 0; dy < hlSize; dy++) {
        for (let dx = 0; dx < hlSize; dx++) {
          const alpha = Math.round(80 * (1 - Math.sqrt(dx * dx + dy * dy) / hlSize));
          if (alpha > 0) blendPixel(bx + dx, by + dy, 255, 255, 255, alpha);
        }
      }

      // Add glow effect (blurred outline)
      const glowRadius = Math.round(blockSize * 0.15);
      for (let dy = -glowRadius; dy <= bh + glowRadius; dy++) {
        for (let dx = -glowRadius; dx <= bw + glowRadius; dx++) {
          const insideX = dx >= 0 && dx < bw;
          const insideY = dy >= 0 && dy < bh;
          if (!insideX || !insideY) {
            const distX = insideX ? 0 : Math.min(Math.abs(dx), Math.abs(dx - bw + 1));
            const distY = insideY ? 0 : Math.min(Math.abs(dy), Math.abs(dy - bh + 1));
            const dist = Math.sqrt(distX * distX + distY * distY);
            if (dist <= glowRadius) {
              const alpha = Math.round(60 * (1 - dist / glowRadius));
              blendPixel(bx + dx, by + dy, cr, cg, cb, alpha);
            }
          }
        }
      }
    }
  }

  return pixels;
}

// Generate 512x512
console.log('Generating 512x512 icon...');
const pixels512 = drawIcon(512);
const png512 = createPNG(512, 512, pixels512);
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), png512);
console.log('Saved icon-512.png');

// Generate 192x192
console.log('Generating 192x192 icon...');
const pixels192 = drawIcon(192);
const png192 = createPNG(192, 192, pixels192);
fs.writeFileSync(path.join(publicDir, 'icon-192.png'), png192);
console.log('Saved icon-192.png');

// Generate maskable icon (192x192 with extra padding for safe zone)
console.log('Generating maskable icon...');
const pixelsMask = drawIcon(512);
const pngMask = createPNG(512, 512, pixelsMask);
fs.writeFileSync(path.join(publicDir, 'icon-maskable.png'), pngMask);
console.log('Saved icon-maskable.png');

console.log('All icons generated successfully!');
