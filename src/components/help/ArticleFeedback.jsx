import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { kb } from '@/lib/help/helpApi';
import ContactSupportButton from './ContactSupportButton';

export default function ArticleFeedback({ article }) {
  const [vote, setVote] = useState(null); // 'yes' | 'no'
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const send = async (helpful, text = '') => {
    setSending(true);
    await kb('feedback', { slug: article.slug, helpful, comment: text });
    setSending(false);
    setDone(true);
  };

  const pickYes = () => { setVote('yes'); send(true); };

  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-3">
      <p className="font-semibold">Was this helpful?</p>
      {!vote && (
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 min-h-[44px]" onClick={pickYes}><ThumbsUp className="w-4 h-4" /> Yes</Button>
          <Button variant="outline" className="gap-2 min-h-[44px]" onClick={() => setVote('no')}><ThumbsDown className="w-4 h-4" /> No</Button>
        </div>
      )}
      {vote === 'yes' && (
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 text-emerald-500" />} Thanks for the feedback!
        </p>
      )}
      {vote === 'no' && (
        <div className="space-y-3">
          {!done && (
            <>
              <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} placeholder="What were you looking for? (optional)" />
              <Button disabled={sending} onClick={() => send(false, comment)} className="min-h-[44px]">
                {sending && <Loader2 className="w-4 h-4 animate-spin" />} Send feedback
              </Button>
            </>
          )}
          {done && <p className="text-sm text-muted-foreground flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Thanks, we'll improve this article.</p>}
          <div className="pt-1">
            <p className="text-sm text-muted-foreground mb-2">Still stuck? Our team can help, and this article will be attached to your ticket.</p>
            <ContactSupportButton article={article} />
          </div>
        </div>
      )}
    </section>
  );
}