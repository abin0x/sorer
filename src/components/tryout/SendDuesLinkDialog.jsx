import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Send, Copy, Check } from "lucide-react";
import { toast } from "sonner";

export default function SendDuesLinkDialog({ open, onOpenChange, plan, clubSlug }) {
  const [playerName, setPlayerName] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    if (open) { setPlayerName(""); setEmail(""); setCopied(false); }
  }, [open]);

  const payUrl = plan?.offer_id
    ? `${window.location.origin}/PayDues?offer=${plan.offer_id}&club=${clubSlug || ""}`
    : "";

  const handleSend = async () => {
    if (!email) { toast.error("Email is required."); return; }
    setSending(true);
    try {
      const r = await base44.functions.invoke("send-dues-link", {
        team_plan_id: plan.id,
        email,
        player_name: playerName,
      });
      toast.success(`Dues link sent to ${email}`);
      onOpenChange(false);
    } catch (e) {
      toast.error(e?.response?.data?.error || "Could not send email");
    }
    setSending(false);
  };

  const handleCopy = () => {
    if (!payUrl) { toast.error("No dues link created yet."); return; }
    navigator.clipboard.writeText(payUrl);
    setCopied(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send Dues Link — {plan?.team_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Player Name</Label>
            <Input value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="Player full name" />
          </div>
          <div>
            <Label>Email Address *</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="family@example.com" />
          </div>
          <p className="text-xs text-slate-500">
            Sends an email with a secure payment link for ${plan?.club_dues || 0}/yr dues.
            The player can pay online through the club's payment processor.
          </p>
          {payUrl && (
            <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
              <code className="text-xs text-slate-500 flex-1 truncate">{payUrl}</code>
              <Button size="sm" variant="outline" className="h-7 shrink-0" onClick={handleCopy}>
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              </Button>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSend} disabled={sending || !email}>
            {sending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />}
            Send Link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}