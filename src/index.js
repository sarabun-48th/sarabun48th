// sarabun48th-demo: landing at / plus GE2026 at /ge2026/, with two
// small form APIs backed by D1 (sarabun48th-feedback).
import { TOOLS } from "../public/tools.js";
import html from "../public/index.html";
import css from "../public/style.css";
import appJs from "../public/app.js";
import configJs from "../public/config.js";
import toolsJs from "./tools.source.js";
import geHtml from "../public/ge2026/index.html";
import geMembers from "../public/ge2026/members.js";

const TOOL_IDS = new Set([...TOOLS.map((t) => t.id), "general"]);
const LIMITS = { message: 2000, idea: 2000, name: 80, contact: 120 };
const MAX_BODY = 16 * 1024;

const FILES = {
  "/": [html, "text/html; charset=utf-8"],
  "/index.html": [html, "text/html; charset=utf-8"],
  "/style.css": [css, "text/css; charset=utf-8"],
  "/app.js": [appJs, "text/javascript; charset=utf-8"],
  "/config.js": [configJs, "text/javascript; charset=utf-8"],
  "/tools.js": [toolsJs, "text/javascript; charset=utf-8"],
  "/ge2026/": [geHtml, "text/html; charset=utf-8"],
  "/ge2026/index.html": [geHtml, "text/html; charset=utf-8"],
  "/ge2026/members.js": [geMembers, "text/javascript; charset=utf-8"],
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

async function readForm(request) {
  const len = Number(request.headers.get("content-length") || 0);
  if (len > MAX_BODY) throw new Error("too_large");
  const text = await request.text();
  if (text.length > MAX_BODY) throw new Error("too_large");
  const type = request.headers.get("content-type") || "";
  if (type.includes("application/json")) return JSON.parse(text || "{}");
  return Object.fromEntries(new URLSearchParams(text));
}

const clean = (v, max) => {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length > max ? null : s; // null = too long
};

async function handle(request, env, type) {
  let body;
  try {
    body = await readForm(request);
  } catch {
    return json({ ok: false, error: "bad_request" }, 400);
  }
  // Honeypot: real users never fill the hidden "website" field. Pretend success.
  if (body.website) return json({ ok: true });
  // Very fast submits (< 2s after page load) are almost always bots.
  const t = Number(body.t || 0);
  if (t && Date.now() - t < 2000) return json({ ok: true });

  const contact = clean(body.contact, LIMITS.contact);
  if (contact === null) return json({ ok: false, error: "contact_too_long" }, 400);
  const ua = (request.headers.get("user-agent") || "").slice(0, 200);
  const country = request.cf?.country || null;

  const name = clean(body.name, LIMITS.name);
  if (name === null) return json({ ok: false, error: "name_too_long" }, 400);
  let tool = null, sKind = null, message;
  if (type === "feedback") {
    tool = clean(body.tool, 40);
    message = clean(body.message, LIMITS.message);
    if (!tool || !TOOL_IDS.has(tool)) return json({ ok: false, error: "invalid_tool" }, 400);
    if (message === null) return json({ ok: false, error: "message_too_long" }, 400);
    if (message.length < 3) return json({ ok: false, error: "message_required" }, 400);
  } else {
    message = clean(body.idea ?? body.message, LIMITS.idea);
    sKind = body.kind === "new_site" ? "new_site" : "feature";
    if (message === null) return json({ ok: false, error: "idea_too_long" }, 400);
    if (message.length < 3) return json({ ok: false, error: "idea_required" }, 400);
  }
  await env.DB.prepare(
    "INSERT INTO submissions (type, tool, kind, message, name, contact, user_agent, country) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  ).bind(type, tool, sKind, message, name || null, contact || null, ua, country).run();
  return json({ ok: true });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;
    if (pathname === "/ge2026") {
      url.pathname = "/ge2026/";
      return Response.redirect(url.toString(), 301);
    }
    if (pathname === "/api/feedback" || pathname === "/api/suggest") {
      if (request.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);
      try {
        return await handle(request, env, pathname === "/api/feedback" ? "feedback" : "suggestion");
      } catch (e) {
        console.error(e);
        return json({ ok: false, error: "server_error" }, 500);
      }
    }
    if (pathname.startsWith("/api/")) return json({ ok: false, error: "not_found" }, 404);
    const file = FILES[pathname];
    if (!file) return new Response("Not found", { status: 404 });
    return new Response(file[0], {
      headers: { "content-type": file[1], "cache-control": "public, max-age=300" },
    });
  },
};
