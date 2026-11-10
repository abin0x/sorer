import React from 'react';
import { useLocation } from '@/lib/router-compat';
import { useQuery } from '@tanstack/react-query';
import { HelpCircle } from 'lucide-react';
import { kb } from '@/lib/help/helpApi';

// Small "?" in the app header. Opens the article mapped to the current page
// (mapping is edited in Help > Manage > Page help), else the Help home.
export default function ContextualHelp({ userId }) {
  const { pathname } = useLocation();
  const { data } = useQuery({
    queryKey: ['kbPageMap', userId],
    queryFn: () => kb('page_map'),
    staleTime: 5 * 60 * 1000,
  });
  const hit = data?.maps?.find((m) => m.page_path.toLowerCase() === pathname.toLowerCase());
  const href = hit ? `/help/article/${hit.slug}` : '/help';
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={hit ? `Help: ${hit.title}` : 'Help Center'}
      aria-label="Help for this page"
      className="p-2 min-h-[44px] min-w-[44px] rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
    >
      <HelpCircle className="w-5 h-5" />
    </a>
  );
}