import React from 'react';
import { Button } from '@/components/ui/button';
import { exportToCsv } from '@/lib/csvUtils';
const parents = [1, 2].flatMap(n => ['Name', 'Email', 'User ID', 'Family ID', 'Cell Phone', 'Home Phone', 'Address 1', 'Address 2', 'City', 'State', 'Zip'].map(f => `Parent ${n} ${f}`));
const templates = {
  members: ['Club', 'Program', 'Registration', 'User Name', 'Email', 'Phone Number', 'Player First Name', 'Player Last Name', 'Date of Birth', 'Gender', 'Grade', 'Team Name', 'Completed Date', 'Cancelled Date', ...parents],
  teams: ['Team Name'],
  events: ['Event Name', 'Start Date', 'End Date', 'Start Time', 'End Time', 'Location', 'Team Name'],
  payments: ['Payment Date', 'Player First Name', 'Player Last Name', 'Guardian Email', 'Amount', 'Currency', 'Status', 'Transaction Reference'],
};
export default function ImportFileGuide() {
  const prompt = 'Organize my export using the selected Club Rudder migration template. Keep one header row with unique column names and one record per row. Preserve all original values, both guardians’ separate addresses, email addresses, phone numbers, and leading zeros in ZIP codes. Use MM/DD/YYYY dates. Do not invent missing data; list missing fields and row numbers for review. Quote cells containing commas. Do not share personal family data with a public facing tool.';
  return <details className="rounded-xl border border-border bg-muted/30 p-4 text-sm">
    <summary className="cursor-pointer font-semibold">Import templates and file-fixing guide</summary>
    <div className="mt-3 space-y-3">
      <p>CSV is preferred. Put column names on the first row, remove title rows and merged cells, and keep Parent 1 and Parent 2 addresses in their own columns. TeamSnap, SportsEngine, and Sprocket exports can be uploaded unchanged under Members & Families — the mapper auto-detects your platform's column names.</p>
      <p>Members require Player First Name, Player Last Name, Date of Birth, and Parent 1 Email columns (or your platform's equivalent). Each guardian needs their own name and valid email. Blank or invalid values are listed for review.</p>
      <div className="flex flex-wrap gap-2">{Object.entries(templates).map(([key, headers]) => <Button key={key} variant="outline" size="sm" onClick={() => exportToCsv(`${key}-template.csv`, [], headers.map(h => ({key:h,label:h})))}>{key.charAt(0).toUpperCase() + key.slice(1)} template</Button>)}</div>
      <p className="text-muted-foreground text-xs">Events and payment files are retained for specialist review only; automatic import currently supports members and team names.</p>
      <label className="block font-medium" htmlFor="file-repair-prompt">File preparation prompt (copy for your spreadsheet assistant)</label>
      <textarea id="file-repair-prompt" readOnly value={prompt} rows={6} className="w-full rounded-md border border-input bg-background p-3 text-xs" onFocus={e => e.target.select()} />
    </div>
  </details>;
}