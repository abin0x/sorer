import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { escapeHtml } from "@/lib/sanitizeHtml";

// Every plan value is escaped before it becomes markup, so typed text can never run as code.
function escapePlan(plan) {
  const out = {};
  for (const [k, v] of Object.entries(plan || {})) out[k] = Array.isArray(v) ? v.map(escapeHtml) : typeof v === "string" ? escapeHtml(v) : v;
  return out;
}

export async function downloadPlanAsImage(plan, clubName, format = "png") {
  const div = document.createElement("div");
  div.style.cssText = "position:fixed;left:-9999px;top:0;width:600px;background:#fff;font-family:Inter,Arial,sans-serif;";
  const safe = escapePlan(plan);
  div.innerHTML = `
    <div style="border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
      <div style="background:#4f46e5;padding:28px 32px;color:#fff;">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.12em;opacity:0.7;">Team Plan</div>
        <div style="font-size:24px;font-weight:800;margin-top:6px;">${safe.team_name || "—"}</div>
        <div style="font-size:13px;opacity:0.8;margin-top:4px;">
          ${[safe.age_group, safe.gender, safe.playing_format, safe.season].filter(Boolean).join(" · ")}
        </div>
      </div>
      <div style="padding:28px 32px;">
        ${safe.club_dues > 0 ? `<div style="font-size:36px;font-weight:800;color:#0f172a;">$${Number(safe.club_dues).toFixed(0)}<span style="font-size:14px;font-weight:400;color:#64748b;">/yr per player</span></div>` : ""}
        ${safe.coach_name ? `<div style="margin-top:8px;font-size:13px;color:#475569;">Coach: ${safe.coach_name}</div>` : ""}
        <div style="margin-top:20px;display:grid;grid-template-columns:1fr 1fr;gap:16px;">
          ${safe.fall_training ? `<div><div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;">Fall Training</div><div style="font-size:13px;color:#1e293b;margin-top:3px;line-height:1.4;">${safe.fall_training}</div></div>` : ""}
          ${safe.winter_training ? `<div><div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;">Winter Training</div><div style="font-size:13px;color:#1e293b;margin-top:3px;line-height:1.4;">${safe.winter_training}</div></div>` : ""}
          ${safe.spring_training ? `<div><div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;">Spring Training</div><div style="font-size:13px;color:#1e293b;margin-top:3px;line-height:1.4;">${safe.spring_training}</div></div>` : ""}
          ${safe.league_games ? `<div><div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;">League Games</div><div style="font-size:13px;color:#1e293b;margin-top:3px;line-height:1.4;">${safe.league_games}</div></div>` : ""}
        </div>
        ${safe.tournament_count > 0 ? `
          <div style="margin-top:20px;padding-top:16px;border-top:1px solid #e2e8f0;">
            <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;">Tournaments (${safe.tournament_count})</div>
            <div style="font-size:13px;color:#1e293b;margin-top:3px;">${(safe.tournament_names || []).join(", ") || "—"}</div>
          </div>` : ""}
        ${(safe.included_programs || []).length > 0 ? `
          <div style="margin-top:16px;">
            <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;">Included Programs</div>
            <div style="font-size:13px;color:#1e293b;margin-top:3px;">${safe.included_programs.join(", ")}</div>
          </div>` : ""}
        <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;">${escapeHtml(clubName || "")}</div>
      </div>
    </div>
  `;
  document.body.appendChild(div);

  try {
    const canvas = await html2canvas(div, { scale: 2, backgroundColor: "#fff" });

    if (format === "pdf") {
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 190;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 10, 10, imgWidth, imgHeight);
      pdf.save(`${(plan.team_name || "team").replace(/\s+/g, "-")}-plan.pdf`);
    } else {
      const link = document.createElement("a");
      link.download = `${(plan.team_name || "team").replace(/\s+/g, "-")}-plan.${format}`;
      link.href = canvas.toDataURL(`image/${format}`);
      link.click();
    }
  } finally {
    document.body.removeChild(div);
  }
}

export function sharePlanUrl(plan, clubSlug) {
  if (!plan?.offer_id) return null;
  const url = `${window.location.origin}/PayDues?offer=${plan.offer_id}&club=${clubSlug || ""}`;
  if (navigator.share) {
    navigator.share({ title: `${plan.team_name} Dues`, url }).catch(() => {});
    return "shared";
  } else {
    navigator.clipboard.writeText(url);
    return "copied";
  }
}