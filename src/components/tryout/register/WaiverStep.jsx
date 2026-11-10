import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { FileSignature } from "lucide-react";

/** Step 3 — required waivers and documents, accepted and signed per player. */
export default function WaiverStep({ family, selected, choices, setChoice, guardianName }) {
  const planById = {};
  (family?.plans || []).forEach((p) => { planById[p.id] = p; });

  return (
    <div className="space-y-6">
      {selected.map((kid) => {
        const choice = choices[kid.id] || {};
        const plan = planById[choice.plan_id];
        const documents = plan?.required_documents || [];
        const accepted = choice.accepted || [];
        const toggleDoc = (name) => setChoice(kid.id, {
          accepted: accepted.includes(name) ? accepted.filter((n) => n !== name) : [...accepted, name],
        });

        return (
          <Card key={kid.id}>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <FileSignature className="w-5 h-5 text-primary" />
                <h2 className="font-bold text-lg">{kid.first_name} {kid.last_name}</h2>
              </div>
              <p className="text-xs text-muted-foreground">{plan?.title}</p>

              {documents.length === 0 && (
                <p className="text-sm text-muted-foreground">This tryout has no waivers to complete — just sign below.</p>
              )}

              <div className="space-y-1.5">
                {documents.map((doc) => (
                  <label key={doc.name} className="flex items-start gap-3 border border-border rounded-xl p-3 cursor-pointer hover:border-primary/40">
                    <Checkbox checked={accepted.includes(doc.name)} onCheckedChange={() => toggleDoc(doc.name)} className="mt-0.5" />
                    <span>
                      <span className="text-sm font-medium">{doc.name}{doc.required === false ? " (optional)" : ""}</span>
                      {doc.notes && <span className="block text-xs text-muted-foreground">{doc.notes}</span>}
                    </span>
                  </label>
                ))}
              </div>

              <div className="border-t border-border pt-4 space-y-2">
                <Label>Parent / guardian signature *</Label>
                <Input
                  placeholder={guardianName || "Type your full name"}
                  value={choice.signature || ""}
                  onChange={(e) => setChoice(kid.id, { signature: e.target.value })}
                  className="rounded-xl"
                />
                <p className="text-xs text-muted-foreground">
                  Typing your name here is your electronic signature. It is recorded with the date and your email on {kid.first_name}'s tryout registration.
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}