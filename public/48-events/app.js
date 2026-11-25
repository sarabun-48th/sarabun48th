import { SITE } from "/config.js";

const $ = (id) => document.getElementById(id);
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const KEY_PASSPORT = "sarabun48th:48-events:passport";
const KEY_PASSPORT_LEGACY = "sarabun48th:kimidoko-roadshow:passport";
const TZ = "Asia/Bangkok";
const WEEKDAY_TH = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
const MONTH_TH = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const MEMBER_CHIP_LIMIT = 8;
const TYPE_CHIPS = [
  { id: "", label: "ทั้งหมด" },
  { id: "roadshow", label: "Roadshow" },
  { id: "handshake", label: "งานจับมือ" },
  { id: "original-stage", label: "Original Stage" },
  { id: "other", label: "อื่นๆ" },
];
const TYPE_LABEL = {
  roadshow: "Roadshow",
  handshake: "งานจับมือ",
  "original-stage": "Original Stage",
  concert: "คอนเสิร์ต",
  other: "อื่นๆ",
};

function isPreviewHost() {
  const h = location.hostname.toLowerCase();
  return (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h === "::1" ||
    h === "demo.sarabun48th.space" ||
    h.endsWith(".workers.dev")
  );
}

function todayISO() {
  if (isPreviewHost()) {
    const q = new URLSearchParams(location.search).get("today");
    if (q && /^\d{4}-\d{2}-\d{2}$/.test(q)) return q;
  }
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function fromISO(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d };
}

function daysBetween(fromIso, toIso) {
  const a = Date.UTC(...Object.values(fromISO(fromIso)));
  const b = Date.UTC(...Object.values(fromISO(toIso)));
  return Math.round((b - a) / 86400000);
}

function formatDay(iso, { withYear = true } = {}) {
  const { y, m, d } = fromISO(iso);
  const wd = WEEKDAY_TH[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return withYear ? `${wd} ${d} ${MONTH_TH[m - 1]} ${y}` : `${wd} ${d} ${MONTH_TH[m - 1]}`;
}

function formatRange(dates, { withYear = true } = {}) {
  if (!dates.length) return "";
  if (dates.length === 1) return formatDay(dates[0], { withYear });
  const a = fromISO(dates[0]);
  const b = fromISO(dates[dates.length - 1]);
  const sameMonth = a.y === b.y && a.m === b.m;
  if (sameMonth) {
    const wdA = WEEKDAY_TH[new Date(Date.UTC(a.y, a.m - 1, a.d)).getUTCDay()];
    const wdB = WEEKDAY_TH[new Date(Date.UTC(b.y, b.m - 1, b.d)).getUTCDay()];
    const year = withYear ? ` ${a.y}` : "";
    return `${wdA} ${a.d}–${wdB} ${b.d} ${MONTH_TH[a.m - 1]}${year}`;
  }
  return `${formatDay(dates[0], { withYear })} – ${formatDay(dates[dates.length - 1], { withYear })}`;
}

function formatRangeShort(dates) {
  if (!dates.length) return "";
  const a = fromISO(dates[0]);
  const b = fromISO(dates[dates.length - 1]);
  if (dates.length === 1) return `${a.d} ${MONTH_TH[a.m - 1]}`;
  if (a.y === b.y && a.m === b.m) return `${a.d}–${b.d} ${MONTH_TH[a.m - 1]}`;
  return `${a.d} ${MONTH_TH[a.m - 1]} – ${b.d} ${MONTH_TH[b.m - 1]}`;
}

function seriesOf(event, data) {
  return (data.series || []).find((s) => s.id === event.seriesId) || null;
}

function typeOf(event, data) {
  return event.type || seriesOf(event, data)?.type || "other";
}

function typeLabel(type) {
  return TYPE_LABEL[type] || TYPE_LABEL.other;
}

function typeBucket(type) {
  if (type === "roadshow" || type === "handshake" || type === "original-stage") return type;
  return "other";
}

function teamOf(event, data) {
  return event.team || seriesOf(event, data)?.team || "";
}

function eventStart(event) {
  return event.dates[0];
}
function eventEnd(event) {
  return event.dates[event.dates.length - 1];
}

function statusOf(event, today) {
  if (eventEnd(event) < today) return "past";
  if (eventStart(event) <= today && today <= eventEnd(event)) return "now";
  return "future";
}

function canTick(event, today) {
  return eventStart(event) <= today;
}

function countdownLabel(today, start) {
  const n = daysBetween(today, start);
  if (n === 0) return "วันนี้";
  if (n === 1) return "อีก 1 วัน";
  if (n > 1) return `อีก ${n} วัน`;
  return "";
}

function hookCountdown(event, today) {
  const status = statusOf(event, today);
  if (status === "now") return "วันนี้";
  return countdownLabel(today, eventStart(event));
}

function groupsLabel(event) {
  const g = event.groups || [];
  if (g.includes("BNK48") && g.includes("CGM48")) return "BNK48 & CGM48";
  return g.join(" / ");
}

function loadPassport() {
  try {
    let raw = localStorage.getItem(KEY_PASSPORT);
    if (!raw) raw = localStorage.getItem(KEY_PASSPORT_LEGACY);
    const parsed = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.map(String));
  } catch {
    return new Set();
  }
}

function savePassport(set) {
  localStorage.setItem(KEY_PASSPORT, JSON.stringify([...set]));
}

function prunePassport(visited, events, today) {
  let changed = false;
  for (const id of [...visited]) {
    const event = events.find((s) => s.id === id);
    if (!event || !canTick(event, today)) {
      visited.delete(id);
      changed = true;
    }
  }
  if (changed) savePassport(visited);
  return visited;
}

function memberLabel(m) {
  return m.nameTh || m.name || "";
}

function memberSecondary(m) {
  if (m.nameTh && m.name && m.nameTh !== m.name) return m.name;
  return "";
}

function allMembers(events) {
  const map = new Map();
  const add = (m, event, day) => {
    if (!m?.id) return;
    if (!map.has(m.id)) map.set(m.id, { ...m, stops: [] });
    const rec = map.get(m.id);
    rec.stops.push({ stop: event, event, day });
    if (m.confirmed) rec.confirmed = true;
  };
  for (const event of events) {
    for (const day of event.days || []) {
      for (const m of day.members || []) add(m, event, day);
    }
    for (const ch of event.handshake?.changes || []) {
      if (ch.member) add(ch.member, event, { date: ch.to?.date || eventStart(event) });
    }
  }
  return [...map.values()].sort((a, b) => {
    if (!!a.confirmed !== !!b.confirmed) return a.confirmed ? -1 : 1;
    return memberLabel(a).localeCompare(memberLabel(b), "th");
  });
}

function displayVenue(event) {
  return event.venueTh || event.venueEn || "ยังไม่ทราบสถานที่";
}

function venueLine(event) {
  const bits = [];
  if (event.venueDetailTh) bits.push(event.venueDetailTh);
  if (event.cityTh) bits.push(event.cityTh);
  return bits.join(" · ");
}

function sourceById(data, id) {
  return (data.meta.sources || []).find((s) => s.id === id);
}

function officialSource(event, data) {
  return (event.sources || [])
    .map((id) => sourceById(data, id))
    .find((s) => s && s.kind === "official") || null;
}

function songTitle(item) {
  return item.nameTh || item.name || item.labelTh || "";
}

function songSecondary(item) {
  if (item.type === "mc") return "";
  if (item.nameTh && item.name && item.nameTh !== item.name) return item.name;
  return "";
}

function searchBlob(event, data) {
  const series = seriesOf(event, data);
  const parts = [
    series?.nameTh,
    series?.nameEn,
    series?.description,
    typeLabel(typeOf(event, data)),
    event.venueTh,
    event.venueEn,
    event.venueDetailTh,
    event.cityTh,
    event.team,
    series?.team,
    ...(event.groups || []),
    ...(event.days || []).flatMap((d) => [
      d.date,
      d.membersNote,
      ...(d.members || []).flatMap((m) => [m.nameTh, m.name, m.id]),
      ...(d.setlist || []).flatMap((s) => [s.nameTh, s.name, s.labelTh]),
    ]),
    ...(event.handshake?.changes || []).flatMap((ch) => [ch.member?.nameTh, ch.member?.name, ch.member?.id, ch.noteTh]),
  ];
  return parts.filter(Boolean).join(" ").toLowerCase();
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

function eventCmpUpcoming(a, b) {
  return eventStart(a).localeCompare(eventStart(b)) || eventEnd(a).localeCompare(eventEnd(b)) || a.id.localeCompare(b.id);
}

function nextEvent(events, today) {
  const upcoming = events
    .filter((s) => eventEnd(s) >= today)
    .sort(eventCmpUpcoming);
  return upcoming[0] || null;
}

function memberNext(entry, today) {
  const future = entry.stops
    .filter(({ day }) => day.date >= today)
    .sort((a, b) => a.day.date.localeCompare(b.day.date));
  return future[0] || null;
}

function sortEvents(list, today, mode) {
  const copy = [...list];
  if (mode === "oldest") {
    return copy.sort((a, b) => eventStart(a).localeCompare(eventStart(b)) || a.id.localeCompare(b.id));
  }
  const upcoming = copy
    .filter((s) => eventEnd(s) >= today)
    .sort(eventCmpUpcoming);
  const past = copy
    .filter((s) => eventEnd(s) < today)
    .sort((a, b) => eventStart(b).localeCompare(eventStart(a)) || b.id.localeCompare(a.id));
  return [...upcoming, ...past];
}

function parseScheduleSpan(event) {
  const times = (event.schedule || [])
    .concat(event.showTimes || [])
    .map((s) => String(s.time || "").split(/[–-]/).map((t) => t.trim()))
    .filter((p) => p.length === 2 && /^\d{1,2}:\d{2}$/.test(p[0]) && /^\d{1,2}:\d{2}$/.test(p[1]));
  if (!times.length) return null;
  const compact = (t) => t.replace(":", "").padStart(4, "0");
  const start = times.map((p) => p[0]).sort((a, b) => compact(a).localeCompare(compact(b)))[0];
  const end = times.map((p) => p[1]).sort((a, b) => compact(b).localeCompare(compact(a)))[0];
  return { start, end };
}

function icsStamp(date = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return (
    date.getUTCFullYear() +
    p(date.getUTCMonth() + 1) +
    p(date.getUTCDate()) +
    "T" +
    p(date.getUTCHours()) +
    p(date.getUTCMinutes()) +
    p(date.getUTCSeconds()) +
    "Z"
  );
}

function icsFold(line) {
  const bytes = [...new TextEncoder().encode(line)];
  if (bytes.length <= 75) return line;
  const out = [];
  let chunk = [];
  for (const b of bytes) {
    if (chunk.length >= 75) {
      out.push(new TextDecoder().decode(Uint8Array.from(chunk)));
      chunk = [0x20, b];
    } else chunk.push(b);
  }
  if (chunk.length) out.push(new TextDecoder().decode(Uint8Array.from(chunk)));
  return out.join("\r\n");
}

function icsLocal(iso, hm) {
  const { y, m, d } = fromISO(iso);
  const [hh, mm] = hm.split(":").map((n) => n.padStart(2, "0"));
  return `${y}${String(m).padStart(2, "0")}${String(d).padStart(2, "0")}T${hh}${mm}00`;
}

function icsDate(iso) {
  const { y, m, d } = fromISO(iso);
  return `${y}${String(m).padStart(2, "0")}${String(d).padStart(2, "0")}`;
}

function nextDateISO(iso) {
  const { y, m, d } = fromISO(iso);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`;
}

function isContinuous(event) {
  if (event.continuous) return true;
  const dates = event.dates || [];
  if (dates.length < 3) return false;
  return dates.every((d, i) => i === 0 || d === nextDateISO(dates[i - 1]));
}

function seriesTitle(event, data) {
  return seriesOf(event, data)?.nameTh || typeLabel(typeOf(event, data));
}

function buildIcs(event, data) {
  const span = parseScheduleSpan(event);
  const venue = displayVenue(event);
  const loc = [event.venueDetailTh, venue, event.cityTh].filter(Boolean).join(", ");
  const title = `${seriesTitle(event, data)} · ${venue}`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//sarabun48th//48-events//TH",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VTIMEZONE",
    "TZID:Asia/Bangkok",
    "X-LIC-LOCATION:Asia/Bangkok",
    "BEGIN:STANDARD",
    "TZOFFSETFROM:+0700",
    "TZOFFSETTO:+0700",
    "TZNAME:ICT",
    "DTSTART:19700101T000000",
    "END:STANDARD",
    "END:VTIMEZONE",
  ];
  const stamp = icsStamp();
  const dates = event.dates.length ? event.dates : [eventStart(event)];
  const oneBlock = !span && isContinuous(event);
  const blocks = oneBlock ? [dates[0]] : dates;
  blocks.forEach((date, i) => {
    const day = (event.days || []).find((d) => d.date === date);
    const names = (day?.members || []).map(memberLabel).filter(Boolean).join(", ");
    const desc = [
      names ? `สมาชิก: ${names}` : "",
      ...(event.schedule || []).map((s) => [s.time, s.labelTh].filter(Boolean).join(" ")),
      event.scheduleNote || "",
    ]
      .filter(Boolean)
      .join("\\n");
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:48-events-${event.id}-${date}@sarabun48th.space`);
    lines.push(`DTSTAMP:${stamp}`);
    if (span && !oneBlock) {
      lines.push(`DTSTART;TZID=Asia/Bangkok:${icsLocal(date, span.start)}`);
      lines.push(`DTEND;TZID=Asia/Bangkok:${icsLocal(date, span.end)}`);
    } else if (span && oneBlock) {
      lines.push(`DTSTART;TZID=Asia/Bangkok:${icsLocal(dates[0], span.start)}`);
      lines.push(`DTEND;TZID=Asia/Bangkok:${icsLocal(dates[dates.length - 1], span.end)}`);
    } else if (oneBlock) {
      lines.push(`DTSTART;VALUE=DATE:${icsDate(dates[0])}`);
      lines.push(`DTEND;VALUE=DATE:${icsDate(nextDateISO(dates[dates.length - 1]))}`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${icsDate(date)}`);
      lines.push(`DTEND;VALUE=DATE:${icsDate(nextDateISO(date))}`);
    }
    lines.push(`SUMMARY:${title}${!oneBlock && dates.length > 1 ? ` (วันที่ ${i + 1})` : ""}`);
    if (loc) lines.push(`LOCATION:${loc}`);
    if (desc) lines.push(`DESCRIPTION:${desc}`);
    lines.push("END:VEVENT");
  });
  lines.push("END:VCALENDAR");
  return lines.map(icsFold).join("\r\n") + "\r\n";
}

function downloadIcs(event, data) {
  const ics = buildIcs(event, data);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `48-events-${event.id}.ics`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function membersHtml(day, activeMember) {
  const members = day.members || [];
  const note = day.membersNote ? `<p class="muted-line">${esc(day.membersNote)}</p>` : "";
  if (!members.length) return note;
  const chips = `<div class="member-row">${members
    .map((m) => {
      const on = activeMember === m.id ? " is-on" : "";
      const wait = m.confirmed ? "" : `<span class="chip-count">รอตรวจสอบ</span>`;
      const sec = memberSecondary(m);
      const label = esc(memberLabel(m));
      return `<button type="button" class="chip member-chip${on}" data-filter="member:${esc(m.id)}" aria-pressed="${activeMember === m.id ? "true" : "false"}" title="${esc(sec)}">${label}${wait}</button>`;
    })
    .join("")}</div>`;
  return chips + note;
}

function renderNextHook(event, today, data, activeMember) {
  const el = $("next-hook");
  if (!event) {
    el.className = "wrap hook";
    el.innerHTML = `
      <p class="hook-kicker">งานถัดไป</p>
      <p class="hook-countdown">รอประกาศงานถัดไป</p>
      <p class="hook-next-meta">ยังไม่มีงานถัดไปในข้อมูลนี้ ถ้ามีประกาศใหม่ สามารถเพิ่มใน data.json ได้</p>`;
    return;
  }
  const status = statusOf(event, today);
  const count = hookCountdown(event, today);
  const city = event.cityTh ? ` · ${event.cityTh}` : "";
  const src = officialSource(event, data);
  const series = seriesOf(event, data);
  const visibleDays = (event.days || []).filter((d) => (d.members || []).length || d.membersNote || (d.setlist || []).length);
  const daysHtml = visibleDays
    .map((d) => {
      const mem = membersHtml(d, activeMember);
      return `<div class="hook-day">
        <p class="day-date">${esc(formatDay(d.date, { withYear: false }))}</p>
        ${mem}
      </div>`;
    })
    .join("");
  const srcHtml = src
    ? `<a class="src-link" href="${esc(src.url)}" target="_blank" rel="noopener">ที่มา @${esc(src.handle)}</a>`
    : "";
  el.className = "wrap hook is-next";
  el.innerHTML = `
    <p class="hook-kicker">${status === "now" ? "งานวันนี้" : "งานถัดไป"}${series ? ` · ${esc(series.nameTh)}` : ""}</p>
    <p class="hook-countdown">${esc(count)}</p>
    <p class="hook-next-title">${esc(displayVenue(event))}</p>
    <p class="hook-next-meta">${esc(formatRange(event.dates))}${esc(city)}${groupsLabel(event) ? ` · ${esc(groupsLabel(event))}` : ""}</p>
    ${daysHtml ? `<div class="hook-days">${daysHtml}</div>` : ""}
    <p class="hook-source">${srcHtml}<button type="button" class="btn ghost" data-ics="${esc(event.id)}">เพิ่มในปฏิทิน</button></p>`;
}

function updatePassport(visited, total) {
  const n = visited.size;
  $("passport-count").innerHTML = `ไปงานมาแล้ว <span>${n}</span> / ${total} งาน`;
  const bar = $("progress-bar");
  bar.style.width = total ? `${(n / total) * 100}%` : "0";
  const progress = $("progress");
  progress.setAttribute("aria-valuenow", String(n));
  progress.setAttribute("aria-valuemax", String(total));
  progress.classList.toggle("is-empty", n === 0);
  $("progress-hint").hidden = n !== 0;
}

function chipButton(id, label, on, extraClass = "") {
  return `<button type="button" class="chip ${extraClass}${on ? " is-on" : ""}" data-filter="${esc(id)}" aria-pressed="${on ? "true" : "false"}">${label}</button>`;
}

function renderFilters({ events, data, type, seriesId, group, team, members, memberId, expanded }) {
  const presentTypes = new Set(events.map((e) => typeBucket(typeOf(e, data))));
  const typeRow = TYPE_CHIPS
    .filter((t) => !t.id || presentTypes.has(t.id))
    .map((t) => chipButton(t.id ? `type:${t.id}` : "type:", esc(t.label), type === t.id))
    .join("");

  const seriesList = (data.series || []).filter((s) => events.some((e) => e.seriesId === s.id));
  const seriesRow = [
    chipButton("series:", "ทั้งหมด", !seriesId),
    ...seriesList.map((s) => chipButton(`series:${s.id}`, esc(s.nameTh), seriesId === s.id)),
  ].join("");

  const groups = [
    { id: "", label: "ทั้งหมด", cls: "" },
    { id: "BNK48", label: "BNK48", cls: "bnk" },
    { id: "CGM48", label: "CGM48", cls: "cgm" },
  ];
  const groupRow = groups
    .map((g) => {
      const icon = g.id ? "<i></i>" : "";
      return chipButton(g.id ? `group:${g.id}` : "group:", `${icon}${esc(g.label)}`, group === g.id, g.cls);
    })
    .join("");

  const teams = [...new Set(events.map((e) => teamOf(e, data)).filter(Boolean))];
  const teamRow = teams.length
    ? `<div class="filter-row" role="group" aria-label="กรองตามทีม">
        <span class="filter-label">ทีม</span>
        ${chipButton("team:", "ทั้งหมด", !team)}
        ${teams.map((t) => chipButton(`team:${t}`, esc(t), team === t)).join("")}
      </div>`
    : "";

  let shown = expanded || members.length <= MEMBER_CHIP_LIMIT ? members : members.slice(0, MEMBER_CHIP_LIMIT);
  if (memberId && !shown.some((m) => m.id === memberId)) {
    const extra = members.find((m) => m.id === memberId);
    if (extra) shown = [...shown.slice(0, Math.max(0, MEMBER_CHIP_LIMIT - 1)), extra];
  }
  const hidden = Math.max(0, members.length - shown.length);
  const memberRow =
    shown
      .map((m) => {
        const label = esc(memberLabel(m));
        return `<button type="button" class="chip member-chip${memberId === m.id ? " is-on" : ""}" data-filter="member:${esc(m.id)}" aria-pressed="${memberId === m.id ? "true" : "false"}">${label}</button>`;
      })
      .join("") +
    (hidden && !expanded
      ? `<button type="button" class="chip more-chips" data-more-members="1">ดูทั้งหมด (${members.length})</button>`
      : expanded && members.length > MEMBER_CHIP_LIMIT
        ? `<button type="button" class="chip more-chips is-on" data-more-members="0">ย่อ</button>`
        : "");

  $("filters").innerHTML = `
    <div class="filter-row" role="group" aria-label="กรองตามประเภท">
      <span class="filter-label">ประเภท</span>${typeRow}
    </div>
    <div class="filter-row" role="group" aria-label="กรองตามซีรีส์">
      <span class="filter-label">ซีรีส์</span>${seriesRow}
    </div>
    <div class="filter-row" role="group" aria-label="กรองตามวง">
      <span class="filter-label">วง</span>${groupRow}
    </div>
    ${teamRow}
    <div class="filter-row" role="group" aria-label="กรองตามสมาชิก">
      <span class="filter-label">สมาชิก</span>${memberRow}
    </div>`;
}

function renderSort(mode) {
  $("sort-row").innerHTML = `
    <span class="filter-label">เรียง</span>
    <button type="button" class="chip${mode === "upcoming" ? " is-on" : ""}" data-sort="upcoming" aria-pressed="${mode === "upcoming" ? "true" : "false"}">ถัดไปก่อน</button>
    <button type="button" class="chip${mode === "oldest" ? " is-on" : ""}" data-sort="oldest" aria-pressed="${mode === "oldest" ? "true" : "false"}">เก่าสุดก่อน</button>`;
}

function renderMemberSummary(entry, today) {
  const box = $("member-summary");
  if (!entry) {
    box.hidden = true;
    box.innerHTML = "";
    return;
  }
  const days = entry.stops.length;
  const nxt = memberNext(entry, today);
  let nextHtml = "รอประกาศงานถัดไป";
  if (nxt) {
    const ev = nxt.event || nxt.stop;
    const count = hookCountdown(ev, today);
    nextHtml = `${count ? count + " · " : ""}${displayVenue(ev)} · ${formatDay(nxt.day.date, { withYear: false })}`;
  }
  box.hidden = false;
  box.innerHTML = `
    <p class="who">${esc(memberLabel(entry))}${entry.confirmed ? "" : " · รอตรวจสอบ"}</p>
    <p class="next">ปรากฏในข้อมูล ${days} งาน · งานถัดไป: <strong>${esc(nextHtml)}</strong></p>
    <p class="clear"><button type="button" class="chip" id="clear-member">ล้างตัวกรองสมาชิก</button></p>`;
}

function setlistHtml(day, data) {
  if (day.setlistStatus === "none" || !(day.setlist || []).length) return "";
  const items = (day.setlist || [])
    .map((item, i) => {
      const wait = item.confirmed ? "" : `<span class="chip-count">รอตรวจสอบ</span>`;
      const sec = songSecondary(item);
      const src = item.sourceId ? sourceById(data, item.sourceId) : null;
      const srcLink = src ? `<a class="src-link" href="${esc(src.url)}" target="_blank" rel="noopener">ที่มา @${esc(src.handle)}</a>` : "";
      if (item.type === "mc") {
        return `<li class="set-item is-mc"><span class="n">${i + 1}</span><div class="names"><div class="primary">${esc(item.labelTh || "MC")}</div></div>${wait}</li>`;
      }
      return `<li class="set-item">
        <span class="n">${i + 1}</span>
        <div class="names">
          <div class="primary">${esc(songTitle(item))}</div>
          ${sec ? `<div class="secondary">${esc(sec)}</div>` : ""}
        </div>
        ${wait}${srcLink}
      </li>`;
    })
    .join("");
  const hint = day.setlistStatus === "hints" ? `<p class="muted-line">ยังไม่ใช่เซ็ตลิสต์ทั้งโชว์ รายการที่ยังไม่ยืนยันติดป้ายรอตรวจสอบ</p>` : "";
  return `${hint}<ol class="setlist">${items}</ol>`;
}

function scheduleHtml(event) {
  const items = (event.schedule || []).filter((s) => s.time || s.labelTh);
  if (!items.length && !event.scheduleNote) return "";
  const list = items.length
    ? `<ul class="schedule">${items
        .map((s) => `<li class="schedule-item">${s.time ? `<span class="time">${esc(s.time)}</span>` : ""}<span>${esc(s.labelTh || "")}</span></li>`)
        .join("")}</ul>`
    : "";
  const note = event.scheduleNote ? `<p class="muted-line">${esc(event.scheduleNote)}</p>` : "";
  return list + note;
}

function showTimesHtml(event) {
  const items = (event.showTimes || []).filter((s) => s.time || s.labelTh);
  if (!items.length) return "";
  return `<div class="showtimes">
    <p class="filter-label">รอบแสดง</p>
    ${items.map((s) => `<p>${s.time ? `<strong>${esc(s.time)}</strong> ` : ""}${esc(s.labelTh || "")}</p>`).join("")}
  </div>`;
}

function handshakeHtml(event, data) {
  const hs = event.handshake;
  if (!hs) return "";
  const bits = [];
  if (hs.laneCount) bits.push(`<p>แผนผังทางการมี ${esc(String(hs.laneCount))} เลน</p>`);
  if (hs.planNote) bits.push(`<p>${esc(hs.planNote)}</p>`);
  for (const ch of hs.changes || []) {
    const src = ch.sourceId ? sourceById(data, ch.sourceId) : null;
    const name = memberLabel(ch.member || {}) || "สมาชิก";
    const from = ch.from ? `${formatDay(ch.from.date, { withYear: false })} ${ch.from.time || ""} (เลน ${ch.from.lane})` : "";
    const to = ch.to ? `${formatDay(ch.to.date, { withYear: false })} ${ch.to.time || ""} (เลน ${ch.to.lane})` : "";
    const srcLink = src ? `<a class="src-link" href="${esc(src.url)}" target="_blank" rel="noopener">ที่มา @${esc(src.handle)}</a>` : "";
    bits.push(`<p><strong>${esc(name)}</strong> ย้ายจาก ${esc(from.trim())} ไป ${esc(to.trim())}${ch.noteTh ? ` · ${esc(ch.noteTh)}` : ""} ${srcLink}</p>`);
  }
  if (!bits.length) return "";
  return `<div class="handshake-box">${bits.join("")}</div>`;
}

function eventCard(event, today, visited, nextId, data, activeMember) {
  const status = statusOf(event, today);
  const checked = visited.has(event.id);
  const tickable = canTick(event, today);
  const series = seriesOf(event, data);
  const typ = typeOf(event, data);
  const cls = ["stop", status === "past" ? "is-past" : "", status === "now" ? "is-now" : "", event.id === nextId ? "is-next" : ""]
    .filter(Boolean)
    .join(" ");
  const badges = [];
  badges.push(`<span class="badge type">${esc(typeLabel(typ))}</span>`);
  if (event.official) badges.push(`<span class="badge official">ทางการ</span>`);
  if (event.unconfirmed) badges.push(`<span class="badge wait">รอตรวจสอบ</span>`);
  (event.groups || []).forEach((g) => badges.push(`<span class="badge ${g === "CGM48" ? "cgm" : "bnk"}">${esc(g)}</span>`));
  const warn = event.unconfirmedNote ? `<p class="warn">${esc(event.unconfirmedNote)}</p>` : "";
  const line = venueLine(event);
  const secVenue = event.venueEn && event.venueTh && event.venueEn !== event.venueTh ? `<span class="sec"> ${esc(event.venueEn)}</span>` : "";
  const kicker = series ? `<p class="series-kicker">${esc(series.nameTh)}</p>` : "";
  const schedule = scheduleHtml(event);
  const showtimes = showTimesHtml(event);
  const handshake = handshakeHtml(event, data);
  const days = (event.days || [])
    .map((d) => {
      const mem = membersHtml(d, activeMember);
      const set = setlistHtml(d, data);
      if (!mem && !set) return "";
      return `<div class="day">
        <p class="day-date">${esc(formatDay(d.date, { withYear: false }))}</p>
        ${mem}
        ${set}
      </div>`;
    })
    .join("");
  const srcLinks = (event.sources || [])
    .map((id) => sourceById(data, id))
    .filter(Boolean)
    .map((s) => {
      const kind = s.kind === "official" ? "ทางการ" : "แฟนคลับ";
      return `<a href="${esc(s.url)}" target="_blank" rel="noopener">${kind} @${esc(s.handle)}</a>`;
    })
    .join("");

  const passport = tickable
    ? `<button type="button" class="passport-toggle${checked ? " is-on" : ""}" data-visit="${esc(event.id)}" aria-pressed="${checked ? "true" : "false"}">
        <span class="box" aria-hidden="true">${checked ? "✓" : ""}</span>
        ${checked ? "ไปแล้ว" : "ติ๊กว่าไปแล้ว"}
      </button>`
    : `<button type="button" class="passport-toggle is-disabled" disabled data-visit="${esc(event.id)}" aria-disabled="true">
        <span class="box" aria-hidden="true"></span>
        ยังไม่ถึงวันจัด
      </button>
      <p class="passport-hint">ติ๊กได้ตั้งแต่วันแรกของงาน (${esc(formatDay(eventStart(event), { withYear: false }))})</p>`;

  return `<article class="${cls}" id="stop-${esc(event.id)}" data-id="${esc(event.id)}">
    <div class="stop-head">
      <div class="stop-head-main">
        ${kicker}
        <p class="stop-date">${esc(formatRange(event.dates))}</p>
        <h3 class="stop-title">${esc(displayVenue(event))}${secVenue}</h3>
        ${line ? `<p class="stop-venue">${esc(line)}</p>` : ""}
      </div>
      <div class="stop-flags">${badges.join("")}</div>
    </div>
    ${passport}
    ${warn}
    ${schedule}
    ${showtimes}
    ${handshake}
    ${days ? `<div class="days${(event.days || []).length > 1 ? " is-multi" : ""}">${days}</div>` : ""}
    <p class="stop-sources">${srcLinks}</p>
  </article>`;
}

function confirmedSongStats(events) {
  const map = new Map();
  let setlists = 0;
  for (const event of events) {
    for (const day of event.days || []) {
      if (day.setlistStatus !== "confirmed") continue;
      const songs = (day.setlist || []).filter((i) => i.type === "song" && i.confirmed);
      if (!songs.length) continue;
      setlists += 1;
      for (const item of songs) {
        const key = item.songId || songTitle(item);
        if (!map.has(key)) map.set(key, { ...item, count: 0, days: [], order: map.size });
        const rec = map.get(key);
        rec.count += 1;
        rec.days.push({ stop: event, event, day });
      }
    }
  }
  const list = [...map.values()].sort((a, b) => b.count - a.count || a.order - b.order);
  return { list, setlists };
}

function renderStats(events) {
  const section = $("stats");
  const { list, setlists } = confirmedSongStats(events);
  const hint = $("stats-hint");
  const ol = $("song-stats");
  const title = $("stats-title");
  if (!setlists) {
    section.hidden = true;
    ol.innerHTML = "";
    return;
  }
  section.hidden = false;
  const ranked = setlists >= 2;
  title.innerHTML = ranked
    ? `เพลงที่ร้องบ่อย <small>Setlist</small>`
    : `เซ็ตลิสต์ที่ยืนยันแล้ว <small>Setlist</small>`;
  hint.textContent = ranked
    ? `นับจากเซ็ตลิสต์ที่ยืนยันแล้ว ${setlists} เซ็ต เพลงจากแฟนแคมที่ติดป้ายรอตรวจสอบไม่ถูกนับ`
    : "จาก 1 เซ็ตลิสต์ที่ยืนยันแล้ว";
  ol.className = "song-stats" + (ranked ? "" : " is-plain");
  ol.innerHTML = list
    .map((s, i) => {
      const sec = songSecondary(s);
      return `<li class="song-stat">
        <span class="num">${i + 1}</span>
        <div class="names">
          <div class="primary">${esc(songTitle(s))}</div>
          ${sec ? `<div class="secondary">${esc(sec)}</div>` : ""}
        </div>
        <span class="times">${s.count} ครั้ง</span>
      </li>`;
    })
    .join("");
}

function eventHasMember(event, memberId) {
  if ((event.days || []).some((d) => (d.members || []).some((m) => m.id === memberId))) return true;
  return (event.handshake?.changes || []).some((ch) => ch.member?.id === memberId);
}

function matchesFilters(event, data, { q, type, seriesId, group, team, memberId }) {
  if (q && !searchBlob(event, data).includes(q)) return false;
  if (type && typeBucket(typeOf(event, data)) !== type) return false;
  if (seriesId && event.seriesId !== seriesId) return false;
  if (group && !(event.groups || []).includes(group)) return false;
  if (team && teamOf(event, data) !== team) return false;
  if (memberId && !eventHasMember(event, memberId)) return false;
  return true;
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

function drawBadge(ctx, text, x, y, fill, stroke, ink) {
  ctx.font = `700 20px Sarabun, 'Noto Sans Thai', system-ui, sans-serif`;
  const w = ctx.measureText(text).width + 22;
  const h = 32;
  ctx.fillStyle = fill;
  roundRect(ctx, x, y, w, h, 16);
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = ink;
  ctx.fillText(text, x + 11, y + 22);
  return w;
}

function fitText(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text;
  let s = String(text);
  while (s.length && ctx.measureText(s + "…").width > maxW) s = s.slice(0, -1);
  return s + "…";
}

function drawShareCard(events, visited, today, data) {
  const canvas = $("share-canvas");
  const ctx = canvas.getContext("2d");
  const W = 1200, H = 675;
  canvas.width = W;
  canvas.height = H;
  const accent = "#c391c1";
  const ink = "#f5f3f4";
  const muted = "#a8a2a6";
  const font = "Sarabun, 'Noto Sans Thai', system-ui, sans-serif";
  const total = events.length;
  const n = visited.size;
  const attended = events.filter((s) => visited.has(s.id));
  const upcoming = nextEvent(events, today);

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
  ctx.fillText("สารบัญ48th  ·  ตามงาน 48", 72, 48);

  ctx.fillStyle = muted;
  ctx.font = `700 22px ${font}`;
  ctx.fillText("ไปงานมาแล้ว", 72, 112);

  ctx.fillStyle = ink;
  ctx.font = `800 76px ${font}`;
  ctx.fillText(`${n}/${total} งาน`, 72, 196);

  const barX = 72, barY = 220, barW = W - 72 - 72, barH = 16;
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  roundRect(ctx, barX, barY, barW, barH, 10);
  ctx.fill();
  const fillW = total ? Math.max(n ? 10 : 0, Math.round((n / total) * barW)) : 0;
  if (fillW) {
    ctx.fillStyle = accent;
    roundRect(ctx, barX, barY, fillW, barH, 10);
    ctx.fill();
  }

  const bottomTop = 260;
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  roundRect(ctx, 56, bottomTop, W - 56 - 48, 332, 20);
  ctx.fill();
  ctx.fillStyle = accent;
  ctx.fillRect(56, bottomTop + 16, 8, 300);

  const textMax = W - 88 - 72;
  let y = bottomTop + 46;
  if (!n) {
    ctx.fillStyle = muted;
    ctx.font = `600 28px ${font}`;
    ctx.fillText("ติ๊กงานที่ไปแล้ว แล้วแชร์การ์ดนี้ได้", 88, y);
  } else {
    attended.slice(0, 3).forEach((s) => {
      ctx.fillStyle = muted;
      ctx.font = `600 16px ${font}`;
      ctx.fillText(fitText(ctx, seriesTitle(s, data), textMax), 88, y);
      y += 24;
      ctx.fillStyle = ink;
      ctx.font = `800 26px ${font}`;
      ctx.fillText(fitText(ctx, displayVenue(s), textMax), 88, y);
      y += 28;
      ctx.fillStyle = muted;
      ctx.font = `700 20px ${font}`;
      const dateText = formatRange(s.dates, { withYear: false });
      ctx.fillText(dateText, 88, y);
      let bx = 88 + ctx.measureText(dateText).width + 14;
      const groups = s.groups || [];
      groups.forEach((g) => {
        const isCgm = g === "CGM48";
        bx += drawBadge(
          ctx,
          g,
          bx,
          y - 20,
          isCgm ? "rgba(73,197,168,.16)" : "rgba(195,145,193,.16)",
          isCgm ? "rgba(73,197,168,.55)" : "rgba(195,145,193,.55)",
          ink,
        ) + 8;
      });
      y += 34;
    });
    if (attended.length > 3) {
      ctx.fillStyle = muted;
      ctx.font = `600 20px ${font}`;
      ctx.fillText(`และอีก ${attended.length - 3} งาน`, 88, y);
      y += 28;
    }
    if (n <= 2 && upcoming) {
      ctx.fillStyle = ink;
      ctx.font = `700 22px ${font}`;
      ctx.fillText(fitText(ctx, `งานถัดไป: ${displayVenue(upcoming)} ${formatRangeShort(upcoming.dates)}`, textMax), 88, y);
    }
  }

  ctx.fillStyle = ink;
  ctx.font = `700 24px ${font}`;
  ctx.fillText("เช็กของคุณได้ที่ sarabun48th.space", 88, bottomTop + 308);

  ctx.fillStyle = muted;
  ctx.font = `500 20px ${font}`;
  ctx.fillText("ทำโดยแฟนคลับ เพื่อแฟนคลับ", 72, 636);

  const url = canvas.toDataURL("image/png");
  $("share-preview").src = url;
  const a = $("share-download");
  a.href = url;
  a.download = "48-events-card.png";
  return url;
}

async function shareImage(dataUrl, visited, total) {
  const blob = await (await fetch(dataUrl)).blob();
  const file = new File([blob], "48-events-card.png", { type: "image/png" });
  const text = `ไปงานมาแล้ว ${visited.size}/${total} งาน`;
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({ files: [file], title: "สารบัญ48th · ตามงาน 48", text });
    return;
  }
  if (navigator.share) {
    await navigator.share({ title: "สารบัญ48th · ตามงาน 48", text, url: location.href });
    return;
  }
  $("share-download").click();
}

async function main() {
  const res = await fetch("/48-events/data.json", { cache: "no-store" });
  if (!res.ok) throw new Error("data");
  const data = await res.json();
  const events = data.events || data.stops || [];
  const today = todayISO();
  const visited = prunePassport(loadPassport(), events, today);
  const members = allMembers(events);
  const upcoming = nextEvent(events, today);
  let type = "";
  let seriesId = "";
  let group = "";
  let team = "";
  let memberId = "";
  let query = "";
  let sortMode = "upcoming";
  let membersExpanded = false;

  fillChrome(data);
  updatePassport(visited, events.length);
  renderNextHook(upcoming, today, data, memberId);
  renderSort(sortMode);

  const filtersEl = $("filters");
  const toggle = $("filters-toggle");
  toggle.addEventListener("click", () => {
    const open = !filtersEl.classList.contains("is-open");
    filtersEl.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });

  function filtered() {
    const q = query.trim().toLowerCase();
    return events.filter((event) => matchesFilters(event, data, { q, type, seriesId, group, team, memberId }));
  }

  function render() {
    const list = sortEvents(filtered(), today, sortMode);
    const nextId = upcoming?.id || "";
    $("stops").innerHTML = list.map((event) => eventCard(event, today, visited, nextId, data, memberId)).join("");
    $("count").textContent = `พบ ${list.length} งาน`;
    $("empty").hidden = list.length > 0;
    renderFilters({ events, data, type, seriesId, group, team, members, memberId, expanded: membersExpanded });
    renderSort(sortMode);
    renderMemberSummary(memberId ? members.find((m) => m.id === memberId) : null, today);
    renderStats(list);
    toggle.classList.toggle("is-active", !!(type || seriesId || group || team || memberId));
  }

  $("q").addEventListener("input", (e) => {
    query = e.target.value;
    render();
  });

  document.addEventListener("click", (e) => {
    const more = e.target.closest("[data-more-members]");
    if (more) {
      membersExpanded = more.getAttribute("data-more-members") === "1";
      render();
      return;
    }
    const sortBtn = e.target.closest("[data-sort]");
    if (sortBtn) {
      sortMode = sortBtn.getAttribute("data-sort") || "upcoming";
      render();
      return;
    }
    const icsBtn = e.target.closest("[data-ics]");
    if (icsBtn) {
      const event = events.find((s) => s.id === icsBtn.getAttribute("data-ics"));
      if (event) downloadIcs(event, data);
      return;
    }
    const filterBtn = e.target.closest("[data-filter]");
    if (filterBtn) {
      const raw = filterBtn.getAttribute("data-filter") || "";
      if (raw.startsWith("type:")) {
        const id = raw.slice(5);
        type = type === id ? "" : id;
      } else if (raw.startsWith("series:")) {
        const id = raw.slice(7);
        seriesId = seriesId === id ? "" : id;
      } else if (raw.startsWith("group:")) {
        const id = raw.slice(6);
        group = group === id ? "" : id;
      } else if (raw.startsWith("team:")) {
        const id = raw.slice(5);
        team = team === id ? "" : id;
      } else if (raw.startsWith("member:")) {
        const id = raw.slice(7);
        memberId = memberId === id ? "" : id;
        if (memberId && window.matchMedia("(max-width:720px)").matches) {
          filtersEl.classList.add("is-open");
        }
      }
      render();
      return;
    }
    if (e.target.closest("#clear-member")) {
      memberId = "";
      render();
      return;
    }
    const visitBtn = e.target.closest("[data-visit]");
    if (visitBtn) {
      if (visitBtn.disabled || visitBtn.getAttribute("aria-disabled") === "true") return;
      const id = visitBtn.getAttribute("data-visit");
      const event = events.find((s) => s.id === id);
      if (!event || !canTick(event, today)) return;
      if (visited.has(id)) visited.delete(id);
      else visited.add(id);
      savePassport(visited);
      updatePassport(visited, events.length);
      render();
    }
  });

  const dialog = $("share-dialog");
  $("share").addEventListener("click", () => {
    drawShareCard(events, visited, today, data);
    dialog.showModal();
  });
  $("share-share").addEventListener("click", async () => {
    const url = drawShareCard(events, visited, today, data);
    try {
      await shareImage(url, visited, events.length);
    } catch {
      /* user cancelled */
    }
  });

  render();
}

main().catch((err) => {
  console.error(err);
  const el = $("stops");
  if (el) el.innerHTML = `<p class="empty">โหลดข้อมูลไม่สำเร็จ ลองรีเฟรชหน้านี้อีกครั้งนะ</p>`;
});
