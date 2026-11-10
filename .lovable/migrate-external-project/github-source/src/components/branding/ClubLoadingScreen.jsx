import React from 'react';
import { Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ClubLoadingScreen({ title = 'Loading your club…', detail = 'Connecting your membership and preparing your workspace.', error, onRetry }) {
  return <div className="min-h-screen flex items-center justify-center bg-background p-6">
    <div className="w-full max-w-sm text-center space-y-6" role={error ? 'alert' : 'status'} aria-live="polite">
      <div className="relative mx-auto h-28 w-28" aria-hidden="true">
        <div className="absolute inset-0 rounded-full border border-primary/15" />
        {!error && <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-primary border-r-primary/40 animate-spin motion-reduce:animate-none" />}
        <div className="absolute inset-3 rounded-full bg-primary/5 border border-primary/10 flex items-center justify-center">
          <Compass className="h-10 w-10 text-primary" strokeWidth={1.3} />
        </div>
      </div>
      <div className="space-y-2"><h1 className="text-xl font-semibold tracking-tight text-foreground">{error ? 'Unable to load your club' : title}</h1><p className="text-sm leading-relaxed text-muted-foreground">{error || detail}</p></div>
      {error && <div className="flex justify-center gap-3"><Button onClick={onRetry}>Try again</Button><Button variant="outline" onClick={() => window.location.assign('/login')}>Sign in</Button></div>}
    </div>
  </div>;
}