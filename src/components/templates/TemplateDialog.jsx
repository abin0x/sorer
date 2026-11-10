import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import MultiBranchSelect from "../shared/MultiBranchSelect";
import { toast } from "sonner";

const SEASONS = ["Summer", "Fall", "Winter 1", "Winter 2", "Spring"];
const GENDER_OPTIONS = ["Boys", "Girls", "Boys and Girls"];

export default function TemplateDialog({ open, onOpenChange, template }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    default_season: "",
    default_branches: [],
    default_gender_eligibility: "",
    default_priority: "medium",
    default_category: "",
    default_duration_days: 90,
    predefined_tasks: [],
    is_active: true
  });

  useEffect(() => {
    if (template) {
      setFormData(template);
    } else {
      setFormData({
        name: "",
        description: "",
        default_season: "",
        default_branches: [],
        default_gender_eligibility: "",
        default_priority: "medium",
        default_category: "",
        default_duration_days: 90,
        predefined_tasks: [],
        is_active: true
      });
    }
  }, [template, open]);

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (template) {
        return base44.entities.ProgramTemplate.update(template.id, data);
      }
      return base44.entities.ProgramTemplate.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success(template ? "Template updated" : "Template created");
      onOpenChange(false);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error("Template name is required");
      return;
    }
    saveMutation.mutate(formData);
  };

  const addTask = () => {
    setFormData({
      ...formData,
      predefined_tasks: [
        ...(formData.predefined_tasks || []),
        { title: "", description: "", category: "", days_offset: 0 }
      ]
    });
  };

  const updateTask = (index, field, value) => {
    const tasks = [...(formData.predefined_tasks || [])];
    tasks[index] = { ...tasks[index], [field]: value };
    setFormData({ ...formData, predefined_tasks: tasks });
  };

  const removeTask = (index) => {
    const tasks = [...(formData.predefined_tasks || [])];
    tasks.splice(index, 1);
    setFormData({ ...formData, predefined_tasks: tasks });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template ? "Edit Template" : "Create Template"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label>Template Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Summer Camp Program"
                required
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe this template..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Default Season</Label>
                <Select
                  value={formData.default_season}
                  onValueChange={(value) => setFormData({ ...formData, default_season: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select season" />
                  </SelectTrigger>
                  <SelectContent>
                    {SEASONS.map((season) => (
                      <SelectItem key={season} value={season}>{season}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Default Priority</Label>
                <Select
                  value={formData.default_priority}
                  onValueChange={(value) => setFormData({ ...formData, default_priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Default Branches</Label>
              <MultiBranchSelect
                value={formData.default_branches || []}
                onValueChange={(value) => setFormData({ ...formData, default_branches: value })}
                placeholder="Select branches"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Gender Eligibility</Label>
                <Select
                  value={formData.default_gender_eligibility}
                  onValueChange={(value) => setFormData({ ...formData, default_gender_eligibility: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENDER_OPTIONS.map((gender) => (
                      <SelectItem key={gender} value={gender}>{gender}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Default Duration (days)</Label>
                <Input
                  type="number"
                  value={formData.default_duration_days}
                  onChange={(e) => setFormData({ ...formData, default_duration_days: parseInt(e.target.value) })}
                  min="1"
                />
              </div>
            </div>

            <div>
              <Label>Default Category</Label>
              <Input
                value={formData.default_category}
                onChange={(e) => setFormData({ ...formData, default_category: e.target.value })}
                placeholder="e.g., Camp, Tournament"
              />
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <Label>Pre-defined Tasks</Label>
              <Button type="button" size="sm" variant="outline" onClick={addTask}>
                <Plus className="w-4 h-4 mr-2" />
                Add Task
              </Button>
            </div>

            {formData.predefined_tasks?.map((task, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-3">
                    <Input
                      placeholder="Task title"
                      value={task.title}
                      onChange={(e) => updateTask(index, 'title', e.target.value)}
                    />
                    <Input
                      placeholder="Description"
                      value={task.description}
                      onChange={(e) => updateTask(index, 'description', e.target.value)}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Category"
                        value={task.category}
                        onChange={(e) => updateTask(index, 'category', e.target.value)}
                      />
                      <Input
                        type="number"
                        placeholder="Days from start"
                        value={task.days_offset}
                        onChange={(e) => updateTask(index, 'days_offset', parseInt(e.target.value))}
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => removeTask(index)}
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-gradient-to-r from-blue-600 to-purple-600">
              {template ? "Update" : "Create"} Template
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}