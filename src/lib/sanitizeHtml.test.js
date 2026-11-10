import { describe, it, expect } from "bun:test";
import { sanitizeEmailHtml, escapeHtml } from "./sanitizeHtml";
describe("sanitizeEmailHtml", () => {
  it("removes scripts, handlers and javascript links but keeps formatting", () => {
    const out = sanitizeEmailHtml('<p onclick="x()">Hi <b>there</b></p><script>alert(1)</script><img src=x onerror=alert(1)><a href="javascript:alert(1)">l</a>');
    expect(out).not.toMatch(/script|onclick|onerror|javascript:/i);
    expect(out).toContain("<b>there</b>");
  });
  it("escapes markup", () => { expect(escapeHtml("<img>")).toBe("&lt;img&gt;"); });
});
