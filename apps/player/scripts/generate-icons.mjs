#!/usr/bin/env node
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pub = path.resolve(__dirname, '../public');
const srcSvg = path.join(pub, 'icon.svg');

if (!fs.existsSync(srcSvg)) {
  console.error('public/icon.svg not found');
  process.exit(1);
}

const targets = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'icon-maskable-512.png', size: 512, maskable: true },
];

await Promise.all(targets.map(async t => {
  const out = path.join(pub, t.name);
  let pipeline = sharp(srcSvg).resize(t.size, t.size, { fit: 'cover' });
  if (t.maskable) {
    // Pad to safe area for maskable icon
    pipeline = pipeline.extend({
      top: 32, bottom: 32, left: 32, right: 32,
      background: { r: 139, g: 92, b: 246, alpha: 1 }
    }).resize(t.size, t.size);
  }
  await pipeline.png().toFile(out);
  console.log('Created', out);
}));
console.log('Done.');