import { useEffect, useState, useCallback } from "react";

const CART_KEY = "offer_cart_v2";
const CART_EVENT = "offer_cart_change";

function readCart() {
  if (typeof window === "undefined") return { club_id: null, items: [] };
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return { club_id: null, items: [] };
    const parsed = JSON.parse(raw);
    return { club_id: parsed.club_id || null, items: Array.isArray(parsed.items) ? parsed.items : [] };
  } catch {
    return { club_id: null, items: [] };
  }
}

function writeCart(cart) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    window.dispatchEvent(new CustomEvent(CART_EVENT));
  } catch {
    /* ignore quota errors */
  }
}

// Build a unique key for a cart line so identical items merge and different
// variants/dates/plans stay separate.
function itemKey(item) {
  const variantKey = item.variant
    ? `${item.variant.size || ""}|${item.variant.color || ""}|${item.variant.sku || ""}`
    : "";
  const datesKey = item.dates ? item.dates.join(",") : "";
  const planKey = item.payment_plan || "";
  const optionKey = item.price_option_key || "";
  const nameKey = item.custom_name || "";
  const numKey = item.custom_number || "";
  return [item.type, item.offer_id, variantKey, datesKey, planKey, optionKey, nameKey, numKey].join("::");
}

export function useOfferCart() {
  const [cart, setCart] = useState(readCart);

  useEffect(() => {
    const handler = () => setCart(readCart());
    window.addEventListener(CART_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(CART_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const ensureClub = useCallback((clubId) => {
    setCart((prev) => {
      if (prev.club_id === clubId) return prev;
      const next = { club_id: clubId, items: [] };
      writeCart(next);
      return next;
    });
  }, []);

  const addItem = useCallback((item) => {
    setCart((prev) => {
      const key = itemKey(item);
      const existing = prev.items.find((i) => i._key === key);
      let items;
      if (existing) {
        items = prev.items.map((i) =>
          i._key === key ? { ...i, quantity: (i.quantity || 1) + (item.quantity || 1) } : i,
        );
      } else {
        items = [...prev.items, { ...item, _key: key }];
      }
      const next = { ...prev, items };
      writeCart(next);
      return next;
    });
  }, []);

  const updateQuantity = useCallback((key, quantity) => {
    setCart((prev) => {
      const items =
        quantity <= 0
          ? prev.items.filter((i) => i._key !== key)
          : prev.items.map((i) => (i._key === key ? { ...i, quantity } : i));
      const next = { ...prev, items };
      writeCart(next);
      return next;
    });
  }, []);

  const removeItem = useCallback((key) => {
    setCart((prev) => {
      const items = prev.items.filter((i) => i._key !== key);
      const next = { ...prev, items };
      writeCart(next);
      return next;
    });
  }, []);

  const clearCart = useCallback(() => {
    setCart((prev) => {
      const next = { ...prev, items: [] };
      writeCart(next);
      return next;
    });
  }, []);

  const itemCount = cart.items.reduce((sum, i) => sum + (i.quantity || 1), 0);
  const subtotal = cart.items.reduce(
    (sum, i) => sum + (i.line_total || (i.unit_price || 0) * (i.quantity || 1)),
    0,
  );
  const hasMembersOnly = cart.items.some((i) => i.access === "members_only");

  return {
    club_id: cart.club_id,
    items: cart.items,
    itemCount,
    subtotal,
    hasMembersOnly,
    ensureClub,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
  };
}