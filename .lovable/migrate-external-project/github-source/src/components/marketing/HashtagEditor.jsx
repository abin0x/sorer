import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

export default function HashtagEditor({ value, onChange }) {
  const [text, setText] = useState("");
  const add = () => {
    const tag = text.trim().replace(/^#/, "").replace(/\s+/g, "");
    if (tag && !value.includes(tag)) onChange([...value, tag]);
    setText("");
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {value.map((h) => (
          <Badge key={h} variant="secondary" className="gap-1 pr-1">
            #{h}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== h))} aria-label={`Remove ${h}`}><X className="w-3 h-3" /></button>
          </Badge>
        ))}
      </div>
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); } }}
        onBlur={add}
        placeholder="Add hashtag and press Enter"
      />
    </div>
  );
}