// Usage: node deploy-gen.js
// Writes /workspace/sarabun48th-demo-deploy.js — an async arrow fn for the
// Cloudflare MCP `execute` tool that uploads the Worker (embedded text modules)
// and enables workers.dev. Does not deploy by itself.
const fs = require("fs");
const path = require("path");
const root = __dirname;
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

const modules = [
  ["src/index.js", read("src/index.js"), "application/javascript+module"],
  ["public/tools.js", read("public/tools.js"), "application/javascript+module"],
  ["public/index.html", read("public/index.html"), "text/plain"],
  ["public/style.css", read("public/style.css"), "text/plain"],
  ["public/app.js", read("public/app.js"), "text/plain"],
  ["public/config.js", read("public/config.js"), "text/plain"],
  ["src/tools.source.js", read("src/tools.source.js"), "text/plain"],
  ["public/ge2026/index.html", read("public/ge2026/index.html"), "text/plain"],
  ["public/ge2026/members.js", read("public/ge2026/members.js"), "text/plain"],
  ["src/og-landing.js", read("src/og-landing.js"), "application/javascript+module"],
  ["src/og-ge2026.js", read("src/og-ge2026.js"), "application/javascript+module"],
  ["src/brand.js", read("src/brand.js"), "application/javascript+module"],
];

const appends = modules
  .map(
    ([name, body, type]) =>
      `form.append(${JSON.stringify(name)}, new Blob([${JSON.stringify(body)}], { type: ${JSON.stringify(type)} }), ${JSON.stringify(name)});`,
  )
  .join("\n");

const out = `async () => {
const name = "sarabun48th-demo";
const meta = {
  main_module: "src/index.js",
  compatibility_date: "2026-11-01",
  bindings: [{ type: "d1", name: "DB", database_id: "451f5cc5-762f-4e48-913c-34465eb03c04" }],
};
const form = new FormData();
form.append("metadata", new Blob([JSON.stringify(meta)], { type: "application/json" }));
${appends}
const d = await cloudflare.request({ method: "PUT", path: \`/accounts/\${accountId}/workers/scripts/\${name}\`, body: form });
const sd = await cloudflare.request({ method: "POST", path: \`/accounts/\${accountId}/workers/scripts/\${name}/subdomain\`, body: { enabled: true, previews_enabled: true } });
return { deployed: d.success, etag: d.result && d.result.etag, modified: d.result && d.result.modified_on, startup: d.result && d.result.startup_time_ms, subdomain: sd.result };
}
`;

const dest = "/workspace/sarabun48th-demo-deploy.js";
fs.writeFileSync(dest, out);
console.log("wrote", dest, out.length, "bytes");
