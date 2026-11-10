import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Plus, Pencil, Trash2, Shirt, X } from "lucide-react";
import { toast } from "sonner";

const SIZES = ["YS", "YS/M", "S", "M", "L", "XL", "XXL"];
const COLORS = ["Navy", "Black", "Heather Gray", "White", "Red", "Royal Blue"];

export default function SpiritwearTab({ clubId }) {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data: offers = [], isLoading } = useQuery({
    queryKey: ["spiritwearOffers", clubId],
    queryFn: () => base44.entities.Offer.filter({ club_id: clubId, type: "spiritwear" }, "sort_order", 200),
  });

  const handleDelete = async (o) => {
    if (!confirm(`Delete "${o.name}"?`)) return;
    try {
      await base44.entities.Offer.delete(o.id);
      qc.invalidateQueries({ queryKey: ["spiritwearOffers", clubId] });
      toast.success("Product deleted");
    } catch { toast.error("Could not delete product"); }
  };

  const handleToggleStatus = async (o) => {
    try {
      await base44.entities.Offer.update(o.id, { status: o.status === "active" ? "archived" : "active" });
      qc.invalidateQueries({ queryKey: ["spiritwearOffers", clubId] });
    } catch { toast.error("Could not update product"); }
  };

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Create and manage spiritwear products with size/color variants.</p>
        <Button size="sm" onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-1" /> Add Product
        </Button>
      </div>

      {offers.length === 0 ? (
        <div className="text-center py-12 text-slate-400 border border-dashed rounded-xl">
          <Shirt className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No spiritwear products yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {offers.map((o) => {
            const cfg = o.config || {};
            const variants = cfg.variants || [];
            return (
              <Card key={o.id}>
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="w-14 h-14 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                    {o.image_url ? <img src={o.image_url} alt={o.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Shirt className="w-6 h-6 text-slate-300" /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-sm text-slate-900 truncate">{o.name}</h3>
                      <Badge variant={o.status === "active" ? "default" : "secondary"} className="text-xs shrink-0">{o.status}</Badge>
                    </div>
                    <p className="text-xs text-slate-500">${cfg.base_price || 0} · {variants.length} variants</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(cfg.sizes || []).slice(0, 5).map((s) => <Badge key={s} variant="outline" className="text-xs">{s}</Badge>)}
                      {(cfg.sizes || []).length > 5 && <Badge variant="outline" className="text-xs">+{cfg.sizes.length - 5}</Badge>}
                    </div>
                    <div className="flex gap-1 mt-2">
                      <Button size="sm" variant="outline" className="h-7" onClick={() => { setEditing(o); setDialogOpen(true); }}><Pencil className="w-3 h-3 mr-1" /> Edit</Button>
                      <Button size="sm" variant="outline" className="h-7" onClick={() => handleToggleStatus(o)}>{o.status === "active" ? "Archive" : "Activate"}</Button>
                      <Button size="sm" variant="ghost" className="h-7 text-slate-400 hover:text-red-500" onClick={() => handleDelete(o)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <SpiritwearOfferDialog open={dialogOpen} onOpenChange={setDialogOpen} offer={editing} clubId={clubId} />
    </div>
  );
}

function SpiritwearOfferDialog({ open, onOpenChange, offer, clubId }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: "", description: "", image_url: "", base_price: "",
    sizes: [], colors: [], fulfillment_options: ["pickup"],
    allow_custom_name_number: false, custom_name_price: 5, custom_number_price: 5,
    order_window_closes: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && offer) {
      const cfg = offer.config || {};
      setForm({
        name: offer.name || "",
        description: offer.description || "",
        image_url: offer.image_url || "",
        base_price: (cfg.base_price || "").toString(),
        sizes: cfg.sizes || [],
        colors: cfg.colors || [],
        fulfillment_options: cfg.fulfillment_options || ["pickup"],
        allow_custom_name_number: cfg.allow_custom_name_number || false,
        custom_name_price: cfg.custom_name_price || 5,
        custom_number_price: cfg.custom_number_price || 5,
        order_window_closes: cfg.order_window_closes || "",
      });
    } else if (open) {
      setForm({ name: "", description: "", image_url: "", base_price: "", sizes: [], colors: [], fulfillment_options: ["pickup"], allow_custom_name_number: false, custom_name_price: 5, custom_number_price: 5, order_window_closes: "" });
    }
  }, [open, offer]);

  const toggleSize = (s) => setForm((p) => ({ ...p, sizes: p.sizes.includes(s) ? p.sizes.filter((x) => x !== s) : [...p.sizes, s] }));
  const toggleColor = (c) => setForm((p) => ({ ...p, colors: p.colors.includes(c) ? p.colors.filter((x) => x !== c) : [...p.colors, c] }));
  const toggleFulfillment = (f) => setForm((p) => ({ ...p, fulfillment_options: p.fulfillment_options.includes(f) ? p.fulfillment_options.filter((x) => x !== f) : [...p.fulfillment_options, f] }));

  const handleSave = async () => {
    if (!form.name || !form.base_price) { toast.error("Name and base price are required."); return; }
    setSaving(true);
    try {
      // Generate variants from sizes × colors
      const basePrice = Number(form.base_price) || 0;
      const variants = [];
      const sizeList = form.sizes.length > 0 ? form.sizes : ["One Size"];
      const colorList = form.colors.length > 0 ? form.colors : ["Default"];
      for (const size of sizeList) {
        for (const color of colorList) {
          const sku = `${form.name.slice(0, 3).toUpperCase()}-${size}-${color.slice(0, 2).toUpperCase()}`.replace(/\s/g, "");
          variants.push({ size, color, sku, price: basePrice, stock: 0 });
        }
      }

      const payload = {
        club_id: clubId,
        name: form.name,
        description: form.description,
        image_url: form.image_url,
        type: "spiritwear",
        access: "public",
        status: "active",
        sort_order: 0,
        config: {
          base_price: basePrice,
          sizes: form.sizes,
          colors: form.colors,
          variants,
          fulfillment_options: form.fulfillment_options,
          allow_custom_name_number: form.allow_custom_name_number,
          custom_name_price: Number(form.custom_name_price) || 0,
          custom_number_price: Number(form.custom_number_price) || 0,
          order_window_closes: form.order_window_closes || undefined,
        },
      };

      if (offer) {
        // Preserve existing variant stock/price overrides where possible
        const existingVariants = (offer.config?.variants) || [];
        const merged = variants.map((nv) => {
          const match = existingVariants.find((ev) => ev.size === nv.size && ev.color === nv.color);
          return match ? { ...nv, price: match.price || nv.price, stock: match.stock ?? nv.stock } : nv;
        });
        payload.config.variants = merged;
        await base44.entities.Offer.update(offer.id, payload);
      } else {
        await base44.entities.Offer.create(payload);
      }
      qc.invalidateQueries({ queryKey: ["spiritwearOffers", clubId] });
      toast.success(offer ? "Product updated" : "Product created");
      onOpenChange(false);
    } catch (e) { toast.error("Could not save product: " + (e.message || "")); }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{offer ? "Edit Spiritwear Product" : "New Spiritwear Product"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jaguars Hoodie" /></div>
          <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Premium fleece hoodie with club logo" rows={2} /></div>
          <div><Label>Image URL</Label><Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://…" /></div>
          <div><Label>Base Price ($) *</Label><Input type="number" step="0.01" value={form.base_price} onChange={(e) => setForm({ ...form, base_price: e.target.value })} placeholder="45.00" /></div>

          <div>
            <Label>Sizes</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {SIZES.map((s) => (
                <button key={s} type="button" onClick={() => toggleSize(s)} className={`px-3 py-1.5 text-sm rounded-lg border transition ${form.sizes.includes(s) ? "bg-primary text-primary-foreground border-primary" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>{s}</button>
              ))}
            </div>
          </div>

          <div>
            <Label>Colors</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {COLORS.map((c) => (
                <button key={c} type="button" onClick={() => toggleColor(c)} className={`px-3 py-1.5 text-sm rounded-lg border transition ${form.colors.includes(c) ? "bg-primary text-primary-foreground border-primary" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>{c}</button>
              ))}
            </div>
          </div>

          <div>
            <Label>Fulfillment Options</Label>
            <div className="flex gap-4 mt-1">
              {["shipping", "pickup"].map((f) => (
                <div key={f} className="flex items-center gap-2">
                  <Checkbox id={`ful-${f}`} checked={form.fulfillment_options.includes(f)} onCheckedChange={() => toggleFulfillment(f)} />
                  <Label htmlFor={`ful-${f}`} className="text-sm font-normal cursor-pointer capitalize">{f}</Label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            <Checkbox id="cnn" checked={form.allow_custom_name_number} onCheckedChange={(v) => setForm({ ...form, allow_custom_name_number: !!v })} />
            <Label htmlFor="cnn" className="text-sm font-normal cursor-pointer">Allow custom name & number</Label>
          </div>
          {form.allow_custom_name_number && (
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Custom Name Price ($)</Label><Input type="number" step="0.01" value={form.custom_name_price} onChange={(e) => setForm({ ...form, custom_name_price: e.target.value })} /></div>
              <div><Label className="text-xs">Custom Number Price ($)</Label><Input type="number" step="0.01" value={form.custom_number_price} onChange={(e) => setForm({ ...form, custom_number_price: e.target.value })} /></div>
            </div>
          )}

          <div><Label>Order Window Closes</Label><Input type="date" value={form.order_window_closes} onChange={(e) => setForm({ ...form, order_window_closes: e.target.value })} /></div>

          <p className="text-xs text-slate-400">
            {form.sizes.length * (form.colors.length || 1)} variants will be generated from sizes × colors.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}