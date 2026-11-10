import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { WHY_FAQ as QA } from "@/lib/faqData";

export default function WhyObjections() {
  const [open, setOpen] = useState(0);

  return (
    <section id="faq" className="py-16 md:py-20 scroll-mt-20">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-10">
          <h2 className="pub-display text-2xl md:text-4xl text-slate-900 dark:text-[#F5F1E8]">
            The questions every
            <span className="block text-primary">director asks.</span>
          </h2>
        </div>

        <div className="space-y-3">
          {QA.map((item, i) => {
            const isOpen = open === i;
            return (
              <div
                key={i}
                className="rounded-2xl border border-slate-200 dark:border-[#2a3a33] bg-white dark:bg-[#17211d] overflow-hidden"
              >
                <button
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  className="w-full flex items-center justify-between gap-4 p-5 text-left"
                >
                  <span className="text-sm md:text-base font-bold text-slate-900 dark:text-[#F5F1E8]">{item.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-primary shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {/* Kept in the DOM while collapsed so the FAQ schema and the
                    page text always agree. */}
                <div className={isOpen ? "px-5 pb-5" : "px-5 pb-5 hidden"}>
                  <p className="text-sm md:text-base text-slate-600 dark:text-[#cfcabd] leading-relaxed">
                    {item.q === "What does it cost?" ? (
                      <>
                        {item.a} <Link to="/pricing" className="text-primary font-semibold underline">See pricing</Link>.
                      </>
                    ) : (
                      item.a
                    )}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}