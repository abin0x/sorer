import React, { useState, useMemo } from 'react';
import { useLocation, useNavigate } from '@/lib/router-compat';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Paperclip, Send, BookOpen, Loader2, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { useTenant } from '@/lib/TenantContext';
import { suggestKbArticles } from './kbArticles';
import { CATEGORY_OPTIONS, URGENCY_OPTIONS } from './ticketStatusHelpers';
import { getRecentErrors } from './clientErrorCapture';

export default function TicketSubmitDialog({ onClose, article = null }) {
  const location = useLocation();
  const navigate = useNavigate();
  const tenant = useTenant();
  const { toast } = useToast();

  const [category, setCategory] = useState('technical');
  const [subject, setSubject] = useState(article ? `Help with: ${article.title}` : '');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState('P3');
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(null);

  const kbSuggestions = useMemo(() => suggestKbArticles(subject), [subject]);

  const captureContext = () => ({
    current_page: location.pathname + location.search,
    app_version: import.meta.env?.VITE_APP_VERSION || '1.0.0',
    language: navigator.language,
    screen: `${window.screen.width}x${window.screen.height}`,
    branch_id: tenant.effectiveClubId || '',
    branch_name: tenant.brand?.club_name || '',
    client_errors: getRecentErrors(),
  });

  const handleSubmit = async () => {
    if (!subject.trim() || !description.trim()) {
      toast({ title: 'Please fill in the subject and description', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      let screenshot_uri = '';
      if (screenshotFile) {
        const uploadRes = await base44.integrations.Core.UploadPrivateFile({ file: screenshotFile });
        screenshot_uri = uploadRes.file_uri;
      }

      const res = await base44.functions.invoke('submit-ticket', {
        category,
        subject: subject.trim(),
        description: description.trim(),
        urgency,
        screenshot_uri,
        kb_article: article,
        context: captureContext(),
      });

      setSubmitted(res.data.ticket);
    } catch (err) {
      toast({ title: 'Failed to submit ticket', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (submitted) {
      setSubmitted(null);
      setSubject('');
      setDescription('');
      setScreenshotFile(null);
      setCategory('technical');
      setUrgency('P3');
    }
    onClose();
  };

  return (
    <Dialog open onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        {submitted ? (
          <div className="flex flex-col items-center text-center py-8 gap-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-500" />
            <div>
              <h3 className="text-lg font-bold">Ticket submitted!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Your ticket number is <span className="font-mono font-semibold">{submitted.ticket_number}</span>
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                We've sent a confirmation to your email. You can track this ticket from the My Tickets page.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose}>Close</Button>
              <Button onClick={() => { handleClose(); navigate('/MyTickets'); }}>
                View My Tickets
              </Button>
            </div>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Get Help</DialogTitle>
              <DialogDescription>
                Submit a support ticket and our team will get back to you. Your context is auto-captured to help us diagnose faster.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map(o => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Urgency</Label>
                  <Select value={urgency} onValueChange={setUrgency}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {URGENCY_OPTIONS.map(o => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Subject</Label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief summary of the issue"
                  maxLength={200}
                />
                {article && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <BookOpen className="w-3 h-3" /> Attached article: {article.title}
                  </p>
                )}
                {kbSuggestions.length > 0 && (
                  <div className="space-y-1.5 mt-2">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <BookOpen className="w-3 h-3" /> Suggested articles
                    </div>
                    {kbSuggestions.map(article => (
                      <a
                        key={article.id}
                        href={article.link}
                        onClick={(e) => { e.preventDefault(); navigate(article.link); }}
                        className="block rounded-lg border border-border p-2 hover:border-primary hover:bg-primary/5 transition-colors"
                      >
                        <p className="text-xs font-medium">{article.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{article.excerpt}</p>
                      </a>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the issue in detail. What were you trying to do? What happened instead?"
                  rows={5}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Screenshot (optional)</Label>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 cursor-pointer rounded-lg border border-dashed border-border px-3 py-2 hover:border-primary transition-colors text-sm text-muted-foreground">
                    <Paperclip className="w-4 h-4" />
                    {screenshotFile ? screenshotFile.name : 'Attach screenshot'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setScreenshotFile(e.target.files?.[0] || null)}
                    />
                  </label>
                  {screenshotFile && (
                    <Button variant="ghost" size="sm" onClick={() => setScreenshotFile(null)}>
                      Remove
                    </Button>
                  )}
                </div>
              </div>

              <div className="rounded-lg bg-muted/50 p-2.5 text-xs text-muted-foreground space-y-0.5">
                <p className="font-medium text-foreground">Auto-captured context:</p>
                <p>Page: {location.pathname}</p>
                <p>Club: {tenant.brand?.club_name || 'N/A'}</p>
                <p>Browser: {navigator.userAgent.substring(0, 80)}...</p>
                {getRecentErrors().length > 0 && (
                  <p className="text-amber-600 dark:text-amber-400">
                    {getRecentErrors().length} recent error(s) will be attached
                  </p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={submitting || !subject.trim() || !description.trim()}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Submit Ticket
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}