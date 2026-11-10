import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Check, X, Calendar, LayoutDashboard, ListTodo } from "lucide-react";
import { toast } from "sonner";

export default function EditableTable({ programs, tasks, type = "programs" }) {
  const queryClient = useQueryClient();
  const [editingItem, setEditingItem] = useState(null);
  const [editValues, setEditValues] = useState({});

  const { data: teamMembers = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list()
  });

  const updateProgramMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Program.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      toast.success("Program updated successfully");
      setEditingItem(null);
      setEditValues({});
    },
    onError: (error) => {
      console.error("Failed to update program:", error);
      toast.error("Failed to update program");
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task updated successfully");
      setEditingItem(null);
      setEditValues({});
    },
    onError: (error) => {
      console.error("Failed to update task:", error);
      toast.error("Failed to update task");
    }
  });

  const deleteProgramMutation = useMutation({
    mutationFn: (id) => base44.entities.Program.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      toast.success("Program deleted successfully");
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id) => base44.entities.Task.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task deleted successfully");
    },
  });

  const startEditing = (item, field) => {
    setEditingItem({ id: item.id, field });
    setEditValues({ [field]: item[field] });
  };

  const cancelEditing = () => {
    setEditingItem(null);
    setEditValues({});
  };

  const saveChanges = (item) => {
    if (type === "programs") {
      updateProgramMutation.mutate({
        id: item.id,
        data: { ...item, ...editValues }
      });
    } else {
      updateTaskMutation.mutate({
        id: item.id,
        data: { ...item, ...editValues }
      });
    }
  };

  const handleDelete = (id) => {
    if (confirm(`Are you sure you want to delete this ${type === "programs" ? "program" : "task"}?`)) {
      if (type === "programs") {
        deleteProgramMutation.mutate(id);
      } else {
        deleteTaskMutation.mutate(id);
      }
    }
  };

  const statusConfig = {
    todo: { label: "To Do", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
    in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
    in_review: { label: "In Review", color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" },
    done: { label: "Done", color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" }
  };

  const priorityConfig = {
    low: { label: "Low", color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
    medium: { label: "Medium", color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" },
    high: { label: "High", color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" }
  };

  const branches = [
    "Dearborn", "Downriver", "Genesee", "Girls Academy", "Huron Valley", 
    "Jackson", "Lansing", "Marshall", "MLS Next", "Northville", 
    "Novi/CW3", "Pre GA", "Pre MLS Next", "United", "West Bloomfield"
  ];

  const seasons = ["Summer", "Fall", "Winter 1", "Winter 2", "Spring"];

  const items = type === "programs" ? programs : tasks;

  const renderEditableCell = (item, field, value) => {
    const isEditing = editingItem?.id === item.id && editingItem?.field === field;

    if (isEditing) {
      let selectOptions = [];
      let placeholder = "";

      switch (field) {
        case "status":
          selectOptions = [
            { value: "todo", label: "To Do" },
            { value: "in_progress", label: "In Progress" },
            { value: "in_review", label: "In Review" },
            { value: "done", label: "Done" }
          ];
          placeholder = "Select status";
          break;
        case "priority":
          selectOptions = [
            { value: "low", label: "Low" },
            { value: "medium", label: "Medium" },
            { value: "high", label: "High" }
          ];
          placeholder = "Select priority";
          break;
        case "branch":
          selectOptions = branches.map(b => ({ value: b, label: b }));
          placeholder = "Select branch";
          break;
        case "season":
          selectOptions = seasons.map(s => ({ value: s, label: s }));
          placeholder = "Select season";
          break;
        case "assignee":
          selectOptions = teamMembers.map(m => ({ 
            value: m.email, 
            label: m.full_name || m.email 
          }));
          placeholder = "Select assignee";
          break;
      }

      return (
        <div className="flex items-center gap-2">
          <Select
            value={editValues[field] || value}
            onValueChange={(newValue) => setEditValues({ ...editValues, [field]: newValue })}
          >
            <SelectTrigger className="w-full dark:bg-slate-800 dark:border-slate-700">
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {selectOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
            onClick={() => saveChanges(item)}
          >
            <Check className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
            onClick={cancelEditing}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      );
    }

    let displayValue = value || "-";
    let badgeColor = "";

    switch (field) {
      case "status":
        displayValue = statusConfig[value]?.label || value;
        badgeColor = statusConfig[value]?.color;
        break;
      case "priority":
        displayValue = priorityConfig[value]?.label || value;
        badgeColor = priorityConfig[value]?.color;
        break;
      case "assignee":
        const member = teamMembers.find(m => m.email === value);
        displayValue = member?.full_name || value || "-";
        break;
    }

    return (
      <div 
        className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded transition-colors"
        onClick={() => startEditing(item, field)}
      >
        {badgeColor ? (
          <Badge className={badgeColor}>{displayValue}</Badge>
        ) : (
          <span className="text-sm text-slate-900 dark:text-white">{displayValue}</span>
        )}
      </div>
    );
  };

  if (items.length === 0) {
    return (
      <Card className="dark:bg-slate-900 dark:border-slate-800">
        <CardContent className="text-center py-12">
          {type === "programs" ? (
            <LayoutDashboard className="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-slate-700" />
          ) : (
            <ListTodo className="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-slate-700" />
          )}
          <p className="text-slate-500 dark:text-slate-400">No {type} found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="dark:bg-slate-900 dark:border-slate-800 shadow-lg">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="text-left p-4 text-sm font-semibold text-slate-900 dark:text-white">Title</th>
                <th className="text-left p-4 text-sm font-semibold text-slate-900 dark:text-white">Status</th>
                <th className="text-left p-4 text-sm font-semibold text-slate-900 dark:text-white">Priority</th>
                {type === "programs" && (
                  <>
                    <th className="text-left p-4 text-sm font-semibold text-slate-900 dark:text-white">Branch</th>
                    <th className="text-left p-4 text-sm font-semibold text-slate-900 dark:text-white">Season</th>
                  </>
                )}
                <th className="text-left p-4 text-sm font-semibold text-slate-900 dark:text-white">Assignee</th>
                <th className="text-left p-4 text-sm font-semibold text-slate-900 dark:text-white">Due Date</th>
                <th className="text-left p-4 text-sm font-semibold text-slate-900 dark:text-white">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <td className="p-4">
                    <div>
                      <div className="font-medium text-slate-900 dark:text-white">{item.title}</div>
                      {item.description && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-1">
                          {item.description}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    {renderEditableCell(item, "status", item.status)}
                  </td>
                  <td className="p-4">
                    {renderEditableCell(item, "priority", item.priority)}
                  </td>
                  {type === "programs" && (
                    <>
                      <td className="p-4">
                        {renderEditableCell(item, "branch", item.branch)}
                      </td>
                      <td className="p-4">
                        {renderEditableCell(item, "season", item.season)}
                      </td>
                    </>
                  )}
                  <td className="p-4">
                    {renderEditableCell(item, "assignee", item.assignee)}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
                      <Calendar className="w-3 h-3" />
                      {item.due_date ? new Date(item.due_date).toLocaleDateString() : "-"}
                    </div>
                  </td>
                  <td className="p-4">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                      onClick={() => handleDelete(item.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}