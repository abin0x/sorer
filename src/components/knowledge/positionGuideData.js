import { STANDARD_POSITIONS } from "@/lib/positions";

// Michigan Jaguars Academy — Position Guide content, sourced from the club's
// Player Development reference document (Qualities, Positional Traits & Qualities,
// Positional Responsibilities, Technical Skill Checklists).

export const JAGUAR_QUALITIES = [
  { key: "we_mentality", label: "We Mentality", text: "Models & demonstrates a WE mentality on a daily basis." },
  { key: "be_fit", label: "Be Fit", text: "Maintains a fitness level to perform at your best on & off the field." },
  { key: "skilled", label: "Skilled", text: "Executes technically under pressure and at speed to perform well in position and within our style of play." },
  { key: "competitive", label: "Competitive", text: "Plays to win, works hard and maintains focus on team and individual goals." },
  { key: "problem_solver", label: "Problem Solver", text: "Makes quick and accurate decisions based on the demands of the game and our style of play." },
  { key: "takes_ownership", label: "Takes Ownership", text: "Is committed to a growth mentality and demonstrates a desire to improve as a person, student, and athlete." },
  { key: "empowering", label: "Empowering & Inspiring", text: "Encourages others, celebrates others' successes, sets a consistent example of hard work, commitment, and team-first mentality." },
];

export const GAME_PRIORITIES = ["Fitness", "Communication", "Game Insight", "Technique"];

// POSITION_ORDER and POSITION_GUIDE are built from STANDARD_POSITIONS below

const GUIDE_GROUPS = {
  goalkeeper: {
    label: "Goalkeeper",
    numbers: [1],
    priorities: ["Deny Goals", "Communication", "Help in Build"],
    traits: [
      "Strength & Power \u2013 Explosive, Agility, & Balance",
      "Composed",
      "Communication \u2013 Directing & Organizing",
      "Shot stopping, Service (wide or central), Breakaways and Entry passes",
      "Distribution \u2013 range of passing",
      "Reading Pressure",
      "Managing Space",
    ],
    responsibilities: {
      defending_organized: [
        "Helping Defensive Organization",
        "Recognizing Threats \u2013 Space or Players",
        "Organizing Team Shape to dictate play",
        "Management of Space",
        "Protect the Space behind our back line \u2013 drop, step, hold",
        "Space between lines \u2013 connected and compact \u2013 vertical and horizontal",
        "Read Pressure",
        "Adjusting Starting Position",
        "Anticipate and intercept through balls or passes",
        "Continuously adjusting position",
      ],
      defending_final_third: [
        "Controlling the Box",
        "Defending Crosses, long passes and 1v1 Situations",
        "Intercept, catch, punch, deflect",
        "Organization of MIB",
        "Protecting the Goal: Prevent Scoring",
        "Making Saves \u2013 long, central, angled, close",
        "Reacting immediately to recover for second phase if rebound",
      ],
      defending_transition: [
        "Direct teammates and anticipate threats",
        "Counter Measures",
        "Protect most dangerous Space",
        "Identify Threats & Marks",
        "Adjust positioning and body shape",
        "Protect the Goal and Defend Space",
      ],
      attacking_organized: [
        "Initiate build up and possession forward",
        "Help break initial lines",
        "Play around, through, beyond",
        "Adjust body position to receive and play quickly",
        "Providing support & clearances",
        "Connected to back line",
        "Help organize Countermeasures \u2013 Balance",
      ],
      attacking_final_third: [
        "Help to organize and keep ball in attacking half",
        "Move and support behind the ball",
        "Help to organize Countermeasures \u2013 Balance",
        "Plus 1 Defensively",
      ],
      attacking_transition: [
        "Initiate Counter Attack",
        "Break out and find highest option",
        "Throw or kick",
        "Initiate Build-up",
        "Maintain possession \u2013 allow team to regain shape",
        "Push up defensive line \u2013 keep team connected",
      ],
    },
    technicalChecklist: {
      Handling: ["Shot Stopping \u2013 Footwork", "Catch/Basket, Blocks, Spread, Smother", "Kick Save \u2013 1 & 2 Handed", "Body Shape"],
      "Angle Play": ["Footwork", "Body Shape", "Positioning", "Vertical / Ball Line"],
      Decisions: ["Parry", "Punch", "Catch", "Smother"],
      Distribution: ["Texture & Accuracy", "Surface & Body Shape", "Passing (Right/Left)", "Punt \u2013 Driven/Flighted", "Clearances (Right/Left)"],
      "Management of Space": ["Service/Cutbacks \u2013 Footwork, Body Shape, Punch, Hold, Positioning, Timing", "Space Behind Back Line \u2013 Shot Stopping, Block/Smother, Balance, Positioning, Angle, Footwork"],
    },
  },

  center_back: {
    label: "Center Back",
    numbers: [4, 5],
    priorities: ["Safety", "Help in Build", "Organize"],
    traits: [
      "Strength & Power, Speed & Agility",
      "Calm, Decisive, Relentless",
      "Communication \u2013 Directing & Organizing",
      "Dominate in 1v1 Situations (tackling, intercepting, heading)",
      "Marking & Protecting Danger Zone",
      "Reading Pressure",
      "Ball winner \u2013 tackling, heading, intercepting, & clearances",
      "Range of Passing \u2013 initiate build",
    ],
    responsibilities: {
      defending_organized: [
        "Organization \u2013 Verbal Communication",
        "Team Shape to Dictate Play",
        "Recognize opponent shape and reading pressure",
        "Management of Space and Threats",
        "Compact and connected between lines \u2013 vertical and horizontal",
        "Line Management \u2013 drop, step, hold",
        "Player Responsibility \u2013 track runners & provide cover",
        "Protect the space behind and in front of line",
        "Body Shape & positioning \u2013 side on / ball side-goal side",
        "Deny and disrupt Forward Passes",
        "Dominating 1v1 \u2013 Ball Winner",
        "Challenge, intercept, tackle",
      ],
      defending_final_third: [
        "Prevent Goal Scoring Opportunities",
        "MIB and defending service & through balls",
        "Contain vs. Touch Tight",
        "Dominating 1v1 Ball Winner",
        "Challenge, intercept, tackle, block shots",
        "Clearances & Managing 2nd Phase",
      ],
      defending_transition: [
        "Providing Organization",
        "Directing Teammates and anticipating threats",
        "Press or Regroup to Press",
        "Delay, Deny, Dictate",
        "Line Management: Drop-step-hold",
        "Read pressure",
        "Deal with most dangerous threat \u2013 space or player",
        "Positioning \u2013 side on / ball side-goal side",
      ],
      attacking_organized: [
        "Initiate Build-up and Possession Forward",
        "Reading pressure",
        "Position in relation to GK, Defensive line, HM",
        "Provide Depth",
        "Receiving and passing under pressure",
        "First Touch & Body shape",
        "Help Break Initial Lines \u2013 pass or dribble",
        "Play around, through, or over",
        "Provide Support and Balance",
        "Change the Point",
        "Help Organize Countermeasures",
      ],
      attacking_final_third: [
        "Support Behind the ball",
        "Maintain possession, change the point, lock in",
        "Keep Lines Connected \u2013 vertically and horizontally",
        "Finishing the Attack \u2013 Through ball, service, shot from distance",
        "Organize Countermeasures \u2013 Plus 1",
      ],
      attacking_transition: [
        "Initiate Counter Attack",
        "Connect 1st Pass",
        "Highest Option",
        "Initiate Build-up",
        "Secure possession \u2013 allow team to gain shape",
        "Move into a supporting position",
        "Protect Against Counter Attack",
      ],
    },
    technicalChecklist: {
      Defending: ["1v1 \u2013 Angle, Speed, Body Position, Hips, Distance, Foot Work", "Tackle \u2013 Strength, Disrupt, Regain, Block, Poke", "Positioning \u2013 Ball Side/Goal Side, Front/Re-front, Distance", "Clearances \u2013 Feet, Head", "50/50 \u2013 1st & 2nd"],
      Possession: ["Dribbling \u2013 Right/Left, Surface, Speed, Duels 1v1", "Receiving \u2013 1st Touch, Surface, Body Shape, Turning, Out of Air", "Passing \u2013 Weight, Texture, Range, Driven/Flighted, Accuracy"],
    },
  },

  outside_back: {
    label: "Outside Back",
    numbers: [2, 3],
    priorities: ["Unlock Space", "Get Forward", "Create Chances"],
    traits: [
      "Speed & Agility, Quick, and Endurance",
      "Energetic and Dynamic",
      "Dominate in 1v1 Situations (tackling, intercepting, taking on)",
      "Marking, Denying Service & Clearances",
      "Support \u2013 providing width, height, and balance",
      "Combination Play",
      "Create Chances \u2013 crosses, shots",
    ],
    responsibilities: {
      defending_organized: [
        "Reading and Positioning",
        "Communication \u2013 Help to Organize",
        "Delay-Deny-Dictate",
        "Screen Middle and Press Wide",
        "Partnership with Wide Forward and Center Back",
        "Press vs. Regroup to Repress",
        "Anticipating and Preventing Threats",
        "Protect Space Behind the Line",
        "Line Management \u2013 drop, step, hold",
        "Body Shape: side on / ball side-goal side",
        "Player Responsibility \u2013 track runners & provide cover",
        "Dominating 1v1 \u2013 Challenge, intercept, tackle, wall pass defending, aerial battles",
        "Flank Defending",
        "Regain in Pressure Pocket",
      ],
      defending_final_third: [
        "Deny and Defend Crosses",
        "Dominate 1v1 \u2013 Challenge, intercept, tackle, block",
        "Prevent Goal Scoring Opportunities",
        "MIB, Track Runners, & Aerial Battles",
        "Contain vs. Touch Tight",
        "Body Position \u2013 See Ball and Player",
        "Clearances & Managing 2nd Phase",
      ],
      defending_transition: [
        "Provide Organization & Anticipate Threats",
        "Delay-Deny-Dictate",
        "Press vs. Regroup to Press",
        "Deal with most dangerous threat \u2013 space or player",
        "Positioning \u2013 side on",
      ],
      attacking_organized: [
        "Supporting Build-up",
        "Reading opponent's pressure",
        "Positioning in relation to Defensive line, Midfield Line, and Wide Forward",
        "Provide Width",
        "Create Overloads \u2013 Wide and Central",
        "Help Break Initial & Final Lines and Advance Forward \u2013 pass or dribble",
        "Play around, through, or over",
        "Provide Support and Balance",
        "Change the Point",
        "Receiving and Passing under Pressure",
        "Body shape & First Touch",
        "Help Organize Countermeasures",
      ],
      attacking_final_third: [
        "Advance Forward",
        "Create overload and numbers up in final third",
        "Flank Play",
        "Dominate 1v1 \u2013 Take on",
        "Finishing the Attack \u2013 Score or Assist",
        "Crosses \u2013 Quality of Service & decision on ball",
        "Next Best, Wide Space, Early, RIB",
      ],
      attacking_transition: [
        "Starting and Supporting Counter Attack",
        "Provide Width",
        "Connect 1st Pass",
        "Initiate Build",
        "Possess to Gain Attacking Shape",
        "Prevent Counter Attack",
      ],
    },
    technicalChecklist: {
      Defending: ["1v1 \u2013 Angle, Speed, Body Position, Foot Work", "Tackle \u2013 Strength, Disrupt, Regain", "Positioning \u2013 Ball Side/Goal Side, Front/Re-front"],
      "Crossing & Finishing": ["Crossing \u2013 First Touch, Type, Cut Back, Wide, Early, Texture/Weight, Accuracy, Efficiency", "Finishing \u2013 First Touch, Balance, Positioning, Power vs. Finesse, Accuracy"],
    },
  },

  holding_midfielder: {
    label: "Holding Midfielder",
    numbers: [6],
    priorities: ["Link", "Vision", "Ball Winner"],
    traits: [
      "Strength, quick, endurance",
      "Controlled, Calculated, and disciplined",
      "Communication \u2013 Organizing",
      "Spatial Awareness (360\u00ba) \u2013 scanning",
      "Ball winner (tackling, intercepting, heading)",
      "Providing offensive & defensive balance",
      "Ability to Break Pressure \u2013 dribble & passing (COP)",
      "Range of Passes",
    ],
    responsibilities: {
      defending_organized: [
        "Organizing Team Defensive Shape",
        "Verbal Communication",
        "Maintaining Connection and Compactness between lines \u2013 vertical and horizontal",
        "Screening Middle and Press Forward & Wide",
        "Supporting and Providing Cover to Forward Line",
        "Building and Initiating Pressure",
        "Regroup to Repress",
        "Opportunity to Regain",
        "Anticipating and Preventing Threats",
        "Deny Forward Passes and Penetrations",
        "Protect the space in front of backs and screen entry passes",
        "Player Responsibility \u2013 track runners & provide cover",
        "Defend Vertical Middle",
        "Dominating 1v1 \u2013 Challenge, intercept, tackle, aerial battles",
      ],
      defending_final_third: [
        "Prevent Scoring & Deny Danger Zone Entry",
        "Protect and Screen Space in front of backs",
        "MIB",
        "Tracking Runners \u2013 Contain vs. Touch Tight",
        "Dominating 1v1 Ball Winner \u2013 Challenge, intercept, tackle, block shots",
        "Clearances & Managing 2nd Phase",
      ],
      defending_transition: [
        "Provide Organization and Anticipate Threats",
        "Press vs. Regroup to Repress",
        "Delay-Deny-Dictate",
        "Keep Play in front",
        "Position \u2013 Side On / ball side-goal side",
      ],
      attacking_organized: [
        "Support and Initiating Build-up",
        "Reading the opponent's pressure",
        "Creating overloads \u2013 central and wide",
        "Help Break Initial & Final Lines and Advance Forward \u2013 pass or dribble",
        "Play around, through, or over",
        "Link Between lines",
        "Provide Support and Balance",
        "Change the Point",
        "Maintain Possession",
        "Dictating the pace of the Game: Accelerating play or slowing it down",
        "Receiving and Passing under Pressure",
        "Body shape & First Touch",
        "Help Organize Countermeasures",
      ],
      attacking_final_third: [
        "Support to Break Final Line",
        "Balance \u2013 change the point and lock play in",
        "Keeping lines connected \u2013 vertical and horizontal",
        "Create chances to score \u2013 Through balls and Service from Deep",
        "Combination Play",
        "RIB and framing the box",
        "Shots from Distance",
      ],
      attacking_transition: [
        "Initiate Counter Attack",
        "Connect 1st Pass \u2013 Highest Option",
        "Initiate Build",
        "Securing possession",
        "Support \u2013 win on one side and connect on other",
        "Prevent Counter Attack",
      ],
    },
    technicalChecklist: {
      "All Positions": ["First touch", "Technique under pressure", "Passing Accuracy", "Positioning", "Decision Making", "Communication"],
    },
  },

  attacking_mid: {
    label: "Attacking Mid",
    numbers: [8, 10],
    priorities: ["Creative", "Key Passer", "Create Chances"],
    traits: [
      "Speed & Agility, Quick, and Endurance",
      "Creative and Dangerous",
      "Spatial Awareness \u2013 body position to break lines and to delay, deny, dictate",
      "Technical \u2013 receiving, dribbling, passing",
      "Combination Play \u2013 movement & interchange",
      "Play Maker & Creating Chances \u2013 through balls, shots (range of finishing)",
      "Shape Play: Delay-Deny-Dictate",
    ],
    responsibilities: {
      defending_organized: [
        "Dictating and Shaping Play",
        "Make Play Predictable",
        "Delay-Deny-Dictate",
        "Compacted and Connected \u2013 Vertical and Horizontal",
        "Screen Middle, Press forward and wide",
        "Communication and support to forward line",
        "Building and Initiating Pressure",
        "Press vs. Regroup to Repress",
        "Opportunity to Regain",
        "Deny forward passes and penetrations",
        "Protecting most dangerous space \u2013 See one, screen one",
        "Defend Vertical Middle",
        "Dominating 1v1 Situations \u2013 Challenge, intercept, tackle, aerial battles",
      ],
      defending_final_third: [
        "Prevent Scoring & Deny Danger Zone Entry",
        "Protect and Screen Space in front of backs",
        "Stay connected \u2013 Recover",
        "Tracking Runners",
        "Contain vs. Touch Tight",
        "Dominating 1v1 Ball Winner \u2013 Challenge, tackle, block shots, double back",
        "Clearances & Managing 2nd Phase",
      ],
      defending_transition: [
        "Prevent Counter Attack",
        "Press vs. Regroup to Repress",
        "TakeAway Time, Space, Options",
        "Anticipate Threat \u2013 Space or Player",
        "Communication to Organize",
      ],
      attacking_organized: [
        "Supporting Build-up",
        "Reading opponent's pressure",
        "Positioning between lines \u2013 spatial awareness",
        "Creating Overloads \u2013 central and wide",
        "Help Break Initial Lines and Advance Forward \u2013 pass or dribble",
        "Play around, through, or over",
        "Help Break Final Line and get into Production Phase",
        "Movement and interchange",
        "Unbalance Opponent \u2013 Speed of Play and Change the Point",
        "Combination Play & Dribble",
        "Receiving and Passing under Pressure",
        "Body shape & First Touch",
      ],
      attacking_final_third: [
        "Creating Chances & Scoring Goals",
        "Assists \u2013 through balls, crosses",
        "Shots \u2013 type, technique, decision",
        "RIB",
        "Adjusting Positioning to provide balance and support",
        "Maintain Possession and lock it in",
      ],
      attacking_transition: [
        "Starting and Supporting Counter Attack",
        "Positioning to be an outlet",
        "Connect 1st Pass",
        "Initiating Build Up",
        "Securing possession and regain shape",
      ],
    },
    technicalChecklist: {
      "All Positions": ["First touch", "Technique under pressure", "Passing Accuracy", "Positioning", "Decision Making", "Communication"],
    },
  },

  central_forward: {
    label: "Central Forward",
    numbers: [9],
    priorities: ["Movement & Interchange", "Create Chances", "Goal Scorer"],
    traits: [
      "Strength, explosive, quick",
      "Dynamic and Dangerous",
      "Creating Chances & Scoring Goals",
      "Establishing Height",
      "Back to Pressure and posting up",
      "Threatening \u2013 movement and combination play",
      "Strength on ball \u2013 balance & control",
      "Dictate and Shape Play Defensively",
      "Dominant and relentless around the goal \u2013 ground and air",
    ],
    responsibilities: {
      defending_organized: [
        "Shaping and Dictating Play",
        "Positioning to make play predictable",
        "Delay-Deny-Dictate",
        "Ability to receive and execute information from deeper players",
        "Building and Initiating Pressure",
        "Press vs. Re-group to Press",
        "Collective and Connected to deeper lines",
        "Opportunity to Regain / Opportunity to Double",
        "Deny forward pass and penetrations",
        "Take away time, space, options",
        "Screen middle, Press forward and wide",
      ],
      defending_final_third: [
        "Prevent Goal Scoring Opportunities",
        "Connected and compact \u2013 vertical and horizontal",
        "Communication to help organize and manage threats \u2013 space or players",
        "Tracking Runners",
        "Opportunities to Double",
        "Managing 2nd Phase",
      ],
      defending_transition: [
        "Positioning to Repress",
        "Challenge, intercept, Tackle",
        "Preventing Counter Attack",
        "Immediate Pressure",
        "Take away Time, Space, Options",
        "Delay, Deny, Dictate",
        "Anticipate and Dealing with Threats \u2013 space or player",
      ],
      attacking_organized: [
        "Supporting Build Up",
        "Create Height",
        "Discipline in positioning \u2013 timing",
        "Reading opponent's pressure",
        "Movement and Interchange \u2013 Between & Behind Lines",
        "Threatening & Timing",
        "Receiving Under Pressure",
        "Spatial and positional Awareness",
        "Back to Goal, Facing Up, Combination Play",
        "Possession to Advance Forward and Break Final Line \u2013 Dribble or Pass",
        "Dominating 1v1 \u2013 Take-on, Create",
      ],
      attacking_final_third: [
        "Creating Chances and Scoring Goals",
        "Positioning in Goal Zone",
        "RIB",
        "Shots \u2013 type, technique, decisions",
        "Assists \u2013 through balls, crosses",
        "Anticipate and react",
        "Decision of when to pass vs. shoot",
      ],
      attacking_transition: [
        "Creating Counter Attack",
        "Movement to threaten and advance forward \u2013 most dangerous player",
        "High or wide",
        "Support to secure possession",
        "Post and hold",
        "Allow team to get into shape",
        "Combination Play",
      ],
    },
    technicalChecklist: {
      "All Positions": ["First touch", "Technique under pressure", "Passing Accuracy", "Positioning", "Decision Making", "Communication"],
    },
  },

  wide_forward: {
    label: "Wide Forward",
    numbers: [7, 11],
    priorities: ["Creating Width", "Dominate 1v1", "Create Chances"],
    traits: [
      "Quick, explosive, and agile",
      "Creative and Energetic",
      "Movement and interchange to break lines of pressure (wide and central)",
      "Dominate in 1v1 Situations (taking on, tackling, intercepting)",
      "Track Back",
      "Dictate play and defend wide space \u2013 intercept and tackle",
      "Creating Chances \u2013 crosses, shots, RIB",
    ],
    responsibilities: {
      defending_organized: [
        "Shaping and Dictating Play",
        "Screen Middle, Press Forward and Wide",
        "Positioning",
        "Recognizing opponent's build up",
        "Ability to receive and execute information from deeper players",
        "Building and Initiating Pressure",
        "Press vs. Re-group to Press",
        "Opportunity to Regain / Opportunity to Double",
        "Deny forward pass and penetrations",
        "Take away time, space, options",
        "Dominating 1v1 Situations \u2013 Challenge, intercept, tackle, Wall pass defending",
        "Flank Defending",
        "Prevent and Disrupt",
        "Regain in Pressure Pocket",
      ],
      defending_final_third: [
        "Prevent Goal Scoring Opportunities",
        "Deny and Defend Crosses",
        "Dominate 1v1",
        "MIB & Tracking Runners",
        "Opportunities to Double",
        "Managing 2nd Phase",
      ],
      defending_transition: [
        "Positioning to Repress",
        "Challenge, intercept, Tackle",
        "Prevent Counter Attack",
        "Immediate Pressure",
        "TakeAway Time, Space, Options",
        "Press vs. Regroup to Repress",
        "Anticipate and Dealing with Threats \u2013 space or player",
      ],
      attacking_organized: [
        "Supporting the build up",
        "Create Height and Width",
        "Discipline in positioning \u2013 timing",
        "Reading opponent's pressure",
        "Movement and Interchange \u2013 Between & Behind Lines",
        "Threatening & Timing",
        "Receiving Under Pressure",
        "Spatial and positional Awareness",
        "Facing Up, Combination Play",
        "Possession to Advance Forward and Break Final Line \u2013 Dribble or Pass",
        "Combination Play & Change of Tempo",
        "Dominating 1v1 \u2013 Take-on, Create",
      ],
      attacking_final_third: [
        "Creating Chances and Scoring Goals",
        "Crossing \u2013 Early, Wide, Next Best",
        "Quality & Accuracy of Service",
        "Re-creating Width",
        "Finishing and Scoring \u2013 Shots type, technique, decision",
        "Assists \u2013 through balls, crosses",
        "RIB",
      ],
      attacking_transition: [
        "Creating & supporting Counter Attack",
        "Movement to threaten and advance forward",
        "High or wide",
        "Support to secure possession",
      ],
    },
    technicalChecklist: {
      "All Positions": ["First touch", "Technique under pressure", "Passing Accuracy", "Positioning", "Decision Making", "Communication"],
    },
  },
};

export const RESPONSIBILITY_LABELS = {
  defending_organized: "Defending Organized",
  defending_final_third: "Defending Final Third",
  defending_transition: "Defending Transition",
  attacking_organized: "Attacking Organized",
  attacking_final_third: "Attacking Final Third",
  attacking_transition: "Attacking Transition",
};

// 11-position standard guide — each position maps to a guide group's content
export const POSITION_GUIDE = {};
STANDARD_POSITIONS.forEach((p) => {
  const group = GUIDE_GROUPS[p.guideKey];
  if (group) {
    POSITION_GUIDE[p.key] = { ...group, label: `${p.number} - ${p.label}`, numbers: [p.number] };
  }
});

export const POSITION_ORDER = STANDARD_POSITIONS.map((p) => p.key);

// Maps a player's position field to a canonical position guide key (one of 11 standard positions)
export function resolvePositionKey(position) {
  if (!position) return null;
  const byLabel = STANDARD_POSITIONS.find((p) => position === `${p.number} - ${p.label}`);
  if (byLabel) return byLabel.key;
  const p = position.toLowerCase();
  if (p.includes("goalkeeper") || p.includes("keeper") || p === "gk") return "goalkeeper";
  if (p.includes("right back")) return "right_back";
  if (p.includes("left back")) return "left_back";
  if (p.includes("right center")) return "right_centerback";
  if (p.includes("left center")) return "left_centerback";
  if (p.includes("center back") || p.includes("centre back") || p.includes("centerback")) return "right_centerback";
  if (p.includes("outside back") || p.includes("fullback") || p.includes("full back") || p.includes("wing back")) return "right_back";
  if (p.includes("holding")) return "holding_midfielder";
  if (p.includes("right winger")) return "right_winger";
  if (p.includes("left mid")) return "left_midfielder";
  if (p.includes("center mid")) return "center_midfielder";
  if (p.includes("attacking mid")) return "attacking_midfielder";
  if (p.includes("winger") || p.includes("wide forward") || p.includes("wide mid")) return "right_winger";
  if (p.includes("center forward") || p.includes("striker") || p.includes("forward")) return "center_forward";
  if (p.includes("mid")) return "center_midfielder";
  if (p.includes("defender") || p.includes("back")) return "right_centerback";
  return null;
}