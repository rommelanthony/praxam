// Copies AR/QR question images from ../../questionbank/data/.../images/
// into web/public/qbank/<book>/<subset>/ so they're served as static assets.
//
// Run with: npm run db:copy-images
import { mkdirSync, copyFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

const SOURCES = [
  { book: 'hutton-2010', subset: 'ar-test1' },
  { book: 'hutton-2010', subset: 'ar-test2' },
  { book: 'hutton-2010', subset: 'qr-test1' },
  { book: 'hutton-2010', subset: 'qr-test2' },
  { book: 'medichut-2023', subset: 'qr-mock' },
  { book: 'medichut-2023', subset: 'qr-full' },
];

const SRC_BASE = resolve(__dirname, '../../../questionbank/data');
const DEST_BASE = resolve(__dirname, '../public/qbank');

let totalFiles = 0;
let totalBytes = 0;

for (const { book, subset } of SOURCES) {
  const srcDir = join(SRC_BASE, book, 'images', subset);
  const destDir = join(DEST_BASE, book, subset);

  try {
    statSync(srcDir);
  } catch {
    console.log(`  [skip] ${srcDir} — not found`);
    continue;
  }

  mkdirSync(destDir, { recursive: true });
  const files = readdirSync(srcDir).filter((f) => f.endsWith('.png'));

  for (const file of files) {
    const src = join(srcDir, file);
    const dest = join(destDir, file);
    copyFileSync(src, dest);
    totalFiles++;
    totalBytes += statSync(src).size;
  }
  console.log(`  ${book}/${subset}: copied ${files.length} files`);
}

console.log(`\nDone. ${totalFiles} files, ${(totalBytes / 1024 / 1024).toFixed(1)} MB total.`);
