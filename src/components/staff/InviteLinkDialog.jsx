import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Copy, Link2, Mail } from "lucide-react";
import { toast } from "sonner";

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const el = document.createElement("textarea");
    el.value = text; document.body.appendChild(el); el.select();
    try { document.execCommand("copy"); } finally { el.remove(); }
  }
}

export function CopyLinkButton({ link, size = "sm", variant = "outline", label = "Copy link", className = "" }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button" size={size} variant={variant} className={className}
      onClick={async () => { await copyText(link); setCopied(true); toast.success("Invite link copied"); setTimeout(() => setCopied(false), 2000); }}
    >
      {copied ? <Check className="w-3.5 h-3.5 mr-1.5" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
      {copied ? "Copied" : label}
    </Button>
  );
}

/** Shows the invitation link after an invite is created, whether or not an email went out. */
export default function InviteLinkDialog({ invite, onOpenChange }) {
  const open = !!invite;
  const mailto = invite ? `mailto:${encodeURIComponent(invite.email)}?subject=${encodeURIComponent("Your Club Rudder invitation")}&body=${encodeURIComponent(`Hi,\n\nYou're invited to join us on Club Rudder. Open this link and sign in or create an account with ${invite.email}:\n\n${invite.link}\n`)}` : "#";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Link2 className="w-5 h-5 text-primary" /> Invitation ready</DialogTitle>
          <DialogDescription>
            {invite?.emailed
              ? `We emailed ${invite?.email}. You can also share this link directly.`
              : `${invite?.note || "No email was sent."} Send this link to ${invite?.email} — they open it, sign in or sign up with that email, and join automatically.`}
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          <Input readOnly value={invite?.link || ""} onFocus={(e) => e.target.select()} className="font-mono text-xs" aria-label="Invitation link" />
          {invite?.link && <CopyLinkButton link={invite.link} variant="default" label="Copy" />}
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" asChild><a href={mailto}><Mail className="w-4 h-4 mr-1.5" /> Open in my email</a></Button>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
