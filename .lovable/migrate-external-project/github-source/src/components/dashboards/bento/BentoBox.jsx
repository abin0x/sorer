import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

export default function BentoBox({ title, icon: Icon, options, className = "" }) {
  const [selected, setSelected] = React.useState(options[0]?.value);
  const active = options.find((o) => o.value === selected) || options[0];

  return (
    <Card className={`border-border rounded-xl shadow-sm flex flex-col ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <CardTitle className="flex items-center gap-2 text-xs font-bold tracking-wider uppercase text-text-primary">
          {Icon && <Icon className="w-4 h-4 text-action" />}
          {title}
        </CardTitle>
        {options.length > 1 && (
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger className="h-7 w-auto text-xs gap-1 border-action/20 bg-action/5 px-2 focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {options.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </CardHeader>
      <CardContent className="flex-1 pt-0">
        {active?.render ? active.render() : null}
      </CardContent>
    </Card>
  );
}