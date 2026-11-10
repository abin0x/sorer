import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertTriangle, ArrowRight, Calendar, Clock, User } from "lucide-react";
import PublicNav from "@/components/layout/PublicNav";
import PublicFooter from "@/components/public/PublicFooter";
import BookDemoDialog from "@/components/public/BookDemoDialog";
import NoIndex from "@/components/seo/NoIndex";
import JsonLd from "@/components/seo/JsonLd";
import ArticleBody from "@/components/resources/ArticleBody";
import usePageMeta from "@/lib/usePageMeta";
import { articleSchema } from "@/lib/seo/structuredData";
import { findArticle, formatArticleDate } from "@/lib/resources/articles";

/**
 * A single /resources article. Published articles carry Article schema;
 * drafts are noindex, kept off the list page and carry no schema until they
 * are published. An unknown slug is a 404.
 */
export default function ResourceArticle() {
  const { slug } = useParams();
  const article = findArticle(slug);
  const isDraft = article?.status === "draft";
  const [demoOpen, setDemoOpen] = useState(false);

  usePageMeta({
    title: article ? `${article.meta_title || article.title} | Club Rudder` : "Article not found | Club Rudder",
    description: article ? article.description : "This article could not be found.",
  });

  // Unknown slug: tell crawlers 404. The lookup is local, so this only runs
  // once the article is definitely absent.
  useEffect(() => {
    if (article) return;
    const meta = document.createElement("meta");
    meta.setAttribute("name", "prerender-status-code");
    meta.setAttribute("content", "404");
    document.head.appendChild(meta);
    return () => {
      if (meta.parentNode) meta.parentNode.removeChild(meta);
    };
  }, [article]);

  if (!article) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#101614] text-slate-900 dark:text-[#F5F1E8]">
        <NoIndex />
        <PublicNav />
        <section className="max-w-2xl mx-auto px-6 py-24 text-center">
          <p className="text-6xl font-black text-slate-200 dark:text-slate-700 mb-4">404</p>
          <h1 className="pub-display text-3xl mb-3">We couldn't find that article.</h1>
          <p className="pub-muted mb-8">It may have been moved, or it hasn't been published yet.</p>
          <Link to="/resources" className="pub-btn">
            Back to resources
          </Link>
        </section>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#101614] text-slate-900 dark:text-[#F5F1E8]">
      {isDraft && <NoIndex />}
      {!isDraft && (
        <JsonLd
          id="ld-article"
          data={articleSchema({
            path: `/resources/${article.slug}`,
            title: article.title,
            description: article.description,
            author: article.author,
            datePublished: article.published_at,
          })}
        />
      )}
      <PublicNav />

      {/* Article header */}
      <section className="max-w-3xl mx-auto px-6 pt-14 pb-8">
        <div className="pub-eye mb-3">{article.category}</div>
        <h1 className="pub-display text-3xl sm:text-4xl md:text-5xl mb-5">{article.title}</h1>
        <p className="text-lg pub-muted mb-7 leading-relaxed">{article.description}</p>
        <div className="flex items-center gap-4 flex-wrap text-sm pub-muted border-t border-slate-200 dark:border-[#2a3a33] pt-5">
          <span className="inline-flex items-center gap-1.5">
            <User className="w-4 h-4" /> {article.author}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="w-4 h-4" /> {formatArticleDate(article.published_at)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="w-4 h-4" /> {article.reading_minutes} min read
          </span>
        </div>
      </section>

      {/* Draft strip */}
      {isDraft && (
        <div className="max-w-3xl mx-auto px-6 mb-10">
          <div className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-700 dark:text-amber-300" />
            <p className="text-xs md:text-sm text-amber-900 dark:text-amber-200">
              <span className="font-extrabold uppercase tracking-wider">Draft — not published.</span> This article is
              kept off the resources list, out of the sitemap and noindex until you publish it.
            </p>
          </div>
        </div>
      )}

      {/* Body */}
      <section className="max-w-3xl mx-auto px-6 pb-16">
        <div className="space-y-4 mb-12">
          {article.intro.map((paragraph) => (
            <p key={paragraph.slice(0, 30)} className="text-base md:text-lg pub-muted leading-relaxed">
              {paragraph}
            </p>
          ))}
        </div>
        <ArticleBody sections={article.sections} />
      </section>

      {/* CTA */}
      <section className="pb-16">
        <div className="max-w-4xl mx-auto px-6">
          <div className="rounded-3xl p-10 md:p-14 text-center" style={{ background: "#F5F1E8", color: "#101614" }}>
            <h2 className="pub-display text-3xl md:text-4xl mb-4">Run it in one place.</h2>
            <p className="mb-8 max-w-xl mx-auto pub-muted">
              Registration, tryouts, payments and scheduling for multi-branch clubs — with no Club Rudder transaction
              fees.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Link to="/create-club" className="pub-btn">
                Start free trial <ArrowRight className="w-4 h-4" />
              </Link>
              <button onClick={() => setDemoOpen(true)} className="pub-btn gh">
                Book a demo
              </button>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
      <BookDemoDialog open={demoOpen} onOpenChange={setDemoOpen} />
    </div>
  );
}