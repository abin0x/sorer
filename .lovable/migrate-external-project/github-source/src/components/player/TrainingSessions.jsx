import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Users, ArrowRight } from "lucide-react";

const SESSIONS = [
  { title: "Cone Dribbling Drill", level: "Beginner", duration: "15 min", capacity: "Solo", desc: "Around-the-cone dribbling to build close control and touch." },
  { title: "Alternating Feet Juggling", level: "Intermediate", duration: "10 min", capacity: "Solo", desc: "Juggling with alternating feet to improve first touch and balance." },
  { title: "1v1 Attacking Moves", level: "Intermediate", duration: "20 min", capacity: "Pairs", desc: "Beat the defender with body feints and change of pace." },
  { title: "Passing Triangles", level: "Advanced", duration: "25 min", capacity: "3+ players", desc: "Quick combination play to develop passing and movement off the ball." },
  { title: "Finishing Under Pressure", level: "Advanced", duration: "30 min", capacity: "Small group", desc: "Composure in the box with a defender closing down." },
  { title: "Small-Sided Game", level: "All Levels", duration: "40 min", capacity: "4v4", desc: "Game-realistic decisions in a tight space." },
];

const LEVEL_COLORS = {
  Beginner: "bg-green-500/15 text-green-600 dark:text-green-400",
  Intermediate: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  Advanced: "bg-red-500/15 text-red-600 dark:text-red-400",
  "All Levels": "bg-blue-500/15 text-blue-600 dark:text-blue-400",
};

export default function TrainingSessions() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {SESSIONS.map((s) => (
        <Card key={s.title} className="adisal-card hover:shadow-md transition-shadow">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className={`status-pill ${LEVEL_COLORS[s.level] || LEVEL_COLORS.Beginner}`}>{s.level}</span>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="font-semibold text-sm">{s.title}</p>
            <p className="text-xs text-muted-foreground">{s.desc}</p>
            <div className="flex items-center gap-3 pt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {s.duration}</span>
              <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {s.capacity}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}