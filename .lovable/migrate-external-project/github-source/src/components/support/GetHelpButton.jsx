import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LifeBuoy } from 'lucide-react';
import TicketSubmitDialog from './TicketSubmitDialog';

// Floating "Get Help" button that appears on every page inside the app.
// Also opens automatically when arriving from a Help article's "Contact support"
// (?kb_slug=...&kb_title=...), with that article attached.
export default function GetHelpButton() {
  const [open, setOpen] = useState(false);
  const [article, setArticle] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const slug = params.get('kb_slug');
    if (!slug) return;
    setArticle({ slug, title: params.get('kb_title') || slug });
    setOpen(true);
    params.delete('kb_slug');
    params.delete('kb_title');
    const qs = params.toString();
    navigate(location.pathname + (qs ? `?${qs}` : ''), { replace: true });
  }, [location.search]);

  const close = () => { setOpen(false); setArticle(null); };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-[calc(5rem+max(env(safe-area-inset-bottom,0px),12px))] right-4 sm:bottom-6 sm:right-6 z-40 flex items-center gap-2 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all px-4 py-3 min-h-[48px] font-medium text-sm"
        aria-label="Get help"
      >
        <LifeBuoy className="w-5 h-5" />
        <span className="hidden sm:inline">Get Help</span>
      </button>

      {open && <TicketSubmitDialog article={article} onClose={close} />}
    </>
  );
}