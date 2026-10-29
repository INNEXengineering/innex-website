# INNEX Engineering Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy a static, SEO-optimized replacement for innexengineering.com on GitHub Pages, targeting attorneys nationally who need a forensic mechanical engineering / safety expert witness.

**Architecture:** Astro static site (zero client JS except a tiny nav toggle and form enhancement). A single `BaseLayout` owns all `<head>` SEO and JSON-LD; case-type and service pages are Markdown content-collection entries rendered by one shared layout. A `node:test` suite runs against the built `dist/` to enforce SEO invariants (one H1, title/description lengths, canonical, valid JSON-LD, alt text, sitemap contents, no broken internal links). GitHub Actions builds, tests, and deploys to Pages.

**Tech Stack:** Astro (latest), @astrojs/sitemap, @fontsource/archivo, @fontsource/source-sans-3, node-html-parser (tests), Node 24, GitHub Actions, GitHub Pages, Formspree.

**User Verification:** YES — before DNS cutover, the user reviews the live `*.github.io` site and confirms content/design are approved (Task 11). Spec: "Site live and correct on `*.github.io` before DNS change."

**Spec:** `docs/superpowers/specs/2026-10-29-innex-website-design.md` — the "Source facts" section is the ONLY source of claims about Paul/INNEX. Never invent cases, clients, testimonials, numbers, or credentials.

---

## File Structure

```
.github/workflows/deploy.yml        Build + test on PR; build + test + deploy Pages on main
.gitignore, .nvmrc
astro.config.mjs                    site URL, trailingSlash, sitemap filter, redirects
package.json, tsconfig.json
public/CNAME                        innexengineering.com
public/robots.txt
public/favicon.png                  copy of logo
public/paul-neumann-pe-cv.pdf       (client-supplied; optional)
src/site.config.ts                  SITE + EXPERT constants (single source of contact/credential data)
src/lib/schema.ts                   JSON-LD builders (pure functions)
src/styles/global.css               design tokens + base styles
src/assets/innex-logo.png           logo downloaded from current site
src/assets/paul-neumann.jpg         (client-supplied; optional)
src/components/SEO.astro            <title>, meta, canonical, OG/Twitter
src/components/JsonLd.astro         renders <script type="application/ld+json">
src/components/Header.astro         sticky header, nav, click-to-call, mobile toggle
src/components/Footer.astro
src/components/Breadcrumbs.astro    visible breadcrumb trail
src/components/CtaBand.astro        "Discuss a case" band reused on every page
src/components/EntryGrid.astro      card grid of case types / services
src/components/ContactForm.astro    Formspree form, mailto fallback
src/components/Headshot.astro       renders headshot if file exists, else monogram
src/layouts/BaseLayout.astro        html shell; composes SEO, JsonLd, Header, Footer
src/layouts/EntryLayout.astro       case-type/service page body (standards, FAQ, related)
src/content.config.ts               caseTypes + services collections & schema
src/content/case-types/*.md         9 entries
src/content/services/*.md           2 entries
src/pages/index.astro
src/pages/expert-witness.astro
src/pages/case-types/index.astro
src/pages/case-types/[slug].astro
src/pages/services/index.astro
src/pages/services/[slug].astro
src/pages/about/index.astro
src/pages/about/paul-neumann-pe.astro
src/pages/contact.astro
src/pages/contact/thanks.astro
src/pages/privacy.astro
src/pages/404.astro
tests/routes.mjs                    EXPECTED_ROUTES list (grows per task)
tests/seo.test.mjs                  SEO invariants against dist/
docs/DEPLOY.md                      GitHub Pages + GoDaddy DNS + Formspree + Search Console steps
```

---

### Task 0: Scaffold Astro project and SEO test harness

**Goal:** A buildable Astro project with a failing-then-passing SEO test suite wired to `npm test`.

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `.gitignore`, `.nvmrc`, `src/pages/index.astro` (temporary), `tests/routes.mjs`, `tests/seo.test.mjs`

**Acceptance Criteria:**
- [ ] `npm run build` produces `dist/index.html`
- [ ] `npm test` runs the suite; it fails on the temporary page (no meta description) before the fix and passes after

**Verify:** `npm run build && npm test` → all tests pass

**Steps:**

- [ ] **Step 1: Init package and install deps**

```bash
cd /c/dev/innex
npm init -y
npm pkg set type=module private=true --json
npm pkg delete main
npm pkg set scripts.dev="astro dev" scripts.build="astro build" scripts.preview="astro preview" scripts.test="node --test tests/"
npm install astro @astrojs/sitemap @fontsource/archivo @fontsource/source-sans-3
npm install -D node-html-parser
echo 24 > .nvmrc
```

- [ ] **Step 2: Write `.gitignore`**

```
node_modules/
dist/
.astro/
.env
lighthouse/
```

- [ ] **Step 3: Write `astro.config.mjs`**

```js
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

const EXCLUDE = ['/404/', '/about-us/', '/consultants/', '/contact/thanks/'];

export default defineConfig({
  site: 'https://innexengineering.com',
  trailingSlash: 'always',
  build: { format: 'directory' },
  redirects: {
    '/about-us': '/about/',
    '/consultants': '/about/paul-neumann-pe/',
  },
  integrations: [
    sitemap({
      filter: (page) => !EXCLUDE.some((p) => new URL(page).pathname === p),
    }),
  ],
});
```

- [ ] **Step 4: Write `tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist"]
}
```

- [ ] **Step 5: Write `tests/routes.mjs`** (each later task appends its routes)

```js
// Indexable routes that must exist in dist/ and in the sitemap.
export const EXPECTED_ROUTES = ['/'];

// Routes that must exist but must NOT be indexed or listed in the sitemap.
export const NON_INDEXED_ROUTES = [];
```

- [ ] **Step 6: Write `tests/seo.test.mjs`**

```js
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
    assert.ok(doc.querySelector('meta[property="og:image"]'), 'og:image');
    assert.equal(doc.querySelector('meta[name="robots"]'), null, 'indexable page must not set robots meta');

    const ld = doc.querySelectorAll('script[type="application/ld+json"]');
    assert.ok(ld.length >= 1, 'at least one JSON-LD block');
    const types = [];
    for (const s of ld) {
      const data = JSON.parse(s.text); // throws on invalid JSON
      const graph = data['@graph'] ?? [data];
      for (const node of graph) types.push(node['@type']);
    }
    assert.ok(types.flat().includes('ProfessionalService'), 'site-wide ProfessionalService schema');
    if (route !== '/') assert.ok(types.includes('BreadcrumbList'), 'BreadcrumbList on non-home pages');

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
```

(The internal-link test is added in Task 8, once every page linked from the header/footer exists.)

- [ ] **Step 7: Write a temporary `src/pages/index.astro` with no SEO tags**

```astro
---
---
<html lang="en"><head><title>INNEX Engineering</title></head><body><h1>INNEX</h1></body></html>
```

- [ ] **Step 8: Build and run tests — expect FAIL**

Run: `npm run build && npm test`
Expected: FAIL in `/: SEO invariants` (title length / description length).

- [ ] **Step 9: Commit scaffold** (the failing home page is replaced in Task 2)

```bash
git add .gitignore .nvmrc package.json package-lock.json astro.config.mjs tsconfig.json src tests
git commit -m "chore: scaffold Astro project and SEO test harness"
```

```json:metadata
{"files": ["package.json", "astro.config.mjs", "tsconfig.json", ".gitignore", ".nvmrc", "src/pages/index.astro", "tests/routes.mjs", "tests/seo.test.mjs"], "verifyCommand": "npm run build && npm test", "acceptanceCriteria": ["npm run build produces dist/index.html", "npm test runs and reports SEO failures on the temp page"], "requiresUserVerification": false}
```

---

### Task 1: Site config, design tokens, fonts, logo

**Goal:** Single source of truth for contact/credential data, global CSS tokens, and the logo asset.

**Files:**
- Create: `src/site.config.ts`, `src/styles/global.css`, `src/assets/innex-logo.png`, `public/favicon.png`

**Acceptance Criteria:**
- [ ] `src/site.config.ts` exports `SITE` and `EXPERT` with only spec-sourced facts
- [ ] Green text color passes 4.5:1 on paper background
- [ ] Logo downloaded with corrected filename

**Verify:** `npm run build` succeeds; `ls src/assets/innex-logo.png public/favicon.png`

**Steps:**

- [ ] **Step 1: Download logo**

```bash
mkdir -p src/assets public
curl -sL "https://img1.wsimg.com/isteam/ip/208a05bf-8f7c-4a34-826d-1fa0ea4fbb45/innex%20tranparents.png" -o src/assets/innex-logo.png
cp src/assets/innex-logo.png public/favicon.png
file src/assets/innex-logo.png   # expect: PNG image data
```

- [ ] **Step 2: Write `src/site.config.ts`**

```ts
export const SITE = {
  name: 'INNEX Engineering',
  url: 'https://innexengineering.com',
  tagline: 'Forensic Mechanical Engineering & Safety Expert Witness',
  phone: '281-755-9177',
  phoneHref: 'tel:+12817559177',
  email: 'Paul@INNEXengineering.com',
  firmRegistration: 'Texas Registered Engineering Firm F-29716',
  // Set after Formspree signup (the part after /f/ in the form endpoint). Empty = mailto fallback.
  formspreeId: '',
  ogImage: '/og-image.png',
} as const;

export const EXPERT = {
  name: 'Paul Neumann',
  suffix: 'P.E., CMRP, CSP',
  path: '/about/paul-neumann-pe/',
  jobTitle: 'Principal Engineer and Expert Witness',
  experience: 'more than 20 years of practical, technical, academic, and operational experience',
  education: { degree: 'B.S., Mechanical Engineering', school: 'University of Illinois' },
  licenses: [
    'Professional Engineer (P.E.), Texas',
    'Professional Engineer (P.E.), Illinois',
    'Texas Apprentice Electrician',
  ],
  certifications: [
    'Certified Safety Professional (CSP)',
    'Certified Maintenance & Reliability Professional (CMRP)',
    'ASE Certified Technician: passenger car, light truck, heavy-duty truck',
  ],
  osha: [
    'OSHA General Industry, Construction, and Oil & Gas safety training',
    'OSHA trainer: powered industrial trucks (forklifts)',
    'OSHA trainer: aerial lifts',
    'Competent person: scaffolding',
    'Competent person: fall protection',
    'Competent person: excavation',
  ],
  training: [
    'NFPA 70E electrical safety',
    'Vibration analysis, ISO 18436-2 Category II',
    'Root cause analysis',
    'ASME Section VIII Div. 1 & 2 pressure vessel design',
    'Bolted joint design',
    'Pumps and mechanical seals',
    'Lubrication',
    'Welding technology',
    'Hazardous materials, confined space, arc flash, and asbestos',
  ],
  knowsAbout: [
    'Forensic engineering', 'Mechanical engineering', 'Process safety management',
    'Process hazard analysis', 'Failure mode and effects analysis', 'Root cause analysis',
    'OSHA compliance', 'ASME pressure vessels', 'Rotating equipment', 'Pressure relief systems',
    'Powered industrial trucks', 'Construction safety', 'Workplace safety', 'Product liability',
  ],
} as const;
```

- [ ] **Step 3: Write `src/styles/global.css`**

```css
:root {
  --ink: #0f1b2d;
  --ink-2: #24324a;
  --paper: #f7f7f4;
  --white: #ffffff;
  --rule: #d9dbd6;
  --muted: #545b66;
  --green: #009a30;       /* accents, buttons on ink, rules */
  --green-text: #00782a;  /* text links on paper: 5.3:1 */
  --green-dark: #005f21;  /* hover */
  --font-head: 'Archivo', system-ui, sans-serif;
  --font-body: 'Source Sans 3', system-ui, sans-serif;
  --max: 72rem;
  --gutter: clamp(1rem, 4vw, 2rem);
  --radius: 4px;
}

*, *::before, *::after { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; scroll-padding-top: 5rem; }
body {
  margin: 0;
  background: var(--paper);
  color: var(--ink);
  font: 400 1.0625rem/1.65 var(--font-body);
}
img { max-width: 100%; height: auto; display: block; }
h1, h2, h3 { font-family: var(--font-head); font-weight: 700; line-height: 1.15; letter-spacing: -0.01em; margin: 0 0 0.6em; }
h1 { font-size: clamp(2rem, 5vw, 3.25rem); }
h2 { font-size: clamp(1.5rem, 3vw, 2rem); }
h3 { font-size: 1.2rem; }
p, ul, ol { margin: 0 0 1em; }
a { color: var(--green-text); text-underline-offset: 0.15em; }
a:hover { color: var(--green-dark); }
:focus-visible { outline: 3px solid var(--green); outline-offset: 2px; }

.container { max-width: var(--max); margin-inline: auto; padding-inline: var(--gutter); }
.section { padding-block: clamp(3rem, 7vw, 5rem); }
.section--white { background: var(--white); border-block: 1px solid var(--rule); }
.section--ink { background: var(--ink); color: var(--paper); }
.section--ink a:not(.btn) { color: #7fd99b; }
.eyebrow {
  font: 600 0.8rem/1 var(--font-body); letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--green-text); margin-bottom: 0.9rem; display: flex; align-items: center; gap: 0.6rem;
}
.eyebrow::before { content: ''; width: 2rem; height: 2px; background: var(--green); }
.section--ink .eyebrow { color: #7fd99b; }
.lead { font-size: 1.2rem; color: var(--muted); max-width: 42rem; }
.section--ink .lead { color: #c9cfd8; }
.prose { max-width: 44rem; }
.prose h2 { margin-top: 2rem; }

.btn {
  display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.8rem 1.4rem;
  font: 600 1rem/1 var(--font-body); text-decoration: none; border-radius: var(--radius);
  border: 2px solid var(--green); background: var(--green); color: var(--white);
}
.btn:hover { background: var(--green-dark); border-color: var(--green-dark); color: var(--white); }
.btn--ghost { background: transparent; color: var(--ink); border-color: var(--ink); }
.btn--ghost:hover { background: var(--ink); color: var(--paper); border-color: var(--ink); }
.section--ink .btn--ghost { color: var(--paper); border-color: var(--paper); }
.section--ink .btn--ghost:hover { background: var(--paper); color: var(--ink); }
.btn-row { display: flex; flex-wrap: wrap; gap: 0.75rem; }

.std-list { list-style: none; padding: 0; display: flex; flex-wrap: wrap; gap: 0.5rem; }
.std-list li {
  font: 600 0.85rem/1 var(--font-body); padding: 0.45rem 0.7rem; border: 1px solid var(--rule);
  background: var(--white); border-radius: var(--radius);
}
.check-list { list-style: none; padding: 0; }
.check-list li { padding-left: 1.6rem; position: relative; margin-bottom: 0.5rem; }
.check-list li::before { content: ''; position: absolute; left: 0; top: 0.6em; width: 0.8rem; height: 2px; background: var(--green); }

.visually-hidden { position: absolute !important; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.skip-link { position: absolute; left: -999px; top: 0; background: var(--ink); color: var(--paper); padding: 0.5rem 1rem; z-index: 100; }
.skip-link:focus { left: 0; }
```

- [ ] **Step 4: Build and commit**

```bash
npm run build
git add src/site.config.ts src/styles/global.css src/assets/innex-logo.png public/favicon.png
git commit -m "feat: add site config, design tokens, and logo"
```

```json:metadata
{"files": ["src/site.config.ts", "src/styles/global.css", "src/assets/innex-logo.png", "public/favicon.png"], "verifyCommand": "npm run build", "acceptanceCriteria": ["SITE and EXPERT constants contain only spec-sourced facts", "green text color passes 4.5:1 on paper", "logo downloaded with corrected filename"], "requiresUserVerification": false}
```

---

### Task 2: SEO head, JSON-LD builders, BaseLayout, header and footer

**Goal:** Every page gets correct meta tags, canonical, OG, and site-wide `ProfessionalService` + `BreadcrumbList` JSON-LD through one layout.

**Files:**
- Create: `src/lib/schema.ts`, `src/components/SEO.astro`, `src/components/JsonLd.astro`, `src/components/Header.astro`, `src/components/Footer.astro`, `src/components/Breadcrumbs.astro`, `src/components/CtaBand.astro`, `src/layouts/BaseLayout.astro`, `public/og-image.png`
- Modify: `src/pages/index.astro` (minimal real home using BaseLayout; full design in Task 6)

**Acceptance Criteria:**
- [ ] `npm test` passes for `/`
- [ ] Header has nav to Expert Witness, Case Types, Consulting, About, Contact and a `tel:` link
- [ ] Mobile nav works without JS (links visible as wrapped row) and is enhanced with a toggle when JS runs

**Verify:** `npm run build && npm test` → all pass

**Steps:**

- [ ] **Step 1: Write `src/lib/schema.ts`**

```ts
import { SITE, EXPERT } from '../site.config';

const abs = (path: string) => new URL(path, SITE.url).href;
export const ORG_ID = `${SITE.url}/#organization`;
export const PERSON_ID = `${SITE.url}${EXPERT.path}#person`;

export function organizationSchema() {
  return {
    '@type': ['Organization', 'ProfessionalService'],
    '@id': ORG_ID,
    name: SITE.name,
    url: `${SITE.url}/`,
    logo: abs('/favicon.png'),
    image: abs(SITE.ogImage),
    telephone: `+1-${SITE.phone}`,
    email: SITE.email,
    description:
      'Independent forensic mechanical engineering, industrial and construction safety analysis, and expert witness services for plaintiff and defense counsel.',
    areaServed: { '@type': 'Country', name: 'United States' },
    founder: { '@id': PERSON_ID },
    employee: { '@id': PERSON_ID },
    knowsAbout: EXPERT.knowsAbout,
  };
}

export function personSchema() {
  return {
    '@type': 'Person',
    '@id': PERSON_ID,
    name: EXPERT.name,
    honorificSuffix: EXPERT.suffix,
    jobTitle: EXPERT.jobTitle,
    url: abs(EXPERT.path),
    worksFor: { '@id': ORG_ID },
    alumniOf: { '@type': 'CollegeOrUniversity', name: EXPERT.education.school },
    hasCredential: [...EXPERT.licenses, ...EXPERT.certifications].map((name) => ({
      '@type': 'EducationalOccupationalCredential',
      name,
    })),
    knowsAbout: EXPERT.knowsAbout,
  };
}

export function serviceSchema(name: string, description: string, path: string) {
  return {
    '@type': 'Service',
    name,
    description,
    url: abs(path),
    provider: { '@id': ORG_ID },
    areaServed: { '@type': 'Country', name: 'United States' },
  };
}

export function faqSchema(faqs: { q: string; a: string }[]) {
  return {
    '@type': 'FAQPage',
    mainEntity: faqs.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
}

export type Crumb = { name: string; href: string };

export function breadcrumbSchema(crumbs: Crumb[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: abs(c.href),
    })),
  };
}
```

- [ ] **Step 2: Write `src/components/SEO.astro`**

```astro
---
import { SITE } from '../site.config';

interface Props { title: string; description: string; noindex?: boolean; type?: 'website' | 'profile' | 'article'; }
const { title, description, noindex = false, type = 'website' } = Astro.props;

const fullTitle = Astro.url.pathname === '/' ? title : `${title} | ${SITE.name}`;
const canonical = new URL(Astro.url.pathname, SITE.url).href;
const image = new URL(SITE.ogImage, SITE.url).href;
---
<title>{fullTitle}</title>
<meta name="description" content={description} />
<link rel="canonical" href={canonical} />
{noindex && <meta name="robots" content="noindex, follow" />}
<meta property="og:type" content={type} />
<meta property="og:site_name" content={SITE.name} />
<meta property="og:title" content={fullTitle} />
<meta property="og:description" content={description} />
<meta property="og:url" content={canonical} />
<meta property="og:image" content={image} />
<meta property="og:locale" content="en_US" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content={fullTitle} />
<meta name="twitter:description" content={description} />
<meta name="twitter:image" content={image} />
```

- [ ] **Step 3: Write `src/components/JsonLd.astro`**

```astro
---
interface Props { graph: object[]; }
const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': Astro.props.graph });
---
<script type="application/ld+json" set:html={json} />
```

- [ ] **Step 4: Write `src/components/Header.astro`**

```astro
---
import { Image } from 'astro:assets';
import logo from '../assets/innex-logo.png';
import { SITE } from '../site.config';

const NAV = [
  { href: '/expert-witness/', label: 'Expert Witness' },
  { href: '/case-types/', label: 'Case Types' },
  { href: '/services/', label: 'Consulting' },
  { href: '/about/', label: 'About' },
  { href: '/contact/', label: 'Contact' },
];
const path = Astro.url.pathname;
---
<header class="site-header">
  <div class="container bar">
    <a href="/" class="brand" aria-label="INNEX Engineering home">
      <Image src={logo} alt="INNEX Engineering logo" height={44} loading="eager" />
    </a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav" hidden>
      <span class="visually-hidden">Menu</span>
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="2"/></svg>
    </button>
    <nav id="site-nav" aria-label="Main">
      <ul>
        {NAV.map((n) => (
          <li><a href={n.href} aria-current={path.startsWith(n.href) ? 'page' : undefined}>{n.label}</a></li>
        ))}
      </ul>
      <a class="btn call" href={SITE.phoneHref}>Call {SITE.phone}</a>
    </nav>
  </div>
</header>

<style>
  .site-header { position: sticky; top: 0; z-index: 50; background: var(--ink); color: var(--paper); border-bottom: 3px solid var(--green); }
  .bar { display: flex; align-items: center; justify-content: space-between; gap: 1rem; min-height: 4.25rem; flex-wrap: wrap; }
  .brand img { width: auto; height: 44px; }
  nav { display: flex; align-items: center; gap: 1.25rem; flex-wrap: wrap; }
  ul { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 0.25rem 1.25rem; }
  nav a:not(.btn) { color: var(--paper); text-decoration: none; font-weight: 600; padding-block: 0.25rem; border-bottom: 2px solid transparent; }
  nav a:not(.btn):hover, nav a[aria-current='page'] { border-bottom-color: var(--green); color: var(--paper); }
  .call { padding: 0.6rem 1rem; }
  .nav-toggle { background: none; border: 0; color: var(--paper); padding: 0.5rem; cursor: pointer; }
  @media (max-width: 860px) {
    :global(html.js) .nav-toggle { display: block; }
    :global(html.js) nav { display: none; width: 100%; padding-bottom: 1rem; flex-direction: column; align-items: flex-start; }
    :global(html.js) nav.open { display: flex; }
    :global(html.js) ul { flex-direction: column; }
  }
</style>

<script is:inline>
  document.documentElement.classList.add('js');
  (() => {
    const btn = document.querySelector('.nav-toggle');
    const nav = document.getElementById('site-nav');
    if (!btn || !nav) return;
    btn.hidden = false;
    btn.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
    });
  })();
</script>
```

Note: `hidden` on the button is removed by the inline script, so without JS the toggle never appears and the nav renders as a wrapped row. Add to `global.css`: `.nav-toggle[hidden] { display: none !important; }`

- [ ] **Step 5: Write `src/components/Footer.astro`**

```astro
---
import { SITE, EXPERT } from '../site.config';
const year = new Date().getFullYear();
---
<footer class="site-footer">
  <div class="container grid">
    <div>
      <p class="name">{SITE.name}</p>
      <p>Forensic mechanical engineering, industrial and construction safety analysis, and expert witness services for plaintiff and defense counsel nationwide.</p>
      <p class="small">{SITE.firmRegistration}</p>
    </div>
    <div>
      <p class="h">Expert Witness</p>
      <ul>
        <li><a href="/expert-witness/">Litigation Support</a></li>
        <li><a href="/case-types/">Case Types</a></li>
        <li><a href={EXPERT.path}>{EXPERT.name}, {EXPERT.suffix}</a></li>
      </ul>
    </div>
    <div>
      <p class="h">Consulting</p>
      <ul>
        <li><a href="/services/process-safety-pha/">Process Safety &amp; PHA</a></li>
        <li><a href="/services/failure-analysis-fmea/">Failure Analysis &amp; FMEA</a></li>
      </ul>
    </div>
    <div>
      <p class="h">Contact</p>
      <ul>
        <li><a href={SITE.phoneHref}>{SITE.phone}</a></li>
        <li><a href={`mailto:${SITE.email}`}>{SITE.email}</a></li>
        <li><a href="/contact/">Submit a case inquiry</a></li>
      </ul>
    </div>
  </div>
  <div class="container legal">
    <p>&copy; {year} {SITE.name}. All rights reserved. · <a href="/privacy/">Privacy</a></p>
  </div>
</footer>

<style>
  .site-footer { background: var(--ink); color: #c9cfd8; padding-top: 3rem; font-size: 0.95rem; }
  .grid { display: grid; gap: 2rem; grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr)); }
  .name { font: 700 1.25rem var(--font-head); color: var(--paper); }
  .h { font-weight: 600; color: var(--paper); text-transform: uppercase; letter-spacing: 0.1em; font-size: 0.8rem; }
  ul { list-style: none; padding: 0; }
  li { margin-bottom: 0.4rem; }
  a { color: #c9cfd8; }
  a:hover { color: var(--paper); }
  .small { font-size: 0.85rem; }
  .legal { border-top: 1px solid var(--ink-2); margin-top: 2rem; padding-block: 1.25rem; font-size: 0.85rem; }
  .legal p { margin: 0; }
</style>
```

- [ ] **Step 6: Write `src/components/Breadcrumbs.astro`**

```astro
---
import type { Crumb } from '../lib/schema';
interface Props { crumbs: Crumb[]; }
const { crumbs } = Astro.props;
---
<nav aria-label="Breadcrumb" class="crumbs container">
  <ol>
    {crumbs.map((c, i) => (
      <li>{i < crumbs.length - 1 ? <a href={c.href}>{c.name}</a> : <span aria-current="page">{c.name}</span>}</li>
    ))}
  </ol>
</nav>
<style>
  .crumbs { padding-top: 1.25rem; font-size: 0.9rem; color: var(--muted); }
  ol { list-style: none; padding: 0; margin: 0; display: flex; flex-wrap: wrap; gap: 0.4rem; }
  li + li::before { content: '/'; margin-right: 0.4rem; color: var(--rule); }
</style>
```

- [ ] **Step 7: Write `src/components/CtaBand.astro`**

```astro
---
import { SITE } from '../site.config';
interface Props { heading?: string; }
const { heading = 'Have a case involving equipment, industrial, or workplace safety?' } = Astro.props;
---
<section class="section section--ink cta">
  <div class="container">
    <p class="eyebrow">Plaintiff &amp; Defense</p>
    <h2>{heading}</h2>
    <p class="lead">Call or send a brief case summary. You will hear back directly from the engineer, not an intake service.</p>
    <div class="btn-row">
      <a class="btn" href="/contact/">Discuss a Case</a>
      <a class="btn btn--ghost" href={SITE.phoneHref}>Call {SITE.phone}</a>
    </div>
  </div>
</section>
```

- [ ] **Step 8: Write `src/layouts/BaseLayout.astro`**

```astro
---
import '@fontsource/archivo/700.css';
import '@fontsource/source-sans-3/400.css';
import '@fontsource/source-sans-3/600.css';
import '../styles/global.css';
import SEO from '../components/SEO.astro';
import JsonLd from '../components/JsonLd.astro';
import Header from '../components/Header.astro';
import Footer from '../components/Footer.astro';
import Breadcrumbs from '../components/Breadcrumbs.astro';
import { organizationSchema, breadcrumbSchema, type Crumb } from '../lib/schema';

interface Props {
  title: string;
  description: string;
  crumbs?: Crumb[];       // excluding Home; Home is prepended automatically
  schema?: object[];
  noindex?: boolean;
  ogType?: 'website' | 'profile' | 'article';
}
const { title, description, crumbs = [], schema = [], noindex = false, ogType } = Astro.props;
const fullCrumbs = crumbs.length ? [{ name: 'Home', href: '/' }, ...crumbs] : [];
const graph = [organizationSchema(), ...schema, ...(fullCrumbs.length ? [breadcrumbSchema(fullCrumbs)] : [])];
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#0f1b2d" />
    <link rel="icon" type="image/png" href="/favicon.png" />
    <link rel="sitemap" href="/sitemap-index.xml" />
    <SEO title={title} description={description} noindex={noindex} type={ogType} />
    <JsonLd graph={graph} />
  </head>
  <body>
    <a class="skip-link" href="#main">Skip to content</a>
    <Header />
    {fullCrumbs.length > 0 && <Breadcrumbs crumbs={fullCrumbs} />}
    <main id="main">
      <slot />
    </main>
    <Footer />
  </body>
</html>
```

- [ ] **Step 9: Create `public/og-image.png`** (1200×630). Generate with sharp (installed with Astro):

```bash
node -e "
const sharp = require('sharp');
const svg = Buffer.from(\`<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='630'>
<rect width='1200' height='630' fill='#0f1b2d'/><rect y='614' width='1200' height='16' fill='#009a30'/>
<text x='80' y='250' font-family='Arial' font-weight='700' font-size='72' fill='#f7f7f4'>INNEX Engineering</text>
<text x='80' y='340' font-family='Arial' font-size='38' fill='#c9cfd8'>Forensic Mechanical Engineering</text>
<text x='80' y='395' font-family='Arial' font-size='38' fill='#c9cfd8'>&amp; Safety Expert Witness</text>
<text x='80' y='500' font-family='Arial' font-weight='700' font-size='34' fill='#7fd99b'>P.E. · CSP · CMRP</text></svg>\`);
sharp(svg).png().toFile('public/og-image.png').then(i => console.log(i));
"
```
Expected: `{ format: 'png', width: 1200, height: 630, ... }`

- [ ] **Step 10: Replace `src/pages/index.astro` with a minimal BaseLayout page**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import { SITE } from '../site.config';
---
<BaseLayout
  title="Forensic Engineering & Safety Expert Witness | INNEX"
  description="Independent forensic mechanical engineering and safety expert witness for plaintiff and defense: industrial accidents, equipment failure, workplace injury."
>
  <section class="section container"><h1>{SITE.tagline}</h1></section>
</BaseLayout>
```

(Title is 53 chars — home is exempt from the suffix rule.)

- [ ] **Step 11: Build, test — expect PASS**

Run: `npm run build && npm test`
Expected: all tests pass.

- [ ] **Step 12: Commit**

```bash
git add src public/og-image.png
git commit -m "feat: add SEO head, JSON-LD builders, base layout, header and footer"
```

```json:metadata
{"files": ["src/lib/schema.ts", "src/components/SEO.astro", "src/components/JsonLd.astro", "src/components/Header.astro", "src/components/Footer.astro", "src/components/Breadcrumbs.astro", "src/components/CtaBand.astro", "src/layouts/BaseLayout.astro", "src/pages/index.astro", "public/og-image.png", "src/styles/global.css"], "verifyCommand": "npm run build && npm test", "acceptanceCriteria": ["npm test passes for /", "header nav + tel link present", "mobile nav works without JS and toggles with JS"], "requiresUserVerification": false}
```

---

### Task 3: Content collections, entry layout, dynamic routes, first case type

**Goal:** Case types and services render from Markdown through one layout that emits `Service` + `FAQPage` JSON-LD, standards, FAQ, and related links.

**Files:**
- Create: `src/content.config.ts`, `src/layouts/EntryLayout.astro`, `src/components/EntryGrid.astro`, `src/pages/case-types/[slug].astro`, `src/pages/services/[slug].astro`, `src/content/case-types/industrial-accidents.md`
- Modify: `tests/routes.mjs`

**Acceptance Criteria:**
- [ ] Schema rejects `seoTitle` > 40 chars and `description` outside 50–155
- [ ] `/case-types/industrial-accidents/` passes SEO tests and includes `Service` and `FAQPage` JSON-LD

**Verify:** `npm run build && npm test`

**Steps:**

- [ ] **Step 1: Add route to `tests/routes.mjs`, plus an FAQ schema test**

Change `EXPECTED_ROUTES` to:
```js
export const EXPECTED_ROUTES = ['/', '/case-types/industrial-accidents/'];
```
Append to `tests/seo.test.mjs`:
```js
test('entry pages carry Service + FAQPage schema', () => {
  const entries = EXPECTED_ROUTES.filter((r) => /^\/(case-types|services)\/[^/]+\/$/.test(r));
  assert.ok(entries.length > 0);
  for (const route of entries) {
    const types = load(route).querySelectorAll('script[type="application/ld+json"]')
      .flatMap((s) => JSON.parse(s.text)['@graph'].map((n) => n['@type']));
    assert.ok(types.includes('Service'), `${route} Service`);
    assert.ok(types.includes('FAQPage'), `${route} FAQPage`);
  }
});
```

- [ ] **Step 2: Run tests — expect FAIL** (`missing page /case-types/industrial-accidents/`)

- [ ] **Step 3: Write `src/content.config.ts`**

```ts
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const entry = z.object({
  title: z.string(),                       // H1
  seoTitle: z.string().max(40),            // + " | INNEX Engineering" ≤ 60
  description: z.string().min(50).max(155),
  summary: z.string().max(200),            // card text on hub pages
  order: z.number(),
  standards: z.array(z.string()).default([]),
  questions: z.array(z.string()).min(3),   // "Questions an expert can answer"
  faqs: z.array(z.object({ q: z.string(), a: z.string() })).min(3).max(5),
  related: z.array(z.string()).default([]), // case-type slugs
});

export const collections = {
  caseTypes: defineCollection({ loader: glob({ pattern: '*.md', base: './src/content/case-types' }), schema: entry }),
  services: defineCollection({ loader: glob({ pattern: '*.md', base: './src/content/services' }), schema: entry }),
};
```

If the installed Astro version reports `astro/zod` or `astro/loaders` as unresolved, check `node_modules/astro/package.json` `exports` and use the documented import for that version (Astro ≤5: `import { z } from 'astro:content'`).

- [ ] **Step 4: Write `src/components/EntryGrid.astro`**

```astro
---
interface Item { href: string; title: string; summary: string; }
interface Props { items: Item[]; headingLevel?: 'h2' | 'h3'; }
const { items, headingLevel = 'h3' } = Astro.props;
const H = headingLevel;
---
<ul class="grid">
  {items.map((i) => (
    <li>
      <a href={i.href}>
        <H>{i.title}</H>
        <p>{i.summary}</p>
        <span class="more" aria-hidden="true">Learn more →</span>
      </a>
    </li>
  ))}
</ul>
<style>
  .grid { list-style: none; padding: 0; display: grid; gap: 1px; background: var(--rule); border: 1px solid var(--rule);
    grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr)); }
  a { display: block; height: 100%; padding: 1.5rem; background: var(--white); color: var(--ink); text-decoration: none; }
  a:hover { background: var(--paper); }
  a:hover .more { color: var(--green-dark); }
  p { color: var(--muted); font-size: 0.98rem; }
  .more { font-weight: 600; color: var(--green-text); }
</style>
```

- [ ] **Step 5: Write `src/layouts/EntryLayout.astro`**

```astro
---
import type { CollectionEntry } from 'astro:content';
import BaseLayout from './BaseLayout.astro';
import CtaBand from '../components/CtaBand.astro';
import EntryGrid from '../components/EntryGrid.astro';
import { serviceSchema, faqSchema } from '../lib/schema';
import { EXPERT } from '../site.config';

interface Props {
  entry: CollectionEntry<'caseTypes'> | CollectionEntry<'services'>;
  section: { name: string; href: string };
  related: CollectionEntry<'caseTypes'>[];
}
const { entry, section, related } = Astro.props;
const d = entry.data;
const path = `${section.href}${entry.id}/`;
---
<BaseLayout
  title={d.seoTitle}
  description={d.description}
  crumbs={[section, { name: d.title, href: path }]}
  schema={[serviceSchema(d.title, d.description, path), faqSchema(d.faqs)]}
>
  <header class="container hero">
    <p class="eyebrow">{section.name}</p>
    <h1>{d.title}</h1>
    <p class="lead">{d.summary}</p>
    <div class="btn-row"><a class="btn" href="/contact/">Discuss a Case</a><a class="btn btn--ghost" href={EXPERT.path}>Expert Credentials</a></div>
  </header>

  <div class="container body">
    <article class="prose"><slot /></article>
    <aside>
      {d.standards.length > 0 && (
        <section>
          <h2 class="h-side">Applicable Standards</h2>
          <ul class="std-list">{d.standards.map((s) => <li>{s}</li>)}</ul>
        </section>
      )}
      <section>
        <h2 class="h-side">Your Expert</h2>
        <p><a href={EXPERT.path}>{EXPERT.name}, {EXPERT.suffix}</a> is a licensed Professional Engineer (Texas and Illinois) and Certified Safety Professional with {EXPERT.experience}.</p>
      </section>
    </aside>
  </div>

  <section class="section section--white">
    <div class="container prose">
      <h2>Questions an Expert Can Answer</h2>
      <ul class="check-list">{d.questions.map((q) => <li>{q}</li>)}</ul>
    </div>
  </section>

  <section class="section container prose">
    <h2>Frequently Asked Questions</h2>
    {d.faqs.map((f) => (<details><summary>{f.q}</summary><p>{f.a}</p></details>))}
  </section>

  {related.length > 0 && (
    <section class="section section--white">
      <div class="container">
        <h2>Related Case Types</h2>
        <EntryGrid items={related.map((r) => ({ href: `/case-types/${r.id}/`, title: r.data.title, summary: r.data.summary }))} />
      </div>
    </section>
  )}

  <CtaBand />
</BaseLayout>

<style>
  .hero { padding-block: 2rem 3rem; }
  .body { display: grid; gap: 3rem; padding-bottom: 3rem; }
  @media (min-width: 900px) { .body { grid-template-columns: minmax(0, 1fr) 20rem; } }
  aside section { border-top: 3px solid var(--ink); padding-top: 1rem; margin-bottom: 2rem; }
  .h-side { font-size: 1rem; text-transform: uppercase; letter-spacing: 0.08em; }
  details { border-top: 1px solid var(--rule); padding-block: 1rem; }
  details:last-of-type { border-bottom: 1px solid var(--rule); }
  summary { cursor: pointer; font-weight: 600; font-size: 1.1rem; }
  details p { margin-top: 0.75rem; }
</style>
```

- [ ] **Step 6: Write `src/pages/case-types/[slug].astro`**

```astro
---
import { getCollection, render } from 'astro:content';
import EntryLayout from '../../layouts/EntryLayout.astro';

export async function getStaticPaths() {
  const all = await getCollection('caseTypes');
  return all.map((entry) => ({
    params: { slug: entry.id },
    props: { entry, related: all.filter((e) => entry.data.related.includes(e.id)) },
  }));
}
const { entry, related } = Astro.props;
const { Content } = await render(entry);
---
<EntryLayout entry={entry} related={related} section={{ name: 'Case Types', href: '/case-types/' }}>
  <Content />
</EntryLayout>
```

- [ ] **Step 7: Write `src/pages/services/[slug].astro`**

```astro
---
import { getCollection, render } from 'astro:content';
import EntryLayout from '../../layouts/EntryLayout.astro';

export async function getStaticPaths() {
  const services = await getCollection('services');
  const caseTypes = await getCollection('caseTypes');
  return services.map((entry) => ({
    params: { slug: entry.id },
    props: { entry, related: caseTypes.filter((e) => entry.data.related.includes(e.id)) },
  }));
}
const { entry, related } = Astro.props;
const { Content } = await render(entry);
---
<EntryLayout entry={entry} related={related} section={{ name: 'Consulting', href: '/services/' }}>
  <Content />
</EntryLayout>
```

- [ ] **Step 8: Write `src/content/case-types/industrial-accidents.md`** (reference example for tone and structure — all other entries follow this pattern)

```markdown
---
title: Industrial & Refinery Accident Expert Witness
seoTitle: Industrial & Refinery Accident Expert
description: Forensic engineering expert for plant, refinery, and chemical facility accidents. P.E. and CSP analysis of PSM, mechanical integrity, and equipment failures.
summary: Independent engineering analysis of incidents at refineries, chemical plants, and manufacturing facilities, from process safety failures to equipment breakdowns.
order: 1
standards:
  - OSHA 29 CFR 1910.119 (PSM)
  - OSHA 29 CFR 1910 General Industry
  - ASME BPVC Section VIII
  - API 510 / 570
  - NFPA 70E
questions:
  - Did the facility's process safety management program meet OSHA 1910.119 requirements?
  - Was the failed equipment inspected, tested, and maintained under a compliant mechanical integrity program?
  - Did a process hazard analysis identify the hazard, and were its recommendations implemented?
  - Were pressure-relief, guarding, and lockout/tagout safeguards adequate and functional?
  - What was the mechanical root cause of the failure, and was it foreseeable?
faqs:
  - q: What types of industrial facilities do you investigate?
    a: Refineries, chemical and petrochemical plants, manufacturing plants, warehouses, and other industrial sites, including incidents involving fixed and rotating equipment, pressure vessels, piping, and materials handling equipment.
  - q: Do you work for plaintiffs or defendants?
    a: Both. INNEX Engineering provides independent, evidence-based opinions to plaintiff and defense counsel, and to insurers.
  - q: How is process safety management relevant to litigation?
    a: OSHA's PSM standard sets requirements for hazard analysis, mechanical integrity, operating procedures, and management of change. Whether a facility met those requirements is often central to establishing the standard of care.
  - q: Can you review a case before a site inspection is possible?
    a: Yes. Initial case reviews commonly start from incident reports, photographs, OSHA citations, maintenance records, and deposition testimony, and identify what additional evidence should be preserved or requested.
related:
  - equipment-machinery-failure
  - workplace-injury
  - forklift-material-handling
---

## Engineering analysis of industrial incidents

Serious incidents at refineries, chemical plants, and manufacturing facilities rarely have a single cause. They typically involve a chain of equipment condition, maintenance practice, procedures, training, and management decisions. Establishing what happened, and whether it should have been prevented, requires an engineer who understands both how the equipment works and how plant safety programs are supposed to function.

Paul Neumann, P.E., CSP, CMRP, brings more than 20 years of practical, technical, academic, and operational experience in industrial plant safety, maintenance and reliability, and mechanical engineering to incident investigation and litigation support.

## What we investigate

- Process safety management (PSM) program compliance, including process hazard analyses and management of change
- Mechanical integrity programs: inspection, testing, and maintenance of pressure vessels, piping, relief systems, and rotating equipment
- Fixed and rotating machinery failures, including pumps, mechanical seals, and bolted joints
- Glass-lined equipment, instrumentation, and electrical system issues
- Pressure-relief system design and performance
- Lockout/tagout, machine guarding, confined space, and arc flash hazards

## Why process safety experience matters

Paul has performed Process Hazard Analyses, Mechanical Integrity PSM compliance audits, and Failure Mode and Effects Analyses for industrial operations. That operational perspective, knowing what a functioning program looks like in practice, makes it possible to identify where a facility's program departed from accepted practice and regulatory requirements.
```

- [ ] **Step 9: Build and test** — `npm run build && npm test`. Expected: all pass. (Related slugs that don't exist yet are silently skipped by the `filter`; they appear once Task 4 adds them.)

- [ ] **Step 10: Commit**

```bash
git add src tests
git commit -m "feat: add content collections, entry layout, and first case type"
```

```json:metadata
{"files": ["src/content.config.ts", "src/layouts/EntryLayout.astro", "src/components/EntryGrid.astro", "src/pages/case-types/[slug].astro", "src/pages/services/[slug].astro", "src/content/case-types/industrial-accidents.md", "tests/routes.mjs", "tests/seo.test.mjs"], "verifyCommand": "npm run build && npm test", "acceptanceCriteria": ["schema rejects seoTitle > 40 and description outside 50-155", "/case-types/industrial-accidents/ passes SEO tests with Service + FAQPage JSON-LD"], "requiresUserVerification": false}
```

---

### Task 4: Write remaining case-type and service content

**Goal:** 8 more case-type entries and 2 service entries, written only from spec source facts, following the `industrial-accidents.md` structure.

**Files:**
- Create: `src/content/case-types/{workplace-injury,construction-accidents,forklift-material-handling,equipment-machinery-failure,product-liability,premises-liability,trucking-trailer-heavy-equipment,vehicle-off-road-recreational}.md`
- Create: `src/content/services/{process-safety-pha,failure-analysis-fmea}.md`
- Modify: `tests/routes.mjs`

**Acceptance Criteria:**
- [ ] Each entry: 350–600 words of body, 3+ `questions`, 3–5 `faqs`, 2–4 `related` slugs that exist
- [ ] Every factual claim about Paul/INNEX traces to spec "Source facts"; no invented cases, numbers, clients, testimonials
- [ ] FAQ "Do you work for plaintiffs or defendants?" appears at most on 3 pages (avoid duplicate content); each page's FAQs are case-type specific
- [ ] All entries pass SEO tests

**Verify:** `npm run build && npm test`

**Content rules (apply to every entry):**
- Frontmatter fields exactly as in `industrial-accidents.md`. `seoTitle` ≤ 40 chars; `description` 50–155 chars containing the primary keyword.
- Body sections: `## <intro heading with keyword>` (2 paragraphs), `## What we investigate` (bullet list), `## <one differentiator section tied to a real credential>`.
- Mention Paul's name + credentials once in the body. Plain, precise, non-salesy language. No guarantees about outcomes.

**Per-entry briefs:**

| slug | title (H1) | seoTitle | primary keyword | standards | differentiator credential | related |
|---|---|---|---|---|---|---|
| workplace-injury | Workplace Injury Expert Witness | Workplace Injury Expert Witness | workplace injury expert witness | OSHA 29 CFR 1910; OSHA 1910.147 (LOTO); OSHA 1910.212 (machine guarding); NFPA 70E; ANSI Z244.1 | CSP + OSHA general industry and oil & gas training | industrial-accidents, forklift-material-handling, construction-accidents |
| construction-accidents | Construction Accident Expert Witness | Construction Accident Expert Witness | construction accident expert witness | OSHA 29 CFR 1926; 1926 Subpart L (scaffolds); Subpart M (fall protection); Subpart P (excavations); ANSI A92 (aerial lifts) | OSHA competent person: scaffolding, fall protection, excavation; aerial lift trainer | workplace-injury, forklift-material-handling, trucking-trailer-heavy-equipment |
| forklift-material-handling | Forklift & Material Handling Accident Expert | Forklift & Material Handling Expert | forklift accident expert witness | OSHA 1910.178; ANSI/ITSDF B56.1; OSHA 1910.179 (cranes); ASME B30 | OSHA powered industrial truck trainer; warehouse operations; materials handling equipment | workplace-injury, industrial-accidents, premises-liability |
| equipment-machinery-failure | Equipment & Machinery Failure Analysis Expert | Equipment Failure Expert Witness | equipment failure expert witness | ASME BPVC Section VIII Div. 1 & 2; ASME PCC-1 (bolted joints); API 610 (pumps); ISO 18436-2 | ASME VIII design training, bolted joint, pumps & seals, vibration analysis Cat II, CMRP | industrial-accidents, product-liability, trucking-trailer-heavy-equipment |
| product-liability | Product Liability Engineering Expert Witness | Product Liability Engineering Expert | product liability engineering expert | ANSI Z535 (warnings); OSHA 1910.212; ASTM (as applicable to product); ISO 12100 | FMEA/DFMEA and mechanical design analysis | equipment-machinery-failure, vehicle-off-road-recreational, forklift-material-handling |
| premises-liability | Premises Liability Safety Expert Witness | Premises Liability Safety Expert | premises liability expert witness | OSHA 1910 Subpart D (walking-working surfaces); ANSI A1264.1; ASTM F1637; IBC/IFC as adopted | CSP; warehouse and industrial site safety | workplace-injury, forklift-material-handling, construction-accidents |
| trucking-trailer-heavy-equipment | Trailer & Heavy Equipment Accident Expert | Trailer & Heavy Equipment Expert | heavy equipment accident expert witness | FMCSA 49 CFR 396 (inspection & maintenance); 49 CFR 393; OSHA 1926 Subpart O; ANSI/SAE as applicable | ASE heavy-duty truck certification; semi-trailer, tank trailer, yard mule inspection & maintenance | equipment-machinery-failure, construction-accidents, vehicle-off-road-recreational |
| vehicle-off-road-recreational | Off-Road & Recreational Vehicle Expert Witness | Off-Road & Recreational Vehicle Expert | off-road vehicle accident expert | ANSI/ROHVA 1; ANSI/SVIA 1; ANSI/ASABE S318 (ag machinery); SAE as applicable | ASE certifications; repair/restoration of motorcycles, RVs, ag equipment, small machinery | product-liability, trucking-trailer-heavy-equipment, equipment-machinery-failure |

Services (section "Consulting"; FAQs aimed at plant/operations managers and counsel needing compliance review):

| slug | title (H1) | seoTitle | primary keyword | standards | content focus | related |
|---|---|---|---|---|---|---|
| process-safety-pha | Process Safety Management & PHA Consulting | Process Safety & PHA Consulting | process hazard analysis consulting | OSHA 1910.119; EPA 40 CFR 68 (RMP); API 510/570; ASME BPVC VIII | PHAs, Mechanical Integrity PSM compliance audits, performed globally | industrial-accidents, equipment-machinery-failure |
| failure-analysis-fmea | Failure Analysis, FMEA & Root Cause Analysis | Failure Analysis & FMEA Consulting | FMEA and root cause analysis consulting | SAE J1739 / AIAG-VDA FMEA; ISO 18436-2; ASME PCC-1 | FMEA/DFMEA, root cause analysis, mechanical design analysis, maintenance & reliability (CMRP) | equipment-machinery-failure, product-liability |

Standards marked "as applicable" must be phrased that way in copy — do not assert a specific standard applies to an unspecified product.

**Steps:**

- [ ] **Step 1: Add all routes to `tests/routes.mjs`**

```js
const CASE_TYPES = [
  'industrial-accidents', 'workplace-injury', 'construction-accidents', 'forklift-material-handling',
  'equipment-machinery-failure', 'product-liability', 'premises-liability',
  'trucking-trailer-heavy-equipment', 'vehicle-off-road-recreational',
];
const SERVICES = ['process-safety-pha', 'failure-analysis-fmea'];

export const EXPECTED_ROUTES = [
  '/',
  ...CASE_TYPES.map((s) => `/case-types/${s}/`),
  ...SERVICES.map((s) => `/services/${s}/`),
];
export const NON_INDEXED_ROUTES = [];
```

- [ ] **Step 2: Run tests — expect FAIL** on each missing page.
- [ ] **Step 3: Write each entry per the briefs above.**
- [ ] **Step 4: Build and test → all pass.** Fix any schema errors (Astro prints the entry and field).
- [ ] **Step 5: Word-count check**

```bash
for f in src/content/case-types/*.md src/content/services/*.md; do echo "$(awk 'f>=2{print} /^---$/{f++}' "$f" | wc -w) $f"; done
```
Expected: every count between 350 and 600.

- [ ] **Step 6: Commit** — `git add src/content tests && git commit -m "content: add case-type and consulting pages"`

```json:metadata
{"files": ["src/content/case-types/workplace-injury.md", "src/content/case-types/construction-accidents.md", "src/content/case-types/forklift-material-handling.md", "src/content/case-types/equipment-machinery-failure.md", "src/content/case-types/product-liability.md", "src/content/case-types/premises-liability.md", "src/content/case-types/trucking-trailer-heavy-equipment.md", "src/content/case-types/vehicle-off-road-recreational.md", "src/content/services/process-safety-pha.md", "src/content/services/failure-analysis-fmea.md", "tests/routes.mjs"], "verifyCommand": "npm run build && npm test", "acceptanceCriteria": ["each entry 350-600 words, 3+ questions, 3-5 faqs, valid related slugs", "all claims trace to spec source facts", "all entries pass SEO tests"], "requiresUserVerification": false}
```

---

### Task 5: Hub pages — Expert Witness, Case Types, Consulting

**Goal:** Three hub pages that target head terms and link to every leaf.

**Files:**
- Create: `src/pages/expert-witness.astro`, `src/pages/case-types/index.astro`, `src/pages/services/index.astro`
- Modify: `tests/routes.mjs`

**Acceptance Criteria:**
- [ ] Hubs list every entry via `getCollection`, sorted by `order`
- [ ] Expert Witness page explains the engagement process (review → investigation & report → deposition & trial) and plaintiff/defense independence
- [ ] All tests pass

**Verify:** `npm run build && npm test` → all pass

**Steps:**

- [ ] **Step 1: Add `'/expert-witness/', '/case-types/', '/services/'` to `EXPECTED_ROUTES`.** Run tests → FAIL.

- [ ] **Step 2: Write `src/pages/case-types/index.astro`**

```astro
---
import { getCollection } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';
import EntryGrid from '../../components/EntryGrid.astro';
import CtaBand from '../../components/CtaBand.astro';

const items = (await getCollection('caseTypes'))
  .sort((a, b) => a.data.order - b.data.order)
  .map((e) => ({ href: `/case-types/${e.id}/`, title: e.data.title, summary: e.data.summary }));
---
<BaseLayout
  title="Case Types: Engineering Expert Witness"
  description="Forensic engineering expert witness case types: industrial and refinery accidents, workplace injury, construction, forklifts, equipment failure, and product liability."
  crumbs={[{ name: 'Case Types', href: '/case-types/' }]}
>
  <header class="container" style="padding-block: 2rem 3rem;">
    <p class="eyebrow">Case Types</p>
    <h1>Engineering &amp; Safety Expert Witness Case Types</h1>
    <p class="lead">Independent analysis for plaintiff and defense counsel in cases where equipment, industrial processes, or workplace safety practices are at issue.</p>
  </header>
  <section class="container" style="padding-bottom: 4rem;">
    <h2 class="visually-hidden">All case types</h2>
    <EntryGrid items={items} />
  </section>
  <CtaBand />
</BaseLayout>
```

- [ ] **Step 3: Write `src/pages/services/index.astro`**

```astro
---
import { getCollection } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';
import EntryGrid from '../../components/EntryGrid.astro';
import CtaBand from '../../components/CtaBand.astro';

const items = (await getCollection('services'))
  .sort((a, b) => a.data.order - b.data.order)
  .map((e) => ({ href: `/services/${e.id}/`, title: e.data.title, summary: e.data.summary }));
---
<BaseLayout
  title="Engineering & Safety Consulting"
  description="Process hazard analysis, PSM mechanical integrity audits, FMEA, and root cause analysis consulting from a licensed P.E., CSP, and CMRP."
  crumbs={[{ name: 'Consulting', href: '/services/' }]}
>
  <header class="container" style="padding-block: 2rem 3rem;">
    <p class="eyebrow">Consulting</p>
    <h1>Engineering &amp; Safety Consulting</h1>
    <p class="lead">The same process safety and reliability expertise behind our expert witness work is available to industrial operators: hazard analyses, compliance audits, and failure analysis.</p>
  </header>
  <section class="container" style="padding-bottom: 4rem;">
    <h2 class="visually-hidden">Consulting services</h2>
    <EntryGrid items={items} />
  </section>
  <CtaBand heading="Need a PHA, PSM audit, or failure analysis?" />
</BaseLayout>
```

- [ ] **Step 4: Write `src/pages/expert-witness.astro`**

```astro
---
import { getCollection } from 'astro:content';
import BaseLayout from '../layouts/BaseLayout.astro';
import EntryGrid from '../components/EntryGrid.astro';
import CtaBand from '../components/CtaBand.astro';
import { serviceSchema } from '../lib/schema';
import { EXPERT } from '../site.config';

const description = 'Mechanical engineering and safety expert witness for plaintiff and defense: case review, investigation, expert reports, deposition, and trial testimony.';
const items = (await getCollection('caseTypes'))
  .sort((a, b) => a.data.order - b.data.order)
  .map((e) => ({ href: `/case-types/${e.id}/`, title: e.data.title, summary: e.data.summary }));

const STEPS = [
  { h: 'Case review', p: 'Send a brief summary and key documents. We assess the engineering and safety issues, identify the evidence that matters, and tell you candidly whether the facts support the opinions you need.' },
  { h: 'Investigation & report', p: 'Site and equipment inspections, document and testimony review, applicable codes and standards analysis, and root cause analysis, leading to clear, well-supported written opinions.' },
  { h: 'Deposition & trial', p: 'Testimony that explains technical findings in plain language for judges and juries, grounded in the evidence and the governing standards.' },
];
---
<BaseLayout
  title="Engineering & Safety Expert Witness"
  description={description}
  crumbs={[{ name: 'Expert Witness', href: '/expert-witness/' }]}
  schema={[serviceSchema('Engineering & Safety Expert Witness Services', description, '/expert-witness/')]}
>
  <header class="container" style="padding-block: 2rem 3rem;">
    <p class="eyebrow">Litigation Support</p>
    <h1>Mechanical Engineering &amp; Safety Expert Witness</h1>
    <p class="lead">INNEX Engineering provides independent, evidence-based engineering and safety analysis in litigation involving equipment failures, product liability, premises liability, and workplace injuries.</p>
    <div class="btn-row"><a class="btn" href="/contact/">Discuss a Case</a><a class="btn btn--ghost" href={EXPERT.path}>View Credentials</a></div>
  </header>

  <section class="section section--white">
    <div class="container">
      <h2>How an Engagement Works</h2>
      <ol class="steps">
        {STEPS.map((s, i) => (<li><span class="n">0{i + 1}</span><h3>{s.h}</h3><p>{s.p}</p></li>))}
      </ol>
    </div>
  </section>

  <section class="section container prose">
    <h2>Plaintiff &amp; Defense: Independent Opinions</h2>
    <p>We are retained by plaintiff counsel, defense counsel, and insurers. Opinions follow the evidence and the applicable standards, regardless of who retains us. That independence is what makes testimony credible.</p>
    <h2>Why an Engineer Who Is Also a Safety Professional</h2>
    <p>{EXPERT.name} is both a licensed Professional Engineer and a Certified Safety Professional, and also holds the CMRP maintenance and reliability certification. Many cases turn on two questions at once: why did the equipment fail, and did the safety program meet the standard of care? Having both answered by one expert keeps the analysis consistent.</p>
  </section>

  <section class="section section--white">
    <div class="container">
      <h2>Case Types</h2>
      <EntryGrid items={items} />
    </div>
  </section>

  <CtaBand />
</BaseLayout>

<style>
  .steps { list-style: none; padding: 0; display: grid; gap: 2rem; grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr)); }
  .steps li { border-top: 3px solid var(--ink); padding-top: 1rem; }
  .n { font: 700 2rem var(--font-head); color: var(--green); display: block; margin-bottom: 0.5rem; }
</style>
```

- [ ] **Step 5: Build and test** — `npm run build && npm test` → all pass.

- [ ] **Step 6: Commit**

```bash
git add src tests
git commit -m "feat: add expert witness, case types, and consulting hub pages"
```

```json:metadata
{"files": ["src/pages/expert-witness.astro", "src/pages/case-types/index.astro", "src/pages/services/index.astro", "tests/routes.mjs"], "verifyCommand": "npm run build && npm test", "acceptanceCriteria": ["hubs list every entry sorted by order", "expert witness page explains engagement process and independence", "all tests pass including internal link test"], "requiresUserVerification": false}
```

---

### Task 6: Home page

**Goal:** Full home page per spec visual design.

**Files:**
- Create: `src/components/Headshot.astro`
- Modify: `src/pages/index.astro`

**Acceptance Criteria:**
- [ ] Sections in order: hero (H1, headshot, "P.E. · CSP · CMRP", CTAs Discuss a Case / View CV-or-Credentials) → credential strip → case-type grid → 3-step engagement → plaintiff & defense → CTA band
- [ ] Headshot renders if `src/assets/paul-neumann.jpg` exists, else a monogram block; build works either way
- [ ] "View CV" links to `/paul-neumann-pe-cv.pdf` only if the file exists in `public/`; otherwise CTA reads "View Credentials" → profile

**Verify:** `npm run build && npm test`; then `npm run preview` and inspect at 375px and 1280px widths.

**Steps:**

- [ ] **Step 1: Write `src/components/Headshot.astro`**

```astro
---
import { Image } from 'astro:assets';
import type { ImageMetadata } from 'astro';
import { EXPERT } from '../site.config';

interface Props { width?: number; eager?: boolean; }
const { width = 360, eager = false } = Astro.props;
const found = import.meta.glob<{ default: ImageMetadata }>('../assets/paul-neumann.{jpg,jpeg,png,webp}', { eager: true });
const img = Object.values(found)[0]?.default;
---
{img ? (
  <Image src={img} alt={`${EXPERT.name}, ${EXPERT.suffix}`} width={width} loading={eager ? 'eager' : 'lazy'} class="headshot" />
) : (
  <div class="monogram" role="img" aria-label={`${EXPERT.name}, ${EXPERT.suffix}`} style={`width:${width}px`}>PN</div>
)}
<style>
  .headshot { border-radius: var(--radius); border-bottom: 6px solid var(--green); }
  .monogram { aspect-ratio: 4 / 5; max-width: 100%; display: grid; place-items: center; background: var(--ink-2);
    color: var(--paper); font: 700 5rem var(--font-head); border-bottom: 6px solid var(--green); border-radius: var(--radius); }
</style>
```

- [ ] **Step 2: Write `src/pages/index.astro`**

```astro
---
import { existsSync } from 'node:fs';
import { getCollection } from 'astro:content';
import BaseLayout from '../layouts/BaseLayout.astro';
import EntryGrid from '../components/EntryGrid.astro';
import CtaBand from '../components/CtaBand.astro';
import Headshot from '../components/Headshot.astro';
import { personSchema } from '../lib/schema';
import { SITE, EXPERT } from '../site.config';

const hasCv = existsSync('public/paul-neumann-pe-cv.pdf');
const items = (await getCollection('caseTypes'))
  .sort((a, b) => a.data.order - b.data.order)
  .slice(0, 6)
  .map((e) => ({ href: `/case-types/${e.id}/`, title: e.data.title, summary: e.data.summary }));

const CREDS = [
  { k: 'P.E.', v: 'Licensed Professional Engineer, Texas & Illinois' },
  { k: 'CSP', v: 'Certified Safety Professional' },
  { k: 'CMRP', v: 'Certified Maintenance & Reliability Professional' },
  { k: 'OSHA', v: 'Competent person & trainer: scaffolding, fall protection, excavation, forklifts, aerial lifts' },
];
const STEPS = [
  { h: 'Case review', p: 'A prompt, candid assessment of the engineering and safety issues and the evidence needed.' },
  { h: 'Investigation & report', p: 'Inspections, document review, standards analysis, and root cause analysis, written up clearly.' },
  { h: 'Deposition & trial', p: 'Technical findings explained in plain language, grounded in evidence and governing standards.' },
];
---
<BaseLayout
  title="Forensic Engineering & Safety Expert Witness | INNEX"
  description="Independent forensic mechanical engineering and safety expert witness for plaintiff and defense: industrial accidents, equipment failure, workplace injury."
  schema={[personSchema()]}
>
  <section class="hero">
    <div class="container hero-grid">
      <div>
        <p class="eyebrow">Expert Witness &amp; Litigation Support</p>
        <h1>{SITE.tagline}</h1>
        <p class="lead">Independent, evidence-based engineering and safety analysis for plaintiff and defense counsel in equipment failure, product liability, premises liability, and workplace injury cases, nationwide.</p>
        <p class="who"><a href={EXPERT.path}>{EXPERT.name}</a> · P.E. · CSP · CMRP</p>
        <div class="btn-row">
          <a class="btn" href="/contact/">Discuss a Case</a>
          {hasCv
            ? <a class="btn btn--ghost" href="/paul-neumann-pe-cv.pdf">View CV (PDF)</a>
            : <a class="btn btn--ghost" href={EXPERT.path}>View Credentials</a>}
        </div>
      </div>
      <div class="hero-photo"><Headshot eager width={360} /></div>
    </div>
  </section>

  <section class="creds" aria-label="Credentials">
    <ul class="container">
      {CREDS.map((c) => (<li><strong>{c.k}</strong><span>{c.v}</span></li>))}
    </ul>
  </section>

  <section class="section container">
    <p class="eyebrow">Case Types</p>
    <h2>Where Engineering and Safety Questions Decide the Case</h2>
    <EntryGrid items={items} />
    <p style="margin-top:1.5rem"><a href="/case-types/">See all case types →</a></p>
  </section>

  <section class="section section--white">
    <div class="container">
      <p class="eyebrow">Process</p>
      <h2>How an Engagement Works</h2>
      <ol class="steps">
        {STEPS.map((s, i) => (<li><span class="n">0{i + 1}</span><h3>{s.h}</h3><p>{s.p}</p></li>))}
      </ol>
      <p><a href="/expert-witness/">More about litigation support →</a></p>
    </div>
  </section>

  <section class="section container prose">
    <p class="eyebrow">Independence</p>
    <h2>Plaintiff &amp; Defense: Opinions That Follow the Evidence</h2>
    <p>INNEX Engineering is retained by plaintiff counsel, defense counsel, and insurers. Our role is to evaluate incidents, explain the engineering clearly, and provide objective opinions grounded in evidence and the applicable OSHA, ASME, ANSI, ASTM, and NFPA standards.</p>
    <p>{EXPERT.name} brings {EXPERT.experience} in engineering applications, industrial plant safety, workplace safety, and construction worksite safety.</p>
  </section>

  <CtaBand />
</BaseLayout>

<style>
  .hero { background: var(--ink); color: var(--paper); padding-block: clamp(3rem, 8vw, 6rem); }
  .hero .eyebrow { color: #7fd99b; }
  .hero .lead { color: #c9cfd8; }
  .hero .btn--ghost { color: var(--paper); border-color: var(--paper); }
  .hero .btn--ghost:hover { background: var(--paper); color: var(--ink); }
  .hero-grid { display: grid; gap: 3rem; align-items: center; }
  @media (min-width: 900px) { .hero-grid { grid-template-columns: minmax(0, 1fr) 360px; } }
  .hero-photo { justify-self: center; }
  .who { font-weight: 600; letter-spacing: 0.04em; }
  .who a { color: var(--paper); }
  .creds { background: var(--white); border-bottom: 1px solid var(--rule); }
  .creds ul { list-style: none; margin: 0; padding-block: 1.5rem; display: grid; gap: 1.5rem; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); }
  .creds li { display: flex; flex-direction: column; border-left: 3px solid var(--green); padding-left: 0.9rem; }
  .creds strong { font: 700 1.5rem var(--font-head); }
  .creds span { color: var(--muted); font-size: 0.95rem; }
  .steps { list-style: none; padding: 0; display: grid; gap: 2rem; grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr)); }
  .steps li { border-top: 3px solid var(--ink); padding-top: 1rem; }
  .n { font: 700 2rem var(--font-head); color: var(--green); display: block; margin-bottom: 0.5rem; }
</style>
```

- [ ] **Step 3: Build, test, visual check**

```bash
npm run build && npm test
npm run preview   # open http://localhost:4321/ at 375px and 1280px widths
```
Expected: tests pass; no horizontal scroll at 375px; hero stacks on mobile.

- [ ] **Step 4: Commit** — `git add src && git commit -m "feat: build home page"`

```json:metadata
{"files": ["src/components/Headshot.astro", "src/pages/index.astro"], "verifyCommand": "npm run build && npm test", "acceptanceCriteria": ["home sections in spec order", "headshot or monogram fallback; build works either way", "CV link only when PDF exists"], "requiresUserVerification": false}
```

---

### Task 7: About and expert profile pages

**Goal:** Firm overview and a full credential profile for Paul with `Person` schema and CV download.

**Files:**
- Create: `src/pages/about/index.astro`, `src/pages/about/paul-neumann-pe.astro`
- Modify: `tests/routes.mjs`, `tests/seo.test.mjs`

**Acceptance Criteria:**
- [ ] Profile lists education, licenses, certifications, OSHA, training, and consulting areas from `EXPERT`
- [ ] Profile JSON-LD includes `Person` with `hasCredential`
- [ ] About page shows firm registration F-29716 and mission

**Verify:** `npm run build && npm test`

**Steps:**

- [ ] **Step 1: Add `'/about/', '/about/paul-neumann-pe/'` to `EXPECTED_ROUTES`; append test:**

```js
test('profile page has Person schema with credentials', () => {
  const graph = load('/about/paul-neumann-pe/').querySelectorAll('script[type="application/ld+json"]')
    .flatMap((s) => JSON.parse(s.text)['@graph']);
  const person = graph.find((n) => n['@type'] === 'Person');
  assert.ok(person, 'Person node');
  assert.ok(person.hasCredential.length >= 5, 'credentials listed');
});
```
Run → FAIL (pages missing).

- [ ] **Step 2: Write `src/pages/about/paul-neumann-pe.astro`**

```astro
---
import { existsSync } from 'node:fs';
import BaseLayout from '../../layouts/BaseLayout.astro';
import CtaBand from '../../components/CtaBand.astro';
import Headshot from '../../components/Headshot.astro';
import { personSchema } from '../../lib/schema';
import { EXPERT, SITE } from '../../site.config';

const hasCv = existsSync('public/paul-neumann-pe-cv.pdf');
const AREAS = [
  'Industrial, refinery, and plant safety',
  'ANSI, OSHA, ASTM, and ASME compliance',
  'FMEA, DFMEA, and Process Hazard Analysis',
  'Mechanical design analysis',
  'Inspection and maintenance of semi-trailers, tank trailers, and yard mules',
  'Heavy construction and materials handling equipment',
  'Off-highway and recreational vehicles',
];
const SUPPLEMENTAL = [
  'Repair and restoration of passenger vehicles, motorcycles, commercial trucks, heavy equipment, recreational vehicles, small machinery, and agricultural equipment',
];
const groups = [
  { h: 'Licenses', items: EXPERT.licenses },
  { h: 'Certifications', items: EXPERT.certifications },
  { h: 'OSHA Training & Competencies', items: EXPERT.osha },
  { h: 'Specialized Training', items: EXPERT.training },
];
---
<BaseLayout
  title="Paul Neumann, P.E., CSP, CMRP"
  description="Paul Neumann, P.E., CSP, CMRP: mechanical engineering and safety expert witness. Licensed in Texas and Illinois. Credentials, training, and CV."
  crumbs={[{ name: 'About', href: '/about/' }, { name: EXPERT.name, href: EXPERT.path }]}
  schema={[personSchema()]}
  ogType="profile"
>
  <header class="container top">
    <div>
      <p class="eyebrow">Expert Profile</p>
      <h1>{EXPERT.name}, {EXPERT.suffix}</h1>
      <p class="lead">Mechanical engineer, Certified Safety Professional, and Certified Maintenance &amp; Reliability Professional with {EXPERT.experience}.</p>
      <div class="btn-row">
        <a class="btn" href="/contact/">Discuss a Case</a>
        {hasCv && <a class="btn btn--ghost" href="/paul-neumann-pe-cv.pdf">Download CV (PDF)</a>}
        <a class="btn btn--ghost" href={SITE.phoneHref}>{SITE.phone}</a>
      </div>
    </div>
    <Headshot eager width={320} />
  </header>

  <section class="section section--white">
    <div class="container cols">
      <div>
        <h2>Education</h2>
        <p>{EXPERT.education.degree}, {EXPERT.education.school}</p>
        {groups.map((g) => (<><h2>{g.h}</h2><ul class="check-list">{g.items.map((i) => <li>{i}</li>)}</ul></>))}
      </div>
      <div>
        <h2>Primary Consulting Areas</h2>
        <ul class="check-list">{AREAS.map((a) => <li>{a}</li>)}</ul>
        <h2>Supplemental Expertise</h2>
        <ul class="check-list">{SUPPLEMENTAL.map((a) => <li>{a}</li>)}</ul>
        <h2>Industrial Consulting</h2>
        <p>Paul has performed Process Hazard Analyses, Mechanical Integrity PSM compliance audits, and Failure Mode and Effects Analyses for industrial operations on a global scale. See <a href="/services/">consulting services</a> and <a href="/case-types/">case types</a>.</p>
      </div>
    </div>
  </section>

  <CtaBand />
</BaseLayout>

<style>
  .top { display: grid; gap: 2.5rem; padding-block: 2rem 3rem; align-items: center; }
  @media (min-width: 900px) { .top { grid-template-columns: minmax(0, 1fr) 320px; } }
  .cols { display: grid; gap: 3rem; }
  @media (min-width: 900px) { .cols { grid-template-columns: 1fr 1fr; } }
  h2 { font-size: 1.25rem; margin-top: 1.75rem; border-top: 3px solid var(--ink); padding-top: 0.75rem; }
</style>
```

(Title "Paul Neumann, P.E., CSP, CMRP | INNEX Engineering" = 49 chars.)

- [ ] **Step 3: Write `src/pages/about/index.astro`**

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import CtaBand from '../../components/CtaBand.astro';
import { EXPERT, SITE } from '../../site.config';
---
<BaseLayout
  title="About INNEX Engineering"
  description="INNEX Engineering provides independent, evidence-based mechanical engineering and safety analysis for litigation. Texas Registered Engineering Firm F-29716."
  crumbs={[{ name: 'About', href: '/about/' }]}
>
  <header class="container" style="padding-block: 2rem 3rem;">
    <p class="eyebrow">About</p>
    <h1>About INNEX Engineering</h1>
    <p class="lead">Independent, evidence-based engineering and safety analysis for litigation, and practical process safety consulting for industry.</p>
  </header>
  <section class="section section--white">
    <div class="container prose">
      <h2>Our Mission</h2>
      <p>To provide independent, evidence-based engineering and safety analysis in litigation involving equipment failures, product liability, premises liability, and workplace injuries: evaluating incidents, explaining the engineering clearly, and providing objective opinions to plaintiff and defense counsel.</p>
      <h2>Experience</h2>
      <p>INNEX Engineering is led by <a href={EXPERT.path}>{EXPERT.name}, {EXPERT.suffix}</a>, who brings {EXPERT.experience} focused on engineering applications, industrial plant safety, workplace safety, and construction worksite safety.</p>
      <p>Areas of expertise include process safety management, fixed and rotating machinery, glass-lined equipment, electrical systems, instrumentation, pressure-relief systems, materials handling equipment, maintenance and reliability programs, warehouse operations, and the inspection and maintenance of semi-trailers, tank trailers, and yard mules.</p>
      <h2>Registration</h2>
      <p>{SITE.firmRegistration}. Professional Engineer licensure in Texas and Illinois. Expert witness services are available nationwide.</p>
    </div>
  </section>
  <CtaBand />
</BaseLayout>
```

- [ ] **Step 4: Build, test → PASS. Commit:** `git add src tests && git commit -m "feat: add about and expert profile pages"`

```json:metadata
{"files": ["src/pages/about/index.astro", "src/pages/about/paul-neumann-pe.astro", "tests/routes.mjs", "tests/seo.test.mjs"], "verifyCommand": "npm run build && npm test", "acceptanceCriteria": ["profile lists all EXPERT credential groups", "Person schema with hasCredential", "about shows F-29716 and mission"], "requiresUserVerification": false}
```

---

### Task 8: Contact form, thanks page, privacy, 404, legacy redirects

**Goal:** Working Formspree contact flow with no-JS fallback, privacy page, custom 404, and noindex redirects from old URLs.

**Files:**
- Create: `src/components/ContactForm.astro`, `src/pages/contact.astro`, `src/pages/contact/thanks.astro`, `src/pages/privacy.astro`, `src/pages/404.astro`
- Modify: `tests/routes.mjs`, `tests/seo.test.mjs`

**Acceptance Criteria:**
- [ ] With `formspreeId` empty: contact page shows phone + mailto CTAs, no `<form>`
- [ ] With `formspreeId` set: form posts to `https://formspree.io/f/<id>` with `_next` → `/contact/thanks/`, honeypot `_gotcha`, required name/email/description; JS enhancement shows inline success/error
- [ ] `/about-us/`, `/consultants/`, `/contact/thanks/`, `/404.html` exist, are noindex, and are absent from sitemap
- [ ] Every internal link on every built page resolves to a file in `dist/`

**Verify:** `npm run build && npm test`; manual: set a test Formspree ID, submit form in `npm run preview`

**Steps:**

- [ ] **Step 1: Update routes and tests**

In `tests/routes.mjs`, add `'/contact/', '/privacy/'` to the `EXPECTED_ROUTES` array literal and change the `NON_INDEXED_ROUTES` declaration to:
```js
export const NON_INDEXED_ROUTES = ['/about-us/', '/consultants/', '/contact/thanks/'];
```

Append to `tests/seo.test.mjs`:
```js
test('internal links resolve to built files', () => {
  const broken = [];
  const walk = (dir) => {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (ent.name.endsWith('.html')) {
        for (const a of parse(readFileSync(p, 'utf8')).querySelectorAll('a[href]')) {
          const href = a.getAttribute('href');
          if (!href.startsWith('/') || href.startsWith('//')) continue;
          const path = href.split('#')[0].split('?')[0];
          const target = path.endsWith('/') ? join(DIST, path, 'index.html') : join(DIST, path);
          if (!existsSync(target)) broken.push(`${p.replace(DIST, '/')} -> ${href}`);
        }
      }
    }
  };
  walk(DIST);
  assert.deepEqual(broken, [], 'broken internal links');
});

test('404 page exists and is noindex', () => {
  const html = readFileSync(join(DIST, '404.html'), 'utf8');
  assert.match(html, /<meta name="robots" content="noindex/);
});

test('sitemap lists every expected route and no excluded ones', () => {
  const xml = readdirSync(DIST).filter((f) => /^sitemap-\d+\.xml$/.test(f))
    .map((f) => readFileSync(join(DIST, f), 'utf8')).join('');
  for (const r of EXPECTED_ROUTES) assert.ok(xml.includes(`<loc>${SITE}${r}</loc>`), `sitemap missing ${r}`);
  for (const r of [...NON_INDEXED_ROUTES, '/404/']) assert.ok(!xml.includes(`${SITE}${r}<`), `sitemap must exclude ${r}`);
});
```
Run → FAIL.

- [ ] **Step 2: Write `src/components/ContactForm.astro`**

```astro
---
import { SITE } from '../site.config';
const action = SITE.formspreeId ? `https://formspree.io/f/${SITE.formspreeId}` : '';
const next = new URL('/contact/thanks/', SITE.url).href;
const CASE_TYPES = ['Industrial / refinery accident', 'Workplace injury', 'Construction accident', 'Forklift / material handling',
  'Equipment or machinery failure', 'Product liability', 'Premises liability', 'Trailer / heavy equipment',
  'Off-road / recreational vehicle', 'Consulting (PHA, PSM, FMEA)', 'Other'];
---
{action ? (
  <form class="cform" action={action} method="POST" data-enhance>
    <input type="hidden" name="_next" value={next} />
    <input type="hidden" name="_subject" value="New case inquiry: innexengineering.com" />
    <p class="hp" aria-hidden="true"><label>Leave blank <input type="text" name="_gotcha" tabindex="-1" autocomplete="off" /></label></p>
    <div class="row">
      <label>Name <span aria-hidden="true">*</span><input name="name" required autocomplete="name" /></label>
      <label>Firm / Company<input name="firm" autocomplete="organization" /></label>
    </div>
    <div class="row">
      <label>Email <span aria-hidden="true">*</span><input type="email" name="email" required autocomplete="email" /></label>
      <label>Phone<input type="tel" name="phone" autocomplete="tel" /></label>
    </div>
    <div class="row">
      <label>You represent
        <select name="represent"><option value="">Select…</option><option>Plaintiff</option><option>Defense</option><option>Insurer</option><option>Other</option></select>
      </label>
      <label>Case type
        <select name="case_type"><option value="">Select…</option>{CASE_TYPES.map((c) => <option>{c}</option>)}</select>
      </label>
    </div>
    <label>Key deadline (e.g., expert designation)<input name="deadline" /></label>
    <label>Brief case description <span aria-hidden="true">*</span>
      <textarea name="message" rows="6" required placeholder="What happened, equipment involved, and what you need from an expert. Please do not include confidential documents here."></textarea>
    </label>
    <button class="btn" type="submit">Send Inquiry</button>
    <p class="status" role="status" aria-live="polite"></p>
  </form>
) : (
  <div class="fallback">
    <p>Call or email to discuss a case. Please include a brief summary and any deadlines.</p>
    <div class="btn-row">
      <a class="btn" href={SITE.phoneHref}>Call {SITE.phone}</a>
      <a class="btn btn--ghost" href={`mailto:${SITE.email}?subject=Case%20inquiry`}>Email {SITE.email}</a>
    </div>
  </div>
)}

<style>
  .cform { display: grid; gap: 1rem; }
  .row { display: grid; gap: 1rem; }
  @media (min-width: 640px) { .row { grid-template-columns: 1fr 1fr; } }
  label { display: grid; gap: 0.35rem; font-weight: 600; }
  input, select, textarea { font: inherit; font-weight: 400; padding: 0.7rem 0.8rem; border: 1px solid #9aa1ab; border-radius: var(--radius); background: var(--white); color: var(--ink); width: 100%; }
  .hp { position: absolute; left: -9999px; }
  .status { min-height: 1.5em; font-weight: 600; }
  .status.ok { color: var(--green-text); }
  .status.err { color: #b42318; }
</style>

<script>
  const form = document.querySelector<HTMLFormElement>('form[data-enhance]');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const status = form.querySelector<HTMLElement>('.status')!;
    const btn = form.querySelector<HTMLButtonElement>('button[type=submit]')!;
    btn.disabled = true;
    status.className = 'status';
    status.textContent = 'Sending…';
    try {
      const res = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(String(res.status));
      form.reset();
      status.classList.add('ok');
      status.textContent = 'Thank you. Your inquiry was sent, and you will hear back directly, usually within one business day.';
    } catch {
      status.classList.add('err');
      status.textContent = 'Sorry, the message could not be sent. Please call 281-755-9177 or email Paul@INNEXengineering.com.';
    } finally {
      btn.disabled = false;
    }
  });
</script>
```

Note: "usually within one business day" is a service promise — confirm with user before launch (listed in Task 11 review checklist); remove if not confirmed.

- [ ] **Step 3: Write `src/pages/contact.astro`**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import ContactForm from '../components/ContactForm.astro';
import { SITE } from '../site.config';
---
<BaseLayout
  title="Contact: Discuss a Case"
  description="Contact INNEX Engineering to discuss an engineering or safety expert witness engagement. Call 281-755-9177 or send a brief case summary."
  crumbs={[{ name: 'Contact', href: '/contact/' }]}
>
  <div class="container wrap">
    <header>
      <p class="eyebrow">Contact</p>
      <h1>Discuss a Case</h1>
      <p class="lead">Send a brief summary of the matter, or call directly. Inquiries go straight to the engineer.</p>
      <dl>
        <dt>Phone</dt><dd><a href={SITE.phoneHref}>{SITE.phone}</a></dd>
        <dt>Email</dt><dd><a href={`mailto:${SITE.email}`}>{SITE.email}</a></dd>
        <dt>Service area</dt><dd>Nationwide</dd>
      </dl>
      <p class="small">Submitting an inquiry does not create an engagement. Please do not send confidential or privileged documents until a conflict check is complete.</p>
    </header>
    <section aria-labelledby="form-h">
      <h2 id="form-h">Case Inquiry</h2>
      <ContactForm />
    </section>
  </div>
</BaseLayout>
<style>
  .wrap { display: grid; gap: 3rem; padding-block: 2rem 5rem; }
  @media (min-width: 900px) { .wrap { grid-template-columns: 1fr 1.3fr; } }
  dl { display: grid; grid-template-columns: auto 1fr; gap: 0.5rem 1.25rem; }
  dt { font-weight: 600; }
  dd { margin: 0; }
  .small { font-size: 0.9rem; color: var(--muted); }
</style>
```

- [ ] **Step 4: Write `src/pages/contact/thanks.astro`**

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
---
<BaseLayout title="Inquiry Received" description="Thank you for contacting INNEX Engineering. Your case inquiry has been received and you will hear back directly." noindex>
  <section class="section container prose">
    <h1>Thank you. Your inquiry was received.</h1>
    <p>You will hear back directly from the engineer. If your matter is time-sensitive, please call <a href="tel:+12817559177">281-755-9177</a>.</p>
    <p><a href="/">Return to the home page</a></p>
  </section>
</BaseLayout>
```

- [ ] **Step 5: Write `src/pages/404.astro`**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---
<BaseLayout title="Page Not Found" description="The page you requested could not be found on the INNEX Engineering website. Use the links below to find what you need." noindex>
  <section class="section container prose">
    <h1>Page not found</h1>
    <p>The page you were looking for may have moved. Try one of these:</p>
    <ul><li><a href="/expert-witness/">Expert witness services</a></li><li><a href="/case-types/">Case types</a></li><li><a href="/about/paul-neumann-pe/">Expert profile</a></li><li><a href="/contact/">Contact</a></li></ul>
  </section>
</BaseLayout>
```

- [ ] **Step 6: Write `src/pages/privacy.astro`**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import { SITE } from '../site.config';
---
<BaseLayout
  title="Privacy Policy"
  description="How INNEX Engineering handles information submitted through this website, including contact form submissions processed by Formspree."
  crumbs={[{ name: 'Privacy', href: '/privacy/' }]}
>
  <section class="section container prose">
    <h1>Privacy Policy</h1>
    <p>This website does not use advertising or analytics cookies.</p>
    <h2>Information you submit</h2>
    <p>When you submit the contact form, the information you enter (name, firm, email, phone, and case details) is transmitted to Formspree, a third-party form processing service, and delivered to INNEX Engineering by email. It is used only to respond to your inquiry and evaluate a potential engagement. It is not sold or shared for marketing.</p>
    <h2>Hosting</h2>
    <p>This site is hosted on GitHub Pages, which may log visitor IP addresses for security and operational purposes.</p>
    <h2>Contact</h2>
    <p>Questions about this policy: <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.</p>
  </section>
</BaseLayout>
```

- [ ] **Step 7: Build and test → PASS.** Verify Astro's redirect pages include noindex: `cat dist/about-us/index.html`. If Astro's generated redirect HTML lacks `<meta name="robots" content="noindex`, remove the `redirects` block from `astro.config.mjs` and create `src/pages/about-us.astro` and `src/pages/consultants.astro` manually:

```astro
---
const to = 'https://innexengineering.com/about/';  // consultants: /about/paul-neumann-pe/
---
<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Redirecting…</title>
<meta name="robots" content="noindex, follow"><link rel="canonical" href={to}>
<meta http-equiv="refresh" content={`0;url=${to}`}></head>
<body><a href={to}>Continue</a></body></html>
```

- [ ] **Step 8: Manual form test** — temporarily set `formspreeId` to a real test form ID, `npm run build && npm run preview`, submit with JS on (inline success) and JS disabled (redirect to `/contact/thanks/`). Revert ID if it was a throwaway.

- [ ] **Step 9: Commit** — `git add src tests astro.config.mjs && git commit -m "feat: add contact form, privacy, 404, and legacy redirects"`

```json:metadata
{"files": ["src/components/ContactForm.astro", "src/pages/contact.astro", "src/pages/contact/thanks.astro", "src/pages/privacy.astro", "src/pages/404.astro", "tests/routes.mjs", "tests/seo.test.mjs"], "verifyCommand": "npm run build && npm test", "acceptanceCriteria": ["empty formspreeId shows phone/mailto fallback, no form", "form posts to Formspree with _next, honeypot, required fields, inline status", "legacy redirects, thanks, 404 are noindex and absent from sitemap"], "requiresUserVerification": false}
```

---

### Task 9: robots, CNAME, GitHub Actions deploy, deploy docs

**Goal:** Automated build/test/deploy to GitHub Pages plus written cutover instructions.

**Files:**
- Create: `public/robots.txt`, `public/CNAME`, `.github/workflows/deploy.yml`, `docs/DEPLOY.md`
- Modify: `tests/seo.test.mjs`

**Acceptance Criteria:**
- [ ] `dist/robots.txt` references `https://innexengineering.com/sitemap-index.xml`; `dist/CNAME` is `innexengineering.com`
- [ ] Workflow builds + tests on PRs, deploys on push to `main`
- [ ] `docs/DEPLOY.md` contains exact GoDaddy DNS records and states MX/TXT/autodiscover must not change

**Verify:** `npm run build && npm test`

**Steps:**

- [ ] **Step 1: Append test**

```js
test('robots.txt and CNAME', () => {
  assert.match(readFileSync(join(DIST, 'robots.txt'), 'utf8'), /Sitemap: https:\/\/innexengineering\.com\/sitemap-index\.xml/);
  assert.equal(readFileSync(join(DIST, 'CNAME'), 'utf8').trim(), 'innexengineering.com');
});
```
Run → FAIL.

- [ ] **Step 2: Write `public/robots.txt`**

```
User-agent: *
Allow: /

Sitemap: https://innexengineering.com/sitemap-index.xml
```

- [ ] **Step 3: Write `public/CNAME`** containing exactly `innexengineering.com`

- [ ] **Step 4: Write `.github/workflows/deploy.yml`**

```yaml
name: Build and deploy

on:
  push:
    branches: [main]
  pull_request:
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages-${{ github.ref }}
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: npm
      - run: npm ci
      - run: npm run build
      - run: npm test
      - if: github.event_name != 'pull_request'
        uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    if: github.event_name != 'pull_request'
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 5: Write `docs/DEPLOY.md`**

```markdown
# Deploying innexengineering.com

## How deploys work
Every push to `main` runs `.github/workflows/deploy.yml`: install → build → SEO tests → publish to GitHub Pages. Pull requests build and test only.

## One-time GitHub setup
1. Create repo `innex-website`, push `main`.
2. Repo → Settings → Pages → Build and deployment → Source: **GitHub Actions**.
3. After the first deploy succeeds, Settings → Pages → Custom domain: `innexengineering.com` → Save.
4. Recommended: verify the domain for your account (GitHub → Settings → Pages → Add a domain) to prevent takeover.

## GoDaddy DNS cutover (do after approving the github.io preview)
In GoDaddy → My Products → innexengineering.com → DNS:

Delete the existing apex `A` record(s) pointing to GoDaddy Website Builder and any `www` record, then add:

| Type | Name | Value |
|---|---|---|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| AAAA | @ | 2606:50c0:8000::153 |
| AAAA | @ | 2606:50c0:8001::153 |
| AAAA | @ | 2606:50c0:8002::153 |
| AAAA | @ | 2606:50c0:8003::153 |
| CNAME | www | <github-username>.github.io |

**Do NOT change** `MX`, `TXT` (SPF/DMARC/Microsoft verification), `autodiscover`, `selector1/2._domainkey`, or any other Microsoft 365 record. Email will keep working.

Also unpublish/disconnect the GoDaddy Website Builder site from the domain so GoDaddy does not re-add its A record.

After DNS propagates (minutes to a few hours): Settings → Pages → check **Enforce HTTPS** once the certificate is issued.

Verify:
    nslookup innexengineering.com 8.8.8.8      # → 185.199.108-111.153
    nslookup -type=MX innexengineering.com 8.8.8.8  # → still *.mail.protection.outlook.com
    curl -sI https://innexengineering.com/ | head -1  # → HTTP/2 200

## Formspree
1. Sign up at formspree.io using Paul@INNEXengineering.com.
2. New form → copy the ID from the endpoint `https://formspree.io/f/<ID>`.
3. Set `formspreeId: '<ID>'` in `src/site.config.ts`, commit, push.
4. In Formspree form settings, restrict to domain `innexengineering.com`.

## Google Search Console
1. search.google.com/search-console → Add property → **Domain** → `innexengineering.com`.
2. Add the provided `TXT` record in GoDaddy DNS (alongside existing TXT records — do not replace them).
3. Sitemaps → submit `https://innexengineering.com/sitemap-index.xml`.
4. URL Inspection → request indexing for `/`, `/expert-witness/`, `/about/paul-neumann-pe/`.
5. Optional: Bing Webmaster Tools → import from Google Search Console.

## Client assets
- Headshot: save as `src/assets/paul-neumann.jpg` (portrait, ≥ 800px wide). Rendered automatically.
- CV: save as `public/paul-neumann-pe-cv.pdf`. "View CV" buttons appear automatically.
```

- [ ] **Step 6: Build, test → PASS. Commit**

```bash
git add public/robots.txt public/CNAME .github docs/DEPLOY.md tests
git commit -m "ci: add GitHub Pages deploy workflow, robots, CNAME, and deploy docs"
```

```json:metadata
{"files": ["public/robots.txt", "public/CNAME", ".github/workflows/deploy.yml", "docs/DEPLOY.md", "tests/seo.test.mjs"], "verifyCommand": "npm run build && npm test", "acceptanceCriteria": ["robots.txt references sitemap-index.xml; CNAME correct", "workflow tests PRs and deploys main", "DEPLOY.md has exact DNS records and preserves M365 records"], "requiresUserVerification": false}
```

---

### Task 10: Quality verification — Lighthouse and structured data

**Goal:** Measured proof the site meets spec quality targets.

**Files:**
- Create: `lighthouse/` (gitignored reports)
- Modify: any source file needed to fix findings

**Acceptance Criteria:**
- [ ] Lighthouse mobile ≥ 95 for Performance, Accessibility, Best Practices, SEO on `/`, `/case-types/industrial-accidents/`, `/about/paul-neumann-pe/`, `/contact/`
- [ ] JSON-LD on `/`, profile, and one case-type page parses with no schema.org validator errors
- [ ] No horizontal scroll at 360px on any page

**Verify:** Lighthouse score summary printed by Step 2 shows all ≥ 0.95

**Steps:**

- [ ] **Step 1: Serve production build**

```bash
npm run build && npm run preview -- --port 4321   # run in background
```

- [ ] **Step 2: Run Lighthouse**

```bash
mkdir -p lighthouse
for p in / /case-types/industrial-accidents/ /about/paul-neumann-pe/ /contact/; do
  name=$(echo "$p" | tr '/' '_')
  npx -y lighthouse "http://localhost:4321$p" --quiet --chrome-flags="--headless=new" \
    --only-categories=performance,accessibility,best-practices,seo --output=json --output-path="lighthouse/$name.json"
  node -e "const r=require('./lighthouse/$name.json');console.log('$p',Object.values(r.categories).map(c=>c.id+'='+c.score).join(' '))"
done
```
Expected: every score ≥ 0.95. Note: SEO category may flag `is-crawlable` on localhost — ignore only that audit. Fix anything else (contrast, tap targets, image sizing) and re-run.

- [ ] **Step 3: Validate JSON-LD** — extract each page's JSON-LD and paste into https://validator.schema.org/ (or use the Rich Results Test after deploy). Expected: 0 errors. Warnings about optional properties are acceptable.

```bash
node -e "const {parse}=require('node-html-parser');const fs=require('fs');for(const p of ['index.html','about/paul-neumann-pe/index.html','case-types/industrial-accidents/index.html']){console.log('== '+p);for(const s of parse(fs.readFileSync('dist/'+p,'utf8')).querySelectorAll('script[type=\"application/ld+json\"]'))console.log(JSON.stringify(JSON.parse(s.text),null,2))}"
```

- [ ] **Step 4: Commit any fixes** — `git commit -am "fix: address Lighthouse and schema findings"` (skip if no changes)

```json:metadata
{"files": [], "verifyCommand": "Lighthouse loop in Task 10 Step 2", "acceptanceCriteria": ["Lighthouse mobile >= 95 all categories on 4 key pages", "JSON-LD 0 validator errors", "no horizontal scroll at 360px"], "requiresUserVerification": false}
```

---

### Task 11: Publish to GitHub, deploy, user review before DNS cutover

**Goal:** Site live on `*.github.io`, user approves it, then DNS cutover instructions handed off.

**Files:** none (git remote + GitHub settings)

**Acceptance Criteria:**
- [ ] Repo `innex-website` exists on GitHub with `main` pushed
- [ ] Actions run green; site reachable at the Pages URL
- [ ] User approves the live preview (content, design, contact flow, "within one business day" promise)

**Verify:** `curl -sI https://<user>.github.io/innex-website/` → 200 (or custom domain URL once set)

**Steps:**

- [ ] **Step 1: Create remote.** If `gh` is installed and authenticated: `gh repo create innex-website --private --source . --push`. Otherwise ask the user to create an empty repo and provide its URL, then:
```bash
git remote add origin <url>
git push -u origin main
```
Note: GitHub Pages on a private repo requires a paid plan; if the account is free, the repo must be public.

- [ ] **Step 2: Enable Pages** — Settings → Pages → Source: GitHub Actions. Re-run the workflow if the first run failed for lack of Pages enablement (`gh workflow run "Build and deploy"` or Actions tab → Re-run).

- [ ] **Step 3: Preview caveat** — because `site` and `CNAME` target the custom domain without a `base` path, the `github.io/innex-website/` preview will have broken asset paths. Preview options: (a) set the custom domain in Pages settings *before* DNS (GitHub serves it once DNS points there — not viewable yet), or (b) review locally with `npm run preview`, or (c) temporarily build with `--base /innex-website/`. **Use (b) plus the deployed Action logs as the pre-cutover check**, and confirm the github.io deploy succeeded.

- [ ] **Step 4: User verification**

**User Verification Required:**
Before marking this task complete, you MUST call AskUserQuestion:
```yaml
AskUserQuestion:
  question: "The new site is built and deployed via GitHub Actions. Having reviewed it (npm run preview at http://localhost:4321), is it approved for DNS cutover? Please also confirm the 'response within one business day' promise on the contact form is OK."
  header: "Verification"
  options:
    - label: "Approved for cutover"
      description: "Content, design, and contact flow are correct; proceed with the DNS steps in docs/DEPLOY.md"
    - label: "Needs changes"
      description: "List the changes; they will be made and re-reviewed before cutover"
```
If "Needs changes": make the changes, push, and re-ask.

- [ ] **Step 5: Hand off `docs/DEPLOY.md`** DNS, Formspree, and Search Console steps to the user.

```json:metadata
{"files": [], "verifyCommand": "GitHub Actions run green; Pages deployment URL returns 200", "acceptanceCriteria": ["repo pushed", "Actions green and site deployed", "user approves preview before DNS cutover"], "requiresUserVerification": true, "userVerificationPrompt": "The new site is built and deployed. Is it approved for DNS cutover, and is the 'response within one business day' promise OK?"}
```
