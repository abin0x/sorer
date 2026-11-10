import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";

const MAX_OPTIONS = 6;

/** Inline editor for the options of a poll being composed. */
export default function ChannelPollEditor({ options, onChange }) {
  const setText = (index, text) => onChange(options.map((o, i) => (i === index ? { ...o, text } : o)));
  const addOption = () => options.length < MAX_OPTIONS && onChange([...options, { id: `o${options.length + 1}-${Date.now()}`, text: "" }]);
  const removeOption = (index) => onChange(options.filter((_, i) => i !== index));

  return (
    <div className="rounded-xl border border-border bg-muted/40 p-2.5 space-y-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Poll options</p>
      {options.map((option, index) => (
        <div key={option.id} className="flex items-center gap-1.5">
          <Input
            value={option.text}
            onChange={(e) => setText(index, e.target.value)}
            placeholder={`Option ${index + 1}`}
            className="h-8 rounded-lg bg-background"
          />
          {options.length > 2 && (
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeOption(index)}>
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      ))}
      {options.length < MAX_OPTIONS && (
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={addOption}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Add option
        </Button>
      )}
    </div>
  );
}