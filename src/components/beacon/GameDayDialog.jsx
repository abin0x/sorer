import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const EMPTY = { opponent: "", home_away: "home", date: "", kickoff: "", arrive: "", field: "", address: "", uniform: "", notes: "" };

/** Builds a game-day card: opponent, times, field pin, uniform, with RSVP buttons for families. */
export default function GameDayDialog({ open, onOpenChange, onAttach, mode = "game" }) {
  const [f, setF] = useState(EMPTY);
  const set = (k) => (e) => setF((v) => ({ ...v, [k]: e.target.value }));
  const isPin = mode === "pin";
  const attach = () => {
    if (isPin) {
      if (!f.field.trim() && !f.address.trim()) return;
      onAttach({ location: { name: f.field.trim(), address: f.address.trim() } });
    } else {
      if (!f.opponent.trim() && !f.date) return;
      onAttach({
        game_card: { ...f, opponent: f.opponent.trim() },
        location: f.field || f.address ? { name: f.field.trim(), address: f.address.trim() } : null,
      });
    }
    setF(EMPTY);
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{isPin ? "Share field location" : "Game day card"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          {!isPin && (
            <>
              <div className="col-span-2"><Label>Opponent</Label><Input value={f.opponent} onChange={set("opponent")} placeholder="Riverside United" /></div>
              <div className="col-span-2 flex gap-2">
                {["home", "away"].map((h) => (
                  <button key={h} onClick={() => setF((v) => ({ ...v, home_away: h }))} className={`flex-1 rounded-full border py-1.5 text-sm capitalize ${f.home_away === h ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}>{h}</button>
                ))}
              </div>
              <div><Label>Date</Label><Input type="date" value={f.date} onChange={set("date")} /></div>
              <div><Label>Kickoff</Label><Input type="time" value={f.kickoff} onChange={set("kickoff")} /></div>
              <div><Label>Arrive by</Label><Input type="time" value={f.arrive} onChange={set("arrive")} /></div>
              <div><Label>Uniform</Label><Input value={f.uniform} onChange={set("uniform")} placeholder="White kit" /></div>
            </>
          )}
          <div className="col-span-2"><Label>Field</Label><Input value={f.field} onChange={set("field")} placeholder="Memorial Park, Field 3" /></div>
          <div className="col-span-2"><Label>Address</Label><Input value={f.address} onChange={set("address")} placeholder="100 Park Ave, Springfield" /></div>
          {!isPin && <div className="col-span-2"><Label>Notes</Label><Input value={f.notes} onChange={set("notes")} placeholder="Bring water and shin guards" /></div>}
        </div>
        <DialogFooter><Button onClick={attach}>{isPin ? "Add pin" : "Add game card"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
