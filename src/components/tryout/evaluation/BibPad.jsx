import React, { useState } from "react";
import { Delete, Hash } from "lucide-react";
import NativeSheet from "@/components/beacon/NativeSheet";
import { haptic } from "@/lib/haptics";

/** Big numeric keypad: type a bib number, jump straight to that player's score sheet. */
export default function BibPad({ open, onClose, rows, onPick }) {
  const [digits, setDigits] = useState("");
  const norm = (v) => String(v ?? "").replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  const match = digits ? rows.find((r) => r.bib != null && norm(r.bib) === norm(digits)) : null;
  const press = (k) => { haptic(); setDigits((d) => (k === "del" ? d.slice(0, -1) : (d + k).slice(0, 4))); };
  const go = () => { if (!match) return haptic("warn"); haptic("success"); onPick(match); setDigits(""); };
  return (
    <NativeSheet open={open} onClose={() => { setDigits(""); onClose(); }} title="Jump to bib">
      <div className="mt-2 rounded-2xl border-2 border-foreground bg-card p-4 text-center">
        <div className="font-mono text-5xl font-black tracking-widest text-foreground min-h-[3.5rem]">{digits ? `#${digits}` : <span className="text-muted-foreground">#</span>}</div>
        <p className={`mt-1 text-sm font-semibold truncate ${match ? "text-foreground" : "text-muted-foreground"}`}>
          {!digits ? "Type the number on the bib" : match ? match.player_name : "No player with that bib"}
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "del", "0", "go"].map((k) => k === "go" ? (
          <button key={k} type="button" onClick={go} disabled={!match} className="h-16 rounded-2xl bg-foreground text-background text-lg font-black disabled:opacity-30 active:scale-95 transition">Score</button>
        ) : (
          <button key={k} type="button" onClick={() => press(k)} aria-label={k === "del" ? "Delete" : k} className="h-16 rounded-2xl border-2 border-border bg-card text-2xl font-black text-foreground active:scale-95 active:bg-muted transition grid place-items-center">
            {k === "del" ? <Delete className="w-6 h-6" /> : k}
          </button>
        ))}
      </div>
    </NativeSheet>
  );
}
export { Hash as BibIcon };
