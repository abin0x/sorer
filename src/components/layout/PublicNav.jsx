import React, { useState } from "react";
import { Link } from '@/lib/router-compat';
import { Calendar, Menu, X } from "lucide-react";
import ThemeToggle from "@/components/theme/ThemeToggle";
import BookDemoDialog from "@/components/public/BookDemoDialog";

const LOGO = "https://media.base44.com/images/public/690d4c6dccfb0f4e79c33a38/161f01a1f_logo.png";

const LINKS = [
  { label: "Why Club Rudder", to: "/why-clubrudder" },
  { label: "Features", to: "/features" },
  { label: "Tours", to: "/walkthrough" },
  { label: "Resources & FAQ", to: "/resources" },
  { label: "Migration", to: "/migration" },
];

/**
 * Single global nav used on every public page. Same links everywhere, with a
 * "Book a demo" primary button (opens the scheduler dialog) and a Login link.
 * On mobile, a hamburger toggles a slide-down menu panel.
 */
export default function PublicNav() {
  const [demoOpen, setDemoOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <nav className="safe-top sticky top-0 z-50 backdrop-blur-md border-b border-slate-200 dark:border-[#2a3a33] bg-white/90 dark:bg-[#101614]/90">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 py-3 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5 shrink-0" onClick={() => setMenuOpen(false)}>
            <img src={LOGO} alt="Club Rudder logo" className="w-9 h-9 rounded-xl object-cover" />
            <span className="font-extrabold text-lg uppercase tracking-wider text-slate-900 dark:text-[#F5F1E8]">Club Rudder</span>
          </Link>

          <div className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-600 dark:text-[#cfcabd]">
            {LINKS.map((l) =>
              l.to ? (
                <Link key={l.label} to={l.to} className="pub-link">{l.label}</Link>
              ) : (
                <a key={l.label} href={l.href} className="pub-link">{l.label}</a>
              )
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link to="/login?returnTo=/home" className="hidden sm:inline text-sm font-semibold text-slate-600 dark:text-[#cfcabd] pub-link">Login</Link>
            <span className="hidden sm:block">
              <button
                onClick={() => setDemoOpen(true)}
                className="pub-btn sm"
              >
                <Calendar className="w-4 h-4" />
                Book a demo
              </button>
            </span>
            <ThemeToggle />
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="md:hidden p-2 -mr-2 text-slate-700 dark:text-[#F5F1E8]"
              aria-label="Toggle menu"
            >
              {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile full-screen overlay menu — sibling of nav so backdrop-filter doesn't trap fixed */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-[60] bg-white dark:bg-[#101614] flex flex-col">
          {/* Overlay header with close button */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-[#2a3a33]">
            <Link to="/" className="flex items-center gap-2.5" onClick={() => setMenuOpen(false)}>
              <img src={LOGO} alt="Club Rudder logo" className="w-9 h-9 rounded-xl object-cover" />
              <span className="font-extrabold text-lg uppercase tracking-wider text-slate-900 dark:text-[#F5F1E8]">Club Rudder</span>
            </Link>
            <button
              onClick={() => setMenuOpen(false)}
              className="p-2 -mr-2 text-slate-700 dark:text-[#F5F1E8]"
              aria-label="Close menu"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Scrollable link list */}
          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-1">
            {LINKS.map((l) =>
              l.to ? (
                <Link
                  key={l.label}
                  to={l.to}
                  onClick={() => setMenuOpen(false)}
                  className="px-3 py-3 rounded-lg text-base font-semibold text-slate-700 dark:text-[#cfcabd] hover:bg-slate-100 dark:hover:bg-[#1a221f] transition-colors"
                >
                  {l.label}
                </Link>
              ) : (
                <a
                  key={l.label}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className="px-3 py-3 rounded-lg text-base font-semibold text-slate-700 dark:text-[#cfcabd] hover:bg-slate-100 dark:hover:bg-[#1a221f] transition-colors"
                >
                  {l.label}
                </a>
              )
            )}
          </div>

          {/* Bottom actions */}
          <div className="px-5 py-4 border-t border-slate-200 dark:border-[#2a3a33] flex flex-col gap-3">
            <button
              onClick={() => { setMenuOpen(false); setDemoOpen(true); }}
              className="pub-btn w-full"
            >
              <Calendar className="w-4 h-4" />
              Book a demo
            </button>
            <Link
              to="/login?returnTo=/home"
              onClick={() => setMenuOpen(false)}
              className="pub-btn gh w-full"
            >
              Login
            </Link>
            <div className="flex items-center justify-center pt-1">
              <ThemeToggle />
            </div>
          </div>
        </div>
      )}
      <BookDemoDialog open={demoOpen} onOpenChange={setDemoOpen} />
    </>
  );
}