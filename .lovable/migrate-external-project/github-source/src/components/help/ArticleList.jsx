import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, BookOpen } from 'lucide-react';
import { cleanHtml } from '@/lib/help/helpApi';

// One click = the answer. Each row expands inline to show the full article
// body right in the list, so users never have to load a separate page just
// to read the steps. A small link still opens the standalone article page
// for feedback and related articles.
export default function ArticleList({ articles, onOpen }) {
  const [openId, setOpenId] = useState(null);

  const toggle = (a) => {
    const id = a.id || a.slug;
    setOpenId((cur) => (cur === id ? null : id));
    onOpen?.(a);
  };

  return (
    <ul className="divide-y divide-border rounded-2xl border border-border bg-card overflow-hidden">
      {articles.map((a) => {
        const id = a.id || a.slug;
        const open = openId === id;
        return (
          <li key={id}>
            <button
              onClick={() => toggle(a)}
              aria-expanded={open}
              className="w-full text-left flex items-center gap-3 px-4 py-3 min-h-[56px] hover:bg-primary/5"
            >
              <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${open ? 'rotate-0' : '-rotate-90'}`} />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">{a.title}</p>
                {!open && a.short_answer && <p className="text-sm text-muted-foreground line-clamp-1">{a.short_answer}</p>}
              </div>
            </button>
            {open && (
              <div className="px-4 pb-4 pl-11 space-y-3 animate-fadeInUp">
                {a.short_answer && (
                  <div className="rounded-xl bg-primary/10 border border-primary/20 p-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-primary mb-1">Short answer</p>
                    <p className="text-sm text-foreground">{a.short_answer}</p>
                  </div>
                )}
                {a.body && <div className="kb-body text-sm" dangerouslySetInnerHTML={{ __html: cleanHtml(a.body) }} />}
                <Link to={`/help/article/${a.slug}`} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                  <BookOpen className="w-3.5 h-3.5" /> Open full article (feedback & related)
                </Link>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}