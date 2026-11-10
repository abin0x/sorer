import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import PublicFooter from "@/components/public/PublicFooter";
import RegistrationCard from "@/components/tryout/status/RegistrationCard";
import FamilyOffers from "@/components/tryout/status/FamilyOffers";
import { loadStatus } from "@/lib/tryoutRegisterApi";

/** Public parent status page: /TryoutStatus?club=<clubId> */
export default function TryoutStatus() {
  const params = new URLSearchParams(window.location.search);
  const clubId = params.get("club") || "";
  const [email, setEmail] = useState(params.get("email") || "");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const search = async (address) => {
    const target = (address ?? email).trim();
    if (!target) { toast.error("Enter the email the club has for your family."); return; }
    setLoading(true);
    try {
      setData(await loadStatus({ club_id: clubId, email: target }));
      setEmail(target);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (params.get("email")) search(params.get("email"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="safe-top min-h-screen bg-background text-foreground">
      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
        <div className="max-w-3xl mx-auto px-6 py-10">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><ClipboardList className="w-5 h-5" /></div>
            <span className="font-bold">{data?.club?.name ? `${data.club.name} Tryouts` : "My Tryouts"}</span>
          </div>
          <h1 className="text-3xl font-bold">My tryout registration</h1>
          <p className="mt-2 opacity-90 text-sm">Check your status, change a session or cancel — up to the club's deadline.</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <Card>
          <CardContent className="p-6 space-y-3">
            <Label>Family email</Label>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                type="email" inputMode="email" autoComplete="email" placeholder="you@example.com"
                value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-xl"
                onKeyDown={(e) => e.key === "Enter" && search()}
              />
              <Button onClick={() => search()} disabled={loading} className="sm:w-32">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Search className="w-4 h-4 mr-2" /> Find</>}
              </Button>
            </div>
          </CardContent>
        </Card>

        {data && data.registrations.length === 0 && (
          <Card><CardContent className="p-8 text-center">
            <p className="font-semibold">No tryout registrations found</p>
            <p className="text-sm text-muted-foreground mt-2">
              Nothing is on file for {email}. Check the address, or register a player first.
            </p>
          </CardContent></Card>
        )}

        {data?.refund_due > 0 && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4 text-sm text-amber-800">
              <Badge className="bg-amber-100 text-amber-800 mb-2">Refund pending</Badge>
              <p>A refund of ${Number(data.refund_due).toFixed(2)} applies to your cancelled spot. The club issues it back to your original payment method.</p>
            </CardContent>
          </Card>
        )}

        {data && <FamilyOffers clubId={clubId} email={email.trim().toLowerCase()} />}

        {data?.registrations.map((reg) => (
          <RegistrationCard key={reg.id} registration={reg} email={email} onChanged={() => search(email)} />
        ))}
      </div>
      <PublicFooter />
    </div>
  );
}