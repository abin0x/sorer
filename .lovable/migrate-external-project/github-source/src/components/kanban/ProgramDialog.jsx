import React, { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import CategorySelect from "../shared/CategorySelect";
import StaffMultiSelect from "../shared/StaffMultiSelect";
import RadioBranchSelect from "../shared/RadioBranchSelect";
import ValidationErrorDialog from "../dialogs/ValidationErrorDialog";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { addDays } from "date-fns";
import { toast } from "sonner";

const SEASONS = ["Summer", "Fall", "Winter 1", "Winter 2", "Spring"];
const BRANCHES = [
  "Dearborn", "Downriver", "Genesee", "Girls Academy", "Huron Valley",
  "Jackson", "Lansing", "Marshall", "MLS Next", "Northville", "Novi/CW3",
  "Pre GA", "Pre MLS Next", "United", "West Bloomfield"
];
const GENDER_OPTIONS = ["Boys", "Girls", "Boys and Girls"];

export default function ProgramDialog({ 
  open, 
  onOpenChange, 
  program, 
  onSave, 
  onDelete,
  teamMembers = [],
  initialStatus = "todo",
  currentUser,
  initialData = null,
  dialogTitle = null,
  hideTemplate = false,
  saveLabel = null,
}) {
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [validationErrors, setValidationErrors] = useState([]);
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  
  const { data: templates = [] } = useQuery({
    queryKey: ["templates"],
    queryFn: () => base44.entities.ProgramTemplate.list(),
    enabled: open && !program
  });

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "", // Added category
    season: "",
    branches: [],
    program_dates: "",
    program_time: "",
    field_location: "",
    field_number: "",
    age_eligibility: "",
    gender_eligibility: "",
    suggested_start_date: "",
    due_date: "",
    completed_date: "",
    status: initialStatus,
    priority: "medium",
    assignee: "",
    accountable: [],
    responsible: [],
    consulted: [],
    informed: [],
    budget: "",
  });

  const canSeeBudget = ['master_admin', 'admin', 'club_director', 'club_admin', 'bookkeeper'].includes(currentUser?.custom_role || currentUser?.role);

  const applyTemplate = (templateId) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    const startDate = formData.suggested_start_date || new Date().toISOString().split('T')[0];
    const dueDate = template.default_duration_days 
      ? addDays(new Date(startDate), template.default_duration_days).toISOString().split('T')[0]
      : formData.due_date;

    setFormData({
      ...formData,
      season: template.default_season || formData.season,
      branches: template.default_branches || formData.branches,
      gender_eligibility: template.default_gender_eligibility || formData.gender_eligibility,
      priority: template.default_priority || formData.priority,
      category: template.default_category || formData.category,
      due_date: dueDate,
    });
  };

  useEffect(() => {
    if (program) {
      setFormData({
        title: program.title || "",
        description: program.description || "",
        category: program.category || "", // Added category
        season: program.season || "",
        branches: program.branches || [],
        program_dates: program.program_dates || "",
        program_time: program.program_time || "",
        field_location: program.field_location || "",
        field_number: program.field_number || "",
        age_eligibility: program.age_eligibility || "",
        gender_eligibility: program.gender_eligibility || "",
        suggested_start_date: program.suggested_start_date || "",
        due_date: program.due_date || "",
        completed_date: program.completed_date || "",
        status: program.status || "todo",
        priority: program.priority || "medium",
        assignee: program.assignee || "",
        accountable: program.accountable || [],
        responsible: program.responsible || [],
        consulted: program.consulted || [],
        informed: program.informed || [],
        budget: program.budget || "",
      });
    } else {
      setFormData({
        title: "",
        description: "",
        category: "", // Added category
        season: "",
        branches: [],
        program_dates: "",
        program_time: "",
        field_location: "",
        field_number: "",
        age_eligibility: "",
        gender_eligibility: "",
        suggested_start_date: "",
        due_date: "",
        completed_date: "",
        status: initialStatus,
        priority: "medium",
        assignee: "",
        accountable: [],
        responsible: [],
        consulted: [],
        informed: [],
        budget: "",
        ...initialData,
      });
    }
  }, [program, open, initialStatus, initialData]);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    
    // Validate required fields
    const errors = [];
    if (!formData.title) errors.push("Program Name");
    if (!formData.suggested_start_date) errors.push("Suggested Start Date");
    if (!formData.due_date) errors.push("Due Date");
    if (!formData.branches?.length) errors.push("At least one Branch");
    if (!formData.accountable?.length) errors.push("Accountable staff (RACI A)");
    if (!formData.responsible?.length) errors.push("Responsible staff (RACI R)");
    
    if (errors.length > 0) {
      setValidationErrors(errors);
      setShowValidationDialog(true);
      return;
    }
    
    const dataToSave = { ...formData };
    // Clean empty optional fields — the backend rejects empty strings for number/date/enum fields
    // (this was causing program creation to silently fail with a 422 validation error).
    if (dataToSave.budget === "" || dataToSave.budget == null) {
      delete dataToSave.budget;
    } else {
      dataToSave.budget = parseFloat(dataToSave.budget);
    }
    if (!dataToSave.completed_date) delete dataToSave.completed_date;
    if (!dataToSave.gender_eligibility) delete dataToSave.gender_eligibility;
    // Program Lead is derived from the first Accountable (RACI A) staff — removes the redundant separate lead field.
    dataToSave.assignee = Array.isArray(dataToSave.accountable) && dataToSave.accountable[0] ? dataToSave.accountable[0] : "";
    onSave(dataToSave);
  };

  const handleDeleteClick = () => { // Renamed to avoid conflict with prop
    if (program && confirm("Are you sure you want to delete this program?")) {
      onDelete(program.id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
        <DialogHeader className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white p-6 -m-6 mb-0 rounded-t-lg">
          <DialogTitle className="text-xl font-bold">
            {dialogTitle || (program ? "Edit Program" : "Create New Program")}
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[calc(90vh-180px)] pr-4 overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Template Selection */}
            {!program && !hideTemplate && templates.length > 0 && (
              <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <Label>Start from Template (optional)</Label>
                <Select value={selectedTemplate} onValueChange={(val) => { setSelectedTemplate(val); applyTemplate(val); }}>
                  <SelectTrigger className="mt-2 bg-white dark:bg-slate-800">
                    <SelectValue placeholder="Select a template..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>No template</SelectItem>
                    {templates.filter(t => t.is_active).map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Basic Info Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Basic Information</h3>
              
              <div className="space-y-2">
                <Label htmlFor="title">Program Name *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter program name..."
                  required
                  className="border-slate-300 dark:border-slate-600"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Program Description for Website</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter program description or type 'use previous description' if returning program..."
                  rows={3}
                  className="border-slate-300 dark:border-slate-600 resize-none"
                />
              </div>

              {/* Category Select */}
              <div className="space-y-2">
                <Label>Category</Label>
                <CategorySelect
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                  placeholder="Select category"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="season">Season</Label>
                <Select
                  value={formData.season}
                  onValueChange={(value) => setFormData({ ...formData, season: value })}
                >
                  <SelectTrigger className="border-slate-300 dark:border-slate-600">
                    <SelectValue placeholder="Select season" />
                  </SelectTrigger>
                  <SelectContent>
                    {SEASONS.map((season) => (
                      <SelectItem key={season} value={season}>{season}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="branches">Branches *</Label>
                <RadioBranchSelect
                  value={formData.branches}
                  onValueChange={(value) => setFormData({ ...formData, branches: value })}
                  required
                />
              </div>
            </div>

            {/* Schedule Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Schedule & Location</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="suggested_start_date">Suggested Start Date *</Label>
                  <Input
                    id="suggested_start_date"
                    type="date"
                    value={formData.suggested_start_date}
                    onChange={(e) => setFormData({ ...formData, suggested_start_date: e.target.value })}
                    className="border-slate-300 dark:border-slate-600"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="due_date">Due Date *</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="border-slate-300 dark:border-slate-600"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="program_dates">Program Dates</Label>
                  <Input
                    id="program_dates"
                    value={formData.program_dates}
                    onChange={(e) => setFormData({ ...formData, program_dates: e.target.value })}
                    placeholder="e.g., June 1 - June 30"
                    className="border-slate-300 dark:border-slate-600"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="program_time">Program Time</Label>
                  <Input
                    id="program_time"
                    value={formData.program_time}
                    onChange={(e) => setFormData({ ...formData, program_time: e.target.value })}
                    placeholder="e.g., 6:00 PM - 8:00 PM"
                    className="border-slate-300 dark:border-slate-600"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="field_location">Field Location Name and Address</Label>
                <Input
                  id="field_location"
                  value={formData.field_location}
                  onChange={(e) => setFormData({ ...formData, field_location: e.target.value })}
                  placeholder="e.g., Toca Wixom, ITC"
                  className="border-slate-300 dark:border-slate-600"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="field_number">Field Number</Label>
                <Input
                  id="field_number"
                  value={formData.field_number}
                  onChange={(e) => setFormData({ ...formData, field_number: e.target.value })}
                  placeholder="e.g., Wembley, Field A"
                  className="border-slate-300 dark:border-slate-600"
                />
              </div>
            </div>

            {/* Eligibility Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Eligibility</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="age_eligibility">Age Eligibility</Label>
                  <Input
                    id="age_eligibility"
                    value={formData.age_eligibility}
                    onChange={(e) => setFormData({ ...formData, age_eligibility: e.target.value })}
                    placeholder="By birth year for 25/26 season"
                    className="border-slate-300 dark:border-slate-600"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender_eligibility">Gender Eligibility</Label>
                  <Select
                    value={formData.gender_eligibility}
                    onValueChange={(value) => setFormData({ ...formData, gender_eligibility: value })}
                  >
                    <SelectTrigger className="border-slate-300 dark:border-slate-600">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      {GENDER_OPTIONS.map((gender) => (
                        <SelectItem key={gender} value={gender}>{gender}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Management Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Management</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger className="border-slate-300 dark:border-slate-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="in_review">In Review</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => setFormData({ ...formData, priority: value })}
                  >
                    <SelectTrigger className="border-slate-300 dark:border-slate-600">
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

              <div className="text-xs text-muted-foreground -mt-1">
                Program Lead is automatically set from the Accountable (RACI A) staff below.
              </div>

              {/* RACI Assignments — 4 levels of access/responsibility */}
              <div className="space-y-3 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40">
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">RACI Assignments</p>
                  <p className="text-xs text-muted-foreground">Four levels of access & responsibility for this program.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-violet-700 dark:text-violet-300">A — Accountable (owns the outcome) *</Label>
                    <StaffMultiSelect value={formData.accountable} onValueChange={(v) => setFormData({ ...formData, accountable: v })} placeholder="Accountable staff…" tone="violet" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-sky-700 dark:text-sky-300">R — Responsible (does the work) *</Label>
                    <StaffMultiSelect value={formData.responsible} onValueChange={(v) => setFormData({ ...formData, responsible: v })} placeholder="Responsible staff…" tone="sky" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-amber-700 dark:text-amber-300">C — Consulted (provides input)</Label>
                    <StaffMultiSelect value={formData.consulted} onValueChange={(v) => setFormData({ ...formData, consulted: v })} placeholder="Consulted staff…" tone="amber" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300">I — Informed (kept up to date)</Label>
                    <StaffMultiSelect value={formData.informed} onValueChange={(v) => setFormData({ ...formData, informed: v })} placeholder="Informed staff…" tone="slate" />
                  </div>
                </div>
              </div>

              {canSeeBudget && (
                <div className="space-y-2">
                  <Label htmlFor="budget">Budget ($)</Label>
                  <Input
                    id="budget"
                    type="number"
                    step="0.01"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    placeholder="0.00"
                    className="border-slate-300 dark:border-slate-600"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="completed_date">Completed Date</Label>
                <Input
                  id="completed_date"
                  type="date"
                  value={formData.completed_date}
                  onChange={(e) => setFormData({ ...formData, completed_date: e.target.value })}
                  className="border-slate-300 dark:border-slate-600"
                />
              </div>
            </div>
          </form>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t dark:border-slate-700">
          {program && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteClick}
              className="mr-auto hover:scale-105 transition-transform shadow-lg"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          )}
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="hover:scale-105 transition-transform">
            Cancel
          </Button>
          <Button 
            type="button" 
            className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 shadow-lg hover:scale-105 transition-all"
            onClick={handleSubmit}
          >
            {saveLabel || (program ? "Save Changes" : "Create Program")}
          </Button>
        </DialogFooter>
      </DialogContent>

      <ValidationErrorDialog
        open={showValidationDialog}
        onOpenChange={setShowValidationDialog}
        errors={validationErrors}
      />
    </Dialog>
  );
}