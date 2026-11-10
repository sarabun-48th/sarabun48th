# sarabun48th-demo

Combined demo site: the landing page at `/` and the GE2026 Final Projection tool at `/ge2026/`, served by one Cloudflare Worker (`sarabun48th-demo`).

Feedback and ideas go to the existing D1 database `sarabun48th-feedback`.

## URLs
- Demo: https://demo.sarabun48th.space/
- Tool: https://demo.sarabun48th.space/ge2026/
- workers.dev: https://sarabun48th-demo.sarabun48th.workers.dev/

Do not attach this Worker to the production apex (`sarabun48th.space`).

## Layout
- `public/index.html`, `style.css`, `app.js`, `tools.js`, `config.js` — landing
- `public/ge2026/index.html`, `public/ge2026/members.js` — GE2026 tool
- `src/index.js` — Worker: static files plus `POST /api/feedback` and `POST /api/suggest`
- `src/tools.source.js` — text copy of the tool list, served at `/tools.js`
- `migrations/0001_init.sql` — D1 schema (already applied on `sarabun48th-feedback`)
- `wrangler.jsonc` — Worker config and D1 binding
- `deploy-gen.js` — writes `/workspace/sarabun48th-demo-deploy.js` for the Cloudflare API upload

## Deploy
```sh
node deploy-gen.js
# then upload via Cloudflare API (embedded text modules; asset upload returns 401)
```

Route `demo.sarabun48th.space/*` should point at `sarabun48th-demo`. Enable `workers.dev`.
