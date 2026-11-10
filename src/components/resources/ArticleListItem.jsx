import React from "react";
import { Link } from '@/lib/router-compat';
import { ArrowRight } from "lucide-react";
import { formatArticleDate } from "@/lib/resources/articles";

/** One published article, as it appears on the /resources list. */
export default function ArticleListItem({ article }) {
  return (
    <Link to={`/resources/${article.slug}`} className="pub-card block p-6 md:p-7">
      <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider mb-2">
        <span className="text-primary">{article.category}</span>
        <span className="text-slate-300 dark:text-slate-600">•</span>
        <span className="text-slate-500 dark:text-slate-400">{formatArticleDate(article.published_at)}</span>
      </div>
      <h2 className="pub-display text-xl md:text-2xl mb-2 text-slate-900 dark:text-[#F5F1E8]">{article.title}</h2>
      <p className="text-sm pub-muted mb-4 leading-relaxed">{article.description}</p>
      <span className="inline-flex items-center gap-1.5 text-sm font-bold text-primary">
        Read the guide <ArrowRight className="w-4 h-4" />
      </span>
    </Link>
  );
}