import React from "react";
import {
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { ChevronDown } from "lucide-react";
import FeatureCard from "./FeatureCard";

export default function ModuleAccordionCard({ module }) {
  const Icon = module.icon;
  // Surface a few representative highlights in the collapsed view
  const previewHighlights = module.features
    .flatMap((f) => f.highlights || [])
    .slice(0, 4);

  return (
    <AccordionItem
      value={module.key}
      className={`rounded-2xl border ${module.border} bg-white dark:bg-slate-900/40 overflow-hidden data-[state=open]:border-primary data-[state=open]:shadow-[0_0_24px_hsl(var(--primary)/0.15)]`}
    >
      <AccordionTrigger
        className="px-5 py-4 hover:no-underline group"
      >
        <div className="flex items-center gap-4 w-full">
          <div className={`p-3 rounded-xl ${module.iconBg} shrink-0`}>
            <Icon className={`w-6 h-6 ${module.iconText}`} />
          </div>
          <div className="flex-1 text-left min-w-0">
            <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
              {module.title}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {module.tagline}
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {previewHighlights.map((h) => (
                <span
                  key={h}
                  className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary"
                >
                  {h}
                </span>
              ))}
            </div>
          </div>
          <ChevronDown className="w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180 group-data-[state=open]:text-primary" />
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="px-5 pb-5 pt-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {module.features.map((feature, idx) => (
              <FeatureCard
                key={idx}
                feature={feature}
                iconBg={module.iconBg}
                iconText={module.iconText}
              />
            ))}
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}