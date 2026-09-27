#!/usr/bin/env node
/*
 * Cache-busts the local asset references across every page in one go.
 *
 * Without a build step, the `?v=` query on each stylesheet and script IS the
 * deploy mechanism: GitHub Pages serves the HTML itself from cache, so a page
 * that still asks for `site-cosmos.js?v=...l` keeps running last week's sky no
 * matter what was pushed. There are 90 of these references across 8 pages and
 * they have to move together - one page left behind is one page silently
 * serving stale code to whoever lands on it.
 *
 * Doing that by hand, or with a loose `sed`, is how it goes wrong. `projects.html`
 * contains `youtube.com/watch?v=KOG_xwrZXik`; a pattern written for the version
 * query matches that too and corrupts a link in the owner's content. So this
 * only ever rewrites a `?v=` that is attached to a path beginning `assets/`.
 *
 *   npm run bump          -> next suffix for today (20260927m -> 20260927n)
 *   npm run bump -- 20261004a  -> an explicit stamp
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const pages = fs.readdirSync(root).filter((f) => f.endsWith('.html'));

/* Only a `?v=` hanging off a local asset path. Anything else - a YouTube id, a
   query in the owner's copy - is left exactly as it was. */
const VERSIONED_ASSET = /(["'])(assets\/[^"'?]+)\?v=([^"'&]*)\1/g;

function today() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

function nextStamp(current) {
  const stamp = today();
  const match = /^(\d{8})([a-z]?)$/.exec(current || '');
  if (!match || match[1] !== stamp) return `${stamp}a`;
  const letter = match[2] || 'a';
  if (letter === 'z') throw new Error(`ran out of suffixes for ${stamp}; pass one explicitly`);
  return `${stamp}${String.fromCharCode(letter.charCodeAt(0) + 1)}`;
}

const found = new Set();
for (const page of pages) {
  const html = fs.readFileSync(path.join(root, page), 'utf8');
  let m;
  VERSIONED_ASSET.lastIndex = 0;
  while ((m = VERSIONED_ASSET.exec(html))) found.add(m[3]);
}

if (!found.size) {
  console.error('No versioned asset references found. Nothing to bump.');
  process.exit(1);
}
if (found.size > 1) {
  console.error(`Pages disagree on the asset version: ${[...found].join(', ')}`);
  console.error('Some pages are already serving stale assets. Bumping anyway to bring them back in step.');
}

const target = process.argv[2] || nextStamp([...found][0]);
if (!/^\d{8}[a-z]?$/.test(target)) {
  console.error(`Not a version stamp: ${target} (expected YYYYMMDD with an optional letter)`);
  process.exit(1);
}

let refs = 0;
let touched = 0;
for (const page of pages) {
  const file = path.join(root, page);
  const html = fs.readFileSync(file, 'utf8');
  const next = html.replace(VERSIONED_ASSET, (whole, quote, asset) => {
    refs += 1;
    return `${quote}${asset}?v=${target}${quote}`;
  });
  if (next !== html) {
    fs.writeFileSync(file, next);
    touched += 1;
  }
}

console.log(`Asset version -> ${target} (${refs} references across ${touched} page${touched === 1 ? '' : 's'})`);
console.log('Run `npm test` before committing.');
