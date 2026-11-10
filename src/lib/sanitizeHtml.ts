// Strips active content (scripts, frames, event handlers, javascript: links) from HTML that
// people type into templates, so previews, exports and emails cannot run code.
export function sanitizeEmailHtml(html: unknown): string {
  if (typeof html !== "string") return "";
  return html
    .replace(/<\s*(script|iframe|object|embed|form|style|link|meta|base|svg|math)\b[\s\S]*?(<\s*\/\s*\1\s*>|$)/gi, "")
    .replace(/<\s*\/?\s*(script|iframe|object|embed|form|link|meta|base|svg|math)\b[^>]*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src|action|formaction|xlink:href)\s*=\s*(["']?)\s*(javascript|vbscript|data):[^"'\s>]*\2/gi, '$1="#"');
}

export function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}
