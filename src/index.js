// sarabun48th-demo: landing at / plus GE2026 at /ge2026/, GE6 results
// at /ge6-results/, GE6 press tour at /ge-press-tour/, 48th-songs
// at /48th-songs/, 48-events at /48-events/
// and ge-song-wish at /ge-song-wish/,
// and jod-setlist at /jod-setlist/
// (demo host only), with two small form APIs backed
// by D1 (sarabun48th-feedback).
import { TOOLS } from "../public/tools.js";
import html from "../public/index.html";
import css from "../public/style.css";
import appJs from "../public/app.js";
import configJs from "../public/config.js";
import toolsJs from "./tools.source.js";
import geHtml from "../public/ge2026/index.html";
import geMembers from "../public/ge2026/members.js";
import ge6Html from "../public/ge6-results/index.html";
import ge6Css from "../public/ge6-results/style.css";
import ge6Js from "../public/ge6-results/app.js";
import ge6Data from "../public/ge6-results/data.json";
import tourHtml from "../public/ge-press-tour/index.html";
import tourCss from "../public/ge-press-tour/style.css";
import tourJs from "../public/ge-press-tour/app.js";
import tourData from "../public/ge-press-tour/data.json";
import songsHtml from "../public/48th-songs/index.html";
import songsCss from "../public/48th-songs/style.css";
import songsJs from "../public/48th-songs/app.js";
import songsData from "../public/48th-songs/data.json";
import evHtml from "../public/48-events/index.html";
import evCss from "../public/48-events/style.css";
import evJs from "../public/48-events/app.js";
import evData from "../public/48-events/data.json";
import wishHtml from "../public/ge-song-wish/index.html";
import wishCss from "../public/ge-song-wish/style.css";
import wishJs from "../public/ge-song-wish/app.js";
import wishData from "../public/ge-song-wish/data.json";
import jodHtml from "../public/jod-setlist/index.html";
import jodCss from "../public/jod-setlist/style.css";
import jodJs from "../public/jod-setlist/app.js";
import jodData from "../public/jod-setlist/data.json";
import ogLandingB64 from "./og-landing.js";
import ogGeB64 from "./og-ge2026.js";
import ogGe6B64 from "./og-ge6-results.js";
import ogTourB64 from "./og-ge-press-tour.js";
import ogSongsB64 from "./og-48th-songs.js";
import ogEvB64 from "./og-48-events.js";
import ogWishB64 from "./og-ge-song-wish.js";
import ogJodB64 from "./og-jod-setlist.js";
import { faviconIco, favicon32, appleTouch, icon512, logoWebp } from "./brand.js";

const b64ToBytes = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const ogLanding = b64ToBytes(ogLandingB64);
const ogGe = b64ToBytes(ogGeB64);
const ogGe6 = b64ToBytes(ogGe6B64);
const ogTour = b64ToBytes(ogTourB64);
const ogSongs = b64ToBytes(ogSongsB64);
const ogEv = b64ToBytes(ogEvB64);
const ogWish = b64ToBytes(ogWishB64);
const ogJod = b64ToBytes(ogJodB64);
const ico = b64ToBytes(faviconIco);
const fav32 = b64ToBytes(favicon32);
const apple = b64ToBytes(appleTouch);
const ic512 = b64ToBytes(icon512);
const logo = b64ToBytes(logoWebp);

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
  "/ge6-results/": [ge6Html, "text/html; charset=utf-8"],
  "/ge6-results/index.html": [ge6Html, "text/html; charset=utf-8"],
  "/ge6-results/style.css": [ge6Css, "text/css; charset=utf-8"],
  "/ge6-results/app.js": [ge6Js, "text/javascript; charset=utf-8"],
  "/ge6-results/data.json": [ge6Data, "application/json; charset=utf-8"],
  "/ge6-results/og.png": [ogGe6, "image/png"],
  "/ge-press-tour/": [tourHtml, "text/html; charset=utf-8"],
  "/ge-press-tour/index.html": [tourHtml, "text/html; charset=utf-8"],
  "/ge-press-tour/style.css": [tourCss, "text/css; charset=utf-8"],
  "/ge-press-tour/app.js": [tourJs, "text/javascript; charset=utf-8"],
  "/ge-press-tour/data.json": [tourData, "application/json; charset=utf-8"],
  "/ge-press-tour/og.png": [ogTour, "image/png"],
  "/48th-songs/": [songsHtml, "text/html; charset=utf-8"],
  "/48th-songs/index.html": [songsHtml, "text/html; charset=utf-8"],
  "/48th-songs/style.css": [songsCss, "text/css; charset=utf-8"],
  "/48th-songs/app.js": [songsJs, "text/javascript; charset=utf-8"],
  "/48th-songs/data.json": [songsData, "application/json; charset=utf-8"],
  "/48th-songs/og.png": [ogSongs, "image/png"],
  "/48-events/": [evHtml, "text/html; charset=utf-8"],
  "/48-events/index.html": [evHtml, "text/html; charset=utf-8"],
  "/48-events/style.css": [evCss, "text/css; charset=utf-8"],
  "/48-events/app.js": [evJs, "text/javascript; charset=utf-8"],
  "/48-events/data.json": [evData, "application/json; charset=utf-8"],
  "/48-events/og.png": [ogEv, "image/png"],
  "/ge-song-wish/": [wishHtml, "text/html; charset=utf-8"],
  "/ge-song-wish/index.html": [wishHtml, "text/html; charset=utf-8"],
  "/ge-song-wish/style.css": [wishCss, "text/css; charset=utf-8"],
  "/ge-song-wish/app.js": [wishJs, "text/javascript; charset=utf-8"],
  "/ge-song-wish/data.json": [wishData, "application/json; charset=utf-8"],
  "/ge-song-wish/og.png": [ogWish, "image/png"],
  "/jod-setlist/": [jodHtml, "text/html; charset=utf-8"],
  "/jod-setlist/index.html": [jodHtml, "text/html; charset=utf-8"],
  "/jod-setlist/style.css": [jodCss, "text/css; charset=utf-8"],
  "/jod-setlist/app.js": [jodJs, "text/javascript; charset=utf-8"],
  "/jod-setlist/data.json": [jodData, "application/json; charset=utf-8"],
  "/jod-setlist/og.png": [ogJod, "image/png"],
  "/og.png": [ogLanding, "image/png"],
  "/ge2026/og.png": [ogGe, "image/png"],
  "/favicon.ico": [ico, "image/x-icon"],
  "/favicon-32.png": [fav32, "image/png"],
  "/apple-touch-icon.png": [apple, "image/png"],
  "/icon-512.webp": [ic512, "image/webp"],
  "/logo.webp": [logo, "image/webp"],
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
    const host = url.hostname.toLowerCase();
    const isProdHost = host === "sarabun48th.space" || host === "www.sarabun48th.space";
    if (pathname === "/ge2026") {
      url.pathname = "/ge2026/";
      return Response.redirect(url.toString(), 301);
    }
    if (pathname === "/ge6-results") {
      url.pathname = "/ge6-results/";
      return Response.redirect(url.toString(), 301);
    }
    if (pathname === "/ge-press-tour") {
      url.pathname = "/ge-press-tour/";
      return Response.redirect(url.toString(), 301);
    }
    if (pathname === "/48th-songs") {
      url.pathname = "/48th-songs/";
      return Response.redirect(url.toString(), 301);
    }
    if (pathname === "/48-events") {
      url.pathname = "/48-events/";
      return Response.redirect(url.toString(), 301);
    }
    if (pathname === "/ge-song-wish") {
      url.pathname = "/ge-song-wish/";
      return Response.redirect(url.toString(), 301);
    }
    if (pathname === "/jod-setlist") {
      url.pathname = "/jod-setlist/";
      return Response.redirect(url.toString(), 301);
    }
    // Demo-only pages: one Worker serves both hosts, so hide these paths on prod.
    const demoOnly = pathname === "/ge6-results/" || pathname.startsWith("/ge6-results/")
      || pathname === "/ge-press-tour/" || pathname.startsWith("/ge-press-tour/")
      || pathname === "/48th-songs/" || pathname.startsWith("/48th-songs/")
      || pathname === "/48-events/" || pathname.startsWith("/48-events/")
      || pathname === "/ge-song-wish/" || pathname.startsWith("/ge-song-wish/")
      || pathname === "/jod-setlist/" || pathname.startsWith("/jod-setlist/");
    if (demoOnly && isProdHost) return new Response("Not found", { status: 404 });
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
    const [body, type] = file;
    const cache = type.startsWith("image/") ? "public, max-age=86400" : "public, max-age=300";
    return new Response(body, {
      headers: { "content-type": type, "cache-control": cache },
    });
  },
};
