import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight, ArrowLeft, Check, Pencil } from "lucide-react";
import { useTenant } from "@/lib/TenantContext";

/**
 * Generic multi-step onboarding stepper with tenant branding.
 * Steps: Welcome → Highlights → Contact → [customSteps...] → Actions (optional) → Review.
 * The Review step shows editable summary sections with jump-to-step links.
 */
export default function OnboardingCardFlow({
  icon: Icon,
  roleLabel,
  welcomeMessage,
  highlights = [],
  renderContact,
  renderActions,
  actionsTitle = "A Few More Details",
  actionsDescription = "",
  customSteps = [],
  summarySections = [],
  summaryItems = [],
  onSubmit,
  submitting,
}) {
  const { brand } = useTenant();
  const primary = brand.primary_color || "#399F7D";
  const [step, setStep] = useState(0);

  const steps = [
    { key: "welcome", label: "Welcome" },
    { key: "highlights", label: "Overview" },
    { key: "contact", label: "Contact" },
    ...customSteps.map((s) => ({ key: s.key, label: s.label || s.title })),
    ...(renderActions ? [{ key: "actions", label: actionsTitle }] : []),
    { key: "review", label: "Review" },
  ];
  const total = steps.length;
  const isLast = step === total - 1;
  const isFirst = step === 0;

  const goTo = (i) => setStep(Math.max(0, Math.min(i, total - 1)));
  const next = () => goTo(step + 1);
  const back = () => goTo(step - 1);

  // Build review sections: combine legacy summaryItems + structured summarySections
  const reviewSections = [];
  if (summarySections.length > 0) {
    reviewSections.push(...summarySections);
  }
  if (summaryItems.length > 0) {
    reviewSections.push({ title: "Summary", items: summaryItems, stepIndex: 2 });
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 mb-4 flex-wrap">
          {steps.map((s, i) => (
            <button
              key={s.key}
              onClick={() => goTo(i)}
              className="group flex items-center gap-1.5"
              title={s.label}
            >
              <div
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: i === step ? "2rem" : i <= step ? "1rem" : "0.5rem",
                  backgroundColor: i <= step ? primary : "#e2e8f0",
                }}
              />
            </button>
          ))}
        </div>

        <Card className="dark:bg-slate-900 dark:border-slate-700 overflow-hidden shadow-lg">
          <div className="h-1.5" style={{ backgroundColor: primary }} />

          {/* Club logo + step indicator */}
          <div className="flex items-center justify-between px-6 pt-5">
            <div className="flex items-center gap-2">
              {brand.logo_url ? (
                <img src={brand.logo_url} alt={brand.club_name} className="h-7 w-7 rounded-md object-contain" />
              ) : (
                <div className="h-7 w-7 rounded-md flex items-center justify-center" style={{ backgroundColor: primary }}>
                  {Icon && <Icon className="w-4 h-4 text-white" />}
                </div>
              )}
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Step {step + 1} of {total}
              </span>
            </div>
            <button
              onClick={onSubmit}
              disabled={submitting}
              className="text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-50"
            >
              Skip for now
            </button>
          </div>

          <CardContent className="space-y-6 pt-4 pb-6 min-h-[340px] flex flex-col">
            <div className="flex-1">
              {/* Welcome */}
              {steps[step].key === "welcome" && (
                <div className="text-center py-6 space-y-4">
                  <div
                    className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center shadow-md overflow-hidden"
                    style={{ backgroundColor: primary }}
                  >
                    {brand.logo_url ? (
                      <img src={brand.logo_url} alt={brand.club_name} className="w-full h-full object-contain p-2" />
                    ) : (
                      Icon && <Icon className="w-8 h-8 text-white" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Welcome to {brand.club_name}!</h2>
                    <p className="text-sm font-semibold mt-1" style={{ color: primary }}>{roleLabel}</p>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">{welcomeMessage}</p>
                </div>
              )}

              {/* Highlights */}
              {steps[step].key === "highlights" && (
                <div className="py-2 space-y-3">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white text-center mb-4">
                    Here's what you can do
                  </h3>
                  {highlights.map((h, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${primary}1a` }}>
                        {h.icon && <h.icon className="w-5 h-5" style={{ color: primary }} />}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-slate-900 dark:text-white">{h.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{h.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Contact */}
              {steps[step].key === "contact" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Your Contact Info</h3>
                  {renderContact?.()}
                </div>
              )}

              {/* Custom steps */}
              {customSteps.map((cs) =>
                steps[step].key === cs.key ? (
                  <div key={cs.key} className="space-y-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">{cs.title}</h3>
                      {cs.description && <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{cs.description}</p>}
                    </div>
                    {cs.render?.()}
                  </div>
                ) : null
              )}

              {/* Actions */}
              {steps[step].key === "actions" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{actionsTitle}</h3>
                  {actionsDescription && <p className="text-sm text-slate-500 dark:text-slate-400">{actionsDescription}</p>}
                  {renderActions?.()}
                </div>
              )}

              {/* Review */}
              {steps[step].key === "review" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Review &amp; Confirm</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Please review everything below. Click <Pencil className="inline w-3 h-3" /> to edit any section before finishing.
                  </p>
                  <div className="space-y-3">
                    {reviewSections.map((section, si) => (
                      <div key={si} className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800/50">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{section.title}</span>
                          {section.stepIndex != null && (
                            <button
                              onClick={() => goTo(section.stepIndex)}
                              className="flex items-center gap-1 text-xs font-medium hover:opacity-70"
                              style={{ color: primary }}
                            >
                              <Pencil className="w-3 h-3" /> Edit
                            </button>
                          )}
                        </div>
                        <div className="px-3 py-2 space-y-1">
                          {section.items.map((item, i) => (
                            <div key={i} className="flex justify-between gap-4 py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
                              <span className="text-sm text-slate-500 dark:text-slate-400">{item.label}</span>
                              <span className="text-sm font-medium text-slate-900 dark:text-white text-right max-w-[60%]">
                                {item.value || "—"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400">You can update any of this later from your profile settings.</p>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="ghost"
                onClick={back}
                disabled={isFirst}
                className={isFirst ? "opacity-0 pointer-events-none" : ""}
              >
                <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
              </Button>
              {isLast ? (
                <Button onClick={onSubmit} disabled={submitting} style={{ backgroundColor: primary }} className="text-white hover:opacity-90">
                  {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                  {submitting ? "Saving…" : "Confirm & Finish"}
                </Button>
              ) : (
                <Button onClick={next} style={{ backgroundColor: primary }} className="text-white hover:opacity-90">
                  Continue <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}