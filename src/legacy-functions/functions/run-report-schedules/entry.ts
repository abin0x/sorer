// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';
import { getReportDefinitionById, idFilter, dateFilter } from "../../shared/reportDefinitions.ts";

/**
 * Runs due report schedules: for each active schedule whose frequency/day matches today,
 * resolves each recipient's role-scope, builds the query, fetches data, generates a CSV,
 * and emails it as an attachment. Each recipient receives only data their role allows.
 *
 * Can be called manually with { schedule_id } to run a single schedule on demand.
 */

const CHUNK_SIZE = 500;
const MAX_ROWS = 5000;

// Roles that see all branches/teams (club-wide)
const CLUB_WIDE_ROLES = ["admin", "club_director", "club_admin", "bookkeeper", "master_admin"];
// Roles scoped to their branches
const BRANCH_SCOPED_ROLES = ["branch_director", "branch_admin"];
// Roles scoped to their teams
const TEAM_SCOPED_ROLES = ["coach", "team_manager"];

function fmtCsvValue(row, col) {
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
  // Neutralize spreadsheet formulas in text cells so emailed reports never run planted formulas.
  if (!["currency", "number"].includes(col.type) && /^[=+\-@\t\r]/.test(str)) str = `'${str}`;
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function generateCsv(rows, columns) {
  let csv = columns.map((c) => c.label).join(",") + "\n";
  for (const row of rows) {
    csv += columns.map((c) => fmtCsvValue(row, c)).join(",") + "\n";
  }
  return csv;
}

function toBase64(str) {
  // Convert string to base64 using Web APIs
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function isDueToday(schedule, now) {
  if (!schedule.is_active) return false;
  const day = now.getDay(); // 0=Sunday
  const date = now.getDate();
  if (schedule.frequency === "weekly") {
    return day === (schedule.day_of_week ?? 1);
  }
  if (schedule.frequency === "monthly") {
    return date === (schedule.day_of_month ?? 1);
  }
  return false;
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const now = new Date();

    // Find due schedules
    let schedules;
    if (body.schedule_id) {
      // Manual single-schedule run
      const sched = await base44.asServiceRole.entities.ReportSchedule.filter({
        _id: body.schedule_id,
      });
      schedules = sched.items || sched;
      if (schedules.length === 0) {
        return Response.json({ error: "Schedule not found" }, { status: 404 });
      }
    } else {
      // Find all active schedules for today
      const allSchedules = await base44.asServiceRole.entities.ReportSchedule.filter({
        is_active: true,
      });
      schedules = (allSchedules.items || allSchedules).filter((s) => isDueToday(s, now));
    }

    if (schedules.length === 0) {
      return Response.json({ message: "No due schedules", processed: 0 });
    }

    const results = [];

    for (const schedule of schedules) {
      try {
        // Get the linked SavedReport
        const savedReports = await base44.asServiceRole.entities.SavedReport.filter({
          _id: schedule.saved_report_id,
        });
        const savedReport = (savedReports.items || savedReports)[0];
        if (!savedReport) {
          await base44.asServiceRole.entities.ReportSchedule.update(schedule.id, {
            last_run: now.toISOString(),
            last_run_status: "failed",
            last_error: "Linked saved report not found",
          });
          results.push({ schedule: schedule.id, status: "failed", error: "SavedReport not found" });
          continue;
        }

        const reportDef = getReportDefinitionById(savedReport.report_id);
        if (!reportDef) {
          await base44.asServiceRole.entities.ReportSchedule.update(schedule.id, {
            last_run: now.toISOString(),
            last_run_status: "failed",
            last_error: `Unknown report: ${savedReport.report_id}`,
          });
          results.push({ schedule: schedule.id, status: "failed", error: "Unknown report" });
          continue;
        }

        const config = savedReport.config || {};
        const globalFilters = config.filters || {};
        const reportFilters = config.reportFilters || {};
        const visibleColumnKeys = config.columns || reportDef.columns.map((c) => c.key);
        const columns = reportDef.columns.filter((c) => visibleColumnKeys.includes(c.key));

        let successCount = 0;
        let failCount = 0;
        let lastError = "";

        // Process each recipient with their own scope
        for (const email of schedule.recipients) {
          try {
            // Resolve recipient's user record to get their role and club_id
            const users = await base44.asServiceRole.entities.User.filter({ email });
            const recipient = (users.items || users)[0];
            if (!recipient) {
              failCount++;
              lastError = `Recipient not found: ${email}`;
              continue;
            }

            const role = recipient.custom_role || recipient.role;
            const clubId = recipient.club_id || savedReport.club_id;

            // Resolve scope based on role
            let effBranchIds: string[] | null = null;
            let effTeamIds: string[] | null = null;

            if (CLUB_WIDE_ROLES.includes(role) || recipient.is_super_admin) {
              // Club-wide: no branch/team filter
              effBranchIds = null;
              effTeamIds = null;
            } else if (BRANCH_SCOPED_ROLES.includes(role)) {
              const locations = await base44.asServiceRole.entities.Location.filter({ club_id: clubId });
              effBranchIds = (locations.items || locations)
                .filter((l) => l.branch_director_email === email || l.branch_admin_email === email)
                .map((l) => l.id);
              effTeamIds = null;
            } else if (TEAM_SCOPED_ROLES.includes(role)) {
              const coaches = await base44.asServiceRole.entities.Coach.filter({ email });
              const coachIds = (coaches.items || coaches).map((c) => c.id);
              if (coachIds.length > 0) {
                const teams = await base44.asServiceRole.entities.Team.filter({ club_id: clubId });
                effTeamIds = (teams.items || teams)
                  .filter((t) => (t.coach_ids || []).some((id) => coachIds.includes(id)))
                  .map((t) => t.id);
              } else {
                effTeamIds = [];
              }
              effBranchIds = null;
            }

            const scope = { clubId, effBranchIds, effTeamIds };
            const query = reportDef.buildQuery(globalFilters, reportFilters, scope);

            // Fetch data in chunks
            let allRows: any[] = [];
            let cursor: string | undefined;
            while (allRows.length < MAX_ROWS) {
              const page = await base44.asServiceRole.entities[reportDef.entity].filter(query, {
                sort: config.sort || reportDef.defaultSort,
                limit: CHUNK_SIZE,
                cursor,
              });
              allRows = allRows.concat(page.items || []);
              if (!page.has_more || allRows.length >= MAX_ROWS) break;
              cursor = page.next_cursor;
            }

            // Generate CSV
            const csv = generateCsv(allRows, columns);
            const csvBase64 = toBase64(csv);
            const dateStr = now.toISOString().split("T")[0];
            const filename = `${reportDef.id}_${dateStr}.csv`;

            // Send email with attachment
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: email,
              template_name: "ReportDelivery",
              variables: {
                report_name: savedReport.name,
                recipient_name: recipient.full_name || email,
                format: schedule.format || "csv",
                generated_at: now.toLocaleString("en-US", { timeZone: "America/New_York" }),
                row_count: String(allRows.length),
                owner_name: schedule.owner_name || "System",
                app_url: "https://clubrudder.com",
              },
              attachments: [{
                filename,
                content: csvBase64,
              }],
            });

            successCount++;
          } catch (recipientErr) {
            failCount++;
            lastError = recipientErr.message || String(recipientErr);
          }
        }

        // Update schedule status
        const status = failCount === 0 ? "success" : successCount > 0 ? "partial" : "failed";
        await base44.asServiceRole.entities.ReportSchedule.update(schedule.id, {
          last_run: now.toISOString(),
          last_run_status: status,
          last_error: failCount > 0 ? `${failCount} of ${schedule.recipients.length} failed: ${lastError}` : "",
        });

        results.push({
          schedule: schedule.id,
          name: schedule.saved_report_name,
          status,
          successCount,
          failCount,
        });
      } catch (schedErr) {
        results.push({ schedule: schedule.id, status: "failed", error: schedErr.message });
      }
    }

    return Response.json({ processed: results.length, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}