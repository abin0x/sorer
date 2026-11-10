import React from "react";

// Design tokens
const NAVY = "#0B162B";
const GREEN = "#399F7D";
const GREEN_LIGHT = "#5BC49A";
const GREY = "#94A3B8";
const GREY_LIGHT = "#CBD5E1";
const FIELD_GREEN = "#F0F9F4";
const FIELD_LINE = "#D1E7DD";
const ORANGE = "#E67E22";
const ORANGE_DARK = "#C05A1A";
const BALL = "#FFFFFF";
const BALL_OUTLINE = "#475569";
const BLUE = "#3A7BD5";
const RED = "#E04A4A";

export default function TestDiagram({ testTitle }) {
  const map = {
    "Around the Cone": AroundTheCone,
    "Alternating Feet Juggling": AlternatingJuggling,
    "Figure 8 — Timed": FigureEight,
    "5-10-5 Dribbling": FiveTenFive,
    "3-Zone Shooting": ThreeZoneShooting,
    "Alternating Insides Volleys": AlternateVolleys,
    "Directional 1st Touch / Wall Pass": WallPass,
    "Long Passing — Both Feet": LongPassing,
  };
  const Cmp = map[testTitle] || DefaultDiagram;
  return <Cmp />;
}

/* ============ Shared primitives ============ */

function Field({ children, bg = FIELD_GREEN }) {
  return (
    <svg viewBox="0 0 300 300" className="w-full h-full">
      <defs>
        <pattern id="grass" patternUnits="userSpaceOnUse" width="20" height="20">
          <rect width="20" height="20" fill={bg} />
          <line x1="0" y1="10" x2="20" y2="10" stroke={FIELD_LINE} strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect x="0" y="0" width="300" height="300" fill="url(#grass)" rx="8" />
      <rect x="15" y="15" width="270" height="270" fill="none" stroke={FIELD_LINE} strokeWidth="1.5" rx="4" />
      {children}
    </svg>
  );
}

function Cone({ x, y, color = ORANGE, r = 7 }) {
  return (
    <g>
      <ellipse cx={x} cy={y + 6} rx={r + 1} ry={2.5} fill="#000" opacity="0.12" />
      <polygon points={`${x - r},${y + 5} ${x + r},${y + 5} ${x},${y - r - 2}`} fill={color} stroke={ORANGE_DARK} strokeWidth="0.8" />
      <line x1={x - r * 0.5} y1={y + 1} x2={x + r * 0.5} y2={y + 1} stroke={ORANGE_DARK} strokeWidth="1" opacity="0.5" />
    </g>
  );
}

function Gate({ x, y, h = 14, color = GREY }) {
  return (
    <g>
      <line x1={x} y1={y - h} x2={x} y2={y + h} stroke={color} strokeWidth="3" strokeLinecap="round" />
      <circle cx={x} cy={y - h} r="2.5" fill={color} />
      <circle cx={x} cy={y + h} r="2.5" fill={color} />
    </g>
  );
}

function Ball({ cx, cy, r = 7 }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={BALL} stroke={BALL_OUTLINE} strokeWidth="1.2" />
      <polygon points={`${cx},${cy - r * 0.7} ${cx + r * 0.6},${cy - r * 0.2} ${cx + r * 0.4},${cy + r * 0.5} ${cx - r * 0.4},${cy + r * 0.5} ${cx - r * 0.6},${cy - r * 0.2}`} fill="none" stroke={BALL_OUTLINE} strokeWidth="0.8" />
      <circle cx={cx} cy={cy} r="1.2" fill={BALL_OUTLINE} />
    </g>
  );
}

function Player({ x, y, color = NAVY, label }) {
  return (
    <g>
      <circle cx={x} cy={y - 16} r="5.5" fill={color} />
      <path d={`M${x},${y - 10} L${x},${y + 4} M${x - 6},${y - 4} L${x + 6},${y - 4} M${x},${y + 4} L${x - 5},${y + 14} M${x},${y + 4} L${x + 5},${y + 14}`} stroke={color} strokeWidth="2.5" strokeLinecap="round" fill="none" />
      {label && <text x={x} y={y + 24} textAnchor="middle" fontSize="7" fill={GREY} fontWeight="600">{label}</text>}
    </g>
  );
}

function Arrow({ d, color = GREEN, dashed = true, width = 2 }) {
  const id = `ah-${color.replace("#", "")}-${Math.random().toString(36).slice(2, 6)}`;
  return (
    <>
      <path d={d} fill="none" stroke={color} strokeWidth={width} strokeDasharray={dashed ? "5,4" : "none"} strokeLinecap="round" markerEnd={`url(#${id})`} />
      <defs>
        <marker id={id} markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <path d="M0,0 L7,4 L0,8 L2,4 Z" fill={color} />
        </marker>
      </defs>
    </>
  );
}

function SeqCircle({ x, y, n, color = GREEN }) {
  return (
    <g>
      <circle cx={x} cy={y} r="9" fill={color} />
      <text x={x} y={y + 3.5} textAnchor="middle" fontSize="10" fill="white" fontWeight="700">{n}</text>
    </g>
  );
}

function Label({ x, y, children, color = GREY, size = 8, anchor = "middle", weight = "600" }) {
  return <text x={x} y={y} textAnchor={anchor} fontSize={size} fill={color} fontWeight={weight}>{children}</text>;
}

function Title({ children }) {
  return <Label x={150} y={28} color={NAVY} size={10} weight="700">{children}</Label>;
}

/* ============ 1. Around the Cone ============ */
/* One cone in center. Circle the ball clockwise 30s, then counter-clockwise 30s.
   Score = full revolutions, -1 for hitting cone. */
function AroundTheCone() {
  return (
    <Field>
      <Title>1 MINUTE · 1 CONE</Title>
      {/* Circular path — top half clockwise (green), bottom half counter-clockwise (blue) */}
      <path d="M150,90 A60,60 0 0 1 210,150" fill="none" stroke={GREEN} strokeWidth="2.5" strokeDasharray="5,4" markerEnd="url(#atc-cw)" />
      <path d="M210,150 A60,60 0 0 1 150,210" fill="none" stroke={GREEN} strokeWidth="2.5" strokeDasharray="5,4" markerEnd="url(#atc-cw)" />
      <path d="M150,210 A60,60 0 0 1 90,150" fill="none" stroke={BLUE} strokeWidth="2.5" strokeDasharray="5,4" markerEnd="url(#atc-ccw)" />
      <path d="M90,150 A60,60 0 0 1 150,90" fill="none" stroke={BLUE} strokeWidth="2.5" strokeDasharray="5,4" markerEnd="url(#atc-ccw)" />
      <defs>
        <marker id="atc-cw" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L7,4 L0,8 L2,4 Z" fill={GREEN} /></marker>
        <marker id="atc-ccw" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L7,4 L0,8 L2,4 Z" fill={BLUE} /></marker>
      </defs>
      {/* Center cone */}
      <Cone x={150} y={150} r={9} />
      {/* Ball on the circle */}
      <Ball cx={150} cy={90} r={7} />
      {/* Direction indicators */}
      <Label x={218} y={148} color={GREEN} size={8}>↻</Label>
      <Label x={82} y={148} color={BLUE} size={8}>↺</Label>
      {/* Time labels */}
      <Label x={150} y={245} color={GREEN} size={8}>0–30s: Clockwise</Label>
      <Label x={150} y={258} color={BLUE} size={8}>30–60s: Reverse</Label>
      <Label x={150} y={275} color={GREY} size={7}>+1 per revolution · −1 for hitting cone</Label>
    </Field>
  );
}

/* ============ 2. Alternating Feet Juggling ============ */
/* Stationary juggling, alternate L→R→L→R, laces, 1 min, keep counting if ball drops. */
function AlternatingJuggling() {
  return (
    <Field>
      <Title>1 MIN · ALTERNATE LACES</Title>
      {/* Player */}
      <Player x={150} y={225} />
      {/* Juggle path — ball goes up and comes down */}
      <Arrow d="M140,205 Q135,150 145,90" color={GREEN} dashed={false} width={2.5} />
      <Arrow d="M155,90 Q165,150 160,205" color={BLUE} dashed={false} width={2.5} />
      {/* Ball at top of arc */}
      <Ball cx={150} cy={85} r={7} />
      {/* Foot labels */}
      <Label x={122} y={215} color={GREEN} size={11} weight="700">L</Label>
      <Label x={178} y={215} color={BLUE} size={11} weight="700">R</Label>
      {/* Sequence indicator */}
      <Label x={150} y={130} color={NAVY} size={9} weight="700">L → R → L → R</Label>
      {/* Instructions */}
      <Label x={150} y={262} color={GREY} size={7}>Keep ball below waist · clean laces touches</Label>
      <Label x={150} y={275} color={GREY} size={7}>Keep counting if ball drops</Label>
    </Field>
  );
}

/* ============ 3. Figure 8 — Timed ============ */
/* 2 cones 10m apart with a middle cone. 3 runs: R only, L only, any. Figure-8 path.
   Score = elapsed time + penalties (lower is better). */
function FigureEight() {
  return (
    <Field>
      <Title>3 RUNS · TIMED (LOWER = BETTER)</Title>
      {/* End cones */}
      <Cone x={70} y={150} r={8} />
      <Cone x={230} y={150} r={8} />
      {/* Middle cone (direction change) */}
      <Cone x={150} y={150} r={6} color={GREY} />
      {/* Figure-8 path: proper crossing at center */}
      <path d="M70,150 C70,95 120,95 150,150 C180,205 230,205 230,150 C230,95 180,95 150,150 C120,205 70,205 70,150"
        fill="none" stroke={GREEN} strokeWidth="2.5" strokeDasharray="5,4" strokeLinecap="round" />
      {/* Direction arrows on the figure-8 */}
      <Arrow d="M110,110 L115,115" color={GREEN} dashed={false} width={2.5} />
      <Arrow d="M190,190 L185,185" color={GREEN} dashed={false} width={2.5} />
      {/* Start position */}
      <Ball cx={70} cy={175} r={6} />
      <Label x={70} y={135} color={NAVY} size={7} weight="700">START</Label>
      <Label x={70} y={195} color={GREY} size={6}>CONE</Label>
      <Label x={230} y={135} color={GREY} size={6}>CONE</Label>
      <Label x={150} y={138} color={GREY} size={6}>MIDDLE</Label>
      {/* Distance */}
      <line x1="70" y1="250" x2="230" y2="250" stroke={GREY_LIGHT} strokeWidth="1" />
      <line x1="70" y1="246" x2="70" y2="254" stroke={GREY} strokeWidth="1" />
      <line x1="230" y1="246" x2="230" y2="254" stroke={GREY} strokeWidth="1" />
      <Label x={150} y={262} color={GREY} size={8}>10m between end cones</Label>
      {/* Run labels */}
      <Label x={150} y={285} color={NAVY} size={7}>Run 1: R only · Run 2: L only · Run 3: Any</Label>
    </Field>
  );
}

/* ============ 4. 5-10-5 Dribbling ============ */
/* 3 gates 5m apart. Start in middle. Sprint to one end, then far end, then back to middle.
   Score = elapsed time (lower is better). */
function FiveTenFive() {
  return (
    <Field>
      <Title>SPRINT DRIBBLE · TIMED</Title>
      {/* 3 gates */}
      <Gate x={60} y={150} />
      <Gate x={150} y={150} />
      <Gate x={240} y={150} />
      {/* Start ball at middle gate */}
      <Ball cx={150} cy={130} r={6} />
      <Label x={150} y={118} color={NAVY} size={7} weight="700">START</Label>
      {/* Path with numbered sequence */}
      {/* 1: middle → left gate */}
      <Arrow d="M142,140 L70,140" color={GREEN} dashed={false} width={2.5} />
      <SeqCircle x={50} y={120} n={1} color={GREEN} />
      {/* 2: left gate → right gate */}
      <Arrow d="M68,165 L238,165" color={BLUE} dashed={false} width={2.5} />
      <SeqCircle x={150} y={195} n={2} color={BLUE} />
      {/* 3: right gate → middle */}
      <Arrow d="M232,140 L158,140" color={GREEN} dashed={false} width={2.5} />
      <SeqCircle x={260} y={120} n={3} color={GREEN} />
      {/* Gate labels */}
      <Label x={60} y={215} color={GREY} size={7}>GATE 1</Label>
      <Label x={150} y={215} color={GREY} size={7}>GATE 2</Label>
      <Label x={240} y={215} color={GREY} size={7}>GATE 3</Label>
      {/* Distance labels */}
      <Label x={105} y={132} color={GREEN} size={7}>5m</Label>
      <Label x={195} y={132} color={GREEN} size={7}>5m</Label>
      <Label x={150} y={178} color={BLUE} size={7}>10m</Label>
      {/* Instructions */}
      <Label x={150} y={255} color={GREY} size={7}>Cut ball past each gate · finish within 1yd of middle</Label>
      <Label x={150} y={270} color={GREY} size={7}>Invalid if you miss a gate</Label>
    </Field>
  );
}

/* ============ 5. 3-Zone Shooting ============ */
function ThreeZoneShooting() {
  return (
    <Field>
      <Title>10 ATTEMPTS · 5s (3s U13+)</Title>
      {/* Goal divided into 3 zones */}
      <rect x="60" y="35" width="180" height="35" fill="none" stroke={NAVY} strokeWidth="3" rx="2" />
      <line x1="120" y1="35" x2="120" y2="70" stroke={NAVY} strokeWidth="1.5" strokeDasharray="3,2" />
      <line x1="180" y1="35" x2="180" y2="70" stroke={NAVY} strokeWidth="1.5" strokeDasharray="3,2" />
      <Label x="90" y="57" color={GREY} size={7}>CORNER</Label>
      <Label x="150" y="57" color={GREY} size={7}>MIDDLE</Label>
      <Label x="210" y="57" color={GREY} size={7}>CORNER</Label>
      <Label x="150" y="28" color={NAVY} size={8} weight="700">GOAL</Label>
      {/* Coach drops ball */}
      <Player x={150} y={115} label="COACH" />
      <Arrow d="M150,105 L150,80" color={GREY} dashed={false} width={2} />
      <Ball cx={150} cy={80} r={6} />
      {/* Two shooters */}
      <Player x={80} y={225} />
      <Player x={220} y={225} />
      <Arrow d="M90,215 L95,80" color={GREEN} dashed={false} width={2.5} />
      <Arrow d="M210,215 L205,80" color={GREEN} dashed={false} width={2.5} />
      <Label x="150" y="265" color={NAVY} size={8} weight="700">10 ATTEMPTS · 5s (3s U13+)</Label>
      <Label x="150" y="280" color={GREY} size={7}>Miss=0 · Middle=1 · Corner=2 · 1-touch=+0.5</Label>
    </Field>
  );
}

/* ============ 6. Alternating Insides Volleys ============ */
function AlternateVolleys() {
  return (
    <Field>
      <Title>UNTIL BALL DROPS · ALTERNATE INSIDE</Title>
      {/* Wall */}
      <rect x="80" y="28" width="140" height="18" fill={GREY} opacity="0.35" rx="3" />
      <Label x="150" y="40" color={NAVY} size={9} weight="700">WALL</Label>
      {/* Player */}
      <Player x={150} y={235} />
      {/* Ball path: up to wall, back down */}
      <Ball cx={150} cy={130} r={6} />
      <Arrow d="M145,215 L145,55" color={GREEN} dashed={false} width={2.5} />
      <Arrow d="M155,55 L155,215" color={BLUE} dashed={false} width={2.5} />
      <Label x="118" y="170" color={GREEN} size={8} anchor="end">R inside ↑</Label>
      <Label x="182" y="170" color={BLUE} size={8} anchor="start">L inside ↓</Label>
      <Label x="150" y="275" color={NAVY} size={8} weight="700">UNTIL BALL DROPS</Label>
      <Label x="150" y="288" color={GREY} size={7}>Alternate inside volleys · ball stays in air</Label>
    </Field>
  );
}

/* ============ 7. Directional 1st Touch / Wall Pass ============ */
function WallPass() {
  return (
    <Field>
      <Title>1 MIN · ALTERNATE FEET THROUGH GATES</Title>
      {/* Wall */}
      <rect x="80" y="28" width="140" height="18" fill={GREY} opacity="0.35" rx="3" />
      <Label x="150" y="40" color={NAVY} size={9} weight="700">WALL</Label>
      {/* Player */}
      <Player x={150} y={225} />
      {/* Gates */}
      <Gate x={80} y={225} h={10} />
      <Gate x={220} y={225} h={10} />
      <Label x="80" y="250" color={GREEN} size={7}>L GATE</Label>
      <Label x="220" y="250" color={BLUE} size={7}>R GATE</Label>
      {/* Pass to wall and back through gates */}
      <Arrow d="M150,210 L150,55" color={GREY} dashed={false} width={2} />
      <Arrow d="M150,55 L220,210" color={BLUE} dashed={false} width={2.5} />
      <Arrow d="M150,55 L80,210" color={GREEN} dashed={false} width={2.5} />
      <Label x="150" y="275" color={NAVY} size={8} weight="700">R through R gate · L through L gate</Label>
      <Label x="150" y="288" color={GREY} size={7}>Alternate feet · 1 minute</Label>
    </Field>
  );
}

/* ============ 8. Long Passing — Both Feet ============ */
function LongPassing() {
  return (
    <Field>
      <Title>10 ATTEMPTS · 5R + 5L</Title>
      {/* Player */}
      <Player x={50} y={150} />
      {/* Target zone */}
      <rect x="220" y="120" width="50" height="50" fill={GREEN} fillOpacity="0.12" stroke={GREEN} strokeWidth="2" strokeDasharray="4,3" rx="4" />
      <Label x="245" y="145" color={GREEN} size={7}>5-YARD</Label>
      <Label x="245" y="157" color={GREEN} size={7}>TARGET</Label>
      {/* Pass arrows */}
      <Arrow d="M62,140 L218,140" color={GREEN} dashed={false} width={2.5} />
      <Arrow d="M62,160 L218,160" color={BLUE} dashed={false} width={2.5} />
      <Label x="140" y="132" color={GREEN} size={8}>→ RIGHT FOOT ×5</Label>
      <Label x="140" y="175" color={BLUE} size={8}>→ LEFT FOOT ×5</Label>
      {/* Distance line */}
      <line x1="50" y1="195" x2="220" y2="195" stroke={GREY_LIGHT} strokeWidth="1" strokeDasharray="2,2" />
      <Label x="135" y="210" color={GREY} size={8}>25–35 YARDS</Label>
      <Label x="150" y="270" color={NAVY} size={8} weight="700">10 ATTEMPTS · 5R + 5L</Label>
      <Label x="150" y="285" color={GREY} size={7}>Ball must come to rest inside the square</Label>
    </Field>
  );
}

/* ============ Default ============ */
function DefaultDiagram() {
  return (
    <Field>
      <Ball cx={150} cy={150} r={8} />
      <Label x={150} y={195} color={GREY}>Diagram not available</Label>
    </Field>
  );
}