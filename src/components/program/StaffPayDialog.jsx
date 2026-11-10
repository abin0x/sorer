import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function StaffPayDialog({ open, onOpenChange, programId, onSave }) {
  const [formData, setFormData] = useState({
    staff_name: "",
    role: "",
    amount: "",
    date: "",
    notes: "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.staff_name.trim()) {
      toast.error("Staff name is required");
      return;
    }
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error("Valid amount is required");
      return;
    }
    
    onSave({
      ...formData,
      amount: parseFloat(formData.amount),
      program_id: programId,
    });
    setFormData({
      staff_name: "",
      role: "",
      amount: "",
      date: "",
      notes: "",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] dark:bg-slate-900">
        <DialogHeader>
          <DialogTitle className="dark:text-white">Add Staff Payment</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="staff_name">Staff Name *</Label>
            <Input
              id="staff_name"
              value={formData.staff_name}
              onChange={(e) => setFormData({ ...formData, staff_name: e.target.value })}
              placeholder="Enter staff member name..."
              required
              className="border-slate-300"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="staff_role">Role</Label>
            <Input
              id="staff_role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              placeholder="e.g., Coach, Assistant, Director..."
              className="border-slate-300"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="staff_amount">Amount *</Label>
              <Input
                id="staff_amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                required
                className="border-slate-300"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="staff_date">Payment Date</Label>
              <Input
                id="staff_date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="border-slate-300"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="staff_notes">Notes</Label>
            <Textarea
              id="staff_notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes..."
              rows={3}
              className="border-slate-300 resize-none"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="hover:scale-105 transition-transform">
              Cancel
            </Button>
            <Button type="submit" className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 shadow-lg hover:scale-105 transition-all">
              Add Payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}