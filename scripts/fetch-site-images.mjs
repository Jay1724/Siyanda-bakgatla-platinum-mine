// Downloads the images used on the live site into assets/img/site/ so the rebuilt site can use them.
//
// Loads each page in a real browser (the live site is script-rendered, so a plain HTTP fetch would
// miss most images), scrolls it to trigger lazy loading, and records every image the page requests
// plus images referenced from the DOM (img tags, CSS backgrounds, social-share and icon tags,
// Wix image components). Wix serves resized copies; those URLs are rewritten to the original file.
//
// Environment:
//   SITE_URL      site to read (default https://www.siyandaplatinum.com)
//   OUT_DIR       where to write (default assets/img/site)
//   MAX_PAGES     page cap (default 40)
//   CHROMIUM_PATH optional path to a Chromium binary
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const BASE = new URL(process.env.SITE_URL || 'https://www.siyandaplatinum.com');
const OUT = process.env.OUT_DIR || 'assets/img/site';
const MAX_PAGES = Number(process.env.MAX_PAGES || 40);
const MAX_IMAGES = 400;
const MAX_BYTES = 12 * 1024 * 1024;   // per image
const MIN_BYTES = 4 * 1024;           // skip tracking pixels and spacers (SVGs exempt)
const IMG_EXT = /\.(png|jpe?g|webp|gif|svg|avif)$/i;
const NON_PAGE_EXT = /\.(pdf|docx?|xlsx?|pptx?|zip|png|jpe?g|webp|gif|svg|avif|mp4|mov|css|js|xml|txt)$/i;

const sleep = ms => new Promise(r => setTimeout(r, ms));

function pageSlug(u) {
  const seg = u.pathname.split('/').filter(Boolean)[0];
  return (seg || 'home').toLowerCase().replace(/[^a-z0-9-]+/g, '-');
}

// Wix serves .../media/<file>/v1/fill/w_980,h_600,.../name.jpg; the original is .../media/<file>.
function normalise(raw, pageUrl) {
  let u;
  try { u = new URL(raw, pageUrl); } catch { return null; }
  if (!/^https?:$/.test(u.protocol)) return null;
  u.hash = '';
  if (/wixstatic\.com$/.test(u.hostname)) {
    const m = u.pathname.match(/^(\/media\/[^/]+)(\/v1\/.*)?$/);
    if (m) u.pathname = m[1];
    u.search = '';
  }
  return u;
}

function looksLikeImage(u, contentType = '') {
  return contentType.startsWith('image/') || IMG_EXT.test(u.pathname) || /wixstatic\.com$/.test(u.hostname) && u.pathname.startsWith('/media/');
}

function extFromType(type, u) {
  const t = (type || '').split(';')[0].trim().toLowerCase();
  const map = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif', 'image/svg+xml': '.svg', 'image/avif': '.avif' };
  return map[t] || (IMG_EXT.test(u.pathname) ? path.extname(u.pathname).toLowerCase() : '');
}

async function autoScroll(page) {
  await page.evaluate(async () => {
    const step = Math.max(300, Math.floor(innerHeight * 0.7));
    for (let y = 0; y < document.documentElement.scrollHeight + step; y += step) {
      scrollTo(0, y);
      await new Promise(r => setTimeout(r, 250));
    }
    scrollTo(0, 0);
  });
}

// Everything in the DOM that points at an image, with alt text and rendered size where known.
function domImages() {
  const out = [];
  const add = (src, extra = {}) => { if (src && !src.startsWith('data:')) out.push({ src, ...extra }); };
  document.querySelectorAll('img').forEach(i => {
    add(i.currentSrc || i.src, { alt: i.alt || '', w: i.naturalWidth, h: i.naturalHeight });
    add(i.getAttribute('data-src'), { alt: i.alt || '' });
    (i.getAttribute('srcset') || '').split(',').forEach(s => add(s.trim().split(/\s+/)[0], { alt: i.alt || '' }));
  });
  document.querySelectorAll('source[srcset]').forEach(s => (s.getAttribute('srcset') || '').split(',').forEach(x => add(x.trim().split(/\s+/)[0])));
  document.querySelectorAll('meta[property="og:image"], meta[name="twitter:image"]').forEach(m => add(m.content, { alt: 'social share image' }));
  document.querySelectorAll('link[rel~="icon"], link[rel="apple-touch-icon"]').forEach(l => add(l.href, { alt: 'icon' }));
  document.querySelectorAll('[data-image-info]').forEach(el => {
    try {
      const uri = JSON.parse(el.getAttribute('data-image-info')).imageData?.uri;
      if (uri) add('https://static.wixstatic.com/media/' + uri, { alt: el.getAttribute('alt') || '' });
    } catch { /* ignore */ }
  });
  document.querySelectorAll('*').forEach(el => {
    const bg = getComputedStyle(el).backgroundImage;
    if (bg && bg !== 'none') for (const m of bg.matchAll(/url\(["']?(.*?)["']?\)/g)) add(m[1]);
  });
  return out;
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });

// found: normalised URL -> { pages:Set, alt, w, h }
const found = new Map();
const note = (u, slug, extra = {}) => {
  const key = u.href;
  const rec = found.get(key) || { url: u, pages: new Set(), alt: '', w: 0, h: 0 };
  rec.pages.add(slug);
  if (extra.alt && !rec.alt) rec.alt = extra.alt;
  if (extra.w > rec.w) { rec.w = extra.w; rec.h = extra.h || rec.h; }
  found.set(key, rec);
};

// ---- crawl ----
const queue = [BASE.href];
const seen = new Set();
const visited = [];
while (queue.length && visited.length < MAX_PAGES) {
  const url = queue.shift();
  if (seen.has(url)) continue;
  seen.add(url);
  const page = await ctx.newPage();
  const pu = new URL(url);
  const slug = pageSlug(pu);
  page.on('response', async res => {
    try {
      const u = normalise(res.url(), url);
      if (!u || !looksLikeImage(u, res.headers()['content-type'] || '')) return;
      if (res.status() >= 200 && res.status() < 300) note(u, slug);
    } catch { /* ignore */ }
  });
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
    await autoScroll(page);
    await sleep(800);
    const imgs = await page.evaluate(domImages);
    for (const i of imgs) { const u = normalise(i.src, url); if (u && looksLikeImage(u)) note(u, slug, i); }
    const links = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map(a => a.href));
    for (const l of links) {
      try {
        const lu = new URL(l);
        if (lu.origin !== BASE.origin || NON_PAGE_EXT.test(lu.pathname)) continue;
        lu.hash = ''; lu.search = '';
        if (!seen.has(lu.href)) queue.push(lu.href);
      } catch { /* ignore */ }
    }
    visited.push(url);
    console.log(`page ${visited.length}: ${url}  (${found.size} images so far)`);
  } catch (e) {
    console.warn(`skipped ${url}: ${e.message}`);
  } finally {
    await page.close();
  }
}
await browser.close();

// ---- download ----
await fs.mkdir(OUT, { recursive: true });
const manifest = [];
const usedNames = new Set();
let total = 0;
for (const rec of found.values()) {
  if (manifest.length >= MAX_IMAGES) { console.warn('image cap reached'); break; }
  try {
    const res = await fetch(rec.url, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; sbpm-image-fetch)', accept: 'image/*,*/*' } });
    if (!res.ok) { console.warn(`  ${res.status} ${rec.url.href}`); continue; }
    const type = res.headers.get('content-type') || '';
    if (!type.startsWith('image/')) continue;
    const buf = Buffer.from(await res.arrayBuffer());
    const isSvg = type.includes('svg');
    if (buf.length > MAX_BYTES || (!isSvg && buf.length < MIN_BYTES)) continue;

    const firstPage = [...rec.pages][0];
    const ext = extFromType(type, rec.url) || '.img';
    let base = decodeURIComponent(path.basename(rec.url.pathname)).replace(/\.[a-z0-9]+$/i, '').replace(/~mv2$/i, '');
    base = base.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'image';
    let rel = `${firstPage}/${base}${ext}`;
    if (usedNames.has(rel)) rel = `${firstPage}/${base}-${crypto.createHash('sha1').update(rec.url.href).digest('hex').slice(0, 6)}${ext}`;
    usedNames.add(rel);

    await fs.mkdir(path.join(OUT, path.dirname(rel)), { recursive: true });
    await fs.writeFile(path.join(OUT, rel), buf);
    total += buf.length;
    manifest.push({ file: rel, source: rec.url.href, pages: [...rec.pages].sort(), alt: rec.alt, width: rec.w || undefined, height: rec.h || undefined, bytes: buf.length });
  } catch (e) {
    console.warn(`  failed ${rec.url.href}: ${e.message}`);
  }
}
manifest.sort((a, b) => a.file.localeCompare(b.file));
await fs.writeFile(path.join(OUT, 'manifest.json'), JSON.stringify({ site: BASE.origin, fetched: new Date().toISOString(), pages: visited, images: manifest }, null, 2) + '\n');
console.log(`\nSaved ${manifest.length} images (${(total / 1048576).toFixed(1)} MB) from ${visited.length} pages to ${OUT}`);
if (!manifest.length) { console.error('No images were saved.'); process.exitCode = 1; }
