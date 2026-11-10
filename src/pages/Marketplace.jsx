import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from '@/lib/router-compat';
import { base44 } from "@/api/base44Client";
import { getHostname, getClubSlugFromHostname } from "@/lib/tenantResolver";
import { useOfferCart } from "@/lib/offerCart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShoppingBag, CheckCircle2, Loader2, Search, SlidersHorizontal, ChevronDown } from "lucide-react";
import OfferCard from "@/components/marketplace/OfferCard";
import CartDrawer from "@/components/marketplace/CartDrawer";
import PublicFooter from "@/components/public/PublicFooter";

const SORT_OPTIONS = [
  { key: "featured", label: "Featured" },
  { key: "price-low", label: "Price: Low to High" },
  { key: "price-high", label: "Price: High to Low" },
  { key: "name", label: "Alphabetical" },
];

export default function Marketplace() {
  const [searchParams, setSearchParams] = useSearchParams();
  const clubSlug = searchParams.get("club") || (!searchParams.get("club_id") ? getClubSlugFromHostname(getHostname()) : null);
  const clubIdFromUrl = searchParams.get("club_id");
  const paid = searchParams.get("paid") === "1";
  const orderId = searchParams.get("order");
  const cart = useOfferCart();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);
  const [clubQuery, setClubQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [sortBy, setSortBy] = useState("featured");
  const [sortOpen, setSortOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [forcePicker, setForcePicker] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {}).finally(() => setUserLoading(false));
  }, []);

  const userClubId = user?.club_id || user?.data?.club_id;
  const effectiveSlug = clubSlug;
  const effectiveClubId = !effectiveSlug ? (clubIdFromUrl || userClubId || null) : null;
  const hasClub = !!(effectiveSlug || effectiveClubId);

  const { data, isLoading } = useQuery({
    queryKey: ["offers", effectiveSlug || effectiveClubId],
    queryFn: () =>
      base44.functions.invoke("list-offers", {
        club_slug: effectiveSlug || undefined,
        club_id: effectiveClubId || undefined,
      }).then((r) => r.data),
    enabled: hasClub,
  });

  React.useEffect(() => {
    if (data?.club?.id) cart.ensureClub(data.club.id);
  }, [data?.club?.id]);

  const { data: clubsList = [], isLoading: clubsLoading, isError: clubsError } = useQuery({
    queryKey: ["marketplaceClubs"],
    queryFn: () => base44.entities.Club.list("name", 200),
    enabled: (!hasClub || forcePicker) && !userLoading && !!user,
  });

  const club = data?.club;
  const offers = data?.offers || [];

  // Client-side filtering + sorting (AJAX-style, no page reload)
  const filteredOffers = useMemo(() => {
    let result = [...offers];

    if (activeCategory !== "all") {
      result = result.filter((o) => o.type === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (o) =>
          o.name?.toLowerCase().includes(q) ||
          o.description?.toLowerCase().includes(q),
      );
    }

    const getPrice = (o) => {
      if (o.type === "spiritwear") {
        const variants = o.config?.variants || [];
        const prices = variants.map((v) => v.price || o.config?.base_price || 0).filter((p) => p > 0);
        return prices.length > 0 ? Math.min(...prices) : o.config?.base_price || 0;
      }
      if (o.type === "event") {
        const opts = o.config?.price_options || [];
        const prices = opts.map((p) => p.price || 0).filter((p) => p > 0);
        return prices.length > 0 ? Math.min(...prices) : 0;
      }
      return 0;
    };

    if (sortBy === "price-low") result.sort((a, b) => getPrice(a) - getPrice(b));
    else if (sortBy === "price-high") result.sort((a, b) => getPrice(b) - getPrice(a));
    else if (sortBy === "name") result.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    else result.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    return result;
  }, [offers, activeCategory, sortBy, searchQuery]);

  const eventCount = offers.filter((o) => o.type === "event").length;
  const spiritwearCount = offers.filter((o) => o.type === "spiritwear").length;

  // --- No club resolved states ---
  if (!hasClub || forcePicker) {
    if (!forcePicker && userLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-white">
          <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
        </div>
      );
    }
    if (!forcePicker && !user) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-white px-6">
          <div className="text-center max-w-md">
            <ShoppingBag className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <h1 className="text-xl font-semibold text-slate-900 mb-2">No club selected</h1>
            <p className="text-sm text-slate-500">Visit your club's marketplace link to start shopping.</p>
          </div>
        </div>
      );
    }
    const filtered = (clubsList || []).filter((c) =>
      c.name?.toLowerCase().includes(clubQuery.toLowerCase()),
    );
    return (
      <div className="safe-top min-h-screen bg-white flex items-center justify-center px-6 py-12">
        <div className="max-w-lg w-full">
          {forcePicker && hasClub && (
            <button
              onClick={() => setForcePicker(false)}
              className="text-sm text-slate-500 hover:text-slate-900 mb-4 flex items-center gap-1"
            >
              ← Back to {data?.club?.name || "store"}
            </button>
          )}
          <div className="text-center mb-8">
            <ShoppingBag className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <h1 className="text-xl font-semibold text-slate-900 mb-1">Select a Club Store</h1>
            <p className="text-sm text-slate-500">Choose a club to browse its marketplace.</p>
          </div>
          <div className="relative mb-3">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={clubQuery}
              onChange={(e) => setClubQuery(e.target.value)}
              placeholder="Search clubs…"
              className="pl-9 border-slate-200"
            />
          </div>
          <div className="space-y-1.5 max-h-80 overflow-y-auto">
            {(filtered || []).length === 0 ? (
              <p className="text-center text-sm text-slate-400 py-8">
                {clubsLoading || userLoading ? "Loading clubs…" : clubsError ? "Could not load club stores. Please reopen the store picker to retry." : clubsList.length > 0 ? "No clubs match your search." : "No club stores available for your account."}
              </p>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { setSearchParams({ club_id: c.id }); setActiveCategory("all"); setSearchQuery(""); setDrawerOpen(false); setForcePicker(false); }}
                  className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 transition text-left"
                >
                  {c.logo_url ? (
                    <img src={c.logo_url} alt={c.name} className="w-9 h-9 rounded-lg object-contain" />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                      <ShoppingBag className="w-4 h-4 text-slate-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-slate-900 truncate">{c.name}</p>
                    <p className="text-xs text-slate-400">{c.slug}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
      </div>
    );
  }

  const categories = [
    { key: "all", label: "All Products", count: offers.length },
    { key: "event", label: "Events", count: eventCount },
    { key: "spiritwear", label: "Spiritwear", count: spiritwearCount },
  ];

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Minimal sticky header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-100">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {club?.logo_url && (
              <img src={club.logo_url} alt={club.name} className="w-8 h-8 rounded object-contain" />
            )}
            <span className="font-semibold text-slate-900 text-sm tracking-tight">{club?.name || "Club"}</span>
            <button
              onClick={() => setForcePicker(true)}
              className="text-xs text-slate-400 hover:text-slate-700 underline underline-offset-2"
            >
              Switch store
            </button>
          </div>
          <button
            onClick={() => setDrawerOpen(true)}
            className="relative flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition"
          >
            <ShoppingBag className="w-5 h-5" />
            <span className="hidden sm:inline">Cart</span>
            {cart.itemCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-slate-900 text-white text-[10px] font-bold w-4.5 h-4.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full">
                {cart.itemCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Paid confirmation */}
      {paid && (
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 pt-6">
          <div className="bg-emerald-50 border border-emerald-100 p-4 flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
            <div>
              <p className="font-semibold text-emerald-900 text-sm">Payment successful</p>
              <p className="text-sm text-emerald-700">
                Your order{orderId ? ` #${orderId.slice(-8).toUpperCase()}` : ""} is confirmed. A receipt has been sent to your email.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Shop hero */}
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 pt-12 pb-8 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 mb-3">Shop</p>
        <h1 className="text-3xl lg:text-4xl font-semibold text-slate-900 tracking-tight">{club?.name || "Club"} Store</h1>
        <p className="text-sm text-slate-500 mt-3 max-w-md mx-auto">Events, camps & spiritwear — register and shop in one cart.</p>
      </div>

      {/* Filter / sort toolbar */}
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 pb-6 border-b border-slate-100">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Category pills */}
          <div className="flex items-center gap-1 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`text-sm font-medium px-4 py-2 transition-colors ${
                  activeCategory === cat.key
                    ? "text-slate-900 border-b-2 border-slate-900"
                    : "text-slate-400 hover:text-slate-700 border-b-2 border-transparent"
                }`}
              >
                {cat.label}
                <span className="ml-1.5 text-xs text-slate-400">({cat.count})</span>
              </button>
            ))}
          </div>

          {/* Search + sort */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products…"
                className="pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-100 focus:outline-none focus:border-slate-300 w-40 lg:w-56"
              />
            </div>

            {/* Sort dropdown */}
            <div className="relative">
              <button
                onClick={() => setSortOpen(!sortOpen)}
                className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 px-3 py-2 border border-slate-100 bg-slate-50"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden sm:inline">Sort:</span>
                <span className="font-medium">{SORT_OPTIONS.find((s) => s.key === sortBy)?.label}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {sortOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setSortOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-slate-100 shadow-lg min-w-[200px] py-1">
                    {SORT_OPTIONS.map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => {
                          setSortBy(opt.key);
                          setSortOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition ${
                          sortBy === opt.key ? "font-semibold text-slate-900" : "text-slate-600"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Result count */}
        <p className="text-xs text-slate-400 mt-4">
          Showing {filteredOffers.length} {filteredOffers.length === 1 ? "product" : "products"}
        </p>
      </div>

      {/* Product grid */}
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 pt-8">
        {filteredOffers.length === 0 ? (
          <div className="text-center py-24">
            <ShoppingBag className="w-10 h-10 mx-auto text-slate-300 mb-4" />
            <p className="text-sm text-slate-400">
              {offers.length === 0 ? "No products available right now." : "No products match your filters."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-10">
            {filteredOffers.map((o) => (
              <OfferCard key={o.id} offer={o} onAddToCart={cart.addItem} />
            ))}
          </div>
        )}
      </div>

      {/* Floating cart button (mobile) */}
      {cart.itemCount > 0 && (
        <button
          onClick={() => setDrawerOpen(true)}
          className="sm:hidden fixed bottom-[calc(1rem+max(env(safe-area-inset-bottom,0px),12px))] right-4 z-30 bg-slate-900 text-white rounded-full px-5 py-3 shadow-lg flex items-center gap-2"
        >
          <ShoppingBag className="w-5 h-5" />
          <span className="font-semibold text-sm">{cart.itemCount}</span>
          <span className="text-sm">${cart.subtotal.toFixed(2)}</span>
        </button>
      )}

      <CartDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
      <PublicFooter />
    </div>
  );
}