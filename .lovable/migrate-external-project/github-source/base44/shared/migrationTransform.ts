// =============================================================================
// Migration Transform — source-agnostic staging + duplicate detection
// =============================================================================
// Reads normalized field keys (produced by the CSV mapper or AI extractor)
// and builds structured staging data: guardians, players, teams, exceptions,
// issues, and duplicate groups. The same transform works for every template
// because every template normalizes to the same field keys.
// =============================================================================

import {
  splitName, normalizeEmail, normalizePhone, normalizeState, preserveZip,
  parseDate, normalizeGender, toBoolean,
} from './migrationCleaning.ts';
import { MigrationIssue, getTemplate } from './migrationTemplates.ts';

export interface StagingGuardian {
  unique_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  street_address: string;
  address_line_2: string;
  city: string;
  state: string;
  zip_code: string;
  household_id: string;
  is_team_parent: boolean;
  relationship: string;
  _source_row: number;
  _issues: string[];
}

export interface StagingPlayer {
  unique_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  team_name: string;
  team_id: string;
  program_title: string;
  program_id: string;
  status: string;
  notes: string;
  guardian_email: string;
  household_id: string;
  _source_row: number;
  _issues: string[];
}

export interface StagingTeam {
  name: string;
  age_group: string;
  gender: string;
  playing_format: string;
  season: string;
  location_id: string;
  coach_id: string;
  _needs_metadata: boolean;
}

export interface DuplicateRecord {
  index: number;       // index in guardians/players array
  display: string;     // human-readable label
  source_row: number;
}

export interface DuplicateGroup {
  id: string;
  type: 'guardian' | 'player';
  match_key: string;
  match_label: string;
  records: DuplicateRecord[];
}

export interface StagingResult {
  guardians: StagingGuardian[];
  players: StagingPlayer[];
  teams: StagingTeam[];
  exceptions: { row: number; reason: string; data: Record<string, any> }[];
  issues: MigrationIssue[];
  duplicates: DuplicateGroup[];
  team_sheet_needed: boolean;
  decisions_needed: boolean;
}

// ---------- Duplicate detection ----------

function detectGuardianDuplicates(guardians: StagingGuardian[]): DuplicateGroup[] {
  const groups: DuplicateGroup[] = [];
  const byEmail = new Map<string, number[]>();

  guardians.forEach((g, i) => {
    if (!g.email) return;
    const key = g.email.toLowerCase();
    if (!byEmail.has(key)) byEmail.set(key, []);
    byEmail.get(key)!.push(i);
  });

  let groupNum = 0;
  for (const [email, indices] of byEmail) {
    if (indices.length < 2) continue;
    groupNum++;
    groups.push({
      id: `g-${groupNum}`,
      type: 'guardian',
      match_key: email,
      match_label: `Email: ${email}`,
      records: indices.map((idx) => ({
        index: idx,
        display: `${guardians[idx].first_name} ${guardians[idx].last_name} — ${guardians[idx].email}`,
        source_row: guardians[idx]._source_row,
      })),
    });
  }
  return groups;
}

function detectPlayerDuplicates(players: StagingPlayer[]): DuplicateGroup[] {
  const groups: DuplicateGroup[] = [];
  const byNameDob = new Map<string, number[]>();

  players.forEach((p, i) => {
    const key = `${p.first_name.toLowerCase()}|${p.last_name.toLowerCase()}|${p.date_of_birth}`;
    if (!byNameDob.has(key)) byNameDob.set(key, []);
    byNameDob.get(key)!.push(i);
  });

  let groupNum = 0;
  for (const [key, indices] of byNameDob) {
    if (indices.length < 2) continue;
    groupNum++;
    const [fn, ln, dob] = key.split('|');
    groups.push({
      id: `p-${groupNum}`,
      type: 'player',
      match_key: key,
      match_label: `${fn} ${ln} (DOB: ${dob})`,
      records: indices.map((idx) => ({
        index: idx,
        display: `${players[idx].first_name} ${players[idx].last_name} — Team: ${players[idx].team_name || 'none'} (DOB: ${players[idx].date_of_birth})`,
        source_row: players[idx]._source_row,
      })),
    });
  }
  return groups;
}

// ---------- Transform ----------

export function transformMigration(source: string, rawMembers: any[], rawTeams: any[]): StagingResult {
  const template = getTemplate(source);
  const guardians: StagingGuardian[] = [];
  const players: StagingPlayer[] = [];
  const exceptions: StagingResult['exceptions'] = [];
  const issues: MigrationIssue[] = [];
  // No inline dedup — collect all records, then detect duplicates and let
  // the client decide (merge / skip / delete) during the review step.
  const seenEmails = new Map<string, number>();

  // --- Teams: just names, metadata needed from client ---
  const teamNames = new Set<string>();
  for (const t of rawTeams) {
    const name = String(t.name || '').trim();
    if (name) teamNames.add(name);
  }

  // --- Process member rows (each row = one player + their guardians) ---
  rawMembers.forEach((row: any, idx: number) => {
    const rowIssues: string[] = [];

    // --- Guardian 1 ---
    const p1 = splitName(row.p1_name || '');
    const p1Email = normalizeEmail(row.p1_email || '');
    const p1Phone = normalizePhone(row.p1_cell || row.p1_home_phone || '');
    const householdId = String(row.p1_family_id || row.family_id || '').trim();

    if (p1Email.ok && p1Email.value) {
      seenEmails.set(p1Email.value, guardians.length);
      guardians.push({
        unique_id: String(row.p1_user_id || row.user_id || '').trim(),
        first_name: p1.first_name,
        last_name: p1.last_name,
        email: p1Email.value,
        phone: p1Phone,
        street_address: String(row.p1_address_1 || row.address_1 || '').trim(),
        address_line_2: String(row.p1_address_2 || row.address_2 || '').trim(),
        city: String(row.p1_city || row.city || '').trim(),
        state: normalizeState(row.p1_state || row.state || ''),
        zip_code: preserveZip(row.p1_zip || row.zip || ''),
        household_id: householdId,
        is_team_parent: toBoolean(row.p1_is_team_parent || row.is_team_parent || ''),
        relationship: 'guardian',
        _source_row: idx,
        _issues: [],
      });
    } else if (row.p1_name) {
      rowIssues.push(`Guardian 1 email missing or invalid: ${p1Email.note}`);
      issues.push({
        category: 'client_fixable',
        type: 'missing_email',
        message: `Row ${idx + 1}: Guardian 1 "${row.p1_name}" has no valid email. Email is required for guardians.`,
        row_ref: `row-${idx}`,
      });
    }

    // --- Guardian 2 (only if has a name AND email) ---
    if (row.p2_name) {
      const p2 = splitName(row.p2_name);
      const p2Email = normalizeEmail(row.p2_email || '');
      if (p2Email.ok && p2Email.value) {
        seenEmails.set(p2Email.value, guardians.length);
        guardians.push({
          unique_id: String(row.p2_user_id || '').trim(),
          first_name: p2.first_name,
          last_name: p2.last_name,
          email: p2Email.value,
          phone: normalizePhone(row.p2_cell || row.p2_home_phone || ''),
          street_address: String(row.p2_address_1 || '').trim(),
          address_line_2: String(row.p2_address_2 || '').trim(),
          city: String(row.p2_city || '').trim(),
          state: normalizeState(row.p2_state || ''),
          zip_code: preserveZip(row.p2_zip || ''),
          household_id: String(row.p2_family_id || householdId || '').trim(),
          is_team_parent: toBoolean(row.p2_is_team_parent || ''),
          relationship: 'guardian',
          _source_row: idx,
          _issues: [],
        });
      } else {
        issues.push({
          category: 'client_fixable',
          type: 'missing_email',
          message: `Row ${idx + 1}: Guardian 2 "${row.p2_name}" has no email. Add one or we'll skip this guardian.`,
          row_ref: `row-${idx}`,
        });
      }
    }

    // --- Player ---
    const pfn = String(row.player_first_name || '').trim();
    const pln = String(row.player_last_name || '').trim();
    const dob = parseDate(row.date_of_birth || '');
    const teamName = String(row.team_name || '').trim();

    const notesParts: string[] = [];
    if (row.grade) notesParts.push(`Grade: ${row.grade}`);
    if (row.birth_certificate_question) notesParts.push(`Birth certificate Q&A: ${row.birth_certificate_question}`);
    if (row.soccer_clearance_question) notesParts.push(`Soccer clearance Q&A: ${row.soccer_clearance_question}`);

    const cancelled = String(row.cancelled_date || '').trim();
    const completed = String(row.completed_date || '').trim();
    let status = 'pending';
    if (cancelled) status = 'inactive';
    else if (completed) status = 'active';

    const missing: string[] = [];
    if (!pfn || !pln) missing.push('player name');
    if (!dob.ok) missing.push(`DOB (${dob.note})`);

    if (missing.length > 0) {
      exceptions.push({
        row: idx + 1,
        reason: `Missing required: ${missing.join(', ')}`,
        data: { player_first_name: pfn, player_last_name: pln, date_of_birth: row.date_of_birth, team_name: teamName },
      });
      issues.push({
        category: 'needs_human_review',
        type: 'missing_required',
        message: `Row ${idx + 1}: Player missing required fields (${missing.join(', ')}). Moved to exceptions.`,
        row_ref: `row-${idx}`,
      });
    } else {
      const dedupeKey = `${householdId}|${pfn.toLowerCase()}|${pln.toLowerCase()}|${dob.value}`;
      const uniqueId = String(row.registration_id || '').trim() || dedupeKey;
      players.push({
        unique_id: uniqueId,
        first_name: pfn,
        last_name: pln,
        date_of_birth: dob.value,
        gender: normalizeGender(row.gender || ''),
        team_name: teamName,
        team_id: '',
        program_title: String(row.program || '').trim(),
        program_id: '',
        status,
        notes: notesParts.join('\n'),
        guardian_email: p1Email.value || '',
        household_id: householdId,
        _source_row: idx,
        _issues: rowIssues,
      });
    }

    if (teamName && !teamNames.has(teamName)) teamNames.add(teamName);
    if (row.date_of_birth && !dob.ok && dob.note?.includes('Ambiguous')) {
      issues.push({
        category: 'client_fixable',
        type: 'ambiguous_date',
        message: `Row ${idx + 1}: Date of birth "${row.date_of_birth}" is ambiguous. Confirm the format (MM/DD or DD/MM).`,
        row_ref: `row-${idx}`,
      });
    }
  });

  // --- Build teams list ---
  const teams: StagingTeam[] = Array.from(teamNames).map((name) => ({
    name,
    age_group: '',
    gender: '',
    playing_format: '',
    season: '',
    location_id: '',
    coach_id: '',
    _needs_metadata: true,
  }));

  // --- Duplicate detection ---
  const duplicates = [
    ...detectGuardianDuplicates(guardians),
    ...detectPlayerDuplicates(players),
  ];

  // Flag duplicate issues for client visibility
  for (const dup of duplicates) {
    issues.push({
      category: 'client_fixable',
      type: 'duplicate',
      duplicate_id: dup.id,
      message: `${dup.type === 'guardian' ? 'Guardian' : 'Player'} duplicate detected: ${dup.match_label} (${dup.records.length} records). Choose to merge, skip, or delete.`,
    });
  }

  return {
    guardians,
    players,
    teams,
    exceptions,
    issues,
    duplicates,
    team_sheet_needed: teams.length > 0,
    decisions_needed: true,
  };
}

// ---------- Apply duplicate decisions during import ----------

export type DuplicateAction = 'merge' | 'skip' | 'delete';

export function applyDuplicateDecisions(
  guardians: StagingGuardian[],
  players: StagingPlayer[],
  duplicates: DuplicateGroup[],
  decisions: Record<string, DuplicateAction>,
): { guardians: StagingGuardian[]; players: StagingPlayer[] } {
  if (!duplicates || duplicates.length === 0) return { guardians, players };

  const guardianSkip = new Set<number>();
  const guardianMergeGroups: number[][] = [];
  const playerSkip = new Set<number>();
  const playerMergeGroups: number[][] = [];

  for (const dup of duplicates) {
    const action = decisions[dup.id] || 'merge'; // default to merge
    const source = dup.type === 'guardian' ? guardians : players;
    const indices = dup.records.map((r) => r.index).filter((i) => source[i] && !(source[i] as any)._excluded && !(source[i] as any)._deleted);

    if (action === 'skip') {
      // Skip all records in this group
      if (dup.type === 'guardian') indices.forEach((i) => guardianSkip.add(i));
      else indices.forEach((i) => playerSkip.add(i));
    } else if (action === 'delete') {
      // Keep only the first, skip the rest
      if (dup.type === 'guardian') indices.slice(1).forEach((i) => guardianSkip.add(i));
      else indices.slice(1).forEach((i) => playerSkip.add(i));
    } else if (action === 'merge') {
      // Merge: combine into first record, fill missing fields from others
      if (dup.type === 'guardian') guardianMergeGroups.push(indices);
      else playerMergeGroups.push(indices);
    }
  }

  // Apply merges for guardians
  const mergedGuardianFields = new Set<number>(); // indices absorbed into first
  for (const indices of guardianMergeGroups) {
    const [first, ...rest] = indices;
    const g0 = guardians[first];
    if (!g0) continue;
    for (const ri of rest) {
      const gr = guardians[ri];
      if (!gr) continue;
      // Fill missing fields from the duplicate
      if (!g0.phone && gr.phone) g0.phone = gr.phone;
      if (!g0.street_address && gr.street_address) g0.street_address = gr.street_address;
      if (!g0.address_line_2 && gr.address_line_2) g0.address_line_2 = gr.address_line_2;
      if (!g0.city && gr.city) g0.city = gr.city;
      if (!g0.state && gr.state) g0.state = gr.state;
      if (!g0.zip_code && gr.zip_code) g0.zip_code = gr.zip_code;
      if (!g0.household_id && gr.household_id) g0.household_id = gr.household_id;
      if (!g0.is_team_parent && gr.is_team_parent) g0.is_team_parent = true;
      mergedGuardianFields.add(ri);
    }
  }

  // Apply merges for players
  const mergedPlayerFields = new Set<number>();
  for (const indices of playerMergeGroups) {
    const [first, ...rest] = indices;
    const p0 = players[first];
    if (!p0) continue;
    for (const ri of rest) {
      const pr = players[ri];
      if (!pr) continue;
      if (!p0.team_name && pr.team_name) p0.team_name = pr.team_name;
      if (!p0.program_title && pr.program_title) p0.program_title = pr.program_title;
      if (!p0.gender && pr.gender) p0.gender = pr.gender;
      if (!p0.notes && pr.notes) p0.notes = pr.notes;
      if (!p0.guardian_email && pr.guardian_email) p0.guardian_email = pr.guardian_email;
      if (!p0.household_id && pr.household_id) p0.household_id = pr.household_id;
      mergedPlayerFields.add(ri);
    }
  }

  const finalGuardians = guardians.filter((_, i) => !guardianSkip.has(i) && !mergedGuardianFields.has(i));
  const finalPlayers = players.filter((_, i) => !playerSkip.has(i) && !mergedPlayerFields.has(i));

  return { guardians: finalGuardians, players: finalPlayers };
}