# Deploying innexengineering.com

## How deploys work
Every push to `main` runs `.github/workflows/deploy.yml`: install → build → SEO tests → publish to GitHub Pages. Pull requests build and test only.

## One-time GitHub setup
1. Create the **public** repo `ejheflin/innex-website` and push `main`. (GitHub Pages on a private repo requires a paid plan.)
2. Repo → Settings → Pages → Build and deployment → Source: **GitHub Actions**.
3. After the first deploy succeeds, Settings → Pages → Custom domain: `innexengineering.com` → Save.
4. Recommended: verify the domain for your account (GitHub → your profile Settings → Pages → Add a domain) to prevent takeover.

## GoDaddy DNS cutover

Approve the site first from a local preview (`npm run build && npm run preview`, then open http://localhost:4321) and a green Actions run. The `ejheflin.github.io/innex-website/` URL will NOT render correctly (the site is built for the root of innexengineering.com), and once the custom domain is set it redirects to innexengineering.com.
The current site runs on GoDaddy **Website Builder** ("Websites + Marketing Basic"). Its apex records are:

| Type | Name | Value |
|---|---|---|
| A | @ | 13.248.243.5 |
| A | @ | 76.223.105.230 |

These are the records to replace.

In GoDaddy → My Products → innexengineering.com → DNS:

Delete the two apex `A` records above and any existing `www` record, then add:

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
| CNAME | www | ejheflin.github.io |

**Do NOT change** `MX`, `TXT` (SPF/DMARC/Microsoft verification), `autodiscover`, `selector1/2._domainkey`, or any other Microsoft 365 record. Email will keep working.

Also unpublish/disconnect the GoDaddy Website Builder site from the domain so GoDaddy does not re-add its A records.

After DNS propagates (minutes to a few hours): Settings → Pages → check **Enforce HTTPS** once the certificate is issued.

Verify:

    nslookup innexengineering.com 8.8.8.8           # → 185.199.108-111.153
    nslookup -type=MX innexengineering.com 8.8.8.8  # → still *.mail.protection.outlook.com
    curl -sI https://innexengineering.com/ | head -1  # → HTTP/2 200

After cutover is verified, the Websites + Marketing subscription can be cancelled. Make sure doing so does not cancel the domain registration or Microsoft 365 email.

## Formspree
1. Sign up at formspree.io using Paul@INNEXengineering.com.
2. New form → copy the ID from the endpoint `https://formspree.io/f/<ID>`.
3. Set `formspreeId: '<ID>'` in `src/site.config.ts`, commit, push.
4. In Formspree form settings, restrict to domain `innexengineering.com`.

Note: the form sends a `_next` field pointing to `/contact/thanks/`, but custom redirects may require a paid Formspree plan. On the free plan, visitors without JavaScript see Formspree's own thank-you page instead; visitors with JavaScript (nearly everyone) get the inline confirmation message on the contact page.

## Google Search Console
1. search.google.com/search-console → Add property → **Domain** → `innexengineering.com`.
2. Add the provided `TXT` record in GoDaddy DNS (alongside existing TXT records; do not replace them).
3. Sitemaps → submit `https://innexengineering.com/sitemap-index.xml`.
4. URL Inspection → request indexing for `/`, `/expert-witness/`, `/about/paul-neumann-pe/`.
5. Optional: Bing Webmaster Tools → import from Google Search Console.

## Client assets
- Headshot: save as `src/assets/paul-neumann.jpg` (portrait, ≥ 800px wide). Rendered automatically.
- CV: save as `public/paul-neumann-pe-cv.pdf`. "View CV" buttons appear automatically.
