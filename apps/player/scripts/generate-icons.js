#!/usr/bin/env node

// Simple script to generate PWA icons
// Since we don't have image manipulation libraries, we'll create placeholder images

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create simple placeholder PNG files
// In production, you'd use sharp or canvas to generate these from the SVG

const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 SIZE SIZE">
  <rect width="SIZE" height="SIZE" fill="#8B5CF6" rx="RADIUS"/>
  <text x="50%" y="60%" font-family="system-ui" font-size="FONTSIZE" font-weight="bold" text-anchor="middle" fill="white">B</text>
</svg>`;

const sizes = [
  { size: 192, radius: 24, fontSize: 120 },
  { size: 512, radius: 64, fontSize: 320 }
];

sizes.forEach(({ size, radius, fontSize }) => {
  const svg = iconSvg
    .replace(/SIZE/g, size)
    .replace(/RADIUS/g, radius)
    .replace(/FONTSIZE/g, fontSize);

  const filename = path.join(__dirname, '..', 'public', `icon-${size}.svg`);
  fs.writeFileSync(filename, svg);
  console.log(`Created ${filename}`);
});

console.log('\nNote: To convert SVG to PNG, use a tool like:');
console.log('  npx svgexport public/icon-192.svg public/icon-192.png 192:192');
console.log('  npx svgexport public/icon-512.svg public/icon-512.png 512:512');
console.log('\nOr use an online converter like:');
console.log('  https://cloudconvert.com/svg-to-png');