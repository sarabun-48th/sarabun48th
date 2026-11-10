# sarabun48th

Fan-made web tools for BNK48 / CGM48 oshi. One Cloudflare Worker (`sarabun48th-demo`) serves the landing page at `/` and the GE2026 Final Projection tool at `/ge2026/`.

Feedback and feature/new-site ideas go to a single D1 database, `sarabun48th-feedback`. Demo and production share that database.

## URLs
- Production: https://sarabun48th.space/ and https://sarabun48th.space/ge2026/
- Demo: https://demo.sarabun48th.space/ and https://demo.sarabun48th.space/ge2026/
- workers.dev: https://sarabun48th-demo.sarabun48th.workers.dev/

## Layout
- `public/index.html`, `style.css`, `app.js`, `tools.js`, `config.js` — landing
- `public/ge2026/index.html`, `public/ge2026/members.js` — GE2026 tool
- `public/og.png`, `public/ge2026/og.png` — Open Graph / X preview images (1200×630)
- `public/logo.webp`, `public/favicon.ico`, `public/favicon-32.png`, `public/apple-touch-icon.png`, `public/icon-512.webp` — brand logo and favicons
- `src/og-landing.js`, `src/og-ge2026.js` — base64 embeds of the OG images for the Worker
- `src/brand.js` — base64 embeds of the logo and favicon files for the Worker
- `src/index.js` — Worker: static files plus `POST /api/feedback` and `POST /api/suggest`
- `src/tools.source.js` — text copy of the tool list, served at `/tools.js`
- `migrations/0001_init.sql` — D1 schema (already applied on `sarabun48th-feedback`)
- `wrangler.jsonc` — Worker config and D1 binding
- `deploy-gen.js` — writes `/workspace/sarabun48th-demo-deploy.js` for the Cloudflare API upload

## Deploy
The same Worker is attached to both hosts. After changing files:

```sh
node deploy-gen.js
# then upload via Cloudflare API (embedded text modules; asset upload returns 401)
```

Routes (set in the Cloudflare dashboard / API, not in wrangler):
- `demo.sarabun48th.space/*` → `sarabun48th-demo`
- `sarabun48th.space/*` → `sarabun48th-demo`

Enable `workers.dev`. Apex and demo DNS are proxied AAAA records to `100::`.
