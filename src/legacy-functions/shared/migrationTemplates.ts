// @ts-nocheck
// =============================================================================
// Migration Template Registry
// =============================================================================
// Reusable, deterministic mapping templates for each supported competitor
// export format. Each template defines:
//   - memberColumns / teamColumns: CSV header → normalized field key (with
//     aliases for sources that vary). The CSV mapper uses these for exact
//     case-insensitive header matching.
//   - schemas: AI extraction schemas (for Excel files) that produce the same
//     normalized field keys.
//   - decisions: client-facing questions the club must answer before submit.
//   - teamSheetFields: metadata the client fills in per team.
//
// The transform function (migrationTransform.ts) is source-agnostic — it
// reads normalized field keys (p1_name, p1_email, player_first_name, etc.)
// produced by either the CSV mapper or the AI extractor. Adding a new source
// is just adding a new template here.
// =============================================================================

export interface MigrationDecision {
  key: string;
  question: string;
  options: { value: string; label: string }[];
}

export interface TeamSheetField {
  key: string;
  label: string;
  placeholder?: string;
  options?: string[];
}

export interface MigrationTemplate {
  source: string;
  label: string;
  memberColumns: Record<string, string[]>; // fieldKey → possible headers
  teamColumns: Record<string, string[]>;   // fieldKey → possible headers
  schemas: { members: object; teams: object };
  decisions: MigrationDecision[];
  teamSheetFields: TeamSheetField[];
}

// ---------- Shared field-key definitions ----------
// Every template normalizes to these keys so the transform is reusable.
// Guardian fields: p1_name, p1_email, p1_cell, p1_home_phone, p1_address_1,
// p1_address_2, p1_city, p1_state, p1_zip, p1_family_id, p1_user_id,
// p1_is_team_parent — same pattern for p2_*.
// Player fields: player_first_name, player_last_name, date_of_birth, gender,
// team_name, program, completed_date, cancelled_date, registration_id, grade,
// birth_certificate_question, soccer_clearance_question.
// Leading account: user_name, user_email, user_phone.
// Shared fallback: family_id, user_id, is_team_parent, address_1, etc.

const TEAM_SHEET_FIELDS: TeamSheetField[] = [
  { key: 'age_group', label: 'Age Group', placeholder: 'e.g. U14' },
  { key: 'gender', label: 'Gender', options: ['Boys', 'Girls', 'Boys and Girls'] },
  { key: 'playing_format', label: 'Playing Format', options: ['4v4', '7v7', '9v9', '11v11'] },
  { key: 'season', label: 'Season', placeholder: 'e.g. 2026-2027' },
  { key: 'location_id', label: 'Branch', placeholder: 'Select branch' },
  { key: 'coach_id', label: 'Coach', placeholder: 'Select coach' },
];

// ---------- TeamSnap ----------

const TEAMSNAP_MEMBER_COLUMNS: Record<string, string[]> = {
  club: ['Club'],
  program: ['Program'],
  registration_label: ['Registration'],
  user_name: ['User Name'],
  user_email: ['Email'],
  user_phone: ['Phone Number'],
  player_first_name: ['Player First Name'],
  player_last_name: ['Player Last Name'],
  date_of_birth: ['Date of Birth'],
  gender: ['Gender'],
  grade: ['Grade'],
  team_name: ['Team Name'],
  completed_date: ['Completed Date'],
  cancelled_date: ['Cancelled Date'],
  registration_id: ['Registration ID', 'Registration Number'],
  birth_certificate_question: ['Clearance is required for non U.S. players. Does your player have a U.S. birth certificate:'],
  soccer_clearance_question: ['Has your player received ITC from U.S Soccer?'],
};
for (const n of [1, 2]) {
  for (const [field, label] of Object.entries({
    name: 'Name', email: 'Email', cell: 'Cell Phone', home_phone: 'Home Phone',
    address_1: 'Address 1', address_2: 'Address 2', city: 'City', state: 'State',
    zip: 'Zip', family_id: 'Family ID', user_id: 'User ID',
  })) {
    TEAMSNAP_MEMBER_COLUMNS[`p${n}_${field}`] = [`Parent ${n} ${label}`];
  }
  TEAMSNAP_MEMBER_COLUMNS[`p${n}_is_team_parent`] = [`Parent ${n} Is Team Parent`];
}
// Shared fallbacks
Object.assign(TEAMSNAP_MEMBER_COLUMNS, {
  family_id: ['Family ID'],
  user_id: ['User ID'],
  is_team_parent: ['Is Team Parent'],
  address_1: ['Address 1'],
  address_2: ['Address 2'],
  city: ['City'],
  state: ['State'],
  zip: ['Zip'],
});

const TEAMSNAP_DECISIONS: MigrationDecision[] = [
  {
    key: 'club_column_meaning',
    question: 'What does the "Club" column mean in your export?',
    options: [
      { value: 'branch', label: 'It refers to a branch/location — map to a branch' },
      { value: 'ignore', label: 'It is just the club name — ignore it (we use your club context)' },
    ],
  },
  {
    key: 'leading_account_columns',
    question: 'Do the leading "User Name / Email / Phone" columns duplicate Parent 1, or are they a separate account?',
    options: [
      { value: 'duplicate', label: 'They duplicate Parent 1 — ignore them' },
      { value: 'separate', label: 'They are a separate registering account — import as a guardian' },
      { value: 'unsure', label: 'Not sure — let the reviewer check' },
    ],
  },
  {
    key: 'cancelled_registrations',
    question: 'How should cancelled registrations be handled?',
    options: [
      { value: 'inactive', label: 'Import as inactive players' },
      { value: 'exclude', label: 'Exclude them entirely' },
    ],
  },
];

// ---------- SportsEngine ----------

const SPORTSENGINE_MEMBER_COLUMNS: Record<string, string[]> = {
  program: ['Program', 'Division', 'Division Name'],
  user_name: ['Registered By', 'Account Name'],
  user_email: ['Registered By Email', 'Account Email'],
  user_phone: ['Registered By Phone', 'Account Phone'],
  player_first_name: ['First Name', 'Player First Name', 'Athlete First Name'],
  player_last_name: ['Last Name', 'Player Last Name', 'Athlete Last Name'],
  date_of_birth: ['Birthdate', 'Date of Birth', 'DOB', 'Birthday'],
  gender: ['Gender', 'Sex'],
  grade: ['Grade', 'Graduation Year'],
  team_name: ['Team', 'Team Name', 'Division', 'Roster Name'],
  completed_date: ['Registration Date', 'Completed Date', 'Date Registered'],
  cancelled_date: ['Cancelled Date', 'Cancellation Date'],
  registration_id: ['Registration ID', 'Registration Number', 'Confirmation Number'],
};
for (const n of [1, 2]) {
  SPORTSENGINE_MEMBER_COLUMNS[`p${n}_name`] = [
    `Guardian ${n} Name`, `Guardian ${n} Full Name`, `Parent ${n} Name`, `Parent ${n} Full Name`,
  ];
  SPORTSENGINE_MEMBER_COLUMNS[`p${n}_email`] = [`Guardian ${n} Email`, `Parent ${n} Email`];
  SPORTSENGINE_MEMBER_COLUMNS[`p${n}_cell`] = [`Guardian ${n} Phone`, `Guardian ${n} Cell`, `Parent ${n} Phone`, `Parent ${n} Cell`];
  SPORTSENGINE_MEMBER_COLUMNS[`p${n}_home_phone`] = [`Guardian ${n} Home Phone`, `Parent ${n} Home Phone`];
  SPORTSENGINE_MEMBER_COLUMNS[`p${n}_address_1`] = [`Guardian ${n} Address`, `Guardian ${n} Address 1`, `Parent ${n} Address`, `Parent ${n} Address 1`];
  SPORTSENGINE_MEMBER_COLUMNS[`p${n}_address_2`] = [`Guardian ${n} Address 2`, `Parent ${n} Address 2`];
  SPORTSENGINE_MEMBER_COLUMNS[`p${n}_city`] = [`Guardian ${n} City`, `Parent ${n} City`];
  SPORTSENGINE_MEMBER_COLUMNS[`p${n}_state`] = [`Guardian ${n} State`, `Parent ${n} State`];
  SPORTSENGINE_MEMBER_COLUMNS[`p${n}_zip`] = [`Guardian ${n} Zip`, `Guardian ${n} Zip Code`, `Parent ${n} Zip`, `Parent ${n} Zip Code`];
  SPORTSENGINE_MEMBER_COLUMNS[`p${n}_family_id`] = [`Guardian ${n} Family ID`, `Family ID`];
  SPORTSENGINE_MEMBER_COLUMNS[`p${n}_user_id`] = [`Guardian ${n} User ID`, `User ID`];
}
// SportsEngine often uses shared address columns
Object.assign(SPORTSENGINE_MEMBER_COLUMNS, {
  family_id: ['Family ID', 'Household ID'],
  user_id: ['User ID'],
  address_1: ['Address', 'Address 1', 'Street Address'],
  address_2: ['Address 2', 'Apt / Suite'],
  city: ['City'],
  state: ['State'],
  zip: ['Zip', 'Zip Code', 'Postal Code'],
});

const SPORTSENGINE_DECISIONS: MigrationDecision[] = [
  {
    key: 'registered_by_meaning',
    question: 'Does the "Registered By" account duplicate Guardian 1, or is it a separate account?',
    options: [
      { value: 'duplicate', label: 'It duplicates Guardian 1 — ignore it' },
      { value: 'separate', label: 'It is a separate account — import as a guardian' },
      { value: 'unsure', label: 'Not sure — let the reviewer check' },
    ],
  },
  {
    key: 'cancelled_registrations',
    question: 'How should cancelled registrations be handled?',
    options: [
      { value: 'inactive', label: 'Import as inactive players' },
      { value: 'exclude', label: 'Exclude them entirely' },
    ],
  },
];

// ---------- Sprocket ----------

const SPROCKET_MEMBER_COLUMNS: Record<string, string[]> = {
  program: ['Program', 'Season Program'],
  user_name: ['Account Name', 'Registered By'],
  user_email: ['Account Email', 'Registered By Email'],
  user_phone: ['Account Phone', 'Registered By Phone'],
  player_first_name: ['Player First Name', 'First Name', 'Athlete First Name'],
  player_last_name: ['Player Last Name', 'Last Name', 'Athlete Last Name'],
  date_of_birth: ['DOB', 'Date of Birth', 'Birthdate'],
  gender: ['Gender', 'Sex'],
  grade: ['Grade'],
  team_name: ['Team', 'Team Name', 'Roster'],
  completed_date: ['Registration Date', 'Completed Date'],
  cancelled_date: ['Cancelled Date', 'Cancellation Date'],
  registration_id: ['Registration ID', 'Registration Number'],
};
for (const n of [1, 2]) {
  SPROCKET_MEMBER_COLUMNS[`p${n}_name`] = [`Parent ${n} Name`, `Guardian ${n} Name`, `Parent ${n} Full Name`];
  SPROCKET_MEMBER_COLUMNS[`p${n}_email`] = [`Parent ${n} Email`, `Guardian ${n} Email`];
  SPROCKET_MEMBER_COLUMNS[`p${n}_cell`] = [`Parent ${n} Phone`, `Parent ${n} Cell`, `Guardian ${n} Phone`];
  SPROCKET_MEMBER_COLUMNS[`p${n}_home_phone`] = [`Parent ${n} Home Phone`, `Guardian ${n} Home Phone`];
  SPROCKET_MEMBER_COLUMNS[`p${n}_address_1`] = [`Parent ${n} Address`, `Parent ${n} Address 1`, `Guardian ${n} Address`];
  SPROCKET_MEMBER_COLUMNS[`p${n}_address_2`] = [`Parent ${n} Address 2`, `Guardian ${n} Address 2`];
  SPROCKET_MEMBER_COLUMNS[`p${n}_city`] = [`Parent ${n} City`, `Guardian ${n} City`];
  SPROCKET_MEMBER_COLUMNS[`p${n}_state`] = [`Parent ${n} State`, `Guardian ${n} State`];
  SPROCKET_MEMBER_COLUMNS[`p${n}_zip`] = [`Parent ${n} Zip`, `Parent ${n} Zip Code`, `Guardian ${n} Zip`];
  SPROCKET_MEMBER_COLUMNS[`p${n}_family_id`] = [`Parent ${n} Family ID`, `Family ID`];
  SPROCKET_MEMBER_COLUMNS[`p${n}_user_id`] = [`Parent ${n} User ID`, `User ID`];
}
Object.assign(SPROCKET_MEMBER_COLUMNS, {
  family_id: ['Family ID', 'Household ID'],
  user_id: ['User ID'],
  address_1: ['Address', 'Address 1', 'Street Address'],
  address_2: ['Address 2'],
  city: ['City'],
  state: ['State'],
  zip: ['Zip', 'Zip Code'],
});

const SPROCKET_DECISIONS: MigrationDecision[] = [
  {
    key: 'account_meaning',
    question: 'Does the "Account" contact duplicate Guardian 1, or is it a separate registering account?',
    options: [
      { value: 'duplicate', label: 'It duplicates Guardian 1 — ignore it' },
      { value: 'separate', label: 'It is a separate account — import as a guardian' },
      { value: 'unsure', label: 'Not sure — let the reviewer check' },
    ],
  },
  {
    key: 'cancelled_registrations',
    question: 'How should cancelled registrations be handled?',
    options: [
      { value: 'inactive', label: 'Import as inactive players' },
      { value: 'exclude', label: 'Exclude them entirely' },
    ],
  },
];

// ---------- AI extraction schemas ----------
// All schemas produce the same normalized field keys the transform reads.
function buildMemberSchema() {
  const props: Record<string, { type: string; description?: string }> = {
    p1_name: { type: 'string', description: 'Parent 1 full name' },
    p1_email: { type: 'string', description: 'Parent 1 email' },
    p1_cell: { type: 'string', description: 'Parent 1 cell phone' },
    p1_home_phone: { type: 'string', description: 'Parent 1 home phone' },
    p1_address_1: { type: 'string', description: 'Parent 1 address line 1' },
    p1_address_2: { type: 'string', description: 'Parent 1 address line 2' },
    p1_city: { type: 'string', description: 'Parent 1 city' },
    p1_state: { type: 'string', description: 'Parent 1 state' },
    p1_zip: { type: 'string', description: 'Parent 1 zip code' },
    p1_family_id: { type: 'string', description: 'Parent 1 family ID / household ID' },
    p1_user_id: { type: 'string', description: 'Parent 1 user ID' },
    p1_is_team_parent: { type: 'string', description: 'Parent 1 is tester/team parent (yes/no)' },
    p2_name: { type: 'string', description: 'Parent 2 full name' },
    p2_email: { type: 'string', description: 'Parent 2 email' },
    p2_cell: { type: 'string', description: 'Parent 2 cell phone' },
    p2_home_phone: { type: 'string', description: 'Parent 2 home phone' },
    p2_address_1: { type: 'string', description: 'Parent 2 address line 1' },
    p2_address_2: { type: 'string', description: 'Parent 2 address line 2' },
    p2_city: { type: 'string', description: 'Parent 2 city' },
    p2_state: { type: 'string', description: 'Parent 2 state' },
    p2_zip: { type: 'string', description: 'Parent 2 zip code' },
    p2_family_id: { type: 'string', description: 'Parent 2 family ID' },
    p2_user_id: { type: 'string', description: 'Parent 2 user ID' },
    p2_is_team_parent: { type: 'string', description: 'Parent 2 is tester/team parent (yes/no)' },
    family_id: { type: 'string', description: 'Shared family ID / household ID (use Parent 1 Family ID if present)' },
    user_id: { type: 'string', description: 'Shared user ID (use Parent 1 User ID if present)' },
    is_team_parent: { type: 'string', description: 'Is team parent? (yes/no, from Parent 1)' },
    address_1: { type: 'string', description: 'Shared address line 1 (fallback for Parent 1 address)' },
    address_2: { type: 'string', description: 'Shared address line 2 (fallback)' },
    city: { type: 'string', description: 'Shared city (fallback)' },
    state: { type: 'string', description: 'Shared state (fallback)' },
    zip: { type: 'string', description: 'Shared zip (fallback)' },
    player_first_name: { type: 'string' },
    player_last_name: { type: 'string' },
    date_of_birth: { type: 'string' },
    gender: { type: 'string' },
    team_name: { type: 'string' },
    program: { type: 'string' },
    completed_date: { type: 'string' },
    cancelled_date: { type: 'string' },
    registration_id: { type: 'string', description: 'Registration ID or registration number' },
    grade: { type: 'string' },
    birth_certificate_question: { type: 'string', description: 'U.S. birth certificate question text and answer' },
    soccer_clearance_question: { type: 'string', description: 'U.S. Soccer clearance question text and answer' },
    user_name: { type: 'string', description: 'Leading User Name column' },
    user_email: { type: 'string', description: 'Leading Email column' },
    user_phone: { type: 'string', description: 'Leading Phone Number column' },
  };
  return {
    type: 'object',
    properties: { records: { type: 'array', items: { type: 'object', properties: props } } },
  };
}

const TEAM_SCHEMA = {
  type: 'object',
  properties: {
    records: {
      type: 'array',
      items: { type: 'object', properties: { name: { type: 'string', description: 'Distinct team name' } } },
    },
  },
};

// ---------- The registry ----------

export const MIGRATION_TEMPLATES: Record<string, MigrationTemplate> = {
  teamsnap: {
    source: 'teamsnap',
    label: 'TeamSnap',
    memberColumns: TEAMSNAP_MEMBER_COLUMNS,
    teamColumns: { name: ['Team Name', 'Name', 'Team'] },
    schemas: { members: buildMemberSchema(), teams: TEAM_SCHEMA },
    decisions: TEAMSNAP_DECISIONS,
    teamSheetFields: TEAM_SHEET_FIELDS,
  },
  sportsengine: {
    source: 'sportsengine',
    label: 'SportsEngine',
    memberColumns: SPORTSENGINE_MEMBER_COLUMNS,
    teamColumns: { name: ['Team', 'Team Name', 'Division', 'Name'] },
    schemas: { members: buildMemberSchema(), teams: TEAM_SCHEMA },
    decisions: SPORTSENGINE_DECISIONS,
    teamSheetFields: TEAM_SHEET_FIELDS,
  },
  sprocket: {
    source: 'sprocket',
    label: 'Sprocket',
    memberColumns: SPROCKET_MEMBER_COLUMNS,
    teamColumns: { name: ['Team', 'Team Name', 'Roster', 'Name'] },
    schemas: { members: buildMemberSchema(), teams: TEAM_SCHEMA },
    decisions: SPROCKET_DECISIONS,
    teamSheetFields: TEAM_SHEET_FIELDS,
  },
};

export function getTemplate(source: string): MigrationTemplate {
  return MIGRATION_TEMPLATES[source] || MIGRATION_TEMPLATES.teamsnap;
}

// ---------- Issue types ----------

export type IssueCategory = 'client_fixable' | 'needs_human_review';

export interface MigrationIssue {
  category: IssueCategory;
  type: string;
  message: string;
  row_ref?: string;
}