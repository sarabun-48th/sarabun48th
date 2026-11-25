import { SITE } from "/config.js";

const $ = (id) => document.getElementById(id);
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const PICK_MAX = 3;
const PICK_KEY = "sarabun48th:ge-song-wish:picked";
const MEMBER_PREVIEW = 8;

let DATA = null;
let SONGS = [];
let releaseById = new Map();
let releaseBySongN = new Map();
let filters = { ge: "", group: "", member: "" };
let query = "";
let pickedIds = [];
let songQuery = "";
let viewMode = "songs";
let membersExpanded = false;

function nameLine(name, nameTh) {
  if (nameTh && name) return { primary: nameTh, secondary: name };
  return { primary: nameTh || name || "", secondary: "" };
}

function songLine(rel) {
  if (!rel) return { primary: "", secondary: "" };
  const primary = rel.nameTh || rel.name || "";
  const parts = [];
  if (rel.nameTh && rel.name) parts.push(rel.name);
  if (rel.nameAlt && rel.nameAlt !== rel.name && rel.nameAlt !== rel.nameTh) parts.push(rel.nameAlt);
  return { primary, secondary: parts.join(" · ") };
}

function searchBlob(wish, rel) {
  const bits = [
    wish.ge, wish.geLabel, wish.member, wish.memberTh, wish.group,
    wish.geRank, wish.wishOrder,
    rel?.name, rel?.nameTh, rel?.nameAlt, rel?.group, rel?.releaseName,
  ];
  (rel?.centers || []).forEach((c) => bits.push(c.name, c.nameTh, c.asWritten));
  return bits.filter(Boolean).join(" ").toLowerCase();
}

function officialTypeLabel(rel) {
  if (!rel || !rel.releaseType || rel.releaseTypeLabel === "รอตรวจสอบ") return "";
  return rel.releaseTypeLabel || "";
}

function officialDateLabel(rel) {
  return rel?.releaseDateLabel || "";
}

function formatCenters(centers, { officialOnly = false } = {}) {
  const list = (centers || []).filter((c) => !officialOnly || c.status === "confirmed");
  if (!list.length) return "";
  return list
    .map((c) => {
      const label = c.nameTh ? `${c.nameTh} (${c.name})` : c.name;
      const extra = c.asWritten && c.asWritten !== c.nameTh ? ` ตามต้นทางเขียนว่า ${c.asWritten}` : "";
      return label + extra;
    })
    .join(", ");
}

function fanCenterNames(rel) {
  return formatCenters(rel?.centers || []);
}

function centerStatusOf(rel) {
  if (!rel || !rel.centers || !rel.centers.length) return "unconfirmed";
  return rel.centers.every((c) => c.status === "confirmed") ? "confirmed" : "unconfirmed";
}

function officialCenterSource(rel) {
  const c = (rel?.centers || []).find((x) => x.status === "confirmed" && x.source);
  return c || null;
}

function matchTag(wish) {
  if (wish.centerMatchStatus !== "confirmed") {
    return { cls: "warn", text: "คนขอได้ Center · รอตรวจสอบ" };
  }
  if (wish.centerMatch === "yes") return { cls: "ok", text: "คนขอได้ Center ✅" };
  return { cls: "no", text: "คนขอได้ Center ❌" };
}

function songStatusBadge(rel, wishes) {
  if (centerStatusOf(rel) !== "confirmed") {
    return { cls: "warn", text: "Center รอตรวจสอบ" };
  }
  const yes = (wishes || []).some((w) => w.centerMatchStatus === "confirmed" && w.centerMatch === "yes");
  if (yes) return { cls: "ok", text: "คนขอได้ Center ✅" };
  return { cls: "no", text: "คนขอได้ Center ❌" };
}

function dash(value) {
  return value ? value : "—";
}

function fillChrome(data) {
  $("sources").innerHTML = (data.meta.sources || [])
    .map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a></li>`)
    .join("");
  $("source-note").textContent = data.meta.sourceNote || "";
  $("footnotes").innerHTML = (data.meta.notes || []).map((n) => `<li>${esc(n)}</li>`).join("");

  const X_ICON = `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.727-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/></svg>`;
  const ICON = { x: "@sarabun48th", facebook: "Facebook", email: "อีเมล" };
  const LABEL = { x: "sarabun48th on X", facebook: "Facebook", email: "อีเมล" };
  $("social").innerHTML = Object.entries(SITE.social || {})
    .filter(([, v]) => v)
    .map(([k, v]) => {
      const href = esc(k === "email" && !v.startsWith("mailto:") ? "mailto:" + v : v);
      const icon = k === "x" ? X_ICON : "";
      return `<a href="${href}" target="_blank" rel="noopener" aria-label="${esc(LABEL[k] || k)}">${icon}<span>${esc(ICON[k] || k)}</span></a>`;
    })
    .join("");
  $("year").textContent = new Date().getFullYear();
}

function renderSummary() {
  const wishes = DATA.wishes;
  const releasedSongIds = [...new Set(wishes.map((w) => w.songId))];
  const officialSongIds = releasedSongIds.filter((id) => centerStatusOf(releaseById.get(id)) === "confirmed");
  const officialYesSongs = new Set(
    wishes.filter((w) => w.centerMatchStatus === "confirmed" && w.centerMatch === "yes").map((w) => w.songId),
  );
  const x = releasedSongIds.length;
  const confirmed = officialSongIds.length;
  const yes = officialYesSongs.size;

  let headline = `เพลงที่ขอแล้วได้ออก <span>${x}</span> เพลง · ยืนยัน Center แล้ว <span>${confirmed}/${x}</span>`;
  if (confirmed === 0) {
    headline += " → ยังสรุปไม่ได้";
  } else {
    headline += ` · คนขอได้ Center <span>${yes}</span>`;
  }
  $("summary-count").innerHTML = headline;
  $("summary-fan").textContent = `ตามชุดข้อมูลของ @ThamMiieZ: คนขอไม่ได้เป็น Center ทั้ง ${x} เพลง`;
}

function unique(arr, keyFn) {
  const seen = new Set();
  const out = [];
  for (const item of arr) {
    const k = keyFn(item);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}

function buildFilterOptions() {
  const ge = unique(DATA.wishes, (w) => w.ge).map((w) => ({ id: w.ge, label: w.geLabel || w.ge }));
  const groups = unique(DATA.wishes, (w) => w.group).map((w) => ({ id: w.group, label: w.group }));
  const members = unique(
    [...DATA.wishes].sort((a, b) => {
      const ca = DATA.wishes.filter((w) => w.member === a.member).length;
      const cb = DATA.wishes.filter((w) => w.member === b.member).length;
      if (cb !== ca) return cb - ca;
      return (a.memberTh || a.member).localeCompare(b.memberTh || b.member, "th");
    }),
    (w) => w.member,
  ).map((w) => ({
    id: w.member,
    label: w.memberTh || w.member,
  }));
  return { ge, groups, members };
}

function chipButton(id, label, count, on) {
  const countHtml = Number.isFinite(count) ? `<span class="chip-count">${count}</span>` : "";
  return `<button type="button" class="chip${on ? " is-on" : ""}" data-id="${esc(id)}" aria-pressed="${on ? "true" : "false"}">${esc(label)}${countHtml}</button>`;
}

function rowMatches(wish, rel, f, q) {
  if (f.ge && wish.ge !== f.ge) return false;
  if (f.group && wish.group !== f.group) return false;
  if (f.member && wish.member !== f.member) return false;
  if (q && !searchBlob(wish, rel).includes(q)) return false;
  return true;
}

function filteredWishes() {
  const q = query.trim().toLowerCase();
  return DATA.wishes.filter((w) => rowMatches(w, releaseById.get(w.songId), filters, q));
}

function countFor(partial) {
  const next = { ...filters, ...partial };
  const q = query.trim().toLowerCase();
  return DATA.wishes.filter((w) => rowMatches(w, releaseById.get(w.songId), next, q)).length;
}

function visibleMembers(all) {
  if (membersExpanded || all.length <= MEMBER_PREVIEW) return all;
  const preview = all.slice(0, MEMBER_PREVIEW);
  if (filters.member && !preview.some((m) => m.id === filters.member)) {
    const selected = all.find((m) => m.id === filters.member);
    if (selected) {
      preview.pop();
      preview.push(selected);
    }
  }
  return preview;
}

function renderFilters() {
  const opts = buildFilterOptions();
  const geChips = [{ id: "", label: "ทั้งหมด" }, ...opts.ge]
    .map((f) => chipButton(f.id, f.label, countFor({ ge: f.id }), filters.ge === f.id))
    .join("");
  const groupChips = [{ id: "", label: "ทั้งหมด" }, ...opts.groups]
    .map((f) => chipButton(f.id, f.label, countFor({ group: f.id }), filters.group === f.id))
    .join("");
  const shown = visibleMembers(opts.members);
  const memberChips = [
    chipButton("", "ทั้งหมด", undefined, filters.member === ""),
    ...shown.map((f) => chipButton(f.id, f.label, undefined, filters.member === f.id)),
  ].join("");
  const moreLabel = membersExpanded ? "ย่อ" : "ดูทั้งหมด";
  const more = opts.members.length > MEMBER_PREVIEW
    ? `<button type="button" class="chip chip-more" data-expand="members" aria-expanded="${membersExpanded ? "true" : "false"}">${esc(moreLabel)}</button>`
    : "";
  $("filters").innerHTML = `
    <div class="filter-row" role="group" aria-label="กรองตาม GE" data-key="ge">
      <span class="filter-label">GE</span>${geChips}
    </div>
    <div class="filter-row" role="group" aria-label="กรองตามวง" data-key="group">
      <span class="filter-label">วง</span>${groupChips}
    </div>
    <div class="filter-row" role="group" aria-label="กรองตามสมาชิก" data-key="member">
      <span class="filter-label">สมาชิก</span>${memberChips}${more}
    </div>`;
  const active = !!(filters.ge || filters.group || filters.member);
  $("filters-toggle").classList.toggle("is-active", active);
}

function wishCard(wish) {
  const rel = releaseById.get(wish.songId);
  const who = nameLine(wish.member, wish.memberTh);
  const song = songLine(rel);
  const match = matchTag(wish);
  const rankText = wish.geRank ? `อันดับ ${wish.geRank}` : "อันดับรอตรวจสอบ";
  const rankCls = wish.geRankStatus === "confirmed" ? "group" : "warn";
  const typeLabel = officialTypeLabel(rel) || "รอตรวจสอบ";
  const releaseName = rel?.releaseName || "รอตรวจสอบชื่อรีลีส";
  const dateText = officialDateLabel(rel) || "วันออก รอตรวจสอบ";
  const official = centerStatusOf(rel) === "confirmed";
  const centerText = official ? formatCenters(rel.centers, { officialOnly: true }) : "รอตรวจสอบ";
  const centerNote = official ? "จากบัญชีทางการ" : "จากโพสต์ของ @ThamMiieZ · รอตรวจสอบ";
  const fanNote = !official && fanCenterNames(rel)
    ? `<br>ในโพสต์ของ @ThamMiieZ ระบุว่า <strong>${esc(fanCenterNames(rel))}</strong>`
    : "";
  const sourceLinks = [
    wish.source ? `<a href="${esc(wish.source)}" target="_blank" rel="noopener">ที่มา</a>` : "",
    ...(rel?.sources || [])
      .filter((s) => s.url && s.url !== wish.source)
      .map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label.startsWith("บัญชีทางการ") ? "ที่มา ทางการ" : s.label)}</a>`),
  ].filter(Boolean);
  const links = [];
  const seen = new Set();
  for (const html of sourceLinks) {
    if (seen.has(html)) continue;
    seen.add(html);
    links.push(html);
    if (links.length >= 3) break;
  }
  return `<article class="wish">
    <div class="wish-top">
      <div class="who">
        <div class="primary">${esc(who.primary)}</div>
        ${who.secondary ? `<div class="secondary">${esc(who.secondary)}</div>` : ""}
      </div>
      <div class="meta">
        <span class="tag group">${esc(wish.geLabel || wish.ge)}</span>
        <span class="tag group">${esc(wish.group)}</span>
        <span class="tag ${rankCls}">${esc(rankText)}</span>
        <span class="tag">เพลงที่ขอ #${esc(wish.wishOrder)}</span>
        <span class="tag ${match.cls}">${esc(match.text)}</span>
      </div>
    </div>
    <div class="song-block">
      <div class="primary">${esc(song.primary)}</div>
      ${song.secondary ? `<div class="secondary">${esc(song.secondary)}</div>` : ""}
    </div>
    <p class="detail">สถานะ <strong>ออกแล้ว</strong> · ประเภท <strong>${esc(typeLabel)}</strong><br>รีลีส <strong>${esc(releaseName)}</strong><br>${esc(dateText)}<br>Center <strong>${esc(centerText)}</strong> <span>(${esc(centerNote)})</span>${fanNote}</p>
    <div class="row-links">${links.join("")}</div>
  </article>`;
}

function officialCenterLinks(rel) {
  const seen = new Set();
  const links = [];
  for (const c of rel?.centers || []) {
    if (c.status !== "confirmed" || !c.source || seen.has(c.source)) continue;
    seen.add(c.source);
    links.push(`<a href="${esc(c.source)}" target="_blank" rel="noopener">ที่มา</a>`);
  }
  for (const s of rel?.sources || []) {
    if (!s.url || seen.has(s.url)) continue;
    if (!s.label.includes("ทางการ")) continue;
    seen.add(s.url);
    links.push(`<a href="${esc(s.url)}" target="_blank" rel="noopener">ที่มา ทางการ</a>`);
    if (links.length >= 3) break;
  }
  return links;
}

function songCard(rel, wishes) {
  const song = songLine(rel);
  const official = centerStatusOf(rel) === "confirmed";
  const badge = songStatusBadge(rel, wishes);
  const typeLabel = officialTypeLabel(rel);
  const dateText = officialDateLabel(rel);
  const releaseName = rel.releaseName || "";
  const centerText = official ? formatCenters(rel.centers, { officialOnly: true }) : "";
  const fanLine = !official && fanCenterNames(rel)
    ? `<div>ในโพสต์ของ @ThamMiieZ ระบุว่า ${esc(fanCenterNames(rel))}</div>`
    : "";
  const wisherHtml = wishes
    .map((w) => {
      const who = nameLine(w.member, w.memberTh);
      const rank = w.geRank
        ? (w.geRankStatus === "confirmed" ? `อันดับ ${w.geRank}` : `อันดับ ${w.geRank} · รอตรวจสอบ`)
        : "อันดับรอตรวจสอบ";
      return `<span class="wisher-chip">
        <span class="name">${esc(who.primary)}${who.secondary ? ` · ${esc(who.secondary)}` : ""}</span>
        <span class="meta">${esc(w.group)} · ${esc(rank)} · เพลงที่ขอ #${esc(w.wishOrder)}</span>
      </span>`;
    })
    .join("");
  return `<article class="song-card">
    <div class="song-card-top">
      <div class="who">
        <div class="primary">${esc(song.primary)}</div>
        ${song.secondary ? `<div class="secondary">${esc(song.secondary)}</div>` : ""}
      </div>
      <div class="meta">
        <span class="tag group">${esc(rel.group)}</span>
        <span class="tag ${badge.cls}">${esc(badge.text)}</span>
      </div>
    </div>
    <p class="song-fields">
      <span><span class="field-label">รีลีส</span> <strong>${esc(dash(releaseName || typeLabel))}</strong></span>
      <span><span class="field-label">วันออก</span> <strong>${esc(dash(dateText))}</strong></span>
      <span><span class="field-label">Center</span> <strong>${esc(dash(centerText))}</strong></span>
      ${fanLine}
    </p>
    <div>
      <p class="wisher-label">คนที่ขอเพลงนี้</p>
      <div class="wisher-chips">${wisherHtml}</div>
    </div>
    <div class="row-links">${officialCenterLinks(rel).join("")}</div>
  </article>`;
}

function releaseCard(rel) {
  const song = songLine(rel);
  const typeLabel = officialTypeLabel(rel) || "รอตรวจสอบ";
  const releaseName = rel.releaseName || "รอตรวจสอบชื่อรีลีส";
  const dateText = officialDateLabel(rel) || "วันออก รอตรวจสอบ";
  const official = centerStatusOf(rel) === "confirmed";
  const centerText = official ? formatCenters(rel.centers, { officialOnly: true }) : "รอตรวจสอบ";
  const centerNote = official ? "จากบัญชีทางการ" : "จากโพสต์ของ @ThamMiieZ · รอตรวจสอบ";
  const fanNote = !official && fanCenterNames(rel)
    ? `<br>ในโพสต์ของ @ThamMiieZ ระบุว่า <strong>${esc(fanCenterNames(rel))}</strong>`
    : "";
  const links = officialCenterLinks(rel).join("");
  return `<article class="release">
    <div class="release-top">
      <div class="who">
        <div class="primary">${esc(song.primary)}</div>
        ${song.secondary ? `<div class="secondary">${esc(song.secondary)}</div>` : ""}
      </div>
      <div class="meta">
        <span class="tag group">${esc(rel.group)}</span>
        <span class="tag">${esc(typeLabel)}</span>
        ${official ? `<span class="tag ok">Center ยืนยันแล้ว</span>` : `<span class="tag warn">Center รอตรวจสอบ</span>`}
      </div>
    </div>
    <p class="detail">รีลีส <strong>${esc(releaseName)}</strong><br>${esc(dateText)}<br>Center <strong>${esc(centerText)}</strong> <span>(${esc(centerNote)})</span>${fanNote}${rel.wishedInGe5Note ? `<br>${esc(rel.wishedInGe5Note)}` : ""}</p>
    <div class="row-links">${links}</div>
  </article>`;
}

function wishedReleases() {
  return DATA.releases.filter((r) => r.wishedInGe5);
}

function renderList() {
  const rows = filteredWishes();
  const wished = wishedReleases();
  const songs = wished
    .map((rel) => ({ rel, wishes: rows.filter((w) => w.songId === rel.id) }))
    .filter((item) => item.wishes.length);
  const songView = viewMode === "songs";
  $("song-list").hidden = !songView;
  $("list").hidden = songView;
  if (songView) {
    $("count").textContent = `แสดง ${songs.length} / ${wished.length} เพลง`;
    $("song-list").innerHTML = songs.map(({ rel, wishes }) => songCard(rel, wishes)).join("");
    $("list").innerHTML = "";
  } else {
    $("count").textContent = `แสดง ${rows.length} / ${DATA.wishes.length} แถว`;
    $("list").innerHTML = rows.map(wishCard).join("");
    $("song-list").innerHTML = "";
  }
  $("empty").hidden = (songView ? songs.length : rows.length) > 0;
  $("view-songs").classList.toggle("is-on", songView);
  $("view-rows").classList.toggle("is-on", !songView);
  $("view-songs").setAttribute("aria-pressed", songView ? "true" : "false");
  $("view-rows").setAttribute("aria-pressed", !songView ? "true" : "false");
}

function renderUnwished() {
  const items = DATA.releases.filter((r) => !r.wishedInGe5);
  $("unwished-list").innerHTML = items.map(releaseCard).join("");
}

function loadPicked() {
  try {
    const raw = JSON.parse(localStorage.getItem(PICK_KEY) || "[]");
    if (!Array.isArray(raw)) return [];
    return raw.map(Number).filter((n) => n >= 1).slice(0, PICK_MAX);
  } catch {
    return [];
  }
}

function savePicked() {
  localStorage.setItem(PICK_KEY, JSON.stringify(pickedIds));
}

function findReleaseForSong(song) {
  if (!song) return null;
  if (releaseBySongN.has(song.n)) return releaseBySongN.get(song.n);
  const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9\u0e00-\u0e7f]+/g, "");
  const keys = [song.name, song.nameTh, song.nameAlt].map(norm).filter(Boolean);
  for (const rel of DATA.releases) {
    const relKeys = [rel.name, rel.nameTh, rel.nameAlt].map(norm).filter(Boolean);
    if (keys.some((k) => relKeys.includes(k))) return rel;
  }
  return null;
}

function lookupStatus(song) {
  const rel = findReleaseForSong(song);
  if (!rel) {
    return { inSet: false, rel: null, type: "", date: "", center: "", pending: true };
  }
  const official = centerStatusOf(rel) === "confirmed";
  const type = officialTypeLabel(rel);
  const date = officialDateLabel(rel);
  const center = official ? formatCenters(rel.centers, { officialOnly: true }) : "";
  const pending = !official || !type || !date;
  return { inSet: true, rel, type, date, center, pending };
}

function songPrimary(s) {
  return s.nameTh || s.name || "";
}

function songSecondary(s) {
  const parts = [];
  if (s.nameTh && s.name) parts.push(s.name);
  if (s.nameAlt) parts.push(s.nameAlt);
  if (s.version) parts.push(s.version);
  return parts.join(" · ");
}

function renderPicked() {
  const limit = $("picker-limit");
  const left = PICK_MAX - pickedIds.length;
  limit.textContent = pickedIds.length ? `เลือกแล้ว ${pickedIds.length} / ${PICK_MAX} เพลง` : `เลือกได้ ${PICK_MAX} เพลง`;
  if (!pickedIds.length) {
    $("picked").innerHTML = `<p class="picked-empty">ยังไม่ได้เลือกเพลง</p>`;
    return;
  }
  $("picked").innerHTML = pickedIds
    .map((n) => {
      const s = SONGS.find((x) => x.n === n);
      if (!s) return "";
      const info = lookupStatus(s);
      const badge = info.pending
        ? `<span class="tag warn">รอตรวจสอบ</span>`
        : `<span class="tag ok">Center ยืนยันแล้ว</span>`;
      const missing = info.inSet ? "" : `<p class="picked-missing">ยังไม่มีข้อมูลในชุดนี้</p>`;
      const source = info.rel && centerStatusOf(info.rel) === "confirmed" && officialCenterLinks(info.rel)[0]
        ? `<div class="row-links">${officialCenterLinks(info.rel)[0]}</div>`
        : "";
      return `<article class="picked-card" data-n="${n}">
        <div class="picked-head">
          <div class="who">
            <div class="primary">${esc(songPrimary(s))}</div>
            ${songSecondary(s) ? `<div class="secondary">${esc(songSecondary(s))}</div>` : ""}
          </div>
          <button type="button" class="btn ghost" data-remove="${n}">ลบ</button>
        </div>
        <div class="meta">${badge}${s.group ? `<span class="tag group">${esc(s.group)}</span>` : ""}</div>
        <p class="picked-fields">
          <span><span class="field-label">ประเภท</span> <strong>${esc(dash(info.type))}</strong></span>
          <span><span class="field-label">วันออก</span> <strong>${esc(dash(info.date))}</strong></span>
          <span><span class="field-label">Center</span> <strong>${esc(dash(info.center))}</strong></span>
        </p>
        ${missing}
        ${source}
      </article>`;
    })
    .join("");
}

function renderSuggest() {
  const box = $("song-suggest");
  const q = songQuery.trim().toLowerCase();
  if (!q) {
    box.hidden = true;
    box.innerHTML = "";
    return;
  }
  const hits = SONGS.filter((s) => {
    const blob = [s.n, s.name, s.nameTh, s.nameAlt, s.version, s.group, ...(s.tags || [])]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return blob.includes(q);
  }).slice(0, 12);
  if (!hits.length) {
    box.hidden = false;
    box.innerHTML = `<p class="picked-empty">ไม่พบเพลงที่ตรงกับคำค้น</p>`;
    return;
  }
  box.hidden = false;
  box.innerHTML = hits
    .map((s) => {
      const disabled = pickedIds.includes(s.n) || pickedIds.length >= PICK_MAX;
      return `<button type="button" class="suggest-item" data-add="${s.n}" ${disabled ? "disabled" : ""}>
        <span class="primary">${esc(songPrimary(s))}</span>
        <span class="secondary">${esc([songSecondary(s), s.group].filter(Boolean).join(" · "))}</span>
      </button>`;
    })
    .join("");
}

function addSong(n) {
  if (pickedIds.includes(n) || pickedIds.length >= PICK_MAX) return;
  pickedIds = [...pickedIds, n];
  savePicked();
  songQuery = "";
  $("song-q").value = "";
  renderSuggest();
  renderPicked();
}

function removeSong(n) {
  pickedIds = pickedIds.filter((x) => x !== n);
  savePicked();
  renderSuggest();
  renderPicked();
}

function setView(mode) {
  viewMode = mode;
  renderList();
}

function bind() {
  $("q").addEventListener("input", (e) => {
    query = e.target.value;
    renderFilters();
    renderList();
  });
  $("filters-toggle").addEventListener("click", () => {
    const open = $("filters").classList.toggle("is-open");
    $("filters-toggle").setAttribute("aria-expanded", open ? "true" : "false");
  });
  $("filters").addEventListener("click", (e) => {
    const more = e.target.closest("[data-expand]");
    if (more) {
      membersExpanded = !membersExpanded;
      renderFilters();
      return;
    }
    const btn = e.target.closest(".chip");
    if (!btn) return;
    const row = btn.closest("[data-key]");
    if (!row) return;
    filters[row.dataset.key] = btn.dataset.id;
    renderFilters();
    renderList();
  });
  $("view-songs").addEventListener("click", () => setView("songs"));
  $("view-rows").addEventListener("click", () => setView("rows"));
  $("song-q").addEventListener("input", (e) => {
    songQuery = e.target.value;
    renderSuggest();
  });
  $("song-q").addEventListener("focus", () => {
    if (songQuery.trim()) renderSuggest();
  });
  $("song-suggest").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-add]");
    if (!btn || btn.disabled) return;
    addSong(Number(btn.dataset.add));
  });
  $("picked").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-remove]");
    if (!btn) return;
    removeSong(Number(btn.dataset.remove));
  });
}

async function main() {
  const [wishRes, songRes] = await Promise.all([
    fetch("/ge-song-wish/data.json"),
    fetch("/48th-songs/data.json"),
  ]);
  DATA = await wishRes.json();
  const songData = await songRes.json();
  SONGS = songData.songs || [];
  releaseById = new Map(DATA.releases.map((r) => [r.id, r]));
  releaseBySongN = new Map(DATA.releases.filter((r) => r.songsN).map((r) => [r.songsN, r]));
  pickedIds = loadPicked().filter((n) => SONGS.some((s) => s.n === n));
  fillChrome(DATA);
  renderSummary();
  renderFilters();
  renderList();
  renderUnwished();
  renderPicked();
  bind();
}

main().catch((err) => {
  console.error(err);
  const count = $("count");
  if (count) count.textContent = "โหลดข้อมูลไม่สำเร็จ";
});
