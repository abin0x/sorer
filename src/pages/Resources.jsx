import React from "react";
import { Link } from '@/lib/router-compat';
import { BookOpen } from "lucide-react";
import PublicNav from "@/components/layout/PublicNav";
import PublicFooter from "@/components/public/PublicFooter";
import ArticleListItem from "@/components/resources/ArticleListItem";
import FAQ from "@/pages/FAQ";
import usePageMeta from "@/lib/usePageMeta";
import { publishedArticles } from "@/lib/resources/articles";

/** Public list page for the /resources section. Drafts never appear here. */
export default function Resources() {
  usePageMeta({
    title: "Resources & FAQ for Club Directors | Club Rudder",
    description:
      "Practical guides for multi-branch soccer clubs: tryouts, registration, payments, scheduling and club operations, written by the Club Rudder team.",
  });

  const articles = publishedArticles();

  return (
    <div className="min-h-screen bg-white dark:bg-[#101614] text-slate-900 dark:text-[#F5F1E8]">
      <PublicNav />

      <section className="max-w-4xl mx-auto px-6 pt-16 pb-10 text-center">
        <div className="pub-eye mb-3">Resources & FAQ</div>
        <h1 className="pub-display text-3xl sm:text-4xl md:text-5xl mb-5">Guides and answers for club directors</h1>
        <div className="flex justify-center gap-3 mb-6"><a href="#faq" className="pub-btn sm gh">Jump to FAQ</a><Link to="/walkthrough" className="pub-btn sm gh">Interactive tours</Link></div>
        <p className="text-lg pub-muted max-w-2xl mx-auto">
          Practical, step-by-step guides to the parts of running a club that cause the most work: tryouts, registration,
          payments and month-end.
        </p>
      </section>

      <section className="max-w-4xl mx-auto px-6 pb-20">
        {articles.length === 0 ? (
          <div className="pub-card p-10 text-center">
            <BookOpen className="w-8 h-8 mx-auto mb-3 text-primary" />
            <p className="font-bold text-lg mb-2">The first guides are on the way.</p>
            <p className="text-sm pub-muted max-w-md mx-auto">
              New articles for club directors are being written now. In the meantime, take the tour or start a free
              trial.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap mt-6">
              <Link to="/demo" className="pub-btn sm">
                Take the tour
              </Link>
              <Link to="/create-club" className="pub-btn sm gh">
                Start free trial
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {articles.map((article) => (
              <ArticleListItem key={article.slug} article={article} />
            ))}
          </div>
        )}
      </section>

      <FAQ embedded />

      <PublicFooter />
    </div>
  );
}