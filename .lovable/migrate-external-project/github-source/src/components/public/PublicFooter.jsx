import React from "react";
import { Link } from "react-router-dom";
import { JOB_PAGES, JOB_PAGE_ORDER } from "@/lib/landing/jobPages";

const LOGO = "https://media.base44.com/images/public/690d4c6dccfb0f4e79c33a38/161f01a1f_logo.png";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Home", to: "/" },
      { label: "Why Club Rudder", to: "/why-clubrudder" },
      { label: "Pricing", to: "/pricing" },
      { label: "Features", to: "/features" },
      { label: "Take the tour", to: "/demo" },
    ],
  },
  {
    title: "Solutions",
    links: JOB_PAGE_ORDER.map((slug) => ({ label: JOB_PAGES[slug].navLabel, to: `/${slug}` })),
  },
  {
    title: "Company",
    links: [
      { label: "Resources", to: "/resources" },
      { label: "Migration", to: "/migration" },
      { label: "FAQ", to: "/faq" },
      { label: "Start free trial", to: "/create-club" },
      { label: "Book a demo", to: "/demo-access" },
    ],
  },
  {
    title: "Legal & Support",
    links: [
      { label: "Privacy Policy", to: "/privacy-policy" },
      { label: "Terms of Service", to: "/terms-of-service" },
      { label: "Support", to: "/help" },
      { label: "Status", to: "/status" },
      { label: "Contact", to: "/request-access" },
    ],
  },
];

export default function PublicFooter() {
  return (
    <footer className="bg-slate-50 dark:bg-[#0b100e] border-t border-slate-200 dark:border-[#2a3a33]">
      <div className="max-w-6xl mx-auto px-6 py-14 grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <img src={LOGO} alt="Club Rudder logo" className="w-8 h-8 rounded-lg object-cover" />
            <span className="font-extrabold text-sm uppercase tracking-wider text-slate-900 dark:text-[#F5F1E8]">Club Rudder</span>
          </div>
          <p className="text-xs leading-relaxed text-slate-500 dark:text-[#a9a495] max-w-xs">
            One club, every branch, one platform. Run registration, payments, scheduling, and player development — with no per-transaction fees.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <p className="pub-eye mb-3.5">{col.title}</p>
            <ul className="space-y-2.5">
              {col.links.map((l) => (
                <li key={l.label}>
                  {l.to ? (
                    <Link to={l.to} className="text-sm text-slate-600 dark:text-[#cfcabd] pub-link">{l.label}</Link>
                  ) : (
                    <a href={l.href} className="text-sm text-slate-600 dark:text-[#cfcabd] pub-link">{l.label}</a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-slate-200 dark:border-[#2a3a33] py-5">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between flex-wrap gap-2">
          <p className="text-xs text-slate-400 dark:text-[#8d8878]">© {new Date().getFullYear()} Club Rudder. All rights reserved.</p>
          <p className="text-xs text-slate-400 dark:text-[#8d8878]">Club Rudder — One Club, Every Branch, One Platform</p>
        </div>
      </div>
    </footer>
  );
}