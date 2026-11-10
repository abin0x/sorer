import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';

// Satisfaction rating widget shown when a ticket is resolved.
// Calls reply-ticket with message_type: 'satisfaction' and metadata: { rating, comment }.
export default function SatisfactionRating({ ticket, onRated }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (rating === 0) return;
    setSubmitting(true);
    try {
      await base44.functions.invoke('reply-ticket', {
        ticket_id: ticket.id,
        body: `Customer rated this ticket ${rating}/5${comment ? `: ${comment}` : ''}`,
        is_internal: false,
        status_change: 'resolved',
      });
      // Also update the ticket's satisfaction fields directly
      await base44.entities.Ticket.update(ticket.id, {
        satisfaction_rating: rating,
        satisfaction_comment: comment,
      });
      toast({ title: 'Thank you for your feedback!' });
      onRated?.(rating, comment);
    } catch (err) {
      toast({ title: 'Failed to submit rating', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 p-4">
      <p className="text-sm font-medium mb-2">How did we do?</p>
      <p className="text-xs text-muted-foreground mb-3">Rate your support experience for this ticket.</p>
      <div className="flex gap-1 mb-3">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(n)}
            className="p-1"
          >
            <Star
              className={`w-7 h-7 transition-colors ${
                (hover || rating) >= n ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'
              }`}
            />
          </button>
        ))}
      </div>
      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Optional comment..."
        rows={2}
        className="mb-3 text-sm"
      />
      <Button onClick={handleSubmit} disabled={rating === 0 || submitting} size="sm">
        Submit Rating
      </Button>
    </div>
  );
}