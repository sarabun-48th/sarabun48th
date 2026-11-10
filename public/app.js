import { TOOLS } from "/tools.js";
import { SITE } from "/config.js";

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const BADGE = { prod: "พร้อมใช้ · Live" };
const loadedAt = Date.now();

// Tool cards (no "ทดลอง · Demo" badge)
$("#cards").innerHTML = TOOLS.map((t) => `
  <a class="card tool" href="${esc(t.href)}">
    ${t.status === "prod" ? `<span class="badge prod">${BADGE.prod}</span>` : ""}
    <h3>${esc(t.name)}</h3>
    <p>${esc(t.desc)}</p>
    <span class="go">เปิดใช้ →</span>
  </a>`).join("") + `
  <a class="card tool soon" href="#suggest">
    <h3>เครื่องมือถัดไป?</h3>
    <p>กำลังทำอีกเรื่อยๆ อยากได้อะไร เสนอมาได้</p>
    <span class="go">เสนอไอเดีย →</span>
  </a>`;

// Feedback tool dropdown
$("#tool-select").innerHTML = TOOLS.map((t) => `<option value="${esc(t.id)}">${esc(t.name)}</option>`).join("") +
  `<option value="general">เว็บนี้ / เรื่องทั่วไป</option>`;
const pre = new URLSearchParams(location.search).get("tool");
if (pre && TOOLS.some((t) => t.id === pre)) $("#tool-select").value = pre;

// Footer social links (empty values are hidden)
const X_ICON = `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.727-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/></svg>`;
const ICON = { x: "@sarabun48th", facebook: "Facebook", email: "อีเมล" };
const LABEL = { x: "sarabun48th on X", facebook: "Facebook", email: "อีเมล" };
$("#social").innerHTML = Object.entries(SITE.social)
  .filter(([, v]) => v)
  .map(([k, v]) => {
    const href = esc(k === "email" && !v.startsWith("mailto:") ? "mailto:" + v : v);
    const icon = k === "x" ? X_ICON : "";
    return `<a href="${href}" target="_blank" rel="noopener" aria-label="${esc(LABEL[k] || k)}">${icon}<span>${esc(ICON[k] || k)}</span></a>`;
  })
  .join("");
$("#year").textContent = new Date().getFullYear();

// Forms
const ERR = {
  message_required: "กรุณาพิมพ์ข้อความก่อนส่ง", idea_required: "กรุณาพิมพ์ไอเดียก่อนส่ง",
  message_too_long: "ข้อความยาวเกินไป", idea_too_long: "ข้อความยาวเกินไป",
  name_too_long: "ชื่อยาวเกินไป", contact_too_long: "ช่องทางติดต่อยาวเกินไป",
};
for (const form of document.querySelectorAll("form[data-api]")) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const st = form.querySelector(".status"), btn = form.querySelector("button");
    const data = Object.fromEntries(new FormData(form));
    const text = (data.message ?? data.idea ?? "").trim();
    if (text.length < 3) { st.className = "status err"; st.textContent = ERR[form.id === "feedback" ? "message_required" : "idea_required"]; return; }
    data.t = loadedAt;
    btn.disabled = true; st.className = "status"; st.textContent = "กำลังส่ง…";
    try {
      const r = await fetch(form.dataset.api, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) throw new Error(j.error || "server_error");
      form.reset(); st.className = "status ok"; st.textContent = "ขอบคุณมาก! ได้รับแล้ว 💌";
    } catch (err) {
      st.className = "status err"; st.textContent = ERR[err.message] || "ส่งไม่สำเร็จ ลองใหม่อีกครั้งนะ";
    } finally { btn.disabled = false; }
  });
}
