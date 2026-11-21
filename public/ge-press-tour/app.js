import { SITE } from "/config.js";

const $ = (id) => document.getElementById(id);
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const MONTH_TH = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

function fmtDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTH_TH[m - 1]} ${y}`;
}

function stopTitle(s) {
  if (!s.channel || s.program === s.channel) return s.program;
  if (String(s.program).toLowerCase().includes(String(s.channel).toLowerCase())) return s.program;
  return `${s.program} · ${s.channel}`;
}

function watchButtonLabel(s) {
  const label = s.watch?.labelTh || "";
  if (s.formatTh === "ไลฟ์" || label.includes("ไลฟ์")) return "ดูไลฟ์ย้อนหลัง";
  return "ดูย้อนหลัง";
}

function bandClass(band) {
  return band === "CGM48" ? "cgm" : "bnk";
}

function memberMap(data) {
  const map = new Map();
  for (const m of data.members) map.set(m.name, m);
  return map;
}

function matchesQuery(m, q) {
  if (!q) return true;
  const parts = [m.name, ...(m.nicknamesTh || [])];
  return parts.some((p) => String(p).toLowerCase().includes(q));
}

function stopHasBand(stop, byName, band) {
  if (!band) return true;
  return stop.members.some((sm) => byName.get(sm.name)?.band === band);
}

function stopMatchesQuery(stop, byName, q) {
  if (!q) return true;
  if (String(stop.channel).toLowerCase().includes(q) || String(stop.program).toLowerCase().includes(q)) return true;
  return stop.members.some((sm) => {
    const m = byName.get(sm.name);
    return m ? matchesQuery(m, q) : String(sm.name).toLowerCase().includes(q);
  });
}

function stopHasMember(stop, name) {
  if (!name) return true;
  return stop.members.some((sm) => sm.name === name);
}

function stopStamp(stop) {
  return `${stop.date}T${stop.time || "00:00"}:00+07:00`;
}

function sortStops(list, key) {
  const copy = list.slice();
  copy.sort((a, b) => {
    const d = Date.parse(stopStamp(a)) - Date.parse(stopStamp(b));
    return key === "oldest" ? d : -d;
  });
  return copy;
}

function memberChip(m, opts = {}) {
  const cls = bandClass(m.band);
  const rank = m.rank != null ? `<span class="rank">#${m.rank}</span>` : "";
  const on = opts.selected && opts.selected === m.name ? " is-on" : "";
  const pressed = opts.selected === m.name ? "true" : "false";
  const jump = opts.jump ? ` data-jump="${esc(m.name)}"` : "";
  const label = m.rank != null ? `กรองสต็อปของ ${m.name} อันดับ ${m.rank}` : `กรองสต็อปของ ${m.name}`;
  return `<button type="button" class="chip ${cls}${on}" aria-pressed="${pressed}" aria-label="${esc(label)}"${jump}><i></i>${esc(m.name)} ${rank}</button>`;
}

function fillChrome(data) {
  $("sources").innerHTML = (data.meta.sources || [])
    .map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a></li>`)
    .join("");
  $("footnotes").innerHTML = (data.meta.notes || [])
    .map((n, i) => {
      const id = typeof n === "object" && n.id ? n.id : `fn-${i + 1}`;
      const text = typeof n === "object" ? n.text : n;
      return `<li id="${esc(id)}">${esc(text)}</li>`;
    })
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

function uniqueChannels(stops) {
  const seen = new Set();
  const out = [];
  for (const s of stops) {
    const key = s.channel;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

function appearingMembers(data) {
  const byName = memberMap(data);
  const names = [];
  const seen = new Set();
  for (const stop of data.stops) {
    for (const sm of stop.members) {
      if (seen.has(sm.name)) continue;
      seen.add(sm.name);
      names.push(byName.get(sm.name) || { name: sm.name, band: "BNK48", nicknamesTh: [] });
    }
  }
  names.sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999) || a.name.localeCompare(b.name, "en"));
  return names;
}

function fillHook(data, selected) {
  const hook = $("hook");
  const latest = sortStops(data.stops, "newest")[0];
  const people = appearingMembers(data);
  const chips = people.map((m) => memberChip(m, { jump: true, selected })).join("");
  const watch = latest.watch
    ? `<a class="btn hook-watch" id="hook-watch" href="${esc(latest.watch.url)}" target="_blank" rel="noopener">ดูล่าสุด</a>`
    : "";
  hook.hidden = false;
  hook.innerHTML = `
    <p class="hook-kicker">${data.stops.length} สต็อป · ${people.length} คน · ${fmtDate(data.meta.tourDates[0])}–${fmtDate(data.meta.tourDates[data.meta.tourDates.length - 1])}</p>
    <div class="hook-latest-row">
      <p class="hook-latest"><span>${esc(latest.program)}</span> · ${fmtDate(latest.date)}</p>
      ${watch}
    </div>
    <div class="hook-row"><span class="hook-label">สมาชิกที่ไปสัมภาษณ์</span>${chips}</div>
  `;
}

function renderStops(stops, byName, selected) {
  $("stops").innerHTML = stops
    .map((s) => {
      const time = s.time ? ` · ${s.time} น.` : "";
      const format = s.formatTh ? `<span class="stop-format">${esc(s.formatTh)}</span>` : "";
      const detail = s.programDetailTh ? `<small>${esc(s.programDetailTh)}</small>` : "";
      const channelLine = esc(stopTitle(s));
      const venue = s.venueTh ? `<p class="stop-venue">${esc(s.venueTh)}</p>` : "";
      const warn = s.unconfirmed && s.unconfirmedNote
        ? `<p class="warn">รอตรวจสอบ · ${esc(s.unconfirmedNote)}${dataNoteRef(s)}</p>`
        : "";
      const members = s.members
        .map((sm) => {
          const m = byName.get(sm.name) || { name: sm.name, band: "BNK48" };
          return memberChip(m, { jump: true, selected });
        })
        .join("");
      const watch = s.watch
        ? `<a class="btn stop-watch" href="${esc(s.watch.url)}" target="_blank" rel="noopener">${esc(watchButtonLabel(s))}</a>`
        : "";
      const official = s.officialPost
        ? `<a class="stop-official" href="${esc(s.officialPost.url)}" target="_blank" rel="noopener">${esc(s.officialPost.labelTh)} →</a>`
        : "";
      return `<article class="stop" data-id="${esc(s.id)}" data-date="${esc(s.date)}">
        <div class="stop-top"><span class="stop-date">${fmtDate(s.date)}${time}</span>${format}</div>
        <h3 class="stop-title">${channelLine}${detail}</h3>
        ${venue}
        <div class="stop-members">${members}</div>
        ${warn}
        <div class="stop-actions">${watch}${official}</div>
      </article>`;
    })
    .join("");
}

function dataNoteRef(s) {
  if (s.id === "thaipbs-2026-11-16") {
    return ` <a class="fn-ref" href="#fn-thaipbs"><sup>※</sup></a>`;
  }
  return "";
}

function renderMemberShare(people, selected) {
  $("member-share-row").innerHTML = people
    .map(
      (m) =>
        `<span class="member-share-item">${memberChip(m, { jump: true, selected })}<button type="button" class="share-btn" data-share="${esc(m.name)}">แชร์</button></span>`,
    )
    .join("");
}

function stopsForMember(data, name) {
  return sortStops(
    data.stops.filter((s) => s.members.some((sm) => sm.name === name)),
    "newest",
  ).map((s) => {
    const sm = s.members.find((x) => x.name === name);
    return { stop: s, confirmed: sm ? sm.confirmed !== false : true };
  });
}

function wrapLines(ctx, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const w of words) {
    const next = line ? line + " " + w : w;
    if (ctx.measureText(next).width <= maxWidth) line = next;
    else {
      if (line) lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines;
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

function drawShareCard(m, entries) {
  const canvas = $("share-canvas");
  const ctx = canvas.getContext("2d");
  const W = 1200, H = 675;
  canvas.width = W;
  canvas.height = H;

  const bandColor = m.band === "CGM48" ? "#49c5a8" : "#c391c1";
  const ink = "#f5f3f4";
  const muted = "#a8a2a6";
  const font = "Sarabun, 'Noto Sans Thai', system-ui, sans-serif";

  ctx.fillStyle = "#0c0a0b";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = bandColor;
  ctx.fillRect(0, 0, 18, H);

  const glow = ctx.createRadialGradient(200, 120, 20, 240, 180, 520);
  glow.addColorStop(0, m.band === "CGM48" ? "rgba(73,197,168,.16)" : "rgba(195,145,193,.18)");
  glow.addColorStop(1, "rgba(12,10,11,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(18, 0, W - 18, H);

  ctx.fillStyle = muted;
  ctx.font = `600 24px ${font}`;
  ctx.fillText("สารบัญ48th  ·  เดินสายสัมภาษณ์ผล GE6", 72, 50);
  ctx.font = `500 20px ${font}`;
  ctx.fillText("sarabun48th.space", 72, 78);

  ctx.fillStyle = ink;
  ctx.font = `800 68px ${font}`;
  ctx.fillText(m.name, 72, 150);

  ctx.font = `700 26px ${font}`;
  ctx.fillStyle = bandColor;
  const rank = m.rank != null ? `${m.band}  ·  GE6 #${m.rank}` : m.band;
  ctx.fillText(rank, 72, 188);

  const confirmed = entries.filter((e) => e.confirmed);
  const pending = entries.filter((e) => !e.confirmed);
  ctx.fillStyle = muted;
  ctx.font = `600 22px ${font}`;
  const countLabel = pending.length
    ? `${confirmed.length} สต็อปที่ยืนยันแล้ว`
    : `${entries.length} สต็อป`;
  ctx.fillText(countLabel, 72, 220);

  const show = confirmed.length ? confirmed : entries;
  const listTop = 240;
  const footerY = 636;
  const noteSpace = pending.length ? 36 : 0;
  const listBottom = footerY - 48 - noteSpace;
  const rowH = Math.floor((listBottom - listTop) / Math.max(show.length, 1));

  show.slice(0, 4).forEach(({ stop }, i) => {
    const y = listTop + i * rowH;
    const boxH = rowH - 10;
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    roundRect(ctx, 56, y, W - 56 - 48, boxH, 16);
    ctx.fill();
    ctx.fillStyle = bandColor;
    ctx.fillRect(56, y + 12, 8, boxH - 24);

    const time = stop.time ? `${stop.time} น.` : "";
    const meta = [fmtDate(stop.date), time, stop.formatTh].filter(Boolean).join("  ·  ");
    const metaY = y + Math.round(boxH * 0.38);
    const titleY = y + boxH - Math.round(boxH * 0.22);
    ctx.fillStyle = muted;
    ctx.font = `600 22px ${font}`;
    ctx.fillText(meta, 88, metaY);
    ctx.fillStyle = ink;
    ctx.font = `800 32px ${font}`;
    ctx.fillText(stopTitle(stop), 88, titleY);
  });

  if (pending.length) {
    ctx.fillStyle = muted;
    ctx.font = `600 20px ${font}`;
    ctx.fillText("รายการที่ยังรอตรวจสอบอยู่ในหมายเหตุบนเว็บ", 72, footerY - 32);
  }

  ctx.fillStyle = muted;
  ctx.font = `500 22px ${font}`;
  ctx.fillText("ทำโดยแฟนคลับ เพื่อแฟนคลับ", 72, footerY);

  const url = canvas.toDataURL("image/png");
  $("share-preview").src = url;
  const a = $("share-download");
  a.href = url;
  a.download = `ge-press-tour-${m.name}.png`;
  return url;
}

async function shareImage(m, dataUrl, entries) {
  const blob = await (await fetch(dataUrl)).blob();
  const file = new File([blob], `ge-press-tour-${m.name}.png`, { type: "image/png" });
  const n = entries.filter((e) => e.confirmed).length || entries.length;
  const text = `${m.name} เดินสายสัมภาษณ์ผล GE6 · ${n} สต็อป`;
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({ files: [file], title: `GE6 PRESS TOUR · ${m.name}`, text });
    return;
  }
  if (navigator.share) {
    await navigator.share({ title: `GE6 PRESS TOUR · ${m.name}`, text, url: location.href });
    return;
  }
  $("share-download").click();
}

async function main() {
  const res = await fetch("/ge-press-tour/data.json", { cache: "no-store" });
  if (!res.ok) throw new Error("data");
  const data = await res.json();
  const byName = memberMap(data);
  fillChrome(data);
  let selectedMember = "";

  const channelSel = $("channel");
  for (const ch of uniqueChannels(data.stops)) {
    const opt = document.createElement("option");
    opt.value = ch;
    opt.textContent = ch;
    channelSel.appendChild(opt);
  }

  const filters = $("filters");
  const toggle = $("filters-toggle");
  const updateToggle = () => {
    const active = $("band").value || $("channel").value || $("sort").value !== "newest";
    toggle.classList.toggle("is-active", !!active);
    toggle.setAttribute("aria-expanded", filters.classList.contains("is-open") ? "true" : "false");
  };
  toggle.addEventListener("click", () => {
    filters.classList.toggle("is-open");
    updateToggle();
  });

  const apply = () => {
    const q = $("q").value.trim().toLowerCase();
    const band = $("band").value;
    const channel = $("channel").value;
    const sort = $("sort").value;
    const filtered = data.stops.filter((s) => {
      if (channel && s.channel !== channel) return false;
      if (!stopHasBand(s, byName, band)) return false;
      if (!stopHasMember(s, selectedMember)) return false;
      if (!selectedMember && !stopMatchesQuery(s, byName, q)) return false;
      return true;
    });
    const sorted = sortStops(filtered, sort);
    fillHook(data, selectedMember);
    renderMemberShare(appearingMembers(data), selectedMember);
    renderStops(sorted, byName, selectedMember);
    $("empty").hidden = sorted.length > 0;
    if (selectedMember) {
      $("count").textContent = `แสดงสต็อปของ ${selectedMember} · ${sorted.length} จาก ${data.stops.length} สต็อป`;
    } else {
      $("count").textContent = `แสดง ${sorted.length} จาก ${data.stops.length} สต็อป`;
    }
    updateToggle();
  };

  for (const id of ["q", "band", "channel", "sort"]) {
    $(id).addEventListener("input", apply);
    $(id).addEventListener("change", apply);
  }
  $("q").addEventListener("input", () => {
    if (selectedMember) selectedMember = "";
  });
  apply();

  const jumpTo = (name) => {
    selectedMember = name;
    $("q").value = "";
    $("band").value = "";
    $("channel").value = "";
    $("sort").value = "newest";
    apply();
    const row = document.querySelector("#stops .stop");
    if (row) row.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  document.body.addEventListener("click", (e) => {
    const chip = e.target.closest("[data-jump]");
    if (!chip) return;
    e.preventDefault();
    if (selectedMember === chip.dataset.jump) {
      selectedMember = "";
      apply();
      return;
    }
    jumpTo(chip.dataset.jump);
  });

  let current = null;
  let currentUrl = "";
  const onShare = (name) => {
    const m = byName.get(name);
    if (!m) return;
    const entries = stopsForMember(data, name);
    if (!entries.length) return;
    current = { m, entries };
    currentUrl = drawShareCard(m, entries);
    $("share-dialog").showModal();
  };
  $("members").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-share]");
    if (btn) onShare(btn.dataset.share);
  });
  $("share-share").addEventListener("click", async () => {
    if (!current) return;
    try {
      await shareImage(current.m, currentUrl, current.entries);
    } catch (err) {
      if (err && err.name === "AbortError") return;
      $("share-download").click();
    }
  });
}

main().catch(() => {
  $("count").textContent = "โหลดข้อมูลไม่สำเร็จ ลองรีเฟรชหน้านี้อีกครั้ง";
});
