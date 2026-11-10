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
import AssigneeSelect from "../shared/AssigneeSelect";
import CategorySelect from "../shared/CategorySelect";
import { toast } from "sonner";

export default function ExpenseDialog({ open, onOpenChange, programId, onSave }) {
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    date: "",
    category: "",
    assigned_to: "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!programId) {
      toast.error("Invalid program");
      return;
    }

    if (!formData.description.trim()) {
      toast.error("Description is required");
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error("Valid amount is required");
      return;
    }

    onSave({
      ...formData,
      program_id: programId,
      amount: parseFloat(formData.amount),
      status: "pending",
      payment_status: "to_be_paid",
    });

    // Reset form
    setFormData({
      description: "",
      amount: "",
      date: "",
      category: "",
      assigned_to: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] dark:bg-slate-900">
        <DialogHeader>
          <DialogTitle className="dark:text-white">Add New Expense</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="expense_description" className="dark:text-slate-300">Description *</Label>
            <Textarea
              id="expense_description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter expense description..."
              rows={2}
              required
              className="border-slate-300 dark:bg-slate-800 dark:border-slate-700 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expense_amount" className="dark:text-slate-300">Amount *</Label>
              <Input
                id="expense_amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                required
                className="border-slate-300 dark:bg-slate-800 dark:border-slate-700"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expense_date" className="dark:text-slate-300">Date</Label>
              <Input
                id="expense_date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="border-slate-300 dark:bg-slate-800 dark:border-slate-700"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="dark:text-slate-300">Category</Label>
            <CategorySelect
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
              placeholder="Select category"
            />
          </div>

          <div className="space-y-2">
            <Label className="dark:text-slate-300">Assigned To (Payor)</Label>
            <AssigneeSelect
              value={formData.assigned_to}
              onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}
              placeholder="Select staff member"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="hover:scale-105 transition-transform">
              Cancel
            </Button>
            <Button type="submit" className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 shadow-lg hover:scale-105 transition-all">
              Add Expense
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}