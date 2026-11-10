import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { Loader2, Tag, Check, X } from "lucide-react";

/**
 * Promo code input with live validation. Calls validate-promo-code and shows
 * the discounted total. onApplied receives the validation result (or null when
 * cleared) so the parent can use the discounted amount at checkout.
 */
export default function PromoCodeInput({ clubId, sourceType, amount, onApplied }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const apply = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await base44.functions.invoke("validate-promo-code", {
        club_id: clubId,
        code: code.trim(),
        source_type: sourceType,
        amount,
      });
      if (res.data?.valid) {
        setResult(res.data);
        onApplied?.(res.data);
      } else {
        setResult(null);
        onApplied?.(null);
        setError(res.data?.error || "Invalid code");
      }
    } catch (e) {
      setError(e?.response?.data?.error || "Could not validate code");
      setResult(null);
      onApplied?.(null);
    }
    setLoading(false);
  };

  const clear = () => {
    setCode("");
    setResult(null);
    setError("");
    onApplied?.(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input
            placeholder="Promo code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="pl-8 rounded-xl"
            disabled={!!result}
          />
        </div>
        {result ? (
          <Button type="button" variant="outline" size="sm" onClick={clear}>
            <X className="w-3.5 h-3.5 mr-1" /> Remove
          </Button>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={apply} disabled={loading || !code.trim()}>
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Apply"}
          </Button>
        )}
      </div>
      {result && (
        <div className="flex items-center gap-2 text-xs">
          <Badge className="bg-emerald-100 text-emerald-700 gap-1">
            <Check className="w-3 h-3" /> {result.code}
          </Badge>
          <span className="text-muted-foreground">
            −${result.discount_amount.toFixed(2)} · New total <b>${result.new_amount.toFixed(2)}</b>
          </span>
        </div>
      )}
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}