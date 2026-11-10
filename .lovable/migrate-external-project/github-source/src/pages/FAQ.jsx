import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search, ChevronDown, HelpCircle, Users, Trophy, Building2, MapPin, MessageSquare, ShieldCheck, ArrowRight } from "lucide-react";
import JsonLd from "@/components/seo/JsonLd";
import { faqPageSchema } from "@/lib/seo/structuredData";
import { FAQ_CATEGORIES as CATEGORIES } from "@/lib/faqData";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import PublicNav from "@/components/layout/PublicNav";
import PublicFooter from "@/components/public/PublicFooter";
import usePageMeta from "@/lib/usePageMeta";

// Icons stay in this file (components can't live in the data module); the
// questions come from @/lib/faqData so the page and its FAQPage schema match.
const CATEGORY_ICONS = {
  getting_started: HelpCircle,
  club_management: Building2,
  registration_teams: Users,
  player_development: Trophy,
  facility_calendar: MapPin,
  communication_payments: MessageSquare,
  security_privacy: ShieldCheck,
};

const CATEGORY_KEYS = ["all", ...CATEGORIES.map((c) => c.key)];

const FAQ_SCHEMA = faqPageSchema(CATEGORIES.flatMap((c) => c.questions));

export default function FAQ() {
  usePageMeta({
    title: "Soccer Club Management Software FAQ | Club Rudder",
    description: "Answers about registration, payments, migration, roles and data ownership on Club Rudder.",
  });
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [openItems, setOpenItems] = useState({});

  const toggle = (key) => setOpenItems((s) => ({ ...s, [key]: !s[key] }));

  const filteredCategories = useMemo(() => {
    if (activeCategory !== "all") return CATEGORIES.filter((c) => c.key === activeCategory);
    return CATEGORIES;
  }, [activeCategory]);

  const filteredQuestions = useMemo(() => {
    if (!search) return filteredCategories;
    return filteredCategories.map((cat) => ({
      ...cat,
      questions: cat.questions.filter(
        (q) => q.q.toLowerCase().includes(search.toLowerCase()) || q.a.toLowerCase().includes(search.toLowerCase())
      ),
    })).filter((c) => c.questions.length > 0);
  }, [filteredCategories, search]);

  const totalQuestions = CATEGORIES.reduce((s, c) => s + c.questions.length, 0);

  return (
    <div className="min-h-screen bg-white dark:bg-[#101614] text-slate-900 dark:text-[#F5F1E8]">
      <JsonLd id="ld-faq" data={FAQ_SCHEMA} />
      <PublicNav />

      {/* Header */}
      <section className="max-w-4xl mx-auto px-6 pt-16 pb-10 text-center">
        <div className="pub-eye mb-2">Help Center</div>
        <h1 className="pub-display text-4xl md:text-6xl mb-4">Questions, answered.</h1>
        <p className="text-lg pub-muted max-w-2xl mx-auto">
          Everything you need to know about Club Rudder — {totalQuestions} questions across {CATEGORIES.length} categories.
        </p>
        {/* Search */}
        <div className="relative max-w-xl mx-auto mt-6">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input placeholder="Search questions..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-12 h-12 text-base pub-card border-0" />
        </div>
      </section>

      {/* Category filter tabs */}
      <section className="max-w-5xl mx-auto px-6 pb-8">
        <div className="flex gap-2 flex-wrap justify-center">
          {CATEGORY_KEYS.map((k) => (
            <button
              key={k}
              onClick={() => setActiveCategory(k)}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-bold tracking-wide uppercase transition-colors",
                activeCategory === k
                  ? "text-white"
                  : "pub-card text-slate-600 dark:text-[#cfcabd] hover:border-primary"
              )}
              style={activeCategory === k ? { background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" } : {}}
            >
              {k === "all" ? "All Topics" : CATEGORIES.find((c) => c.key === k)?.label}
            </button>
          ))}
        </div>
      </section>

      {/* FAQ accordions */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <div className="space-y-8">
          {filteredQuestions.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.key];
            return (
              <div key={cat.key}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: cat.color + "15" }}>
                    <Icon className="w-5 h-5" style={{ color: cat.color }} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold tracking-wider uppercase text-slate-900 dark:text-[#F5F1E8]">{cat.label}</h2>
                    <p className="text-xs pub-muted">{cat.questions.length} questions</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {cat.questions.map((qa, i) => {
                    const itemKey = `${cat.key}-${i}`;
                    const open = openItems[itemKey];
                    return (
                      <div key={itemKey} className="pub-card overflow-hidden">
                        <button
                          onClick={() => toggle(itemKey)}
                          className="w-full flex items-center justify-between p-4 text-left"
                        >
                          <span className="text-sm font-semibold text-slate-900 dark:text-[#F5F1E8] uppercase tracking-wide">{qa.q}</span>
                          <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform shrink-0 ml-4", open && "rotate-180")} />
                        </button>
                        {/* The answer stays in the DOM while collapsed, so crawlers
                            read the same text the FAQ schema declares. */}
                        <div className={cn("px-4 pb-4 text-sm pub-muted leading-relaxed", !open && "hidden")}>
                          {qa.a}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {filteredQuestions.length === 0 && (
            <div className="text-center py-20">
              <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="pub-muted">No questions match your search. Try different keywords.</p>
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="pb-16">
        <div className="max-w-4xl mx-auto px-6">
          <div className="rounded-3xl p-10 md:p-14 text-center" style={{ background: "#F5F1E8", color: "#101614" }}>
            <h2 className="pub-display text-3xl md:text-4xl mb-4">Still have questions?</h2>
            <p className="mb-8 max-w-xl mx-auto opacity-80">Start a 30-day free trial — no credit card required — or book a demo and we'll walk you through it.</p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Link to="/create-club" className="pub-btn">Start free trial <ArrowRight className="w-4 h-4" /></Link>
              <Link to="/features" className="pub-btn gh">Explore features</Link>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}