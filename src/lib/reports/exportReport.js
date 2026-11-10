import { base44 } from "@/api/base44Client";
import { format } from "date-fns";

const CHUNK_SIZE = 500;

function fmtCsv(row, col) {
  const value = col.compute ? col.compute(row) : row[col.key];
  if (value == null || value === "") return "";
  let str;
  switch (col.type) {
    case "currency": str = String(value || 0); break;
    case "number": str = String(value || 0); break;
    case "date": str = value ? String(value).split("T")[0] : ""; break;
    case "boolean": str = value ? "Yes" : "No"; break;
    case "array": str = Array.isArray(value) ? value.join("; ") : String(value || ""); break;
    case "status": str = String(value || "").replace(/_/g, " "); break;
    default: str = String(value || "");
  }
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function fmtDisplay(row, col) {
  const value = col.compute ? col.compute(row) : row[col.key];
  if (value == null) return "—";
  switch (col.type) {
    case "currency": return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
    case "number": return new Intl.NumberFormat("en-US").format(value);
    case "date": return value ? format(new Date(value), "MMM d, yyyy") : "—";
    case "boolean": return value ? "Yes" : "No";
    case "array": return Array.isArray(value) ? value.join(", ") : String(value || "—");
    case "status": return String(value).replace(/_/g, " ");
    default: return String(value || "—");
  }
}

/**
 * Export all matching rows to CSV, fetching in chunks to avoid timeouts.
 * @param {Object} params - { report, query, sort, columns, onProgress }
 */
export async function exportReportCsv({ report, query, sort, columns, onProgress }) {
  const total = await base44.entities[report.entity].count(query);
  const totalableFields = columns.filter((c) => c.totalable && !c.compute).map((c) => c.key);

  let csv = columns.map((c) => c.label).join(",") + "\n";
  let cursor = undefined;
  let exported = 0;

  while (true) {
    const page = await base44.entities[report.entity].filter(query, { sort, limit: CHUNK_SIZE, cursor });
    for (const row of page.items) {
      csv += columns.map((c) => fmtCsv(row, c)).join(",") + "\n";
    }
    exported += page.items.length;
    onProgress?.(exported, total);
    if (!page.has_more) break;
    cursor = page.next_cursor;
  }

  // Totals row
  if (totalableFields.length > 0) {
    const totalsData = await base44.entities[report.entity].aggregate({ query, sum: totalableFields });
    const totals = {};
    for (const f of totalableFields) totals[f] = totalsData?.rows?.[0]?.[`sum_${f}`] || 0;
    // Computed totalable columns: sum from all rows (already loaded above — re-derive from CSV is complex; skip for now)
    csv += columns.map((c, i) => {
      if (i === 0) return "TOTAL";
      if (c.totalable && !c.compute) return String(totals[c.key] || 0);
      return "";
    }).join(",") + "\n";
  }

  // Download
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${report.id}_${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Open a print-friendly window with all matching rows (up to 1000) and trigger print.
 * @param {Object} params - { report, query, sort, columns, onProgress }
 */
export async function openPrintView({ report, query, sort, columns, onProgress }) {
  const MAX_ROWS = 1000;
  const total = await base44.entities[report.entity].count(query);
  const cappedTotal = Math.min(total, MAX_ROWS);

  let allRows = [];
  let cursor = undefined;
  while (allRows.length < cappedTotal) {
    const page = await base44.entities[report.entity].filter(query, { sort, limit: CHUNK_SIZE, cursor });
    allRows = allRows.concat(page.items);
    onProgress?.(allRows.length, cappedTotal);
    if (!page.has_more || allRows.length >= cappedTotal) break;
    cursor = page.next_cursor;
  }
  allRows = allRows.slice(0, MAX_ROWS);

  const totalableFields = columns.filter((c) => c.totalable && !c.compute).map((c) => c.key);
  const totals = {};
  if (totalableFields.length > 0) {
    const totalsData = await base44.entities[report.entity].aggregate({ query, sum: totalableFields });
    for (const f of totalableFields) totals[f] = totalsData?.rows?.[0]?.[`sum_${f}`] || 0;
  }

  const w = window.open("", "_blank", "width=1000,height=700");
  if (!w) { alert("Please allow popups to use the print view."); return; }

  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const headerCells = columns.map((c) => `<th>${esc(c.label)}</th>`).join("");
  const bodyRows = allRows.map((row) =>
    `<tr>${columns.map((c) => `<td>${esc(fmtDisplay(row, c))}</td>`).join("")}</tr>`
  ).join("");
  const totalCells = columns.map((c, i) => {
    if (i === 0) return `<td><strong>TOTAL</strong></td>`;
    if (c.totalable && !c.compute) return `<td><strong>${esc(fmtDisplay(totals[c.key], c))}</strong></td>`;
    return "<td></td>";
  }).join("");

  w.document.write(`<!DOCTYPE html><html><head><title>${esc(report.name)}</title>
    <style>
      body { font-family: Inter, Arial, sans-serif; margin: 24px; color: #0f172a; }
      h1 { font-size: 20px; margin: 0 0 4px; }
      .meta { font-size: 12px; color: #64748b; margin-bottom: 16px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th { background: #f1f5f9; padding: 6px 10px; text-align: left; border-bottom: 2px solid #e2e8f0; white-space: nowrap; }
      td { padding: 5px 10px; border-bottom: 1px solid #e2e8f0; }
      tr.totals td { border-top: 2px solid #334155; background: #f8fafc; }
      @media print { body { margin: 12px; } }
    </style></head><body>
    <h1>${esc(report.name)}</h1>
    <div class="meta">Generated ${format(new Date(), "MMM d, yyyy h:mm a")} · ${allRows.length} of ${total} rows${total > MAX_ROWS ? ` (showing first ${MAX_ROWS})` : ""}</div>
    <table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody>
    <tfoot><tr class="totals">${totalCells}</tr></tfoot></table>
    </body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}