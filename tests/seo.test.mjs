import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'node-html-parser';
import { EXPECTED_ROUTES, NON_INDEXED_ROUTES } from './routes.mjs';

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const SITE = 'https://innexengineering.com';
const SUFFIX = ' | INNEX Engineering';

const fileFor = (route) => join(DIST, route, 'index.html');
const load = (route) => parse(readFileSync(fileFor(route), 'utf8'));

test('dist exists (run npm run build first)', () => {
  assert.ok(existsSync(DIST), `missing ${DIST}`);
});

for (const route of EXPECTED_ROUTES) {
  test(`${route}: SEO invariants`, () => {
    assert.ok(existsSync(fileFor(route)), `missing page ${route}`);
    const doc = load(route);

    assert.equal(doc.querySelector('html')?.getAttribute('lang'), 'en', 'html lang');

    const h1s = doc.querySelectorAll('h1');
    assert.equal(h1s.length, 1, `expected exactly one h1, found ${h1s.length}`);
    assert.ok(h1s[0].text.trim().length > 0, 'h1 is empty');

    for (const h of doc.querySelectorAll('h2, h3')) {
      assert.ok(h.text.trim().length > 0, `empty ${h.tagName}`);
    }

    const title = doc.querySelector('title')?.text.trim() ?? '';
    assert.ok(title.length >= 15 && title.length <= 60, `title length ${title.length}: "${title}"`);
    if (route !== '/') assert.ok(title.endsWith(SUFFIX), `title must end with "${SUFFIX}"`);

    const desc = doc.querySelector('meta[name="description"]')?.getAttribute('content') ?? '';
    assert.ok(desc.length >= 50 && desc.length <= 155, `description length ${desc.length}`);

    const canonical = doc.querySelector('link[rel="canonical"]')?.getAttribute('href');
    assert.equal(canonical, `${SITE}${route}`, 'canonical');

    assert.equal(doc.querySelector('meta[property="og:url"]')?.getAttribute('content'), `${SITE}${route}`);
    assert.ok(doc.querySelector('meta[property="og:title"]'), 'og:title');
    const ogImage = doc.querySelector('meta[property="og:image"]')?.getAttribute('content');
    assert.ok(ogImage, 'og:image');
    assert.ok(existsSync(join(DIST, new URL(ogImage).pathname)), `og:image file missing: ${ogImage}`);
    assert.equal(doc.querySelector('meta[name="robots"]'), null, 'indexable page must not set robots meta');

    const ld = doc.querySelectorAll('script[type="application/ld+json"]');
    assert.ok(ld.length >= 1, 'at least one JSON-LD block');
    const types = [];
    for (const s of ld) {
      const data = JSON.parse(s.rawText); // throws on invalid JSON
      const graph = data['@graph'] ?? [data];
      for (const node of graph) types.push(node['@type']);
    }
    const flat = types.flat();
    assert.ok(flat.includes('Organization'), 'site-wide Organization schema');
    if (route !== '/') assert.ok(flat.includes('BreadcrumbList'), 'BreadcrumbList on non-home pages');

    for (const img of doc.querySelectorAll('img')) {
      assert.ok(img.hasAttribute('alt'), `img missing alt: ${img.getAttribute('src')}`);
      assert.ok(img.hasAttribute('width') && img.hasAttribute('height'), `img missing dimensions: ${img.getAttribute('src')}`);
    }
  });
}

for (const route of NON_INDEXED_ROUTES) {
  test(`${route}: exists and is noindex`, () => {
    assert.ok(existsSync(fileFor(route)), `missing ${route}`);
    const html = readFileSync(fileFor(route), 'utf8');
    assert.match(html, /<meta name="robots" content="noindex/);
  });
}
