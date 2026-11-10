import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, DollarSign, CheckCircle2, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function ExpenseList({ programId }) {
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    date: "",
    category: "",
  });
  const [approvalNotes, setApprovalNotes] = useState("");
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["expenses", programId],
    queryFn: () => base44.entities.Expense.filter({ program_id: programId }),
  });

  const createExpenseMutation = useMutation({
    mutationFn: (expenseData) => base44.entities.Expense.create(expenseData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Expense added successfully");
      setFormData({ description: "", amount: "", date: "", category: "" });
      setIsAdding(false);
    },
  });

  const updateExpenseMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Expense.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Expense updated");
      setApprovalNotes("");
    },
  });

  const canApprove = currentUser?.role === "admin" || currentUser?.role === "director" || currentUser?.role === "branch_director";

  const handleSubmit = (e) => {
    e.preventDefault();
    createExpenseMutation.mutate({
      ...formData,
      amount: parseFloat(formData.amount),
      program_id: programId,
      status: "pending",
    });
  };

  const handleApprove = (expense) => {
    updateExpenseMutation.mutate({
      id: expense.id,
      data: {
        ...expense,
        status: "approved",
        approved_by: currentUser?.email,
        approval_date: new Date().toISOString().split('T')[0],
        approval_notes: approvalNotes
      }
    });
  };

  const handleReject = (expense) => {
    if (!approvalNotes.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    updateExpenseMutation.mutate({
      id: expense.id,
      data: {
        ...expense,
        status: "rejected",
        approved_by: currentUser?.email,
        approval_date: new Date().toISOString().split('T')[0],
        approval_notes: approvalNotes
      }
    });
  };

  const getStatusBadge = (status) => {
    const config = {
      pending: { label: "Pending", color: "bg-amber-100 text-amber-700", icon: Clock },
      approved: { label: "Approved", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
      rejected: { label: "Rejected", color: "bg-red-100 text-red-700", icon: XCircle }
    };
    const { label, color, icon: Icon } = config[status] || config.pending;
    return (
      <Badge className={color}>
        <Icon className="w-3 h-3 mr-1" />
        {label}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {!isAdding && (
        <Button onClick={() => setIsAdding(true)} className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Add Expense
        </Button>
      )}

      {isAdding && (
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Description *</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter expense description..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Input
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g., Equipment, Venue, Marketing..."
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={createExpenseMutation.isPending}>
                  Add Expense
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAdding(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800 mx-auto" />
        </div>
      ) : expenses.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No expenses yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {expenses.map((expense) => (
            <Card key={expense.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-slate-900">{expense.description}</h4>
                      {getStatusBadge(expense.status)}
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                      <span className="font-semibold text-lg text-slate-900">
                        ${expense.amount?.toLocaleString()}
                      </span>
                      {expense.category && <span>• {expense.category}</span>}
                      {expense.date && <span>• {format(new Date(expense.date), "MMM d, yyyy")}</span>}
                    </div>
                  </div>
                </div>

                {expense.status === "pending" && canApprove && (
                  <div className="space-y-2 mt-3 pt-3 border-t">
                    <Textarea
                      placeholder="Add approval notes..."
                      value={approvalNotes}
                      onChange={(e) => setApprovalNotes(e.target.value)}
                      rows={2}
                      className="text-sm"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(expense)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReject(expense)}
                        className="border-red-300 text-red-600 hover:bg-red-50"
                      >
                        <XCircle className="w-3 h-3 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                )}

                {expense.approval_notes && (
                  <div className="text-xs text-slate-600 mt-3 pt-3 border-t">
                    <p className="font-semibold">
                      {expense.status === "approved" ? "Approved" : "Rejected"} by {expense.approved_by}
                    </p>
                    <p className="mt-1">{expense.approval_notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}