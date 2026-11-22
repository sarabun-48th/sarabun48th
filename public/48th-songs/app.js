import { SITE } from "/config.js";

const $ = (id) => document.getElementById(id);
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const KEY_HEARD = "sarabun48th:48th-songs:heard";
const KEY_LIVE = "sarabun48th:48th-songs:live";
const TOTAL = 242;

// วง chips use inclusive counts: a song counts as BNK48 if the source
// text names BNK48 (teams, Mimigumo, OST, Original Stage, member
// attributions, “BNK48 ver.”, and joint/collab songs included).
// CGM48 is the same rule, so 81 matches the source list. Joint songs
// (15) appear in both, and also under the dedicated joint chip.
const BAND_FILTERS = [
  { id: "", label: "ทั้งหมด" },
  { id: "BNK48", label: "BNK48" },
  { id: "CGM48", label: "CGM48" },
  { id: "BNK48 & CGM48", label: "BNK48 & CGM48" },
];
const UNIT_FILTERS = [
  { id: "Team BIII", label: "BIII" },
  { id: "Team NV", label: "NV" },
  { id: "Team C", label: "C" },
  { id: "Mimigumo", label: "Mimigumo" },
  { id: "eRAA", label: "eRAA" },
  { id: "Original Stage", label: "Original Stage" },
  { id: "OST", label: "OST" },
  { id: "คอลแลบ", label: "คอลแลบ" },
];

function loadSet(key) {
  try {
    const raw = JSON.parse(localStorage.getItem(key) || "[]");
    if (!Array.isArray(raw)) return new Set();
    return new Set(raw.map(Number).filter((n) => n >= 1 && n <= TOTAL));
  } catch {
    return new Set();
  }
}

function saveSet(key, set) {
  localStorage.setItem(key, JSON.stringify([...set].sort((a, b) => a - b)));
}

function migrateHeard() {
  // The previous single checklist lived in KEY_HEARD. Keep those ids as ฟังแล้ว.
  return loadSet(KEY_HEARD);
}

function primaryName(s) {
  return s.nameTh || s.name || "";
}

function secondaryName(s) {
  const parts = [];
  if (s.nameTh && s.name) parts.push(s.name);
  if (s.nameAlt) parts.push(s.nameAlt);
  return parts.join(" · ");
}

function searchBlob(s) {
  return [s.n, s.name, s.nameTh, s.nameAlt, s.version, s.qualifier, s.group, ...(s.tags || [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function matchesQuery(s, q) {
  if (!q) return true;
  return searchBlob(s).includes(q);
}

function hasTag(s, id) {
  return (s.tags || []).includes(id);
}

function matchesFilter(s, filter) {
  if (!filter) return true;
  return hasTag(s, filter);
}

function filterCount(songs, filter) {
  return songs.filter((s) => matchesFilter(s, filter)).length;
}

function youtubeHref(s) {
  const parts = [primaryName(s), s.name && s.name !== primaryName(s) ? s.name : "", s.version, s.group]
    .map((p) => String(p || "").trim())
    .filter(Boolean);
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(parts.join(" "))}`;
}

function fillChrome(data) {
  $("sources").innerHTML = (data.meta.sources || [])
    .map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a></li>`)
    .join("");
  $("source-note").textContent = data.meta.sourceNote || "";
  $("footnotes").innerHTML = (data.meta.notes || [])
    .map((n) => `<li>${esc(n)}</li>`)
    .join("");

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

function chipButton(f, count, on) {
  const countHtml = Number.isFinite(count) ? `<span class="chip-count">${count}</span>` : "";
  return `<button type="button" class="chip${on ? " is-on" : ""}" data-filter="${esc(f.id)}" aria-pressed="${on ? "true" : "false"}">${esc(f.label)}${countHtml}</button>`;
}

function renderFilters(songs, total, active) {
  const units = UNIT_FILTERS.filter((f) => filterCount(songs, f.id) > 0);
  const band = BAND_FILTERS.map((f) => chipButton(f, f.id ? filterCount(songs, f.id) : total, active === f.id)).join("");
  const unit = units.map((f) => chipButton(f, filterCount(songs, f.id), active === f.id)).join("");
  $("filters").innerHTML = `
    <div class="filter-row" role="group" aria-label="กรองตามวง">
      <span class="filter-label">วง</span>${band}
    </div>
    <div class="filter-row" role="group" aria-label="กรองตามยูนิตหรือทีม">
      <span class="filter-label">ยูนิต / ทีม</span>${unit}
    </div>`;
}

function songRow(s, heard, live) {
  const primary = primaryName(s);
  const secondary = secondaryName(s);
  const extras = [s.version, s.qualifier].filter(Boolean);
  const group = s.group
    ? `<span class="tag group">${esc(s.group)}</span>`
    : `<span class="tag warn">รอตรวจสอบ</span>`;
  const extraTags = extras.map((x) => `<span class="tag">${esc(x)}</span>`).join("");
  const isHeard = heard.has(s.n);
  const isLive = live.has(s.n);
  return `<article class="song${isHeard ? " is-heard" : ""}" id="song-${s.n}" data-n="${s.n}">
    <div class="song-main">
      <button type="button" class="song-heard" data-heard="${s.n}" aria-pressed="${isHeard ? "true" : "false"}" aria-label="ฟังแล้ว: ${esc(primary)}">
        <span class="num">${s.n}</span>
        <div class="names">
          <div class="primary">${esc(primary)}</div>
          ${secondary ? `<div class="secondary">${esc(secondary)}</div>` : ""}
        </div>
        <div class="meta">${group}${extraTags}</div>
        <span class="mark mark-heard" aria-hidden="true">🎧</span>
      </button>
      <button type="button" class="song-live${isLive ? " is-on" : ""}" data-live="${s.n}" aria-pressed="${isLive ? "true" : "false"}" aria-label="เคยดูสด: ${esc(primary)}">🎤</button>
    </div>
  </article>`;
}

function updateProgress(heard, live, total) {
  const n = heard.size;
  const y = live.size;
  $("hook-count").innerHTML = `ฟังมาแล้ว <span>${n}</span> / ${total} เพลง`;
  const bar = $("progress-bar");
  bar.style.width = total ? `${(n / total) * 100}%` : "0";
  const progress = $("progress");
  progress.setAttribute("aria-valuenow", String(n));
  progress.setAttribute("aria-valuemax", String(total));
  progress.classList.toggle("is-empty", n === 0);
  const hint = $("progress-hint");
  hint.hidden = n !== 0;
  $("live-count").innerHTML = `เคยดูสด <span>${y}</span> เพลง`;
}

function updateCount(shown, total) {
  $("count").textContent = `แสดง ${shown} / ${total} เพลง`;
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function groupHeardCount(songs, heard, tag) {
  return songs.filter((s) => heard.has(s.n) && hasTag(s, tag)).length;
}

function drawShareCard(songs, heard, live, total) {
  const canvas = $("share-canvas");
  const ctx = canvas.getContext("2d");
  const W = 1200, H = 675;
  canvas.width = W;
  canvas.height = H;

  const accent = "#c391c1";
  const ink = "#f5f3f4";
  const muted = "#a8a2a6";
  const font = "Sarabun, 'Noto Sans Thai', system-ui, sans-serif";
  const n = heard.size;
  const y = live.size;
  const bnkTotal = filterCount(songs, "BNK48");
  const cgmTotal = filterCount(songs, "CGM48");
  const bnkHeard = groupHeardCount(songs, heard, "BNK48");
  const cgmHeard = groupHeardCount(songs, heard, "CGM48");

  ctx.fillStyle = "#0c0a0b";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, 18, H);

  const glow = ctx.createRadialGradient(200, 100, 20, 240, 160, 480);
  glow.addColorStop(0, "rgba(195,145,193,.18)");
  glow.addColorStop(1, "rgba(12,10,11,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(18, 0, W - 18, H);

  ctx.fillStyle = muted;
  ctx.font = `600 22px ${font}`;
  ctx.fillText("สารบัญ48th  ·  242 เพลง", 72, 54);

  ctx.fillStyle = muted;
  ctx.font = `700 24px ${font}`;
  ctx.fillText("ฟังมาแล้ว", 72, 130);

  ctx.fillStyle = ink;
  ctx.font = `800 84px ${font}`;
  ctx.fillText(`${n}/${total} เพลง`, 72, 222);

  ctx.fillStyle = muted;
  ctx.font = `700 28px ${font}`;
  ctx.fillText(`เคยดูสด  ${y} เพลง`, 72, 268);

  const barX = 72, barY = 300, barW = W - 72 - 72, barH = 18;
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  roundRect(ctx, barX, barY, barW, barH, 10);
  ctx.fill();
  const fillW = total ? Math.max(n ? 10 : 0, Math.round((n / total) * barW)) : 0;
  if (fillW) {
    ctx.fillStyle = accent;
    roundRect(ctx, barX, barY, fillW, barH, 10);
    ctx.fill();
  }

  // Bottom third: per-group breakdown + CTA
  const bottomTop = 360;
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  roundRect(ctx, 56, bottomTop, W - 56 - 48, 232, 20);
  ctx.fill();
  ctx.fillStyle = accent;
  ctx.fillRect(56, bottomTop + 16, 8, 200);

  function miniBar(label, have, denom, x, y0) {
    ctx.fillStyle = ink;
    ctx.font = `700 28px ${font}`;
    ctx.fillText(`${label}   ${have}/${denom}`, x, y0);
    const bw = 420, bh = 12;
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    roundRect(ctx, x, y0 + 16, bw, bh, 7);
    ctx.fill();
    const fw = denom ? Math.max(have ? 8 : 0, Math.round((have / denom) * bw)) : 0;
    if (fw) {
      ctx.fillStyle = accent;
      roundRect(ctx, x, y0 + 16, fw, bh, 7);
      ctx.fill();
    }
  }
  miniBar("BNK48", bnkHeard, bnkTotal, 88, bottomTop + 58);
  miniBar("CGM48", cgmHeard, cgmTotal, 88, bottomTop + 122);

  ctx.fillStyle = ink;
  ctx.font = `700 24px ${font}`;
  ctx.fillText("เช็กของคุณได้ที่ sarabun48th.space", 88, bottomTop + 198);

  ctx.fillStyle = muted;
  ctx.font = `500 20px ${font}`;
  ctx.fillText("ทำโดยแฟนคลับ เพื่อแฟนคลับ", 72, 636);

  const url = canvas.toDataURL("image/png");
  $("share-preview").src = url;
  const a = $("share-download");
  a.href = url;
  a.download = "48th-songs-card.png";
  return url;
}

async function shareImage(dataUrl, heard, live, total) {
  const blob = await (await fetch(dataUrl)).blob();
  const file = new File([blob], "48th-songs-card.png", { type: "image/png" });
  const text = `ฟังมาแล้ว ${heard.size}/${total} เพลง · เคยดูสด ${live.size}`;
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({ files: [file], title: "สารบัญ48th · 242 เพลง", text });
    return;
  }
  if (navigator.share) {
    await navigator.share({ title: "สารบัญ48th · 242 เพลง", text, url: location.href });
    return;
  }
  $("share-download").click();
}

async function main() {
  const res = await fetch("/48th-songs/data.json", { cache: "no-store" });
  if (!res.ok) throw new Error("data");
  const data = await res.json();
  const total = data.meta.total || data.songs.length;
  const heard = migrateHeard();
  const live = loadSet(KEY_LIVE);
  let activeFilter = "";
  let currentUrl = "";
  let pickedN = null;
  const byN = new Map(data.songs.map((s) => [s.n, s]));

  fillChrome(data);
  updateProgress(heard, live, total);

  const filtersEl = $("filters");
  const toggle = $("filters-toggle");
  const updateToggle = () => {
    toggle.classList.toggle("is-active", !!activeFilter);
    toggle.setAttribute("aria-expanded", filtersEl.classList.contains("is-open") ? "true" : "false");
  };
  toggle.addEventListener("click", () => {
    filtersEl.classList.toggle("is-open");
    updateToggle();
  });

  const attachRandomActions = (article, song) => {
    document.querySelectorAll(".random-actions").forEach((el) => el.remove());
    const row = document.createElement("div");
    row.className = "random-actions";
    const yt = document.createElement("a");
    yt.className = "yt";
    yt.href = youtubeHref(song);
    yt.target = "_blank";
    yt.rel = "noopener noreferrer";
    yt.textContent = "ฟังบน YouTube";
    const again = document.createElement("button");
    again.type = "button";
    again.className = "btn";
    again.dataset.randomAgain = "1";
    again.textContent = "สุ่มใหม่";
    row.append(yt, again);
    article.append(row);
  };

  const jumpTo = (pick) => {
    for (const el of document.querySelectorAll(".song.is-flash")) el.classList.remove("is-flash");
    document.querySelectorAll(".random-actions").forEach((el) => el.remove());
    if (!pick) return;
    const root = document.documentElement;
    const prev = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    pick.classList.add("is-flash");
    pick.scrollIntoView({ block: "center" });
    root.style.scrollBehavior = prev;
    pickedN = Number(pick.dataset.n);
    const song = byN.get(pickedN);
    if (song) attachRandomActions(pick, song);
    const heardBtn = pick.querySelector(".song-heard");
    if (heardBtn) heardBtn.focus({ preventScroll: true });
  };

  const pickRandom = () => {
    const visible = [...document.querySelectorAll("#list .song")];
    if (!visible.length) return;
    let pool = visible;
    if (visible.length > 1 && pickedN != null) {
      const rest = visible.filter((el) => Number(el.dataset.n) !== pickedN);
      if (rest.length) pool = rest;
    }
    jumpTo(pool[Math.floor(Math.random() * pool.length)]);
  };

  const apply = () => {
    const q = $("q").value.trim().toLowerCase();
    const filtered = data.songs.filter((s) => matchesFilter(s, activeFilter) && matchesQuery(s, q));
    renderFilters(data.songs, total, activeFilter);
    $("list").innerHTML = filtered.map((s) => songRow(s, heard, live)).join("");
    $("empty").hidden = filtered.length > 0;
    updateCount(filtered.length, total);
    updateToggle();
    if (pickedN != null) {
      const el = document.getElementById(`song-${pickedN}`);
      if (el) {
        const song = byN.get(pickedN);
        el.classList.add("is-flash");
        if (song) attachRandomActions(el, song);
      } else {
        pickedN = null;
      }
    }
    return filtered;
  };

  filtersEl.addEventListener("click", (e) => {
    const chip = e.target.closest("[data-filter]");
    if (!chip) return;
    activeFilter = chip.dataset.filter || "";
    apply();
  });

  $("q").addEventListener("input", apply);
  apply();

  $("list").addEventListener("click", (e) => {
    if (e.target.closest("[data-random-again]")) {
      e.preventDefault();
      pickRandom();
      return;
    }
    if (e.target.closest("a.yt")) return;
    const liveBtn = e.target.closest("[data-live]");
    if (liveBtn) {
      e.preventDefault();
      e.stopPropagation();
      const n = Number(liveBtn.dataset.live);
      if (live.has(n)) live.delete(n);
      else live.add(n);
      saveSet(KEY_LIVE, live);
      liveBtn.classList.toggle("is-on", live.has(n));
      liveBtn.setAttribute("aria-pressed", live.has(n) ? "true" : "false");
      updateProgress(heard, live, total);
      return;
    }
    const heardBtn = e.target.closest("[data-heard]");
    if (!heardBtn) return;
    const n = Number(heardBtn.dataset.heard);
    if (heard.has(n)) heard.delete(n);
    else heard.add(n);
    saveSet(KEY_HEARD, heard);
    heardBtn.setAttribute("aria-pressed", heard.has(n) ? "true" : "false");
    const article = heardBtn.closest(".song");
    if (article) article.classList.toggle("is-heard", heard.has(n));
    updateProgress(heard, live, total);
  });

  $("random").addEventListener("click", pickRandom);

  const openShare = () => {
    currentUrl = drawShareCard(data.songs, heard, live, total);
    $("share-dialog").showModal();
  };
  $("share").addEventListener("click", openShare);
  $("share-share").addEventListener("click", async () => {
    try {
      await shareImage(currentUrl || drawShareCard(data.songs, heard, live, total), heard, live, total);
    } catch (err) {
      if (err && err.name === "AbortError") return;
      $("share-download").click();
    }
  });
}

main().catch(() => {
  $("hook-count").textContent = "โหลดข้อมูลไม่สำเร็จ ลองรีเฟรชหน้านี้อีกครั้ง";
  $("count").textContent = "โหลดข้อมูลไม่สำเร็จ ลองรีเฟรชหน้านี้อีกครั้ง";
});
