import React from 'react';
import { Link, Outlet, useLocation } from '@/lib/router-compat';
import { BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useViewer, isHelpAdmin } from '@/lib/help/helpApi';
import IncidentBanner from '@/components/systemhealth/IncidentBanner';

export default function HelpLayout() {
  const { data: user } = useViewer();
  const loc = useLocation();
  const returnTo = encodeURIComponent(loc.pathname + loc.search);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="safe-top sticky top-0 z-30 bg-card/95 backdrop-blur border-b border-border">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
          <Link to="/help" className="flex items-center gap-2 font-bold text-foreground min-h-[44px]">
            <BookOpen className="w-5 h-5 text-primary" /> Help Center
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            {isHelpAdmin(user) && (
              <Button asChild variant="ghost" size="sm"><Link to="/help/admin">Manage</Link></Button>
            )}
            {user ? (
              <Button asChild variant="outline" size="sm"><Link to="/home">Back to app</Link></Button>
            ) : (
              <Button asChild size="sm"><Link to={`/login?returnTo=${returnTo}`}>Sign in</Link></Button>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1"><IncidentBanner publicOnly /><Outlet /></main>
      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        Club Rudder Help Center
      </footer>
    </div>
  );
}