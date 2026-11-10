import { base44 } from "@/api/base44Client";
import { exportToCsv } from "@/lib/csvUtils";
import { SESSION_LABEL } from "@/lib/tryoutRegisterApi";

/** Every roster/pool change goes through the tryout function so capacity,
 *  waitlists and event counts stay consistent for the whole club. */
const invoke = async (action, payload = {}) => {
  const res = await base44.functions.invoke("tryout-registration", { action, ...payload });
  if (res.data?.error) throw new Error(res.data.error);
  return res.data;
};

export const movePlayers = (registration_ids, event_id) => invoke("admin_move_bulk", { registration_ids, event_id });
export const assignBibs = (payload) => invoke("admin_bib_assign", payload);
export const remindFamilies = (payload) => invoke("admin_remind", payload);
export const addAdminNote = (registration_id, text) => invoke("admin_note", { registration_id, text });
export const addPlayerOnBehalf = (payload) => invoke("admin_add_player", payload);

/** Age at the tryout session (falls back to today when no session yet). */
export function ageOn(dob, onDate) {
  if (!dob) return null;
  const born = new Date(dob);
  const at = onDate ? new Date(onDate) : new Date();
  if (Number.isNaN(born.getTime())) return null;
  let age = at.getFullYear() - born.getFullYear();
  const month = at.getMonth() - born.getMonth();
  if (month < 0 || (month === 0 && at.getDate() < born.getDate())) age -= 1;
  return age;
}

export const ISSUE_FILTERS = [
  { key: "all", label: "Everyone" },
  { key: "paperwork", label: "Paperwork outstanding" },
  { key: "payment", label: "Payment due" },
  { key: "no_session", label: "No session yet" },
  { key: "no_bib", label: "No bib number" },
  { key: "no_dob", label: "Missing date of birth" },
  { key: "aid", label: "Aid requests" },
  { key: "waitlist", label: "Waitlist" },
];

/** What a row flags — the filter list and the badges read the same source. */
export function issuesFor(reg) {
  const out = [];
  if (reg.waiver_status !== "signed") out.push("paperwork");
  if (["unpaid", "pending", "failed", "partially_paid"].includes(reg.payment_status)) out.push("payment");
  if (!reg.tryout_event_id || reg.status === "pooled") out.push("no_session");
  if (!(Number(reg.bib_number) >= 1)) out.push("no_bib");
  if (!reg.player_date_of_birth) out.push("no_dob");
  if (reg.financial_aid_status === "requested") out.push("aid");
  if (reg.status === "waitlist") out.push("waitlist");
  return out;
}

export const sessionText = (reg) =>
  reg.tryout_event_id ? `${reg.session_date || ""} ${reg.session_start_time || ""}`.trim() || "Session" : "No session yet";

export const playerAge = (reg) => ageOn(reg.player_date_of_birth, reg.session_date);

/** Flat rows for CSV export and printed sheets. */
export function rosterRows(rows) {
  return rows.map((r) => ({
    ...r,
    age: playerAge(r) ?? "",
    session_text: sessionText(r),
    payment: r.payment_status || "",
    paperwork: r.waiver_status === "signed" ? "Signed" : "Outstanding",
    checked: r.checked_in ? "Yes" : "No",
    pool: r.pool_status || "",
  }));
}

const CSV_FIELDS = [
  { key: "player_name", label: "Player" },
  { key: "age", label: "Age" },
  { key: "player_gender", label: "Gender" },
  { key: "bib_number", label: "Bib" },
  { key: "session_text", label: "Session" },
  { key: "status", label: "Status" },
  { key: "payment", label: "Payment" },
  { key: "paperwork", label: "Paperwork" },
  { key: "checked", label: "Checked in" },
  { key: "pool", label: "Pool" },
  { key: "guardian_name", label: "Parent" },
  { key: "guardian_email", label: "Parent email" },
  { key: "guardian_phone", label: "Parent phone" },
  { key: "check_in_code", label: "Check-in code" },
];

export function exportRoster(rows, filename = "tryout-roster.csv") {
  exportToCsv(filename, rosterRows(rows), CSV_FIELDS);
}

const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;");

function openPrintWindow(title, bodyHtml) {
  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.write(`<!DOCTYPE html><html><head><title>${esc(title)}</title>
    <style>
      body { font-family: Inter, Arial, sans-serif; margin: 20px; color: #0f172a; }
      h1 { font-size: 19px; margin: 0 0 4px; }
      .meta { font-size: 12px; color: #64748b; margin-bottom: 14px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th { background: #f1f5f9; padding: 6px 8px; text-align: left; border-bottom: 2px solid #e2e8f0; }
      td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
      .box { display: inline-block; width: 12px; height: 12px; border: 1px solid #94a3b8; border-radius: 2px; }
      .line { display: inline-block; width: 90px; border-bottom: 1px solid #cbd5e1; height: 12px; }
      @media print { body { margin: 10px; } }
    </style></head><body>${bodyHtml}</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
  return true;
}

/** Session roster: who is in the session, with bibs and what staff must chase. */
export function printRoster({ title, subtitle, rows, includeSignature = false }) {
  const body = rows.map((r) => `<tr>
      <td>${esc(r.bib_number || "")}</td>
      <td>${esc(r.player_name)}</td>
      <td>${esc(playerAge(r) ?? "")}</td>
      <td>${esc(r.player_gender || "")}</td>
      <td>${esc(r.desired_age_group || "")}</td>
      <td>${esc(r.guardian_name || "")}<br />${esc(r.guardian_phone || r.guardian_email || "")}</td>
      <td>${esc(r.payment_status === "paid" || r.payment_status === "waived" ? "OK" : r.payment_status || "")}</td>
      <td>${esc(r.waiver_status === "signed" ? "OK" : "Outstanding")}</td>
      <td>${r.checked_in ? "Yes" : ""}</td>
      ${includeSignature ? `<td><span class="line"></span></td><td><span class="line"></span></td>` : ""}
    </tr>`).join("");
  return openPrintWindow(title, `
    <h1>${esc(title)}</h1>
    <div class="meta">${esc(subtitle)} · ${rows.length} player${rows.length === 1 ? "" : "s"} · printed ${new Date().toLocaleString()}</div>
    <table><thead><tr><th>Bib</th><th>Player</th><th>Age</th><th>Gender</th><th>Group</th><th>Parent / contact</th><th>Fee</th><th>Paperwork</th><th>Arrived</th>
    ${includeSignature ? "<th>Initials</th><th>Notes</th>" : ""}</tr></thead><tbody>${body}</tbody></table>`);
}

/** Check-in sheet: bib-ordered, with a box to tick and a line to sign. */
export function printCheckInSheet({ title, subtitle, rows }) {
  const sorted = [...rows].sort((a, b) => (Number(a.bib_number) || 9999) - (Number(b.bib_number) || 9999) || String(a.player_name).localeCompare(String(b.player_name)));
  const body = sorted.map((r) => `<tr>
      <td><span class="box"></span></td>
      <td>${esc(r.bib_number || "")}</td>
      <td>${esc(r.player_name)}</td>
      <td>${esc(playerAge(r) ?? "")}</td>
      <td>${esc(r.desired_age_group || "")}</td>
      <td>${esc(r.guardian_name || "")}<br />${esc(r.guardian_phone || "")}</td>
      <td>${esc(r.waiver_status === "signed" ? "OK" : "Outstanding")}</td>
      <td>${esc(r.payment_status === "paid" || r.payment_status === "waived" ? "OK" : "Due")}</td>
      <td><span class="line"></span></td>
      <td><span class="line"></span></td>
    </tr>`).join("");
  return openPrintWindow(title, `
    <h1>${esc(title)}</h1>
    <div class="meta">${esc(subtitle)} · ${sorted.length} registered · printed ${new Date().toLocaleString()}</div>
    <table><thead><tr><th>✓</th><th>Bib</th><th>Player</th><th>Age</th><th>Group</th><th>Parent / phone</th><th>Paperwork</th><th>Fee</th><th>Arrival time</th><th>Staff initials</th></tr></thead>
    <tbody>${body}</tbody></table>`);
}

export const sessionOptionLabel = (e) => `${SESSION_LABEL[e.type] || "Session"} — ${e.date}${e.start_time ? ` ${e.start_time}` : ""}`;