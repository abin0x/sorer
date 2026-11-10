import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Trash2, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { canApproveExpenses } from "@/components/utils/permissions";
import { Switch } from "@/components/ui/switch";
import StaffSearchSelect from "@/components/staff/StaffSearchSelect";
import { formatExpenseApprovalEmail, sendBulkEmails } from "@/components/utils/emailTemplates";

export default function ExpenseDetailDialog({ open, onOpenChange, expense, onUpdate, onSave }) {
  const [formData, setFormData] = useState({
    description: expense?.description || "",
    amount: expense?.amount || 0,
    category: expense?.category || "",
    date: expense?.date || "",
    assigned_to: expense?.assigned_to || "",
    payment_status: expense?.payment_status || "to_be_paid",
  });

  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: programs = [] } = useQuery({
    queryKey: ["programs"],
    queryFn: () => base44.entities.Program.list(),
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  const updateExpenseMutation = useMutation({
    mutationFn: (data) => base44.entities.Expense.update(expense.id, data),
    onSuccess: async (updatedExpense) => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["expenses", expense.program_id] });
      toast.success("Expense updated successfully");
      onUpdate?.();
      onOpenChange(false);

      // Send email if expense was approved or rejected
      if ((updatedExpense.status === 'approved' || updatedExpense.status === 'rejected') && 
          expense.status !== updatedExpense.status) {
        try {
          const program = programs.find(p => p.id === expense.program_id);
          const payee = teamMembers.find(m => m.email === expense.created_by);
          const payor = teamMembers.find(m => m.email === expense.assigned_to);
          const programOwner = teamMembers.find(m => m.email === program?.assignee);
          
          if (currentUser && payee) {
            const emailContent = formatExpenseApprovalEmail(updatedExpense, payee, payor, program, currentUser);
            const recipients = [payee.email];
            
            if (payor && payor.email !== payee.email) recipients.push(payor.email);
            if (programOwner && programOwner.email !== payee.email && programOwner.email !== payor?.email) {
              recipients.push(programOwner.email);
            }
            
            await sendBulkEmails({
              recipients,
              subject: emailContent.subject,
              body: emailContent.body,
              from_name: "Jaguars Kanban"
            });
          }
        } catch (error) {
          console.error("Failed to send approval email", error);
        }
      }
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: () => base44.entities.Expense.delete(expense.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["expenses", expense.program_id] });
      toast.success("Expense deleted successfully");
      onUpdate?.();
      onOpenChange(false);
    },
  });

  React.useEffect(() => {
    if (expense) {
      setFormData({
        description: expense.description || "",
        amount: expense.amount || 0,
        category: expense.category || "",
        date: expense.date || "",
        assigned_to: expense.assigned_to || "",
        payment_status: expense.payment_status || "to_be_paid",
      });
    }
  }, [expense]);

  const handleSave = () => {
    if (expense?.id) {
      updateExpenseMutation.mutate(formData);
    } else if (onSave) {
      onSave(formData);
      onOpenChange(false);
    }
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this expense?")) {
      deleteExpenseMutation.mutate();
    }
  };

  const handleApprove = () => {
    updateExpenseMutation.mutate({
      ...formData,
      status: "approved",
      approved_by: currentUser?.email,
      approval_date: new Date().toISOString(),
    });
  };

  const handleReject = () => {
    updateExpenseMutation.mutate({
      ...formData,
      status: "rejected",
      approved_by: currentUser?.email,
      approval_date: new Date().toISOString(),
    });
  };

  if (!expense) return null;

  const canApprove = currentUser && canApproveExpenses(currentUser) && expense.status === "pending";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] dark:bg-slate-900">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between dark:text-white">
            <span>Expense Details</span>
            <Badge className={
              expense.status === 'approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' :
              expense.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
              'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
            }>
              {expense.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="dark:bg-slate-800 dark:border-slate-700"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
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
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g., Equipment, Travel"
                className="dark:bg-slate-800 dark:border-slate-700"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Date</Label>
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
            <Label htmlFor="assigned_to">Assigned To</Label>
            <StaffSearchSelect
              value={formData.assigned_to}
              onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}
              placeholder="Select staff member"
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

          {expense.status !== "pending" && (
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <h4 className="font-semibold text-sm mb-2 dark:text-white">Approval Details</h4>
              <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                <p>Status: <span className="font-semibold">{expense.status}</span></p>
                {expense.approved_by && <p>Approved by: {expense.approved_by}</p>}
                {expense.approval_date && <p>Date: {new Date(expense.approval_date).toLocaleString()}</p>}
                {expense.approval_notes && <p>Notes: {expense.approval_notes}</p>}
              </div>
            </div>
          )}

          <div className="pt-4 border-t dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
            <p>Created: {new Date(expense.created_date).toLocaleString()}</p>
            {expense.created_by && <p>Created by: {expense.created_by}</p>}
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteExpenseMutation.isPending}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
          {canApprove && (
            <>
              <Button
                onClick={handleReject}
                variant="outline"
                className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                disabled={updateExpenseMutation.isPending}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject
              </Button>
              <Button
                onClick={handleApprove}
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={updateExpenseMutation.isPending}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve
              </Button>
            </>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={updateExpenseMutation.isPending}
            className="bg-orange-600 hover:bg-orange-700"
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}