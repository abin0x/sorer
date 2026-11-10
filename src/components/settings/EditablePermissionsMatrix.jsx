import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Shield, Save, RefreshCw, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { PERMISSIONS, ROLE_PERMISSIONS } from "@/components/utils/permissions";

const ROLE_CONFIG = {
  admin: { label: "Admin", color: "bg-red-100 text-red-700 border-red-300" },
  director: { label: "Director", color: "bg-blue-100 text-blue-700 border-blue-300" },
  branch_director: { label: "Branch Director", color: "bg-purple-100 text-purple-700 border-purple-300" },
  staff: { label: "Staff", color: "bg-emerald-100 text-emerald-700 border-emerald-300" }
};

const PERMISSION_CATEGORIES = {
  "Programs": [
  { key: "PROGRAMS_VIEW_ALL", label: "View All Programs" },
  { key: "PROGRAMS_VIEW_BRANCH", label: "View Branch Programs" },
  { key: "PROGRAMS_VIEW_OWN", label: "View Own Programs" },
  { key: "PROGRAMS_CREATE", label: "Create Programs" },
  { key: "PROGRAMS_EDIT_ALL", label: "Edit Any Program" },
  { key: "PROGRAMS_EDIT_BRANCH", label: "Edit Branch Programs" },
  { key: "PROGRAMS_EDIT_OWN", label: "Edit Own Programs" },
  { key: "PROGRAMS_DELETE_ALL", label: "Delete Any Program" },
  { key: "PROGRAMS_DELETE_BRANCH", label: "Delete Branch Programs" }],

  "Tasks": [
  { key: "TASKS_VIEW_ALL", label: "View All Tasks" },
  { key: "TASKS_VIEW_BRANCH", label: "View Branch Tasks" },
  { key: "TASKS_VIEW_OWN", label: "View Own Tasks" },
  { key: "TASKS_CREATE", label: "Create Tasks" },
  { key: "TASKS_EDIT_ALL", label: "Edit All Tasks" },
  { key: "TASKS_EDIT_BRANCH", label: "Edit Branch Tasks" },
  { key: "TASKS_EDIT_OWN", label: "Edit Own Tasks" }],

  "Expenses": [
  { key: "EXPENSES_VIEW_ALL", label: "View All Expenses" },
  { key: "EXPENSES_VIEW_BRANCH", label: "View Branch Expenses" },
  { key: "EXPENSES_VIEW_OWN", label: "View Own Expenses" },
  { key: "EXPENSES_CREATE", label: "Create Expenses" },
  { key: "EXPENSES_APPROVE", label: "Approve Expenses" },
  { key: "EXPENSES_EDIT_ALL", label: "Edit All Expenses" },
  { key: "EXPENSES_EDIT_OWN", label: "Edit Own Expenses" }],

  "User Management": [
  { key: "USERS_VIEW_ALL", label: "View All Users" },
  { key: "USERS_VIEW_BRANCH", label: "View Branch Users" },
  { key: "USERS_CREATE", label: "Create Users" },
  { key: "USERS_EDIT_ALL", label: "Edit All Users" },
  { key: "USERS_EDIT_BRANCH", label: "Edit Branch Users" },
  { key: "USERS_EDIT_ROLES", label: "Edit User Roles" },
  { key: "USERS_DELETE", label: "Delete Users" }],

  "Reports": [
  { key: "REPORTS_VIEW_ALL", label: "View All Reports" },
  { key: "REPORTS_VIEW_BRANCH", label: "View Branch Reports" },
  { key: "REPORTS_EXPORT", label: "Export Reports" }]

};

const DEFAULT_PERMISSIONS = ROLE_PERMISSIONS;

export default function EditablePermissionsMatrix() {
  const [rolePermissions, setRolePermissions] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const queryClient = useQueryClient();

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ["rbac-configs"],
    queryFn: () => base44.entities.RBACConfig.list()
  });

  useEffect(() => {
    // Initialize with custom configs or defaults
    const initialPermissions = {};
    ["admin", "director", "branch_director", "staff"].forEach((role) => {
      const config = configs.find((c) => c.role === role && c.is_active);
      initialPermissions[role] = config ? config.permissions : DEFAULT_PERMISSIONS[role];
    });
    setRolePermissions(initialPermissions);
  }, [configs]);

  const saveConfigMutation = useMutation({
    mutationFn: async ({ role, permissions }) => {
      // Check if config exists
      const existingConfig = configs.find((c) => c.role === role);
      if (existingConfig) {
        return base44.entities.RBACConfig.update(existingConfig.id, {
          permissions,
          is_active: true
        });
      } else {
        return base44.entities.RBACConfig.create({
          role,
          permissions,
          is_active: true
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rbac-configs"] });
    }
  });

  const handleTogglePermission = (role, permission) => {
    setRolePermissions((prev) => {
      const rolePerms = prev[role] || [];
      const hasPermission = rolePerms.includes(permission);

      return {
        ...prev,
        [role]: hasPermission ?
        rolePerms.filter((p) => p !== permission) :
        [...rolePerms, permission]
      };
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await Promise.all(
        Object.entries(rolePermissions).map(([role, permissions]) =>
        saveConfigMutation.mutateAsync({ role, permissions })
        )
      );
      toast.success("Permissions saved successfully");
      setHasChanges(false);
    } catch (error) {
      toast.error("Failed to save permissions");
    }
  };

  const handleReset = () => {
    if (confirm("Reset all roles to default permissions? This cannot be undone.")) {
      setRolePermissions(DEFAULT_PERMISSIONS);
      setHasChanges(true);
      toast.success("Reset to defaults. Click Save to apply changes.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>);

  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Edit RBAC Permissions
            </CardTitle>
            <CardDescription className="mt-2">
              Customize role-based access control permissions for your organization
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={saveConfigMutation.isPending}>

              <RefreshCw className="w-4 h-4 mr-2" />
              Reset to Defaults
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || saveConfigMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700">

              <Save className="w-4 h-4 mr-2" />
              {saveConfigMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {hasChanges &&
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-semibold">You have unsaved changes</p>
              <p className="text-xs mt-1">Click "Save Changes" to apply your permission updates</p>
            </div>
          </div>
        }

        <div className="space-y-6">
          {Object.entries(PERMISSION_CATEGORIES).map(([category, permissions]) =>
          <div key={category} className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-100 px-4 py-3 border-b border-slate-200">
                <h3 className="font-semibold text-slate-900">{category}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-slate-700 text-sm">Permission</th>
                      <th className="text-center px-4 py-3 font-semibold text-slate-700 text-sm">Admin</th>
                      <th className="text-center px-4 py-3 font-semibold text-slate-700 text-sm">Director</th>
                      <th className="text-center px-4 py-3 font-semibold text-slate-700 text-sm">Branch Dir.</th>
                      <th className="text-center px-4 py-3 font-semibold text-slate-700 text-sm">Staff</th>
                    </tr>
                  </thead>
                  <tbody>
                    {permissions.map((perm) => {
                    const permissionValue = PERMISSIONS[perm.key];
                    return (
                      <tr key={perm.key} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="text-slate-800 px-4 py-3 text-sm">{perm.label}</td>
                          {["admin", "director", "branch_director", "staff"].map((role) => {
                          const hasPermission = rolePermissions[role]?.includes(permissionValue);
                          return (
                            <td key={role} className="text-center px-4 py-3">
                                <Switch
                                checked={hasPermission}
                                onCheckedChange={() => handleTogglePermission(role, permissionValue)}
                                className="data-[state=checked]:bg-emerald-600" />

                              </td>);

                        })}
                        </tr>);

                  })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">Important Notes:</h4>
          <ul className="space-y-1 text-sm text-blue-800">
            <li>• Changes take effect immediately after saving</li>
            <li>• Admin role should always maintain full permissions</li>
            <li>• Branch-level permissions only work if users have a branch assigned</li>
            <li>• Be careful removing critical permissions like viewing own programs</li>
            <li>• You can reset to defaults anytime using the Reset button</li>
          </ul>
        </div>
      </CardContent>
    </Card>);

}