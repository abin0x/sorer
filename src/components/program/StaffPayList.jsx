import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, UserPlus } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function StaffPayList({ programId }) {
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    staff_name: "",
    role: "",
    amount: "",
    date: "",
    notes: "",
  });
  const queryClient = useQueryClient();

  const { data: staffPay = [], isLoading } = useQuery({
    queryKey: ["staffpay", programId],
    queryFn: () => base44.entities.StaffPay.filter({ program_id: programId }),
  });

  const createStaffPayMutation = useMutation({
    mutationFn: (data) => base44.entities.StaffPay.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staffpay"] });
      toast.success("Staff pay added successfully");
      setFormData({ staff_name: "", role: "", amount: "", date: "", notes: "" });
      setIsAdding(false);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createStaffPayMutation.mutate({
      ...formData,
      amount: parseFloat(formData.amount),
      program_id: programId,
    });
  };

  return (
    <div className="space-y-4">
      {!isAdding && (
        <Button onClick={() => setIsAdding(true)} className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Add Staff Pay
        </Button>
      )}

      {isAdding && (
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Staff Name *</Label>
                <Input
                  value={formData.staff_name}
                  onChange={(e) => setFormData({ ...formData, staff_name: e.target.value })}
                  placeholder="Enter staff member name..."
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Role</Label>
                <Input
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  placeholder="e.g., Coach, Assistant, Director..."
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
                  <Label>Payment Date</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={createStaffPayMutation.isPending}>
                  Add Staff Pay
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
      ) : staffPay.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          <UserPlus className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No staff pay records yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {staffPay.map((pay) => (
            <Card key={pay.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-900">{pay.staff_name}</h4>
                    {pay.role && (
                      <p className="text-sm text-slate-600 mt-1">{pay.role}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="font-semibold text-lg text-slate-900">
                        ${pay.amount?.toLocaleString()}
                      </span>
                      {pay.date && (
                        <span className="text-sm text-slate-600">
                          • {format(new Date(pay.date), "MMM d, yyyy")}
                        </span>
                      )}
                    </div>
                    {pay.notes && (
                      <p className="text-sm text-slate-600 mt-2">{pay.notes}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}