import { SITE } from "/config.js";

const $ = (id) => document.getElementById(id);
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const MEMBER_PREVIEW = 8;
const TEAM_TH = { BIII: "BIII", NV: "NV", C: "C", Trainee: "Trainee", Graduated: "สำเร็จการศึกษา" };
const GEN_TH = { "1st": "รุ่น 1", "2nd": "รุ่น 2", "3rd": "รุ่น 3", "4th": "รุ่น 4", "5th": "รุ่น 5", "6th": "รุ่น 6" };

let DATA = null;
let memberById = new Map();
let songsByMember = new Map();
let view = "member";
let filters = { group: "", member: "" };
let query = "";
let membersExpanded = false;
let selectedSong = "";
let selectedMember = "";

function genLabel(g) { return GEN_TH[g] || g; }
function teamLabel(t) { return TEAM_TH[t] || t; }

function songPrimary(s) {
  return s.titleTh && s.titleTh !== s.title ? s.titleTh : s.title;
}
function songSecondary(s) {
  const parts = [];
  if (s.titleTh && s.titleTh !== s.title) parts.push(s.title);
  if (s.version) parts.push(s.version);
  return parts.join(" · ");
}
function searchBlob(...parts) {
  return parts.filter(Boolean).join(" ").toLowerCase();
}

function nameTh(m) {
  return (m?.nameTh || "").trim();
}

function nameStack(m, mainClass) {
  const th = nameTh(m);
  return `<div class="name-stack">
    <div class="${mainClass}">${esc(m.name)}</div>
    ${th ? `<div class="name-th">${esc(th)}</div>` : ""}
  </div>`;
}

function mismatchLinks(mm) {
  if (!mm) return "";
  const official = (mm.officialUrls || []).map((u, i) =>
    `<a href="${esc(u)}" target="_blank" rel="noopener">${i === 0 ? "โพสต์ทางการ" : "โพสต์ทางการ (" + (i + 1) + ")"}</a>`
  ).join(" · ");
  const table = mm.tableUrl
    ? `<a href="${esc(mm.tableUrl)}" target="_blank" rel="noopener">ตารางต้นทาง</a>`
    : "";
  return [table, official].filter(Boolean).join(" · ");
}

function renderMismatch(mm, extra = "") {
  if (!mm) return "";
  return `<aside class="mismatch">
    <p class="mismatch-label">${esc(mm.label || "ตารางกับโพสต์ทางการไม่ตรงกัน")}</p>
    ${mm.tableText ? `<p>ตาราง: ${esc(mm.tableText)}</p>` : ""}
    ${mm.officialText ? `<p>โพสต์ทางการ: ${esc(mm.officialText)}</p>` : ""}
    ${extra}
    <p>${mismatchLinks(mm)}</p>
  </aside>`;
}

function renderMismatchLine(mm) {
  if (!mm) return "";
  return `<p class="mismatch-line">${esc(mm.label || "ตารางกับโพสต์ทางการไม่ตรงกัน")} · ${mismatchLinks(mm)}</p>`;
}

function rankedWithTies(list) {
  let last = null;
  let pos = 0;
  return list.map((item, i) => {
    if (item.n !== last) {
      pos = i + 1;
      last = item.n;
    }
    const tied = (i > 0 && list[i - 1].n === item.n) || (i + 1 < list.length && list[i + 1].n === item.n);
    return { ...item, rank: pos, tied };
  });
}

function rankLabel(r) {
  return r.tied ? `${r.rank}=` : String(r.rank);
}

function memberRank(id) {
  const list = rankedWithTies(
    [...DATA.members]
      .map((m) => ({ m, n: songCount(m.id) }))
      .sort((a, b) => b.n - a.n || a.m.name.localeCompare(b.m.name)),
  );
  return list.find((r) => r.m.id === id);
}

function buildIndexes() {
  memberById = new Map(DATA.members.map((m) => [m.id, m]));
  songsByMember = new Map(DATA.members.map((m) => [m.id, []]));
  for (const song of DATA.songs) {
    for (const id of song.members) {
      const list = songsByMember.get(id);
      if (list) list.push(song);
    }
  }
}

function centersOn(song) {
  return (song.centers || []).map((id) => memberById.get(id)).filter(Boolean);
}

function songCount(id) {
  return (songsByMember.get(id) || []).length;
}

function memberMatches(m, q) {
  if (filters.group && m.group !== filters.group) return false;
  if (filters.member && m.id !== filters.member) return false;
  if (!q) return true;
  const songs = songsByMember.get(m.id) || [];
  const blob = searchBlob(
    m.name, nameTh(m), m.group, m.team, teamLabel(m.team), m.gen, genLabel(m.gen),
    ...songs.flatMap((s) => [s.title, s.titleTh, s.code, s.version, s.unit]),
  );
  return blob.includes(q);
}

function songMatches(s, q) {
  if (filters.group && !s.members.some((id) => memberById.get(id)?.group === filters.group)) return false;
  if (filters.member && !s.members.includes(filters.member)) return false;
  if (!q) return true;
  const names = s.members.flatMap((id) => {
    const m = memberById.get(id);
    return m ? [m.name, nameTh(m)] : [];
  });
  return searchBlob(s.title, s.titleTh, s.code, s.version, s.unit, s.note, ...names).includes(q);
}

function filteredMembers() {
  const q = query.trim().toLowerCase();
  return DATA.members.filter((m) => memberMatches(m, q));
}

function filteredSongs() {
  const q = query.trim().toLowerCase();
  return DATA.songs.filter((s) => songMatches(s, q));
}

function rankedMembers() {
  return filteredMembers()
    .map((m) => ({ m, n: songCount(m.id) }))
    .sort((a, b) => b.n - a.n || a.m.name.localeCompare(b.m.name));
}

function topMembersByCount() {
  return [...DATA.members].sort((a, b) => songCount(b.id) - songCount(a.id) || a.name.localeCompare(b.name));
}

function visibleMemberChips(all) {
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

function chip(id, label, on, key) {
  return `<button type="button" class="chip${on ? " is-on" : ""}" data-filter="${esc(key)}:${esc(id)}" aria-pressed="${on ? "true" : "false"}">${esc(label)}</button>`;
}

function memberChip(m, on, key) {
  return `<button type="button" class="chip${on ? " is-on" : ""}" data-filter="${esc(key)}:${esc(m.id)}" aria-pressed="${on ? "true" : "false"}">${nameStack(m, "chip-name")}</button>`;
}

function renderFilters() {
  const byCount = topMembersByCount();
  const shown = visibleMemberChips(byCount);
  const moreLabel = membersExpanded ? "ย่อ" : "ดูทั้งหมด";
  const more = byCount.length > MEMBER_PREVIEW
    ? `<button type="button" class="chip chip-more" data-expand="members" aria-expanded="${membersExpanded ? "true" : "false"}">${esc(moreLabel)}</button>`
    : "";
  $("filters").innerHTML = `
    <div class="filter-row" role="group" aria-label="กรองตามวง" data-key="group">
      <span class="filter-label">วง</span>
      ${chip("", "ทั้งหมด", filters.group === "", "group")}
      ${chip("BNK48", "BNK48", filters.group === "BNK48", "group")}
      ${chip("CGM48", "CGM48", filters.group === "CGM48", "group")}
    </div>
    <div class="filter-row" role="group" aria-label="กรองตามสมาชิก" data-key="member">
      <span class="filter-label">สมาชิก</span>
      ${chip("", "ทั้งหมด", filters.member === "", "member")}
      ${shown.map((m) => memberChip(m, filters.member === m.id, "member")).join("")}
      ${more}
    </div>`;
  const active = !!(filters.group || filters.member);
  $("filters-toggle").classList.toggle("is-active", active);
}

function tagsForMember(m) {
  const bits = [
    `<span class="tag group">${esc(m.group)}</span>`,
    `<span class="tag">${esc(teamLabel(m.team))}</span>`,
    `<span class="tag">${esc(genLabel(m.gen))}</span>`,
  ];
  return `<div class="meta">${bits.join("")}</div>`;
}

function renderMemberCard(m, opts = {}) {
  const songs = songsByMember.get(m.id) || [];
  const centers = songs.filter((s) => (s.centers || []).includes(m.id));
  const lines = songs.map((s) => {
    const isCenter = (s.centers || []).includes(m.id);
    return `<div class="song-line">
      <span class="num">${esc(s.code)}</span>
      <div class="names">
        <div class="primary">${esc(songPrimary(s))}</div>
        ${songSecondary(s) ? `<div class="secondary">${esc(songSecondary(s))}</div>` : ""}
        ${renderMismatchLine(s.mismatch)}
      </div>
      <div class="meta">${s.section === "encore" ? `<span class="tag section">Encore</span>` : ""}
        ${isCenter ? `<span class="tag center">Center</span>` : ""}</div>
    </div>`;
  }).join("");
  const share = opts.share
    ? `<div class="hook-actions"><button type="button" class="btn" data-share="${esc(m.id)}">แชร์การ์ด</button></div>`
    : "";
  const centerNote = centers.length
    ? `<p class="unit-note">เป็น Center ${centers.length} เพลง: ${centers.map((s) => songPrimary(s)).join(", ")}</p>`
    : "";
  return `<article class="member-card" data-member="${esc(m.id)}">
    <div class="member-head">
      <h3 class="member-name">${nameStack(m, "name-main")}</h3>
      <p class="member-count">ขึ้น ${songs.length} เพลง</p>
    </div>
    ${tagsForMember(m)}
    ${centerNote}
    <div class="song-list">${lines || `<p class="empty">ไม่มีเพลงในมุมมองนี้</p>`}</div>
    ${share}
  </article>`;
}

function mismatchExtra(s) {
  const unmarked = s.mismatch?.unmarked || [];
  if (!unmarked.length) return "";
  const names = unmarked.map((u) => u.name).join(" และ ");
  const reasons = unmarked.map((u) => `${u.name}: ${u.reason}`).join(" ");
  return `<p>ไม่ติดเครื่องหมายในตาราง 2 คน คือ ${esc(names)} — ${esc(reasons)}</p>`;
}

function renderSongCard(s) {
  const people = s.members.map((id) => memberById.get(id)).filter(Boolean);
  const shown = filters.group ? people.filter((m) => m.group === filters.group) : people;
  const chips = shown.map((m) => {
    const isCenter = (s.centers || []).includes(m.id);
    return `<button type="button" class="member-chip${isCenter ? " is-center" : ""}" data-open-member="${esc(m.id)}">${nameStack(m, "chip-name")}${isCenter ? ` <span class="tag center">Center</span>` : ""} <span class="tag">${esc(m.group)}</span></button>`;
  }).join("");
  const centerNames = centersOn(s).map((m) => m.name);
  const unitBits = [s.unit, s.version].filter(Boolean).join(" · ");
  return `<article class="song-card" data-song="${esc(s.id)}">
    <div class="song-head">
      <h3 class="song-title">${esc(songPrimary(s))}</h3>
      <p class="song-count">${s.count} คน</p>
    </div>
    <div class="meta">
      <span class="tag">${esc(s.code)}</span>
      ${s.section === "encore" ? `<span class="tag section">Encore</span>` : `<span class="tag section">Main</span>`}
      ${centerNames.length ? `<span class="tag center">Center: ${esc(centerNames.join(", "))}</span>` : `<span class="tag">ไม่มีดาว Center ในตาราง</span>`}
    </div>
    ${songSecondary(s) || unitBits ? `<p class="secondary" style="margin:8px 0 0">${esc([songSecondary(s), unitBits].filter(Boolean).join(" · "))}</p>` : ""}
    ${s.note && !s.mismatch ? `<p class="unit-note">${esc(s.note)}</p>` : ""}
    ${s.mismatch ? renderMismatch(s.mismatch, mismatchExtra(s)) : ""}
    <p class="unit-note" style="margin-top:10px">สมาชิกที่ขึ้นเพลงนี้</p>
    <div class="member-chips">${chips}</div>
    <p class="unit-note" style="margin-top:10px"><a href="${esc(s.officialUrl)}" target="_blank" rel="noopener">ที่มาทางการ</a> · <a href="${esc(s.source)}" target="_blank" rel="noopener">ตารางต้นทาง</a></p>
  </article>`;
}

function renderMemberPicker(members) {
  const rows = members.map((m) => `
    <button type="button" class="rank-row" data-open-member="${esc(m.id)}">
      <div class="rank-body">
        ${nameStack(m, "rank-name")}
        ${tagsForMember(m)}
      </div>
      <div class="rank-count">ขึ้น ${songCount(m.id)} เพลง</div>
    </button>`).join("");
  return `<p class="unit-note">เลือกสมาชิกเพื่อดูรายชื่อเพลงตามลำดับเซ็ตลิสต์</p><div class="rank-list">${rows}</div>`;
}

function renderMemberView() {
  const members = [...filteredMembers()].sort((a, b) => songCount(b.id) - songCount(a.id) || a.name.localeCompare(b.name));
  const id = filters.member || (members.length === 1 ? members[0].id : "");
  const one = id ? members.find((m) => m.id === id) : null;
  if (one) {
    const back = filters.member || members.length === 1
      ? `<p class="unit-note"><button type="button" class="chip" data-filter="member:">ดูทุกคน</button></p>`
      : "";
    $("member-view").innerHTML = back + renderMemberCard(one, { share: true });
    return members.length;
  }
  $("member-view").innerHTML = renderMemberPicker(members);
  return members.length;
}

function renderSongView() {
  const songs = filteredSongs();
  const current = songs.find((s) => s.id === selectedSong) || songs[0];
  if (current) selectedSong = current.id;
  const options = songs.map((s) => {
    const sub = [s.code, songSecondary(s) || (s.titleTh !== s.title ? s.title : ""), `${s.count} คน`].filter(Boolean).join(" · ");
    return `<button type="button" class="song-option${s.id === selectedSong ? " is-on" : ""}" data-song-pick="${esc(s.id)}">
      <span class="primary">${esc(songPrimary(s))}</span>
      <span class="secondary">${esc(sub)}</span>
    </button>`;
  }).join("");
  $("song-view").innerHTML = `${current ? renderSongCard(current) : ""}<p class="unit-note">เพลงในเซ็ตลิสต์</p><div class="song-pick">${options}</div>`;
  return songs.length;
}

function renderRankView() {
  const ranked = rankedWithTies(rankedMembers());
  const rows = ranked.map((r) => {
    return `<div class="rank-row">
      <div class="rank-pos">${esc(rankLabel(r))}</div>
      <div class="rank-body">
        ${nameStack(r.m, "rank-name")}
        ${tagsForMember(r.m)}
      </div>
      <div class="rank-count">${r.n} เพลง</div>
    </div>`;
  }).join("");
  $("rank-view").innerHTML = `<div class="rank-list">${rows}</div>`;
  return ranked.length;
}

function leastAndMostSongs() {
  const sorted = [...DATA.songs].sort((a, b) => a.count - b.count || a.order - b.order);
  const least = sorted[0];
  const most = sorted[sorted.length - 1];
  return { least, most };
}

function performerLabel(song) {
  if (song.count === 1) {
    const m = memberById.get(song.members[0]);
    const nm = m ? m.name : "";
    return nm ? `เดี่ยว ${nm}` : "เดี่ยว";
  }
  return `${song.count} คน`;
}

function renderSummary() {
  const { least, most } = leastAndMostSongs();
  const top = topMembersByCount()[0];
  const topName = nameTh(top) ? `${esc(top.name)} (${esc(nameTh(top))})` : esc(top.name);
  $("summary-count").innerHTML = `ขึ้นมากสุด <span>${songCount(top.id)} เพลง</span> คือ ${topName}`;
  $("summary-stat").innerHTML =
    `เพลงที่ขึ้นคนน้อยสุดคือ ${esc(songPrimary(least))} (${esc(performerLabel(least))}) · ขึ้นคนเยอะสุดคือ ${esc(songPrimary(most))} (${most.count} คน) · นับจากตาราง 24 เพลง ไม่รวม Dance Act`;
}

function renderSources() {
  $("sources").innerHTML = (DATA.sources || [])
    .map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a></li>`)
    .join("");
  $("source-note").textContent = DATA.meta.scope || "";
  $("footnotes").innerHTML = (DATA.footnotes || []).map((t) => `<li>${esc(t)}</li>`).join("");
}

function render() {
  renderFilters();
  $("member-view").hidden = view !== "member";
  $("song-view").hidden = view !== "song";
  $("rank-view").hidden = view !== "rank";
  for (const [id, key] of [["view-member", "member"], ["view-song", "song"], ["view-rank", "rank"]]) {
    $(id).classList.toggle("is-on", view === key);
    $(id).setAttribute("aria-pressed", view === key ? "true" : "false");
  }
  let n = 0;
  let total = 0;
  if (view === "member") { n = renderMemberView(); total = DATA.members.length; $("count").textContent = `แสดง ${n} / ${total} คน`; }
  else if (view === "song") { n = renderSongView(); total = DATA.songs.length; $("count").textContent = `แสดง ${n} / ${total} เพลง`; }
  else { n = renderRankView(); total = DATA.members.length; $("count").textContent = `แสดง ${n} / ${total} คน`; }
  $("empty").hidden = n !== 0;
}

function wrapText(ctx, text, x, y, max, lineH) {
  const words = text.split(" ");
  let line = "";
  let yy = y;
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > max && line) {
      ctx.fillText(line, x, yy);
      line = w;
      yy += lineH;
    } else line = test;
  }
  if (line) { ctx.fillText(line, x, yy); yy += lineH; }
  return yy;
}

function drawShareCard(m) {
  const canvas = $("share-canvas");
  const ctx = canvas.getContext("2d");
  const W = 1200, H = 675;
  const accent = "#c391c1", ink = "#f5f3f4", muted = "#a8a2a6";
  ctx.fillStyle = "#0c0a0b";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, 18, H);
  const glow = ctx.createRadialGradient(260, 80, 20, 360, 200, 560);
  glow.addColorStop(0, "rgba(195,145,193,.22)");
  glow.addColorStop(1, "rgba(12,10,11,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(18, 0, W - 18, H);

  ctx.fillStyle = muted;
  ctx.font = "600 24px 'Noto Sans Thai', Sarabun, system-ui, sans-serif";
  ctx.fillText("สารบัญ48th  ·  JOURNEY OF DREAMS", 72, 58);

  const songs = songsByMember.get(m.id) || [];
  const rank = memberRank(m.id);
  const th = nameTh(m);

  ctx.fillStyle = ink;
  ctx.font = "800 58px 'Noto Sans Thai', Sarabun, system-ui, sans-serif";
  ctx.fillText(m.name, 72, 126);
  let y = 126;
  if (th) {
    y += 36;
    ctx.fillStyle = muted;
    ctx.font = "600 28px 'Noto Sans Thai', Sarabun, system-ui, sans-serif";
    ctx.fillText(th, 72, y);
  }
  y += 36;
  ctx.fillStyle = muted;
  ctx.font = "600 22px 'Noto Sans Thai', Sarabun, system-ui, sans-serif";
  ctx.fillText(`${m.group}  ·  ${teamLabel(m.team)}  ·  ${genLabel(m.gen)}`, 72, y);

  y += 50;
  ctx.fillStyle = accent;
  ctx.font = "800 44px 'Noto Sans Thai', Sarabun, system-ui, sans-serif";
  ctx.fillText(`ขึ้น ${songs.length} เพลง`, 72, y);
  if (rank) {
    y += 36;
    ctx.fillStyle = ink;
    ctx.font = "700 24px 'Noto Sans Thai', Sarabun, system-ui, sans-serif";
    ctx.fillText(`อันดับ ${rankLabel(rank)} จาก ${DATA.members.length} คน`, 72, y);
  }

  const centers = songs.filter((s) => (s.centers || []).includes(m.id));
  y += 28;
  if (centers.length) {
    ctx.fillStyle = muted;
    ctx.font = "600 20px 'Noto Sans Thai', Sarabun, system-ui, sans-serif";
    ctx.fillText("Center: " + centers.map(songPrimary).join(", "), 72, y);
    y += 18;
  }

  const colX = [72, 636];
  const colW = 490;
  const lineH = 32;
  const footerY = 638;
  const usable = footerY - 28 - (y + 16);
  const rows = Math.ceil(songs.length / 2);
  const fit = Math.max(24, Math.min(lineH, Math.floor(usable / Math.max(rows, 1))));
  let startY = y + 16;
  ctx.font = `600 ${Math.max(18, fit - 10)}px 'Noto Sans Thai', Sarabun, system-ui, sans-serif`;
  songs.forEach((s, i) => {
    const col = i < Math.ceil(songs.length / 2) ? 0 : 1;
    const row = col === 0 ? i : i - Math.ceil(songs.length / 2);
    const x = colX[col];
    const yy = startY + row * fit;
    ctx.fillStyle = muted;
    ctx.textAlign = "left";
    ctx.fillText(s.code, x, yy);
    ctx.fillStyle = ink;
    ctx.fillText(songPrimary(s), x + 78, yy);
  });

  ctx.fillStyle = muted;
  ctx.font = "500 20px 'Noto Sans Thai', Sarabun, system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("จากตารางของ @immabird_z  ·  ทำโดยแฟนคลับ เพื่อแฟนคลับ", 72, footerY);
  return canvas;
}

function openShare(id) {
  const m = memberById.get(id);
  if (!m) return;
  let canvas;
  try {
    canvas = drawShareCard(m);
  } catch (err) {
    console.error("share draw failed", err);
    return;
  }
  const url = canvas.toDataURL("image/png");
  $("share-preview").src = url;
  $("share-download").href = url;
  $("share-download").download = `jod-setlist-${m.id}.png`;
  $("share-dialog").showModal();
  $("share-share").onclick = async () => {
    try {
      const blob = await new Promise((res) => canvas.toBlob(res, "image/png"));
      const file = new File([blob], `jod-setlist-${m.id}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `${m.name} ใน Journey of Dreams` });
      } else {
        $("share-download").click();
      }
    } catch (err) {
      if (err?.name !== "AbortError") $("share-download").click();
    }
  };
}

function renderFooter() {
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

function onClick(e) {
  const btn = e.target.closest("[data-filter], [data-expand], [data-share], [data-song-pick], [data-open-member], .view-btn, .filters-toggle");
  if (!btn) return;
  if (btn.classList.contains("filters-toggle")) {
    const open = btn.getAttribute("aria-expanded") !== "true";
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    $("filters").classList.toggle("is-open", open);
    return;
  }
  if (btn.id === "view-member" || btn.id === "view-song" || btn.id === "view-rank") {
    view = btn.id.replace("view-", "");
    if (view === "member" && !filters.member && selectedMember) filters.member = selectedMember;
    render();
    return;
  }
  if (btn.dataset.expand === "members") {
    membersExpanded = !membersExpanded;
    render();
    return;
  }
  if (btn.dataset.filter) {
    const [key, ...rest] = btn.dataset.filter.split(":");
    const val = rest.join(":");
    filters[key] = val;
    if (key === "member") selectedMember = val;
    render();
    return;
  }
  if (btn.dataset.share) {
    openShare(btn.dataset.share);
    return;
  }
  if (btn.dataset.songPick) {
    selectedSong = btn.dataset.songPick;
    render();
    return;
  }
  if (btn.dataset.openMember) {
    filters.member = btn.dataset.openMember;
    selectedMember = btn.dataset.openMember;
    view = "member";
    render();
    $("browse").scrollIntoView({ block: "start" });
  }
}

async function main() {
  DATA = await fetch("/jod-setlist/data.json").then((r) => r.json());
  buildIndexes();
  renderFooter();
  renderSummary();
  renderSources();
  selectedSong = DATA.songs[0].id;
  $("q").addEventListener("input", (e) => { query = e.target.value; render(); });
  document.addEventListener("click", onClick);
  render();
}

main();
