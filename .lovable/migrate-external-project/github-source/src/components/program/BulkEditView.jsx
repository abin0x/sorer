import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, X } from "lucide-react";
import { toast } from "sonner";

export default function BulkEditView({ programs }) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkEdits, setBulkEdits] = useState({});
  const queryClient = useQueryClient();

  const { data: teamMembers = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  const updateProgramsMutation = useMutation({
    mutationFn: async (updates) => {
      const promises = updates.map(({ id, data }) => 
        base44.entities.Program.update(id, data)
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      toast.success(`${selectedIds.length} programs updated successfully`);
      setSelectedIds([]);
      setBulkEdits({});
    },
  });

  const toggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === programs.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(programs.map(p => p.id));
    }
  };

  const handleBulkUpdate = () => {
    if (selectedIds.length === 0) {
      toast.error("No programs selected");
      return;
    }

    if (Object.keys(bulkEdits).length === 0) {
      toast.error("No changes to apply");
      return;
    }

    const updates = selectedIds.map(id => ({
      id,
      data: bulkEdits
    }));

    updateProgramsMutation.mutate(updates);
  };

  const BRANCHES = [
    "Dearborn", "Downriver", "Genesee", "Girls Academy", "Huron Valley",
    "Jackson", "Lansing", "Marshall", "MLS Next", "Northville", "Novi/CW3",
    "Pre GA", "Pre MLS Next", "United", "West Bloomfield"
  ];

  const SEASONS = ["Summer", "Fall", "Winter 1", "Winter 2", "Spring"];

  return (
    <div className="space-y-4">
      {/* Bulk Edit Controls */}
      {selectedIds.length > 0 && (
        <Card className="dark:bg-slate-900 dark:border-slate-800 bg-amber-50 dark:bg-amber-900 border-amber-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 dark:text-white">
                Bulk Edit ({selectedIds.length} selected)
              </h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedIds([]);
                    setBulkEdits({});
                  }}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleBulkUpdate}
                  disabled={updateProgramsMutation.isPending}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {updateProgramsMutation.isPending ? "Saving..." : "Apply Changes"}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Status</label>
                <Select
                  value={bulkEdits.status || ""}
                  onValueChange={(value) => setBulkEdits({ ...bulkEdits, status: value })}
                >
                  <SelectTrigger className="dark:bg-slate-800">
                    <SelectValue placeholder="Select status" />
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
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Priority</label>
                <Select
                  value={bulkEdits.priority || ""}
                  onValueChange={(value) => setBulkEdits({ ...bulkEdits, priority: value })}
                >
                  <SelectTrigger className="dark:bg-slate-800">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Branch</label>
                <Select
                  value={bulkEdits.branch || ""}
                  onValueChange={(value) => setBulkEdits({ ...bulkEdits, branch: value })}
                >
                  <SelectTrigger className="dark:bg-slate-800">
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {BRANCHES.map(branch => (
                      <SelectItem key={branch} value={branch}>{branch}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Assignee</label>
                <Select
                  value={bulkEdits.assignee || ""}
                  onValueChange={(value) => setBulkEdits({ ...bulkEdits, assignee: value })}
                >
                  <SelectTrigger className="dark:bg-slate-800">
                    <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers.map(member => (
                      <SelectItem key={member.id} value={member.email}>
                        {member.full_name || member.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Season</label>
                <Select
                  value={bulkEdits.season || ""}
                  onValueChange={(value) => setBulkEdits({ ...bulkEdits, season: value })}
                >
                  <SelectTrigger className="dark:bg-slate-800">
                    <SelectValue placeholder="Select season" />
                  </SelectTrigger>
                  <SelectContent>
                    {SEASONS.map(season => (
                      <SelectItem key={season} value={season}>{season}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Programs Table */}
      <Card className="dark:bg-slate-900 dark:border-slate-800">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-4 text-left">
                    <Checkbox
                      checked={selectedIds.length === programs.length && programs.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-900 dark:text-white">Title</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-900 dark:text-white">Status</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-900 dark:text-white">Priority</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-900 dark:text-white">Branch</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-900 dark:text-white">Season</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-900 dark:text-white">Assignee</th>
                </tr>
              </thead>
              <tbody>
                {programs.map((program) => (
                  <tr
                    key={program.id}
                    className={`border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 ${
                      selectedIds.includes(program.id) ? 'bg-amber-50 dark:bg-amber-900' : ''
                    }`}
                  >
                    <td className="p-4">
                      <Checkbox
                        checked={selectedIds.includes(program.id)}
                        onCheckedChange={() => toggleSelect(program.id)}
                      />
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-slate-900 dark:text-white">{program.title}</div>
                      {program.description && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                          {program.description}
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-sm text-slate-600 dark:text-slate-400">
                      {program.status?.replace(/_/g, ' ') || '-'}
                    </td>
                    <td className="p-4 text-sm text-slate-600 dark:text-slate-400">
                      {program.priority || '-'}
                    </td>
                    <td className="p-4 text-sm text-slate-600 dark:text-slate-400">
                      {program.branch || '-'}
                    </td>
                    <td className="p-4 text-sm text-slate-600 dark:text-slate-400">
                      {program.season || '-'}
                    </td>
                    <td className="p-4 text-sm text-slate-600 dark:text-slate-400">
                      {program.assignee || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {programs.length === 0 && (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                No programs found
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}