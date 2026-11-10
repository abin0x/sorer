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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import StaffSearchSelect from "@/components/staff/StaffSearchSelect";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function BulkStaffPayDialog({ open, onOpenChange, programId, onSuccess }) {
  const [entries, setEntries] = useState([{
    staff_email: "",
    staff_name: "",
    payor_email: "",
    payor_name: "",
    role: "",
    amount: 0,
    hours_worked: 0,
    date: new Date().toISOString(),
    notes: "",
  }]);

  const queryClient = useQueryClient();

  const { data: teamMembers = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  const createStaffPayMutation = useMutation({
    mutationFn: (data) => base44.entities.StaffPay.bulkCreate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staffpay"] });
      queryClient.invalidateQueries({ queryKey: ["staffpay", programId] });
      toast.success("Staff pay entries created successfully");
      onSuccess?.();
      onOpenChange(false);
      // Reset form
      setEntries([{
        staff_email: "",
        staff_name: "",
        payor_email: "",
        payor_name: "",
        role: "",
        amount: 0,
        hours_worked: 0,
        date: new Date().toISOString(),
        notes: "",
      }]);
    },
  });

  const addEntry = () => {
    setEntries([...entries, {
      staff_email: "",
      staff_name: "",
      payor_email: "",
      payor_name: "",
      role: "",
      amount: 0,
      hours_worked: 0,
      date: new Date().toISOString(),
      notes: "",
    }]);
  };

  const removeEntry = (index) => {
    if (entries.length === 1) {
      toast.error("You must have at least one entry");
      return;
    }
    setEntries(entries.filter((_, i) => i !== index));
  };

  const updateEntry = (index, field, value) => {
    const newEntries = [...entries];
    newEntries[index] = { ...newEntries[index], [field]: value };
    setEntries(newEntries);
  };

  const handleSave = () => {
    // Validate entries
    const validEntries = entries.filter(e => e.staff_email && e.amount > 0);
    if (validEntries.length === 0) {
      toast.error("Please add at least one valid entry with staff member and amount");
      return;
    }

    // Add program_id to all entries
    const entriesToSave = validEntries.map(e => ({
      ...e,
      program_id: programId,
      amount: parseFloat(e.amount) || 0,
      hours_worked: parseFloat(e.hours_worked) || 0,
    }));

    createStaffPayMutation.mutate(entriesToSave);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Add Staff Pay (Bulk)</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-200px)]">
          <div className="space-y-6 pr-4">
            {entries.map((entry, index) => (
              <div key={index} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-slate-900 dark:text-white">Entry #{index + 1}</h4>
                  {entries.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeEntry(index)}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label>Staff Being Paid (Payee) *</Label>
                    <StaffSearchSelect
                      value={entry.staff_email}
                      onValueChange={(email) => {
                        const member = teamMembers.find(m => m.email === email);
                        updateEntry(index, 'staff_email', email);
                        updateEntry(index, 'staff_name', member?.full_name || email);
                      }}
                      placeholder="Select staff member"
                    />
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label>Assigned Staff (Payor)</Label>
                    <StaffSearchSelect
                      value={entry.payor_email}
                      onValueChange={(email) => {
                        const member = teamMembers.find(m => m.email === email);
                        updateEntry(index, 'payor_email', email);
                        updateEntry(index, 'payor_name', member?.full_name || email);
                      }}
                      placeholder="Select payor"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Input
                      value={entry.role}
                      onChange={(e) => updateEntry(index, 'role', e.target.value)}
                      placeholder="e.g., Coach, Assistant"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Amount *</Label>
                    <Input
                      type="number"
                      value={entry.amount}
                      onChange={(e) => updateEntry(index, 'amount', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Hours Worked</Label>
                    <Input
                      type="number"
                      value={entry.hours_worked}
                      onChange={(e) => updateEntry(index, 'hours_worked', e.target.value)}
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Payment Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {entry.date ? format(new Date(entry.date), 'PPP') : 'Select date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={entry.date ? new Date(entry.date) : undefined}
                          onSelect={(date) => updateEntry(index, 'date', date?.toISOString())}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label>Notes</Label>
                    <Input
                      value={entry.notes}
                      onChange={(e) => updateEntry(index, 'notes', e.target.value)}
                      placeholder="Additional notes..."
                    />
                  </div>
                </div>
              </div>
            ))}

            <Button
              variant="outline"
              onClick={addEntry}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Another Entry
            </Button>
          </div>
        </ScrollArea>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={createStaffPayMutation.isPending}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {createStaffPayMutation.isPending ? "Saving..." : `Save ${entries.filter(e => e.staff_email && e.amount > 0).length} Entries`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}