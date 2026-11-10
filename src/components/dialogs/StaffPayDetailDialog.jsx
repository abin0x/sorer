import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import StaffSearchSelect from "@/components/staff/StaffSearchSelect";

export default function StaffPayDetailDialog({ open, onOpenChange, staffPay, onUpdate, onSave }) {
  const [formData, setFormData] = useState({
    staff_email: staffPay?.staff_email || "",
    staff_name: staffPay?.staff_name || "",
    payor_email: staffPay?.payor_email || "",
    payor_name: staffPay?.payor_name || "",
    role: staffPay?.role || "",
    amount: staffPay?.amount || 0,
    hours_worked: staffPay?.hours_worked || 0,
    date: staffPay?.date || "",
    notes: staffPay?.notes || "",
    payment_status: staffPay?.payment_status || "to_be_paid",
  });

  const queryClient = useQueryClient();

  const updateStaffPayMutation = useMutation({
    mutationFn: (data) => base44.entities.StaffPay.update(staffPay.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staffpay"] });
      queryClient.invalidateQueries({ queryKey: ["staffpay", staffPay.program_id] });
      toast.success("Staff pay updated successfully");
      onUpdate?.();
      onOpenChange(false);
    },
  });

  const deleteStaffPayMutation = useMutation({
    mutationFn: () => base44.entities.StaffPay.delete(staffPay.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staffpay"] });
      queryClient.invalidateQueries({ queryKey: ["staffpay", staffPay.program_id] });
      toast.success("Staff pay deleted successfully");
      onUpdate?.();
      onOpenChange(false);
    },
  });

  React.useEffect(() => {
    if (staffPay) {
      setFormData({
        staff_email: staffPay.staff_email || "",
        staff_name: staffPay.staff_name || "",
        payor_email: staffPay.payor_email || "",
        payor_name: staffPay.payor_name || "",
        role: staffPay.role || "",
        amount: staffPay.amount || 0,
        hours_worked: staffPay.hours_worked || 0,
        date: staffPay.date || "",
        notes: staffPay.notes || "",
        payment_status: staffPay.payment_status || "to_be_paid",
      });
    }
  }, [staffPay]);

  const handleSave = () => {
    if (!formData.staff_email) {
      toast.error("Please select a staff member (Payee)");
      return;
    }
    
    const dataToSave = {
      ...formData,
      staff_name: formData.staff_name || formData.staff_email,
      payor_name: formData.payor_name || formData.payor_email,
      hours_worked: parseFloat(formData.hours_worked) || 0,
      amount: parseFloat(formData.amount) || 0
    };
    
    if (staffPay?.id) {
      updateStaffPayMutation.mutate(dataToSave);
    } else if (onSave) {
      onSave(dataToSave);
      onOpenChange(false);
    }
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this staff pay record?")) {
      deleteStaffPayMutation.mutate();
    }
  };

  if (!staffPay) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] dark:bg-slate-900">
        <DialogHeader>
          <DialogTitle className="dark:text-white">Staff Pay Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="staff_email">Staff Being Paid (Payee) *</Label>
            <StaffSearchSelect
              value={formData.staff_email}
              onValueChange={async (email) => {
                try {
                  const teamMembers = await queryClient.fetchQuery({
                    queryKey: ["users"],
                    queryFn: () => base44.entities.User.list(),
                  });
                  const member = teamMembers.find(m => m.email === email);
                  setFormData({ 
                    ...formData, 
                    staff_email: email,
                    staff_name: member?.full_name || email
                  });
                } catch (error) {
                  console.error("Failed to fetch team members", error);
                  setFormData({ 
                    ...formData, 
                    staff_email: email,
                    staff_name: email
                  });
                }
              }}
              placeholder="Select staff member being paid"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="payor_email">Assigned Staff (Payor)</Label>
            <StaffSearchSelect
              value={formData.payor_email}
              onValueChange={async (email) => {
                try {
                  const teamMembers = await queryClient.fetchQuery({
                    queryKey: ["users"],
                    queryFn: () => base44.entities.User.list(),
                  });
                  const member = teamMembers.find(m => m.email === email);
                  setFormData({ 
                    ...formData, 
                    payor_email: email,
                    payor_name: member?.full_name || email
                  });
                } catch (error) {
                  console.error("Failed to fetch team members", error);
                  setFormData({ 
                    ...formData, 
                    payor_email: email,
                    payor_name: email
                  });
                }
              }}
              placeholder="Select staff member making payment"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Input
                id="role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                placeholder="e.g., Coach, Assistant"
                className="dark:bg-slate-800 dark:border-slate-700"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                className="dark:bg-slate-800 dark:border-slate-700"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hours_worked">Hours Worked</Label>
              <Input
                id="hours_worked"
                type="number"
                step="0.5"
                value={formData.hours_worked}
                onChange={(e) => setFormData({ ...formData, hours_worked: parseFloat(e.target.value) })}
                placeholder="0"
                className="dark:bg-slate-800 dark:border-slate-700"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Payment Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start dark:bg-slate-800 dark:border-slate-700">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.date ? format(new Date(formData.date), 'PPP') : 'Select date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.date ? new Date(formData.date) : undefined}
                  onSelect={(date) => setFormData({ ...formData, date: date?.toISOString() })}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={4}
              placeholder="Additional notes..."
              className="dark:bg-slate-800 dark:border-slate-700"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="payment_status">Payment Status</Label>
              <p className="text-xs text-slate-500 dark:text-slate-400">Mark whether this has been paid</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600 dark:text-slate-400">To Be Paid</span>
              <Switch
                id="payment_status"
                checked={formData.payment_status === "paid"}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, payment_status: checked ? "paid" : "to_be_paid" })
                }
              />
              <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Paid</span>
            </div>
          </div>

          <div className="pt-4 border-t dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
            <p>Created: {new Date(staffPay.created_date).toLocaleString()}</p>
            {staffPay.created_by && <p>Created by: {staffPay.created_by}</p>}
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteStaffPayMutation.isPending}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={updateStaffPayMutation.isPending}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}