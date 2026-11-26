import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { build } from 'vite';
import preact from '@preact/preset-vite';
import { createManifest } from './manifest.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');

function parseTargetArg() {
  const arg = process.argv.find((a) => a.startsWith('--target='));
  const val = arg ? arg.split('=')[1] : 'all';
  if (val === 'chrome' || val === 'firefox') return [val];
  return ['chrome', 'firefox'];
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

/**
 * 生成纯色带高光边框的合规 PNG 图标（无外部图像依赖）。
 */
function createSolidPng(size) {
  const raw = Buffer.alloc(size * (1 + size * 4));
  for (let y = 0; y < size; y++) {
    const rowStart = y * (1 + size * 4);
    raw[rowStart] = 0;
    for (let x = 0; x < size; x++) {
      const idx = rowStart + 1 + x * 4;
      const border = x < 2 || y < 2 || x >= size - 2 || y >= size - 2;
      const innerCross =
        Math.abs(x - size / 2) < Math.max(1.5, size * 0.1) ||
        Math.abs(y - size / 2) < Math.max(1.5, size * 0.1);
      if (border) {
        raw[idx] = 22;
        raw[idx + 1] = 163;
        raw[idx + 2] = 74;
        raw[idx + 3] = 255;
      } else if (innerCross && x > size * 0.22 && x < size * 0.78 && y > size * 0.22 && y < size * 0.78) {
        raw[idx] = 248;
        raw[idx + 1] = 250;
        raw[idx + 2] = 252;
        raw[idx + 3] = 255;
      } else {
        raw[idx] = 21;
        raw[idx + 1] = 128;
        raw[idx + 2] = 61;
        raw[idx + 3] = 255;
      }
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const idat = zlib.deflateSync(raw);

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

async function buildForTarget(target) {
  const outDir = path.join(ROOT, 'dist', `${target}-mv3`);
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  await build({
    configFile: false,
    root: ROOT,
    plugins: [preact()],
    logLevel: 'warn',
    build: {
      outDir,
      emptyOutDir: false,
      lib: {
        entry: path.join(ROOT, 'src/entrypoints/hattrick.content/index.ts'),
        name: 'HattrickHelperContent',
        formats: ['iife'],
        fileName: () => 'content.js',
      },
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
        },
      },
    },
  });

  await build({
    configFile: false,
    root: ROOT,
    logLevel: 'warn',
    build: {
      outDir,
      emptyOutDir: false,
      lib: {
        entry: path.join(ROOT, 'src/entrypoints/background.ts'),
        formats: ['es'],
        fileName: () => 'background.js',
      },
    },
  });

  const popupInput = path.join(ROOT, 'src/entrypoints/popup/index.html');
  await build({
    configFile: false,
    root: path.join(ROOT, 'src/entrypoints/popup'),
    base: './',
    plugins: [preact()],
    logLevel: 'warn',
    build: {
      outDir,
      emptyOutDir: false,
      rollupOptions: {
        input: popupInput,
        output: {
          entryFileNames: 'popup.js',
          chunkFileNames: 'assets/[name].js',
          assetFileNames: 'assets/[name].[ext]',
        },
      },
    },
  });

  const indexHtmlPath = path.join(outDir, 'index.html');
  const popupHtmlPath = path.join(outDir, 'popup.html');
  if (fs.existsSync(indexHtmlPath)) {
    fs.renameSync(indexHtmlPath, popupHtmlPath);
  }

  const iconsDir = path.join(outDir, 'icons');
  fs.mkdirSync(iconsDir, { recursive: true });
  for (const size of [16, 48, 128]) {
    fs.writeFileSync(path.join(iconsDir, `icon-${size}.png`), createSolidPng(size));
  }

  fs.writeFileSync(
    path.join(outDir, 'manifest.json'),
    JSON.stringify(createManifest(target), null, 2),
    'utf8'
  );

  console.log(`[build-ext] Built ${target} MV3 bundle -> ${outDir}`);
}

const targets = parseTargetArg();
for (const target of targets) {
  await buildForTarget(target);
}
