import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Download, Trash2, Database, AlertTriangle, Plus, X, Package } from "lucide-react";
import { toast } from "sonner";
import { useTenant } from "@/lib/TenantContext";

export default function DataManagement() {
  const { effectiveClubId } = useTenant();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [exporting, setExporting] = useState(false);
  const [newBranch, setNewBranch] = useState("");
  const queryClient = useQueryClient();

  const { data: programs = [] } = useQuery({
    queryKey: ["programs"],
    queryFn: () => base44.entities.Program.list(),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => base44.entities.Task.list(),
  });

  const { data: subtasks = [] } = useQuery({
    queryKey: ["subtasks"],
    queryFn: () => base44.entities.Subtask.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: appConfig } = useQuery({
    queryKey: ["appConfig", "available_branches"],
    queryFn: async () => {
      const configs = await base44.entities.AppConfig.filter({ config_key: "available_branches", club_id: effectiveClubId || null });
      return configs[0] || { config_value: { branches: [] } };
    },
  });

  const updateBranchesMutation = useMutation({
    mutationFn: async (branches) => {
      if (appConfig?.id) {
        return base44.entities.AppConfig.update(appConfig.id, {
          config_key: "available_branches",
          config_value: { branches }
        });
      } else {
        return base44.entities.AppConfig.create({
          config_key: "available_branches",
          config_value: { branches },
          club_id: effectiveClubId || null
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appConfig"] });
      toast.success("Branches updated");
    },
  });

  const branches = appConfig?.config_value?.branches || [];

  const handleAddBranch = () => {
    if (!newBranch.trim()) {
      toast.error("Branch name cannot be empty");
      return;
    }
    if (branches.includes(newBranch.trim())) {
      toast.error("Branch already exists");
      return;
    }
    updateBranchesMutation.mutate([...branches, newBranch.trim()]);
    setNewBranch("");
  };

  const handleRemoveBranch = (branch) => {
    updateBranchesMutation.mutate(branches.filter(b => b !== branch));
  };

  const handleExportData = async () => {
    setExporting(true);
    try {
      const JSZip = (await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm')).default;
      const zip = new JSZip();

      // Export Programs
      const programsCSV = [
        Object.keys(programs[0] || {}).join(','),
        ...programs.map(p => Object.values(p).map(v => 
          typeof v === 'object' ? JSON.stringify(v) : v
        ).join(','))
      ].join('\n');
      zip.file("programs.csv", programsCSV);

      // Export Tasks
      const tasksCSV = [
        Object.keys(tasks[0] || {}).join(','),
        ...tasks.map(t => Object.values(t).map(v => 
          typeof v === 'object' ? JSON.stringify(v) : v
        ).join(','))
      ].join('\n');
      zip.file("tasks.csv", tasksCSV);

      // Export Subtasks
      const subtasksCSV = [
        Object.keys(subtasks[0] || {}).join(','),
        ...subtasks.map(s => Object.values(s).map(v => 
          typeof v === 'object' ? JSON.stringify(v) : v
        ).join(','))
      ].join('\n');
      zip.file("subtasks.csv", subtasksCSV);

      // Export Users
      const usersCSV = [
        Object.keys(users[0] || {}).join(','),
        ...users.map(u => Object.values(u).map(v => 
          typeof v === 'object' ? JSON.stringify(v) : v
        ).join(','))
      ].join('\n');
      zip.file("users.csv", usersCSV);

      // Add metadata
      const metadata = {
        exported_at: new Date().toISOString(),
        total_programs: programs.length,
        total_tasks: tasks.length,
        total_subtasks: subtasks.length,
        total_users: users.length,
      };
      zip.file("metadata.json", JSON.stringify(metadata, null, 2));

      // Generate and download
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = url;
      link.download = `jaguars-backup-${new Date().toISOString().split('T')[0]}.zip`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success("Data exported successfully");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export data");
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAllData = async () => {
    if (confirmText !== "DELETE ALL DATA") {
      toast.error("Please type the confirmation text correctly");
      return;
    }

    try {
      // Delete in order: subtasks -> tasks -> programs
      await Promise.all(subtasks.map(s => base44.entities.Subtask.delete(s.id)));
      await Promise.all(tasks.map(t => base44.entities.Task.delete(t.id)));
      await Promise.all(programs.map(p => base44.entities.Program.delete(p.id)));

      queryClient.invalidateQueries();
      toast.success("All data deleted successfully");
      setDeleteDialogOpen(false);
      setConfirmText("");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete data");
    }
  };

  return (
    <div className="space-y-6">
      {/* Branch Management */}
      <Card className="dark:bg-slate-900 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 dark:text-white">
            <Package className="w-5 h-5" />
            Manage Branches
          </CardTitle>
          <CardDescription className="dark:text-slate-400">
            Add or remove branches available for programs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter branch name..."
              value={newBranch}
              onChange={(e) => setNewBranch(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddBranch()}
              className="dark:bg-slate-800 dark:border-slate-700"
            />
            <Button onClick={handleAddBranch} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {branches.map(branch => (
              <Badge key={branch} variant="outline" className="text-sm px-3 py-1.5 dark:border-slate-700">
                {branch}
                <button
                  onClick={() => handleRemoveBranch(branch)}
                  className="ml-2 hover:text-red-600 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
            {branches.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No branches configured yet. Add your first branch above.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Export Data */}
      <Card className="dark:bg-slate-900 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 dark:text-white">
            <Download className="w-5 h-5" />
            Export All Data
          </CardTitle>
          <CardDescription className="dark:text-slate-400">
            Download all programs, tasks, subtasks, and user data as CSV files in a ZIP archive
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{programs.length}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Programs</div>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{tasks.length}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Tasks</div>
            </div>
            <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{subtasks.length}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Subtasks</div>
            </div>
            <div className="p-4 bg-amber-50 dark:bg-amber-950 rounded-lg">
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{users.length}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Users</div>
            </div>
          </div>

          <Button
            onClick={handleExportData}
            disabled={exporting}
            className="w-full bg-slate-800 hover:bg-slate-900"
          >
            <Download className="w-4 h-4 mr-2" />
            {exporting ? "Exporting..." : "Export All Data as ZIP"}
          </Button>
        </CardContent>
      </Card>

      {/* Delete All Data */}
      <Card className="border-red-200 dark:border-red-900 dark:bg-slate-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertTriangle className="w-5 h-5" />
            Danger Zone
          </CardTitle>
          <CardDescription className="dark:text-slate-400">
            Permanently delete all programs, tasks, and subtasks. This action cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={() => setDeleteDialogOpen(true)}
            className="w-full"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete All Data
          </Button>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="dark:bg-slate-900">
          <AlertDialogHeader>
            <AlertDialogTitle className="dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Delete All Data
            </AlertDialogTitle>
            <AlertDialogDescription className="dark:text-slate-400">
              This will permanently delete:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>{programs.length} programs</li>
                <li>{tasks.length} tasks</li>
                <li>{subtasks.length} subtasks</li>
              </ul>
              <p className="mt-4 font-semibold text-red-600">
                This action cannot be undone!
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2">
            <Label htmlFor="confirm" className="dark:text-white">
              Type <span className="font-mono font-bold">DELETE ALL DATA</span> to confirm:
            </Label>
            <Input
              id="confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE ALL DATA"
              className="dark:bg-slate-800 dark:border-slate-700"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmText("")}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAllData}
              disabled={confirmText !== "DELETE ALL DATA"}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}