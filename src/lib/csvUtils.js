import { base44 } from "@/api/base44Client";

/**
 * Export an array of records to a CSV file and trigger download.
 * @param {string} filename - Download file name
 * @param {Array} records - Records to export
 * @param {Array} fields - [{ key, label }] field config
 */
export function exportToCsv(filename, records, fields) {
  const headers = fields.map((f) => f.label);
  const escapeCell = (val) => {
    let s;
    if (val == null) s = "";
    else if (Array.isArray(val)) s = val.join("; ");
    else if (typeof val === "object") s = "";
    else if (typeof val === "boolean") s = val ? "Yes" : "No";
    else s = String(val);
    // Neutralize spreadsheet formulas (=, +, -, @, tab, CR) so opened files never run planted formulas.
    if (typeof val === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const rows = records.map((r) =>
    fields.map((f) => escapeCell(r[f.key])).join(",")
  );
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}

/**
 * Parse a CSV/Excel file into an array of objects keyed by entity field names.
 * Uses the ExtractDataFromUploadedFile integration.
 * @param {File} file - The uploaded file
 * @param {Array} fields - [{ key, label }] field config; labels become CSV column headers
 * @returns {Promise<Array>} parsed records keyed by field.key
 */
export async function parseCsvFile(file, fields) {
  const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });

  const properties = {};
  fields.forEach((f) => {
    properties[f.label] = { type: "string" };
  });

  const schema = {
    type: "array",
    items: {
      type: "object",
      properties,
    },
  };

  const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
    file_url,
    json_schema: schema,
  });

  if (result.status === "error") {
    throw new Error(result.details || "Failed to extract data from file");
  }

  const extracted = result.output;
  if (!Array.isArray(extracted) || extracted.length === 0) {
    throw new Error("No valid data found in the file");
  }

  // Map from label-keyed objects to entity-keyed objects
  return extracted.map((row) => {
    const mapped = {};
    fields.forEach((f) => {
      const raw = row[f.label];
      if (raw == null || raw === "") {
        // skip empty
        return;
      }
      // Handle array fields (semicolon-separated in CSV)
      if (f.isArray) {
        mapped[f.key] = String(raw)
          .split(";")
          .map((s) => s.trim())
          .filter(Boolean);
      } else if (f.type === "number") {
        const num = Number(raw);
        if (!isNaN(num)) mapped[f.key] = num;
      } else if (f.type === "boolean") {
        mapped[f.key] = ["yes", "true", "1"].includes(String(raw).toLowerCase());
      } else {
        mapped[f.key] = String(raw).trim();
      }
    });
    return mapped;
  });
}