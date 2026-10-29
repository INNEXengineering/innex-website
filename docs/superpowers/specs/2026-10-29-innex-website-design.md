# INNEX Engineering Website Replacement — Design Spec

Date: 2026-10-29
Status: Approved (design), pending spec review

## Goal

Replace the GoDaddy Website Builder site at innexengineering.com with a fast, static, SEO-optimized site that ranks nationally for forensic mechanical engineering and safety expert witness searches and converts attorney visitors into case inquiries.

## Decisions

| Topic | Decision |
|---|---|
| Hosting | GitHub Pages, deployed by GitHub Actions on push to `main` |
| Generator | Astro (static output, zero client JS by default) |
| Contact form | Formspree (posts to Paul@INNEXengineering.com); mailto fallback until form ID exists |
| Geographic target | National only (no local/city pages); `areaServed: US` |
| Primary audience | Attorneys (plaintiff & defense) and insurers; industrial consulting is a secondary track |
| Brand | Keep existing INNEX logo; refreshed palette (navy/ink + paper + INNEX green accent) |
| Assets from client | Headshot of Paul, CV PDF (placeholders until supplied) |
| Blog | Out of scope for launch |

## Source facts (from current site — the only facts copy may assert)

- Firm: INNEX Engineering. Texas Registered Engineering Firm F-29716.
- Principal: Paul Neumann, P.E., CMRP, CSP. B.S. Mechanical Engineering, University of Illinois. P.E. in Texas and Illinois. Texas apprentice electrician license. ASE certified (passenger car, light truck, heavy-duty truck).
- 20+ years practical, technical, academic, and operational experience.
- OSHA training: general industry, construction, oil & gas; trainer for powered industrial trucks and aerial lifts; competent person for scaffolding, fall protection, excavation.
- Specialized training: NFPA 70E, vibration analysis (ISO 18436-2 Cat II), root cause analysis, ASME Section VIII Div. 1 & 2, bolted joint design, pumps & mechanical seals, lubrication, welding technology, HAZMAT, confined space, arc flash, asbestos.
- Expertise: process safety management, fixed and rotating machinery, glass-lined equipment, electrical systems, instrumentation, pressure-relief systems, materials handling equipment, maintenance & reliability, warehouse operations, semi-trailers, tank trailers, yard mules, heavy construction equipment, off-highway & recreational vehicles, agricultural equipment.
- Services: PHA, Mechanical Integrity / PSM compliance audits, FMEA/DFMEA, mechanical design analysis, ANSI/OSHA/ASTM/ASME compliance; expert witness for plaintiff and defense in equipment failure, product liability, premises liability, workplace injury.
- Contact: 281-755-9177, Paul@INNEXengineering.com.

No invented cases, testimonials, client names, statistics, or credentials.

## Information architecture

```
/                                              Home
/expert-witness/                               Expert Witness & Litigation Support hub
/case-types/                                   Case Types hub
  /case-types/industrial-accidents/
  /case-types/workplace-injury/
  /case-types/construction-accidents/
  /case-types/forklift-material-handling/
  /case-types/equipment-machinery-failure/
  /case-types/product-liability/
  /case-types/premises-liability/
  /case-types/trucking-trailer-heavy-equipment/
  /case-types/vehicle-off-road-recreational/
/services/                                     Engineering & Safety Consulting hub
  /services/process-safety-pha/
  /services/failure-analysis-fmea/
/about/                                        Firm overview
/about/paul-neumann-pe/                        Expert profile + CV download
/contact/                                      Formspree form + phone/email
/privacy/                                      Privacy policy
/404                                           Custom 404
/about-us/   -> meta-refresh + canonical to /about/
/consultants/ -> meta-refresh + canonical to /about/paul-neumann-pe/
```

Case-type and service pages are Markdown content-collection entries sharing one layout. Each contains: intro, what is investigated, applicable standards, questions the expert answers, FAQ (3–5 Q&A), related case types, CTA.

## Technical SEO

- `SEO` component: `<title>` (`{Page} | INNEX Engineering`, ≤60 chars), meta description (≤155 chars), canonical, Open Graph, Twitter card, `html lang="en"`.
- JSON-LD:
  - Site-wide: `Organization` + `ProfessionalService` (name, url, logo, telephone, email, `areaServed: US`, `founder`/`employee` → Paul).
  - Profile: `Person` (jobTitle, `hasCredential` for P.E./CSP/CMRP, `alumniOf` University of Illinois, `knowsAbout`).
  - Case-type/service pages: `Service` + `FAQPage`.
  - All non-home pages: `BreadcrumbList`.
- `@astrojs/sitemap` → `sitemap-index.xml`; `public/robots.txt` references it. Redirect stubs excluded from sitemap and marked `noindex`.
- One H1 per page, ordered headings, descriptive alt text, internal links from every leaf page to related leaves, profile, and contact.
- Performance: no runtime framework; only inline JS for mobile nav and form submit. Self-hosted fonts (subset weights). Images via `astro:assets` (AVIF/WebP, width/height, lazy below fold). Target Lighthouse ≥95 on all four categories.
- `public/CNAME` = `innexengineering.com`; `site` in Astro config = `https://innexengineering.com`.

## Visual design

- Tokens: ink `#0F1B2D` (header/footer/headings), paper `#F7F7F4` (background), green `#009A30` accent; darker green (≥4.5:1 on paper) for text links; neutral grays for rules.
- Type: Archivo (headings), Source Sans 3 (body), self-hosted via Fontsource.
- Style: engineering-report sobriety — hairline rules, numbered sections, standards citations as texture. No stock gavel imagery.
- Home sections: hero (H1, headshot, "P.E. · CSP · CMRP", CTAs "Discuss a Case" / "View CV") → credential strip → case-type grid → 3-step engagement process → "Plaintiff & Defense — independent opinions" → contact band.
- Sticky header with click-to-call. Mobile-first, works at 360px width.

## Contact form

- Fields: name, firm, email, phone, party represented (plaintiff / defense / insurer / other), case type, deadline (optional), brief description. Honeypot field `_gotcha`.
- `action` = `https://formspree.io/f/{FORMSPREE_ID}` from a single config constant. If unset, form is replaced with mailto/tel CTAs.
- Plain HTML POST works without JS; small enhancement script submits via fetch and shows inline success/error.

## Repo & deployment

- Git repo at `C:\dev\innex`, pushed to GitHub as `innex-website`. (`gh` CLI is not installed; repo created via web UI or after installing `gh`.)
- `.github/workflows/deploy.yml`: on push to `main` → `npm ci` → `astro build` → `actions/upload-pages-artifact` → `actions/deploy-pages`. On pull_request → build only.
- Logo pulled from current site, re-exported as SVG/PNG with corrected filename. Headshot at `src/assets/paul-neumann.jpg`, CV at `public/paul-neumann-pe-cv.pdf` (placeholders until supplied; build must not fail if absent — CV link hidden when file missing).

## DNS cutover (GoDaddy, manual)

- Apex A: 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153
- Apex AAAA: 2606:50c0:8000::153, 2606:50c0:8001::153, 2606:50c0:8002::153, 2606:50c0:8003::153
- `www` CNAME → `<github-user>.github.io`
- Do NOT modify MX/TXT/autodiscover records (Microsoft 365 email).
- Enable "Enforce HTTPS" in Pages settings after certificate issues.

## Verification

- `astro build` passes with zero warnings about missing pages/links.
- Link check across built `dist/` (no broken internal links).
- Lighthouse (mobile) ≥95 Performance/SEO/Accessibility/Best Practices on home, one case-type page, profile, contact.
- JSON-LD validates (schema.org validator / Rich Results test) for home, profile, one case-type page.
- Site live and correct on `*.github.io` before DNS change.

## Post-launch (client)

- Create Formspree account, set form ID.
- Google Search Console: verify domain (DNS TXT at GoDaddy), submit sitemap.
- Optional: Bing Webmaster Tools import from GSC.

## Out of scope

Blog/articles, local city pages, analytics/cookie banner (can add privacy-friendly analytics later), fee schedule publication.
