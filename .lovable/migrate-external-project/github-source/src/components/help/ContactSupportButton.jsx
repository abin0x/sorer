import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LifeBuoy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useViewer } from '@/lib/help/helpApi';

// Signed-in users land on My Tickets with the Get Help form open and the
// article attached; signed-out users sign in first.
export default function ContactSupportButton({ article }) {
  const { data: user } = useViewer();
  const loc = useLocation();
  const target = `/MyTickets?kb_slug=${encodeURIComponent(article.slug)}&kb_title=${encodeURIComponent(article.title)}`;
  const to = user ? target : `/login?returnTo=${encodeURIComponent(target)}`;
  return (
    <Button asChild className="gap-2 min-h-[44px]">
      <Link to={to} state={{ from: loc.pathname }}><LifeBuoy className="w-4 h-4" /> {user ? 'Contact support' : 'Sign in to contact support'}</Link>
    </Button>
  );
}