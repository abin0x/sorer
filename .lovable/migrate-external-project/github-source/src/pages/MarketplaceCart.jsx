import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { getHostname, getClubSlugFromHostname } from "@/lib/tenantResolver";
import { useOfferCart } from "@/lib/offerCart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, ShoppingBag, Lock, ArrowLeft, Loader2, Shield } from "lucide-react";
import { toast } from "sonner";
import PublicFooter from "@/components/public/PublicFooter";

export default function MarketplaceCart() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const cart = useOfferCart();
  const clubSlug = searchParams.get("club") || getClubSlugFromHostname(getHostname());
  const clubId = searchParams.get("club_id") || cart.club_id;
  const marketplaceUrl = `/Marketplace${clubSlug ? `?club=${clubSlug}` : clubId ? `?club_id=${clubId}` : ""}`;

  const confirmationStep = searchParams.get("step") === "confirmation";
  const canceled = searchParams.get("canceled") === "1";
  const orderId = searchParams.get("order");

  const [step, setStep] = useState(confirmationStep ? "confirmation" : canceled ? "cart" : "cart");
  const [customer, setCustomer] = useState({ name: "", email: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Pre-fill from logged-in user
  useEffect(() => {
    if (user) {
      setCustomer((prev) => ({
        ...prev,
        name: prev.name || user.full_name || "",
        email: prev.email || user.email || "",
      }));
    }
  }, [user]);

  // Clear cart on confirmation
  useEffect(() => {
    if (step === "confirmation") {
      cart.clearCart();
    }
  }, [step]);

  // Redirect to marketplace if cart is empty (and not on confirmation/canceled)
  useEffect(() => {
    if (cart.items.length === 0 && step === "cart" && !confirmationStep) {
      navigate(marketplaceUrl);
    }
  }, [cart.items.length, step, confirmationStep]);

  const needsSignIn = cart.hasMembersOnly && !user;

  const handleCheckout = async () => {
    if (!customer.name.trim() || !customer.email.trim()) {
      toast.error("Please enter your name and email");
      return;
    }
    if (needsSignIn) {
      toast.error("Please sign in to complete members-only purchases");
      return;
    }

    setLoading(true);
    setStep("payment");
    try {
      const res = await base44.functions.invoke("create-offer-checkout", {
        club_slug: clubSlug || undefined,
        club_id: clubId || undefined,
        items: cart.items.map(({ _key, ...item }) => item),
        customer: {
          ...customer,
          user_id: user?.id || null,
          cover_fee: cart.items.some((i) => i.cover_fee),
        },
      });
      if (res.data?.checkout_url) {
        window.location.href = res.data.checkout_url;
      } else {
        throw new Error(res.data?.error || "Could not start checkout");
      }
    } catch (err) {
      toast.error(err.message || "Checkout failed");
      setStep("details");
    } finally {
      setLoading(false);
    }
  };

  // ── Confirmation step ──────────────────────────────────────
  if (step === "confirmation") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Order Confirmed!</h1>
          <p className="text-slate-600 mb-1">
            Thank you for your purchase. A receipt has been sent to your email.
          </p>
          {orderId && (
            <p className="text-sm text-slate-400 mb-6">Order #{orderId.slice(-8).toUpperCase()}</p>
          )}
          <div className="space-y-2">
            <Button asChild className="w-full">
              <Link to={{marketplaceUrl}}>Continue Shopping</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ── Empty cart ─────────────────────────────────────────────
  if (cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-700 mb-2">Your cart is empty</h1>
          <Button asChild>
            <Link to={{marketplaceUrl}}>Browse the store</Link>
          </Button>
        </Card>
      </div>
    );
  }

  // ── Cart + Details + Payment steps ─────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to={{marketplaceUrl}}>
              <ArrowLeft className="w-4 h-4" />
              <span className="ml-1">Back</span>
            </Link>
          </Button>
          <h1 className="font-bold text-slate-900">
            {step === "cart" ? "Your Cart" : step === "details" ? "Your Details" : "Redirecting to Payment…"}
          </h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Canceled notice */}
        {canceled && step === "cart" && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
            Payment was canceled. Your cart is still here — try again when you're ready.
          </div>
        )}

        {/* Step indicator */}
        <div className="flex items-center gap-2 text-xs">
          {["cart", "details", "payment"].map((s, i) => {
            const stepIndex = ["cart", "details", "payment"].indexOf(step);
            const isActive = i <= stepIndex;
            return (
              <React.Fragment key={s}>
                <div className={`flex items-center gap-1.5 ${isActive ? "text-primary font-medium" : "text-slate-400"}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${isActive ? "bg-primary text-primary-foreground" : "bg-slate-200"}`}>
                    {i + 1}
                  </span>
                  <span className="capitalize">{s === "cart" ? "Cart" : s === "details" ? "Details" : "Payment"}</span>
                </div>
                {i < 2 && <div className={`flex-1 h-px ${isActive ? "bg-primary" : "bg-slate-200"}`} />}
              </React.Fragment>
            );
          })}
        </div>

        {/* Cart items (always visible in cart and details steps) */}
        {(step === "cart" || step === "details") && (
          <div className="space-y-2">
            {cart.items.map((item) => (
              <div key={item._key} className="flex gap-3 p-3 bg-white rounded-xl border border-slate-100">
                <div className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-slate-900 truncate">{item.name}</p>
                  <p className="text-xs text-slate-500">
                    {item.type === "spiritwear" && `${item.variant?.size} ${item.variant?.color}`}
                    {item.type === "event" && `${item.price_option_name}${item.dates?.length ? ` · ${item.dates.length}d` : ""}`}
                    {item.type === "dues" && `${item.payment_plan === "monthly" ? "Monthly" : "Full"}`}
                    {item.access === "members_only" && <Lock className="w-3 h-3 inline ml-1 text-purple-500" />}
                  </p>
                  <p className="text-xs text-slate-400">Qty {item.quantity || 1}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-sm">${((item.line_total || (item.unit_price || 0) * (item.quantity || 1))).toFixed(2)}</p>
                  {step === "cart" && (
                    <Button variant="ghost" size="sm" className="text-xs text-red-500 h-6 px-1" onClick={() => cart.removeItem(item._key)}>
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Details form */}
        {step === "details" && (
          <Card className="p-4 space-y-3">
            <h2 className="font-semibold text-slate-900">Contact Information</h2>
            {needsSignIn && (
              <div className="flex items-center gap-2 text-sm text-purple-700 bg-purple-50 p-3 rounded-lg">
                <Lock className="w-4 h-4 shrink-0" />
                <span>Your cart includes members-only items. Please </span>
                <Link to={`/login?returnTo=/MarketplaceCart`} className="underline font-medium">sign in</Link>
                <span> to continue.</span>
              </div>
            )}
            <div>
              <Label className="text-xs text-slate-500">Full Name</Label>
              <Input value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} placeholder="Your name" />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Email</Label>
              <Input type="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} placeholder="you@example.com" />
              <p className="text-xs text-slate-400 mt-1">Your receipt and order lookup link will be sent here.</p>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Phone (optional)</Label>
              <Input value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} placeholder="(555) 123-4567" />
            </div>
          </Card>
        )}

        {/* Payment loading */}
        {step === "payment" && (
          <Card className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
            <p className="text-slate-600">Redirecting to secure checkout…</p>
          </Card>
        )}

        {/* Subtotal + actions */}
        {(step === "cart" || step === "details") && (
          <Card className="p-4 space-y-3 sticky bottom-0">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Subtotal</span>
              <span className="text-lg font-bold text-slate-900">${cart.subtotal.toFixed(2)}</span>
            </div>
            <Separator />
            {step === "cart" ? (
              <Button className="w-full" size="lg" onClick={() => setStep("details")}>
                Continue to Details
              </Button>
            ) : (
              <>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Secure payment powered by Stripe</span>
                </div>
                <Button className="w-full" size="lg" onClick={handleCheckout} disabled={loading || needsSignIn}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Pay ${cart.subtotal.toFixed(2)}
                </Button>
                <Button variant="ghost" className="w-full" onClick={() => setStep("cart")}>
                  Back to Cart
                </Button>
              </>
            )}
          </Card>
        )}
      </div>
      <PublicFooter />
    </div>
  );
}