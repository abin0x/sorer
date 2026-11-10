import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Loader2, ChevronDown, Calendar, Clock, MapPin, DollarSign } from "lucide-react";

const TYPE_OPTIONS = [
  { value: "camp", label: "Camp" },
  { value: "class", label: "Class" },
  { value: "clinic", label: "Clinic" },
  { value: "tournament", label: "Tournament" },
  { value: "open_play", label: "Open Play" },
  { value: "social", label: "Social" },
];

const EMPTY = {
  name: "", type: "camp", description: "", start_date: "", end_date: "",
  start_time: "", end_time: "", location: "", capacity: 0, price: 0,
  status: "draft", is_public: true, allow_waitlist: true, registration_opens: "", registration_closes: "",
};

export default function EventFormDialog({ open, onOpenChange, editing, onSave }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [showOptional, setShowOptional] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(editing ? { ...EMPTY, ...editing } : EMPTY);
      setShowOptional(false);
    }
  }, [open, editing]);

  const set = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  // Detect if form has any data entered (to guard against accidental close)
  const hasData = () => {
    const f = form;
    return !!(f.name?.trim() || f.description?.trim() || f.start_date || f.end_date ||
      f.start_time || f.end_time || f.location?.trim() ||
      Number(f.capacity) > 0 || Number(f.price) > 0 ||
      f.registration_opens || f.registration_closes ||
      (!f.is_public) || (!f.allow_waitlist));
  };

  // Prevent outside-click and Escape from discarding unsaved work
  const handleInteractOutside = (e) => {
    if (hasData()) {
      e.preventDefault();
      setConfirmClose(true);
    }
  };
  const handleEscapeKey = (e) => {
    if (hasData()) {
      e.preventDefault();
      setConfirmClose(true);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  };

  const closeWithoutSave = () => {
    setConfirmClose(false);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-lg max-h-[92vh] overflow-y-auto"
          onInteractOutside={handleInteractOutside}
          onEscapeKeyDown={handleEscapeKey}
        >
          <DialogHeader>
            <DialogTitle className="text-xl">{editing?.id ? "Edit Event" : "Create New Event"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Required essentials */}
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-semibold">Event Name <span className="text-rose-500">*</span></Label>
                <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Summer Skills Camp" className="mt-1" autoFocus />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-semibold">Type</Label>
                  <Select value={form.type} onValueChange={(v) => set("type", v)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TYPE_OPTIONS.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Status</Label>
                  <Select value={form.status} onValueChange={(v) => set("status", v)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-semibold flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Start Date <span className="text-rose-500">*</span></Label>
                  <Input type="date" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-sm font-semibold flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> End Date</Label>
                  <Input type="date" value={form.end_date} onChange={(e) => set("end_date", e.target.value)} className="mt-1" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-semibold flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Start Time</Label>
                  <Input type="time" value={form.start_time} onChange={(e) => set("start_time", e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-sm font-semibold flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> End Time</Label>
                  <Input type="time" value={form.end_time} onChange={(e) => set("end_time", e.target.value)} className="mt-1" />
                </div>
              </div>
            </div>

            {/* Location & capacity */}
            <div className="space-y-3 border-t pt-4">
              <div>
                <Label className="text-sm font-semibold flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Location</Label>
                <Input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Field, facility, or address" className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-semibold">Capacity (0 = unlimited)</Label>
                  <Input type="number" min="0" value={form.capacity} onChange={(e) => set("capacity", e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-sm font-semibold flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" /> Price</Label>
                  <Input type="number" min="0" step="0.01" value={form.price} onChange={(e) => set("price", e.target.value)} className="mt-1" />
                </div>
              </div>
            </div>

            {/* Collapsible optional section */}
            <div className="border-t pt-3">
              <button
                type="button"
                onClick={() => setShowOptional((s) => !s)}
                className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors w-full text-left"
              >
                <ChevronDown className={`w-4 h-4 transition-transform ${showOptional ? "rotate-180" : ""}`} />
                More Options
              </button>
              {showOptional && (
                <div className="space-y-3 mt-3">
                  <div>
                    <Label className="text-sm font-semibold">Description</Label>
                    <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} placeholder="Public description shown on the signup page" className="mt-1" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Registration Opens</Label>
                      <Input type="date" value={form.registration_opens} onChange={(e) => set("registration_opens", e.target.value)} className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">Registration Closes</Label>
                      <Input type="date" value={form.registration_closes} onChange={(e) => set("registration_closes", e.target.value)} className="mt-1" />
                    </div>
                  </div>
                  <div className="flex items-center gap-5 pt-1">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={form.is_public} onCheckedChange={(c) => set("is_public", c)} />
                      Public (visible on signup page)
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={form.allow_waitlist} onCheckedChange={(c) => set("allow_waitlist", c)} />
                      Allow waitlist
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.name || !form.start_date} className="min-w-28">
              {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null}
              {editing?.id ? "Save Changes" : "Create Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm discard dialog */}
      <AlertDialog open={confirmClose} onOpenChange={setConfirmClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard this event?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Closing now will lose everything you entered. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmClose(false)}>Keep Editing</AlertDialogCancel>
            <AlertDialogAction onClick={closeWithoutSave} className="bg-rose-600 hover:bg-rose-700 text-white">Discard</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}