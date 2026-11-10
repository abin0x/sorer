import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Clock, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function TimeTracker({ programId, currentUser }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    hours: "",
    description: "",
    billable: true
  });
  
  const queryClient = useQueryClient();

  const { data: timeEntries = [] } = useQuery({
    queryKey: ["timeEntries", programId],
    queryFn: () => base44.entities.TimeEntry.filter({ program_id: programId }),
    enabled: !!programId
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.TimeEntry.create({
      program_id: programId,
      user_email: currentUser?.email,
      user_name: currentUser?.full_name || currentUser?.email,
      ...data
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeEntries", programId] });
      toast.success("Time logged");
      setDialogOpen(false);
      setFormData({ date: new Date().toISOString().split('T')[0], hours: "", description: "", billable: true });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TimeEntry.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeEntries", programId] });
      toast.success("Time entry deleted");
    }
  });

  const totalHours = timeEntries.reduce((sum, e) => sum + (e.hours || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Clock className="w-5 h-5 text-emerald-600" />
          Time Tracking ({totalHours.toFixed(1)}h total)
        </h3>
        <Button onClick={() => setDialogOpen(true)} size="sm" className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4 mr-2" />
          Log Time
        </Button>
      </div>

      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {timeEntries.map((entry) => (
          <Card key={entry.id}>
            <CardContent className="p-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline">{entry.hours}h</Badge>
                    <span className="text-sm font-medium">{format(new Date(entry.date), 'MMM d, yyyy')}</span>
                    {entry.billable && (
                      <Badge className="bg-emerald-100 text-emerald-700">Billable</Badge>
                    )}
                  </div>
                  <p className="text-sm text-slate-600">{entry.description}</p>
                  <p className="text-xs text-slate-500 mt-1">{entry.user_name}</p>
                </div>
                {currentUser?.email === entry.user_email && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      if (confirm("Delete this time entry?")) {
                        deleteMutation.mutate(entry.id);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {timeEntries.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No time entries yet</p>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Time</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Date *</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div>
              <Label>Hours *</Label>
              <Input
                type="number"
                step="0.5"
                min="0"
                value={formData.hours}
                onChange={(e) => setFormData({ ...formData, hours: parseFloat(e.target.value) })}
                placeholder="e.g., 2.5"
              />
            </div>
            <div>
              <Label>Description *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What did you work on?"
                rows={3}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.billable}
                onChange={(e) => setFormData({ ...formData, billable: e.target.checked })}
                id="billable"
              />
              <Label htmlFor="billable">Billable</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button
                onClick={() => createMutation.mutate(formData)}
                disabled={!formData.hours || !formData.description}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Log Time
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}