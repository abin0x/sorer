// Curated, deterministic beta template data for trial club rollover.
// Not random — every trial gets the same quality, realistic dataset,
// parameterized only by the trialist's branch names and platform selections.

export const AGE_GROUPS = [
  { label: "U9", format: "4v4", roster: 7, birthYearStart: 2017, birthYearEnd: 2018, order: 0 },
  { label: "U11", format: "7v7", roster: 10, birthYearStart: 2015, birthYearEnd: 2016, order: 1 },
  { label: "U13", format: "9v9", roster: 12, birthYearStart: 2013, birthYearEnd: 2014, order: 2 },
  { label: "U15", format: "11v11", roster: 16, birthYearStart: 2011, birthYearEnd: 2012, order: 3 },
];

export const PLATFORM_GENDER_MAP = {
  "ECNL": "Boys and Girls",
  "Girls Academy": "Girls",
  "MLS Next": "Boys",
  "Aspire": "Boys and Girls",
  "ECNL RL": "Boys and Girls",
  "Pre-ECNL": "Boys and Girls",
  "Pre-GA": "Girls",
  "Inspire": "Girls",
  "Directors Academy": "Boys and Girls",
  "MYSL": "Boys and Girls",
  "WSSL": "Boys and Girls",
  "MSDSL": "Boys and Girls",
  "NAL": "Boys and Girls",
  "MSPSP": "Boys and Girls",
};

export const CURATED_COACH_NAMES = [
  { first: "Michael", last: "Stevens", role: "head_coach" },
  { first: "Jennifer", last: "Parker", role: "head_coach" },
  { first: "Robert", last: "Chen", role: "head_coach" },
  { first: "Sarah", last: "Mitchell", role: "head_coach" },
  { first: "David", last: "Okonkwo", role: "head_coach" },
  { first: "Lisa", last: "Anderson", role: "head_coach" },
  { first: "James", last: "Rivera", role: "assistant_coach" },
  { first: "Maria", last: "Gonzalez", role: "head_coach" },
  { first: "Thomas", last: "Brennan", role: "head_coach" },
  { first: "Patricia", last: "Walsh", role: "head_coach" },
  { first: "Daniel", last: "Kim", role: "head_coach" },
  { first: "Aisha", last: "Patel", role: "head_coach" },
  { first: "Kevin", last: "O'Brien", role: "assistant_coach" },
  { first: "Rachel", last: "Goldberg", role: "head_coach" },
  { first: "Marcus", last: "Johnson", role: "head_coach" },
  { first: "Sofia", last: "Russo", role: "head_coach" },
  { first: "Andrew", last: "Thompson", role: "head_coach" },
  { first: "Nicole", last: "Dubois", role: "head_coach" },
  { first: "Carlos", last: "Mendoza", role: "head_coach" },
  { first: "Hannah", last: "Schmidt", role: "head_coach" },
  { first: "Devin", last: "Carter", role: "assistant_coach" },
  { first: "Yuki", last: "Tanaka", role: "head_coach" },
  { first: "Olivia", last: "Bennett", role: "head_coach" },
  { first: "Andre", last: "Williams", role: "head_coach" },
];

export const CURATED_PLAYER_FIRSTS = [
  "James","Emma","Liam","Olivia","Noah","Ava","Ethan","Sophia","Mason","Isabella",
  "Lucas","Mia","Logan","Charlotte","Aiden","Amelia","Caden","Harper","Jackson","Evelyn",
  "Carter","Abigail","Henry","Emily","Sebastian","Ella","Jack","Grace","Owen","Chloe",
  "Leo","Layla","Eli","Riley","Asher","Nora","Wyatt","Hazel","Julian","Aurora",
  "Levi","Zoey","Ezra","Stella","Miles","Violet","Hudson","Lily","Asher","Hannah",
  "Cole","Scarlett","Easton","Penelope","Bennett","Lila","Brody","Nora","Reid","Maya",
  "Finn","Eleanor","Gavin","Claire","Nolan","Audrey","Beau","Skylar","Jace","Sadie",
  "Tucker","Aria","Sawyer","Quinn","Grant","Ivy","Rhett","Ellie","Dawson","Piper",
];

export const CURATED_PLAYER_LASTS = [
  "Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Rodriguez","Martinez",
  "Wilson","Anderson","Taylor","Thomas","Moore","Jackson","Martin","Lee","Thompson","White",
  "Harris","Clark","Lewis","Walker","Hall","Allen","Young","King","Wright","Lopez",
  "Hill","Scott","Green","Adams","Baker","Nelson","Carter","Mitchell","Roberts","Turner",
  "Phillips","Campbell","Parker","Evans","Edwards","Collins","Stewart","Sanchez","Morris","Rogers",
  "Reed","Cook","Morgan","Bell","Murphy","Bailey","Rivera","Cooper","Richardson","Cox",
  "Howard","Ward","Torres","Peterson","Gray","Ramirez","James","Watson","Brooks","Kelly",
  "Sanders","Price","Bennett","Wood","Barnes","Ross","Henderson","Coleman","Jenkins","Perry",
];

export const POSITIONS = [
  "1 - Goalkeeper","2 - Right Back","3 - Left Back","4 - Right Centerback","5 - Left Centerback",
  "6 - Holding Midfielder","7 - Right Winger","8 - Center Midfielder","9 - Center Forward",
  "10 - Attacking Midfielder","11 - Left Midfielder",
];

export const SKILL_TESTS = [
  { title: "Directional 1st Touch", category: "basic", duration: 2, playerCount: 2, description: "First touch under pressure", setup: "Cone gates", howToPerform: "Receive and redirect", scoring: "Out of 100" },
  { title: "Wall Pass Combination", category: "basic", duration: 2, playerCount: 2, description: "Quick combination passing", setup: "Wall + cones", howToPerform: "One-two around cone", scoring: "Out of 100" },
  { title: "Finishing Under Pressure", category: "advanced", duration: 3, playerCount: 3, description: "Finishing with defender", setup: "Goal + defender", howToPerform: "Receive, turn, finish", scoring: "Out of 100" },
];

export const FEEDBACK_TEMPLATES = [
  {
    strengths: "Strong technical foundation and excellent positional awareness. Reads the game well and makes smart decisions in transition.",
    areasOfGrowth: "Consistency in defensive transition moments and aerial duels.",
    trainingFocus: "Decision-making under pressure and finishing in the final third.",
    feedbackText: "Key strengths include first touch and work rate. Focus areas: finishing under pressure and defensive transition awareness.",
    strengthList: ["First touch", "Work rate", "Positional awareness"],
    developmentPriorities: ["Finishing under pressure", "Defensive transitions"],
  },
  {
    strengths: "Explosive speed and direct attacking mentality. Creates chances for teammates with quality service.",
    areasOfGrowth: "Defensive discipline and tracking back on transition.",
    trainingFocus: "1v1 defending technique and end-product decision-making in the final third.",
    feedbackText: "Excellent pace and going forward. Needs to commit more on the defensive side and improve final ball selection.",
    strengthList: ["Pace", "1v1 attacking", "Crossing"],
    developmentPriorities: ["Defensive tracking", "Final ball selection"],
  },
  {
    strengths: "Composed on the ball and excellent range of passing. Dictates tempo from deep positions.",
    areasOfGrowth: "Mobility to cover ground and press higher up the field.",
    trainingFocus: "Pressing intensity and box-to-box endurance development.",
    feedbackText: "Very composed distributor who controls the tempo. Needs to add more physical presence and pressing output.",
    strengthList: ["Passing range", "Composure", "Vision"],
    developmentPriorities: ["Pressing intensity", "Box-to-box mobility"],
  },
  {
    strengths: "Fearless in the air and commands the box. Organizes the back line with clear communication.",
    areasOfGrowth: "Distribution under pressure and playing out from the back.",
    trainingFocus: "Ball-playing defender skills and playing out from the back under pressure.",
    feedbackText: "Dominant aerial presence and leader at the back. Needs to improve comfort on the ball when pressed high.",
    strengthList: ["Aerial duels", "Leadership", "Tackling"],
    developmentPriorities: ["Distribution under pressure", "Playing out from the back"],
  },
  {
    strengths: "Natural finisher with great movement off the ball. Always finds space in the box.",
    areasOfGrowth: "Hold-up play and bringing others into the game.",
    trainingFocus: "Link-up play and back-to-goal technique.",
    feedbackText: "Prolastic finisher with sharp movement. Needs to develop link-up play and hold-up ability to involve teammates.",
    strengthList: ["Finishing", "Movement off ball", "Composure"],
    developmentPriorities: ["Hold-up play", "Link-up play"],
  },
];

export const SEASON_NAME = "2026-2027";