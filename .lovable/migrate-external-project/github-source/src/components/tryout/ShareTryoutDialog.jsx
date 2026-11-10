import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { QrCode, Copy, Download, Share2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ShareTryoutDialog({ open, onOpenChange, tryout }) {
  const [downloading, setDownloading] = useState(false);

  const signupUrl = tryout
    ? `${window.location.origin}/TryoutSignup?id=${tryout.id}`
    : "";
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(signupUrl)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(signupUrl);
    toast.success("Link copied to clipboard");
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Tryout: ${tryout?.title}`,
          text: `Sign up for the ${tryout?.title} tryout!`,
          url: signupUrl,
        });
      } catch (e) {
        // user cancelled
      }
    } else {
      handleCopyLink();
    }
  };

  const handleDownloadQR = async () => {
    setDownloading(true);
    try {
      const res = await fetch(qrUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tryout_qr_${tryout?.title?.replace(/\s+/g, "_") || "event"}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("QR code downloaded");
    } catch (e) {
      toast.error("Failed to download QR code");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-4 h-4" /> Share Tryout Signup
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <Card className="border-slate-200">
            <CardContent className="p-4 flex flex-col items-center gap-3">
              <div className="w-48 h-48 bg-white rounded-xl border border-slate-200 flex items-center justify-center overflow-hidden">
                <img src={qrUrl} alt="QR Code" className="w-44 h-44" />
              </div>
              <p className="text-xs text-slate-500 text-center">
                Scan to open the signup page
              </p>
              <Button
                onClick={handleDownloadQR}
                disabled={downloading}
                variant="outline"
                className="w-full rounded-xl"
              >
                {downloading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                Download QR Code
              </Button>
            </CardContent>
          </Card>

          <div>
            <Label>Signup Link</Label>
            <div className="flex gap-2">
              <Input value={signupUrl} readOnly className="rounded-xl text-xs" />
              <Button onClick={handleCopyLink} variant="outline" className="rounded-xl shrink-0">
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <Button onClick={handleShare} className="w-full rounded-xl bg-primary hover:bg-primary/90">
            <Share2 className="w-4 h-4 mr-2" /> Share
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}