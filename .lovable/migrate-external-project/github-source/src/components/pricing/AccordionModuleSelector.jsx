import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Check } from "lucide-react";
import { MODULES } from "@/components/features/moduleData";

// Maps pricing-calculator module keys to the rich module entries on the home page.
const MODULE_KEY_MAP = {
  payments: "payments",
  kanban: "kanban",
  player_dev: "development",
  facilities: "facilities",
  tournaments: "tournaments",
  website: "branding",
};

export default function AccordionModuleSelector({ modules, selectedKeys, onToggle }) {
  const richFor = (key) => MODULES.find((m) => m.key === MODULE_KEY_MAP[key]);

  return (
    <Accordion type="multiple" className="space-y-3">
      {modules.map((m) => {
        const checked = selectedKeys.includes(m.key);
        const rich = richFor(m.key);
        return (
          <div
            key={m.key}
            className={`rounded-xl border-2 transition-colors ${checked ? "border-slate-900 bg-slate-50" : "border-slate-200 bg-white"}`}
          >
            <div className="flex items-center gap-3 px-4 py-3">
              <Checkbox checked={checked} onCheckedChange={() => onToggle(m.key)} />
              <AccordionItem value={m.key} className="flex-1 border-0">
                <AccordionTrigger className="hover:no-underline py-0">
                  <div className="flex items-baseline justify-between gap-2 w-full pr-2">
                    <span className="font-semibold text-slate-900 text-sm text-left">{m.name}</span>
                    <span className="text-sm font-bold text-slate-900 whitespace-nowrap">${Number(m.list_price).toFixed(0)}/yr</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-3 pb-1">
                  {rich ? (
                    <>
                      <p className="text-xs text-slate-500 mb-3">{rich.tagline}</p>
                      <div className="space-y-3">
                        {rich.features.map((f, i) => {
                          const FIcon = f.icon;
                          return (
                            <div key={i} className="flex gap-3">
                              <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 bg-slate-100">
                                {FIcon ? <FIcon className="w-3 h-3 text-slate-600" /> : <Check className="w-3 h-3 text-slate-600" />}
                              </div>
                              <div>
                                <div className="text-sm font-bold text-slate-800">{f.title}</div>
                                <div className="text-xs text-slate-500 mt-0.5">{f.description}</div>
                                {f.highlights && (
                                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                                    {f.highlights.map((h) => (
                                      <span key={h} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{h}</span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    m.notes && <p className="text-xs text-slate-500">{m.notes}</p>
                  )}
                </AccordionContent>
              </AccordionItem>
            </div>
          </div>
        );
      })}
    </Accordion>
  );
}