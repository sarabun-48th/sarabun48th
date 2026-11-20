import { SITE } from "/config.js";

const $ = (id) => document.getElementById(id);
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const GROUP = {
  kami7: { name: "KAMI 7", nameTh: "คามิ 7", cls: "kami7" },
  senbatsu: { name: "Senbatsu", nameTh: "เซ็มบัตสึ", cls: "senbatsu" },
  under: { name: "Under Girls", nameTh: "อันเดอร์เกิลส์", cls: "under" },
  next: { name: "Next Girls", nameTh: "เน็กซ์เกิลส์", cls: "next" },
};

const CHANGE = { up: "ขึ้น", down: "ลง", same: "เท่าเดิม", new: "ใหม่" };

const fmtTokens = (n) =>
  Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function groupOf(m) {
  return m.group ? GROUP[m.group] : null;
}

function riseDelta(m) {
  if (m.change === "up" && m.ge5Rank && m.rank) return m.ge5Rank - m.rank;
  return null;
}

function changeLabel(m) {
  if (m.change === "up" && m.ge5Rank && m.rank) {
    return `ขึ้นจาก #${m.ge5Rank} → #${m.rank} (+${m.ge5Rank - m.rank})`;
  }
  if (m.change === "down" && m.ge5Rank && m.rank) {
    return `ลงจาก #${m.ge5Rank} → #${m.rank} (−${m.rank - m.ge5Rank})`;
  }
  if (m.change === "down" && m.ge5Rank && !m.rank) {
    return `ลงจาก GE5 #${m.ge5Rank}`;
  }
  if (m.change === "same" && m.rank) return `เท่าเดิม (#${m.rank})`;
  if (m.change === "new") return m.ge5Note ? `ใหม่ (${m.ge5Note})` : "ใหม่";
  return CHANGE[m.change] || "—";
}

function changeShort(m) {
  if (m.change === "up" && m.ge5Rank && m.rank) return `ขึ้น #${m.ge5Rank}→#${m.rank} (+${m.ge5Rank - m.rank})`;
  if (m.change === "down" && m.ge5Rank && m.rank) return `ลง #${m.ge5Rank}→#${m.rank} (−${m.rank - m.ge5Rank})`;
  if (m.change === "down" && m.ge5Rank && !m.rank) return `GE5 #${m.ge5Rank}`;
  if (m.change === "same" && m.rank) return "เท่าเดิม";
  if (m.change === "new") return "ใหม่";
  return CHANGE[m.change] || "—";
}

function unrankedGe5(m) {
  if (m.ge5Rank) return m.change === "down" ? `GE5 #${m.ge5Rank}` : `GE5 #${m.ge5Rank}`;
  if (m.ge5Note) return m.ge5Note;
  return "—";
}

function badges(m) {
  if (m.firstSenbatsu !== true) return "";
  return `<span class="badges"><span class="tag"><span class="tag-full">เซ็มบัตสึครั้งแรก</span><span class="tag-short">ครั้งแรก</span></span></span>`;
}

function matchesGroup(m, g) {
  if (!g) return true;
  if (g === "unranked") return m.rank == null;
  if (g === "senbatsu") return m.rank >= 1 && m.rank <= 12;
  return m.group === g;
}

function matchesQuery(m, q) {
  if (!q) return true;
  const parts = [m.name, ...(m.nicknamesTh || [])];
  return parts.some((p) => String(p).toLowerCase().includes(q));
}

function sortMembers(list, key) {
  const copy = list.slice();
  const rankKey = (m) => (m.rank == null ? 999 : m.rank);
  if (key === "name") {
    copy.sort((a, b) => a.name.localeCompare(b.name, "en") || rankKey(a) - rankKey(b));
  } else if (key === "tokens") {
    copy.sort((a, b) => {
      const ta = a.tokens == null ? -1 : a.tokens;
      const tb = b.tokens == null ? -1 : b.tokens;
      return tb - ta || rankKey(a) - rankKey(b);
    });
  } else if (key === "change") {
    const delta = (m) => {
      if (m.change === "up" && m.ge5Rank && m.rank) return 1000 + (m.ge5Rank - m.rank);
      if (m.change === "same") return 0;
      if (m.change === "down" && m.ge5Rank && m.rank) return -1000 - (m.rank - m.ge5Rank);
      if (m.change === "down") return -2000;
      return -3000;
    };
    copy.sort((a, b) => delta(b) - delta(a) || rankKey(a) - rankKey(b));
  } else {
    copy.sort((a, b) => rankKey(a) - rankKey(b) || a.name.localeCompare(b.name, "en"));
  }
  return copy;
}

function bandDot(m) {
  const cls = m.band === "CGM48" ? "cgm" : "bnk";
  return `<span class="band ${cls}"><i></i><span class="band-label">${esc(m.band)}</span></span>`;
}

function shareBtn(m) {
  return `<button class="share-btn" type="button" data-share="${esc(m.name)}">แชร์</button>`;
}

function changeCells(m) {
  return `<span class="change change-long ${esc(m.change)}">${esc(changeLabel(m))}</span><span class="change change-short ${esc(m.change)}">${esc(changeShort(m))}</span>`;
}

function renderRanked(list) {
  $("rows").innerHTML = list
    .map((m) => {
      const g = groupOf(m);
      const grpCell = g ? `<span class="grp ${g.cls}">${esc(g.nameTh)}</span>` : "—";
      const tokenCell = m.tokens == null ? "—" : fmtTokens(m.tokens);
      return `<tr data-name="${esc(m.name)}">
        <td class="col-rank"><span class="rank-n">#${m.rank}</span></td>
        <td class="col-name"><span class="name">${esc(m.name)}</span>${badges(m)}</td>
        <td class="col-band">${bandDot(m)}</td>
        <td class="col-group">${grpCell}</td>
        <td class="col-tokens num">${tokenCell}</td>
        <td class="col-change">${changeCells(m)}</td>
        <td class="col-share">${shareBtn(m)}</td>
      </tr>`;
    })
    .join("");
}

function renderUnranked(list) {
  $("unranked-rows").innerHTML = list
    .map((m) => {
      const ge5cls = m.ge5Rank && m.change === "down" ? "down" : "same";
      return `<tr data-name="${esc(m.name)}">
        <td class="col-name"><span class="name">${esc(m.name)}</span></td>
        <td class="col-band">${bandDot(m)}</td>
        <td class="col-change"><span class="change change-long ${ge5cls}">${esc(unrankedGe5(m))}</span><span class="change change-short ${ge5cls}">${esc(unrankedGe5(m))}</span></td>
        <td class="col-share">${shareBtn(m)}</td>
      </tr>`;
    })
    .join("");
}

function fillHook(members) {
  const first = members.find((m) => m.rank === 1);
  const kami = members.filter((m) => m.group === "kami7").sort((a, b) => a.rank - b.rank);
  const risers = members
    .filter((m) => riseDelta(m) != null)
    .sort((a, b) => riseDelta(b) - riseDelta(a) || a.rank - b.rank)
    .slice(0, 3);
  if (!first) return;
  $("hook").hidden = false;
  $("hook").innerHTML = `
    <div class="hook-center">
      <span class="hook-rank">#${first.rank}</span>
      <span class="hook-name">${esc(first.name)}</span>
      <span class="hook-tokens">${fmtTokens(first.tokens)} โทเคน</span>
    </div>
    <div class="hook-row">
      <span class="hook-label">คามิ 7</span>
      ${kami
        .map((m) => {
          const cls = m.band === "CGM48" ? "cgm" : "bnk";
          return `<button class="chip ${cls}" type="button" data-jump="${esc(m.name)}"><i></i>${esc(m.name)}</button>`;
        })
        .join("")}
    </div>
    <div class="hook-risers">
      <span class="hook-label">ขึ้นสูงสุดจาก GE5</span>
      ${risers
        .map((m) => {
          const d = riseDelta(m);
          return `<span class="riser">${esc(m.name)} #${m.ge5Rank}→#${m.rank} (+${d})</span>`;
        })
        .join("")}
    </div>`;
}

function fillChrome(data) {
  const total = data.meta.totalTokens;
  const rankedTokens = data.members.filter((m) => m.tokens != null).reduce((s, m) => s + m.tokens, 0);
  $("totals").innerHTML = `ยอดรวม <a class="fn-ref" href="#fn-total">${fmtTokens(total)}<sup>※</sup></a> โทเคน · อันดับ 1–36 รวม ${fmtTokens(rankedTokens)} โทเคน`;

  const cr = data.meta.concertRerun;
  if (cr) {
    $("concert").hidden = false;
    const start = new Date(cr.start);
    const end = new Date(cr.end);
    const fmt = (d) =>
      d.toLocaleString("th-TH", {
        timeZone: "Asia/Bangkok",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    $("concert-text").textContent = `${fmt(start)} – ${fmt(end)} (เวลาไทย)`;
    $("concert-link").href = cr.url;
  }

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

function drawShareCard(m) {
  const canvas = $("share-canvas");
  const ctx = canvas.getContext("2d");
  const W = 1200, H = 675;
  canvas.width = W;
  canvas.height = H;

  const bandColor = m.band === "CGM48" ? "#49c5a8" : "#c391c1";
  const ink = "#f5f3f4";
  const muted = "#a8a2a6";
  const font = "system-ui, Sarabun, 'Noto Sans Thai', sans-serif";

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
  ctx.font = `600 28px ${font}`;
  ctx.fillText("สารบัญ48th  ·  ผล GE6", 72, 70);
  ctx.font = `500 22px ${font}`;
  ctx.fillText("sarabun48th.space", 72, 104);

  ctx.fillStyle = bandColor;
  ctx.font = `800 96px ${font}`;
  const rankText = m.rank == null ? "รอตรวจสอบ" : `#${m.rank}`;
  ctx.fillText(rankText, 72, 220);

  ctx.fillStyle = ink;
  ctx.font = `800 92px ${font}`;
  ctx.fillText(m.name, 72, 328);

  ctx.font = `700 34px ${font}`;
  ctx.fillStyle = bandColor;
  const g = groupOf(m);
  const line2 = g ? `${m.band}  ·  ${g.nameTh}  (${g.name})` : m.band;
  ctx.fillText(line2, 72, 386);

  ctx.fillStyle = ink;
  ctx.font = `600 36px ${font}`;
  const tok = m.tokens == null ? "โทเคนยังไม่ประกาศ" : `${fmtTokens(m.tokens)} โทเคน`;
  ctx.fillText(tok, 72, 460);

  ctx.fillStyle = m.change === "up" ? "#4ade80" : m.change === "down" ? "#f87171" : m.change === "new" ? "#fcd34d" : muted;
  ctx.font = `700 32px ${font}`;
  ctx.fillText(`เทียบ GE5  ·  ${changeLabel(m)}`, 72, 512);

  // Confirmed first-time badge only — never an unconfirmed badge.
  if (m.firstSenbatsu === true) {
    ctx.font = `700 22px ${font}`;
    const text = "เซ็มบัตสึครั้งแรก";
    const w = ctx.measureText(text).width + 28;
    ctx.fillStyle = bandColor;
    roundRect(ctx, 72, 540, w, 40, 8);
    ctx.fill();
    ctx.fillStyle = "#1a0d18";
    ctx.fillText(text, 86, 568);
  }

  ctx.fillStyle = muted;
  ctx.font = `500 22px ${font}`;
  ctx.fillText("ทำโดยแฟนคลับ เพื่อแฟนคลับ  ·  ไม่ใช่เว็บทางการของวง", 72, 636);

  const url = canvas.toDataURL("image/png");
  $("share-preview").src = url;
  const a = $("share-download");
  a.href = url;
  a.download = `ge6-${m.name}.png`;
  return url;
}

async function shareImage(m, dataUrl) {
  const blob = await (await fetch(dataUrl)).blob();
  const file = new File([blob], `ge6-${m.name}.png`, { type: "image/png" });
  const text = m.rank
    ? `${m.name} อันดับ ${m.rank} GE6 · ${changeLabel(m)}`
    : `${m.name} GE6 · อันดับยังไม่ประกาศ`;
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({ files: [file], title: `GE6 · ${m.name}`, text });
    return;
  }
  if (navigator.share) {
    await navigator.share({ title: `GE6 · ${m.name}`, text, url: location.href });
    return;
  }
  $("share-download").click();
}

async function main() {
  const res = await fetch("/ge6-results/data.json", { cache: "no-store" });
  if (!res.ok) throw new Error("data");
  const data = await res.json();
  fillChrome(data);
  fillHook(data.members);

  const apply = () => {
    const q = $("q").value.trim().toLowerCase();
    const band = $("band").value;
    const group = $("group").value;
    const sort = $("sort").value;
    const filtered = data.members.filter((m) => {
      if (band && m.band !== band) return false;
      if (!matchesGroup(m, group)) return false;
      if (!matchesQuery(m, q)) return false;
      return true;
    });
    const ranked = sortMembers(filtered.filter((m) => m.rank != null), sort);
    const unranked = sortMembers(filtered.filter((m) => m.rank == null), sort === "tokens" ? "name" : sort);
    renderRanked(ranked);
    renderUnranked(unranked);
    $("ranked-wrap").hidden = ranked.length === 0;
    $("unranked-wrap").hidden = unranked.length === 0;
    $("empty").hidden = filtered.length > 0;
    $("count").textContent = `แสดง ${filtered.length} จาก ${data.members.length} คน`;
  };

  for (const id of ["q", "band", "group", "sort"]) {
    $(id).addEventListener("input", apply);
    $(id).addEventListener("change", apply);
  }
  apply();

  let current = null;
  let currentUrl = "";
  const onShare = (btn) => {
    const m = data.members.find((x) => x.name === btn.dataset.share);
    if (!m) return;
    current = m;
    currentUrl = drawShareCard(m);
    $("share-dialog").showModal();
  };
  $("results").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-share]");
    if (btn) onShare(btn);
  });
  $("hook").addEventListener("click", (e) => {
    const chip = e.target.closest("[data-jump]");
    if (!chip) return;
    $("q").value = chip.dataset.jump;
    $("band").value = "";
    $("group").value = "";
    $("sort").value = "rank";
    apply();
    const row = document.querySelector(`#rows tr[data-name="${CSS.escape(chip.dataset.jump)}"]`);
    if (row) row.scrollIntoView({ behavior: "smooth", block: "center" });
  });
  $("share-share").addEventListener("click", async () => {
    if (!current) return;
    try {
      await shareImage(current, currentUrl);
    } catch (err) {
      if (err && err.name === "AbortError") return;
      $("share-download").click();
    }
  });
}

main().catch(() => {
  $("count").textContent = "โหลดข้อมูลไม่สำเร็จ ลองรีเฟรชหน้านี้อีกครั้ง";
});
