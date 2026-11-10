import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { JOB_PAGE_ORDER, JOB_PAGES } from "@/lib/landing/jobPages";

/**
 * The five single-job landing pages as a link grid. Shared by the homepage
 * ("See what Club Rudder does for each job") and the /features page.
 */
export default function JobPagesGrid() {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
      {JOB_PAGE_ORDER.map((slug) => {
        const page = JOB_PAGES[slug];
        return (
          <Link key={slug} to={`/${slug}`} className="pub-card p-5 flex flex-col">
            <h3 className="font-extrabold text-base mb-2 text-slate-900 dark:text-[#F5F1E8]">{page.navLabel}</h3>
            <p className="text-sm pub-muted mb-4 flex-1 leading-relaxed">{page.gridLine}</p>
            <span className="inline-flex items-center gap-1.5 text-sm font-bold text-primary">
              Read more <ArrowRight className="w-4 h-4" />
            </span>
          </Link>
        );
      })}
    </div>
  );
}