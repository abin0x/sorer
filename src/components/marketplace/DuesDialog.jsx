import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { CreditCard, ShoppingBag, TrendingUp } from "lucide-react";
import { toast } from "sonner";

const PLAN_LABELS = {
  full: "Pay in Full",
  monthly: "Monthly Installments",
  split_guardians: "Split Among Guardians",
};

const PLAN_DESCRIPTIONS = {
  full: "One-time charge for the full season",
  monthly: "Fixed-term installments ending after the season",
  split_guardians: "Each guardian pays their share from their own card",
};

export default function DuesDialog({ open, onOpenChange, offer, onAdd }) {
  const config = offer.config || {};
  const plans = config.payment_plans || ["full"];

  const [plan, setPlan] = useState(plans[0] || "full");
  const [playerName, setPlayerName] = useState("");
  const [coverFee, setCoverFee] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const earlyBirdActive = config.early_bird?.until && today <= config.early_bird.until;
  const baseAmount = earlyBirdActive
    ? Number(config.early_bird.price || config.amount || 0)
    : Number(config.amount || 0);

  const siblingDiscount = config.sibling_discount_percent > 0;
  const amountAfterDiscount = siblingDiscount
    ? baseAmount * (1 - config.sibling_discount_percent / 100)
    : baseAmount;

  const feeAmount = coverFee ? Math.round((amountAfterDiscount * 0.029 + 0.3) * 100) / 100 : 0;
  const lineTotal = amountAfterDiscount + feeAmount;

  const handleAdd = () => {
    if (!playerName.trim()) {
      toast.error("Please enter the player's name");
      return;
    }
    onAdd({
      type: "dues",
      offer_id: offer.id,
      name: offer.name,
      image_url: offer.image_url,
      payment_plan: plan,
      player: { name: playerName },
      cover_fee: coverFee,
      quantity: 1,
      unit_price: amountAfterDiscount,
      line_total: lineTotal,
      access: offer.access,
    });
    toast.success(`${offer.name} added to cart`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{offer.name}</DialogTitle>
        </DialogHeader>

        {/* Season info */}
        <div className="space-y-1.5 text-sm text-slate-600">
          {config.season && (
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-slate-400" />
              <span>Season {config.season}</span>
            </div>
          )}
          {config.team_name && (
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-slate-400" />
              <span>{config.team_name}</span>
            </div>
          )}
          {earlyBirdActive && (
            <div className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded">
              Early bird pricing active until {new Date(config.early_bird.until).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </div>
          )}
        </div>

        {/* Payment plan */}
        <div>
          <Label className="text-xs text-slate-500 mb-1.5 block">Payment Plan</Label>
          <RadioGroup value={plan} onValueChange={setPlan}>
            <div className="space-y-2">
              {plans.map((p) => (
                <div key={p} className="flex items-start gap-2 p-2.5 rounded-lg border-2 border-slate-200 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                  <RadioGroupItem value={p} id={p} className="mt-0.5" />
                  <div className="flex-1">
                    <Label htmlFor={p} className="font-medium text-sm cursor-pointer">{PLAN_LABELS[p]}</Label>
                    <p className="text-xs text-slate-500">{PLAN_DESCRIPTIONS[p]}</p>
                  </div>
                </div>
              ))}
            </div>
          </RadioGroup>
        </div>

        {/* Player name */}
        <div>
          <Label className="text-xs text-slate-500 mb-1.5 block">Player Name</Label>
          <Input
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Player's full name"
          />
        </div>

        {/* Sibling discount notice */}
        {siblingDiscount && (
          <p className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1.5 rounded">
            {config.sibling_discount_percent}% sibling discount applied
          </p>
        )}

        {/* Cover fee option */}
        {config.cover_fee_option && (
          <div className="flex items-start gap-2 p-2.5 rounded-lg border border-slate-200">
            <Checkbox checked={coverFee} onCheckedChange={setCoverFee} id="coverfee" className="mt-0.5" />
            <div>
              <Label htmlFor="coverfee" className="text-sm cursor-pointer font-medium">
                Cover the processing fee (+${(amountAfterDiscount * 0.029 + 0.3).toFixed(2)})
              </Label>
              <p className="text-xs text-slate-500">100% goes to the club</p>
            </div>
          </div>
        )}

        {/* Price + Add */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div>
            <span className="text-xs text-slate-400">{plan === "monthly" ? "per month" : "total"}</span>
            <span className="text-xl font-bold text-slate-900 ml-1">${amountAfterDiscount.toFixed(2)}</span>
            {feeAmount > 0 && <span className="text-xs text-slate-500 ml-1">+ ${feeAmount.toFixed(2)} fee</span>}
          </div>
          <Button onClick={handleAdd}>
            <ShoppingBag className="w-4 h-4 mr-1.5" />
            Add to Cart
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}