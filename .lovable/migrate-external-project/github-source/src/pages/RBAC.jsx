import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2, Shield, Save, RotateCcw, Lock, ChevronDown, ChevronRight, Users } from "lucide-react";
import { toast } from "sonner";
import {
  ROLES,
  ROLE_LABELS,
  ROLE_DESCRIPTIONS,
  ROLE_COLORS,
  PERMISSION_MODULES,
  DEFAULT_ROLE_PERMISSIONS,
  getRolePermissions,
} from "@/lib/rbac";

export default function RBAC() {
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState(ROLES.CLUB_DIRECTOR);
  const [expandedModules, setExpandedModules] = useState({});
  const [draftPermissions, setDraftPermissions] = useState({});
  const [hasChanges, setHasChanges] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ["current-user-rbac"],
    queryFn: () => base44.auth.me(),
  });

  const { data: rbacConfigs = [], isLoading } = useQuery({
    queryKey: ["rbac-configs"],
    queryFn: () => base44.entities.RBACConfig.list("role", 50),
  });

  // Initialize draft permissions when role or configs change
  useEffect(() => {
    const perms = getRolePermissions(selectedRole, rbacConfigs);
    setDraftPermissions((prev) => ({ ...prev, [selectedRole]: [...perms] }));
    setHasChanges(false);
  }, [selectedRole, rbacConfigs]);

  const saveMutation = useMutation({
    mutationFn: async ({ role, permissions }) => {
      const existing = rbacConfigs.find((c) => c.role === role);
      const payload = {
        role,
        permissions,
        role_label: ROLE_LABELS[role],
        description: ROLE_DESCRIPTIONS[role],
        is_active: true,
        is_custom: true,
      };
      if (existing?.id) {
        return await base44.entities.RBACConfig.update(existing.id, payload);
      } else {
        return await base44.entities.RBACConfig.create(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rbac-configs"] });
      toast.success("Permissions saved successfully");
      setHasChanges(false);
    },
    onError: (err) => toast.error("Failed to save: " + err.message),
  });

  const resetMutation = useMutation({
    mutationFn: async (role) => {
      const existing = rbacConfigs.find((c) => c.role === role);
      if (existing?.id) {
        return await base44.entities.RBACConfig.delete(existing.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rbac-configs"] });
      const defaults = DEFAULT_ROLE_PERMISSIONS[ROLES[selectedRole]] || [];
      setDraftPermissions((prev) => ({ ...prev, [selectedRole]: [...defaults] }));
      toast.success("Reset to default permissions");
      setHasChanges(false);
    },
    onError: (err) => toast.error("Failed to reset: " + err.message),
  });

  const canManage = [ROLES.MASTER_ADMIN, ROLES.ADMIN, ROLES.CLUB_ADMIN].includes(currentUser?.custom_role);

  const togglePermission = (permKey) => {
    const current = draftPermissions[selectedRole] || [];
    const exists = current.includes(permKey);
    const updated = exists ? current.filter((p) => p !== permKey) : [...current, permKey];
    setDraftPermissions((prev) => ({ ...prev, [selectedRole]: updated }));
    setHasChanges(true);
  };

  const toggleModule = (moduleKey) => {
    setExpandedModules((prev) => ({ ...prev, [moduleKey]: !prev[moduleKey] }));
  };

  const toggleAllModule = (module, enable) => {
    const modulePerms = module.permissions.map((p) => p.key);
    const current = draftPermissions[selectedRole] || [];
    let updated;
    if (enable) {
      updated = [...new Set([...current, ...modulePerms])];
    } else {
      updated = current.filter((p) => !modulePerms.includes(p));
    }
    setDraftPermissions((prev) => ({ ...prev, [selectedRole]: updated }));
    setHasChanges(true);
  };

  if (!canManage) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Lock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Access Restricted</h2>
            <p className="text-muted-foreground">Only Admins and Club Admins can manage RBAC permissions.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const currentPerms = draftPermissions[selectedRole] || [];
  const isCustom = rbacConfigs.some((c) => c.role === selectedRole && c.is_custom);
  const roleConfig = rbacConfigs.find((c) => c.role === selectedRole);
  // Master Admin is hidden from everyone except the Master Admin themselves.
  const visibleRoles = Object.values(ROLES).filter((r) => r !== ROLES.MASTER_ADMIN || currentUser?.custom_role === ROLES.MASTER_ADMIN);

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            Role-Based Access Control
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Customize what each role can view, create, edit, and delete across the club hierarchy.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Role selector */}
        <Card className="lg:col-span-1 h-fit">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4" /> Roles
            </CardTitle>
            <CardDescription>Select a role to customize</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {visibleRoles.map((role) => {
              const isSelected = selectedRole === role;
              const isRoleCustom = rbacConfigs.some((c) => c.role === role && c.is_custom);
              const permCount = getRolePermissions(role, rbacConfigs).length;
              return (
                <button
                  key={role}
                  onClick={() => { setSelectedRole(role); setHasChanges(false); }}
                  className={`w-full text-left p-3 rounded-xl transition-all border ${
                    isSelected
                      ? "bg-primary/10 border-primary shadow-sm"
                      : "bg-card border-border hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge className={`text-xs ${ROLE_COLORS[role]}`}>{ROLE_LABELS[role]}</Badge>
                        {isRoleCustom && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">Custom</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ROLE_DESCRIPTIONS[role]}</p>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground shrink-0">{permCount}</span>
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        {/* Permission editor */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Badge className={ROLE_COLORS[selectedRole]}>{ROLE_LABELS[selectedRole]}</Badge>
                <span className="text-sm font-normal text-muted-foreground">
                  {currentPerms.length} permissions
                  {isCustom && " · customized"}
                </span>
              </CardTitle>
              <CardDescription className="mt-1">{ROLE_DESCRIPTIONS[selectedRole]}</CardDescription>
            </div>
            <div className="flex gap-2">
              {isCustom && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => resetMutation.mutate(selectedRole)}
                  disabled={resetMutation.isPending || hasChanges}
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Reset
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => saveMutation.mutate({ role: selectedRole, permissions: currentPerms })}
                disabled={!hasChanges || saveMutation.isPending}
                className="bg-primary hover:bg-primary/90"
              >
                {saveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                Save
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {(selectedRole === ROLES.ADMIN || selectedRole === ROLES.MASTER_ADMIN) && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 mb-3">
                <p className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5" /> {selectedRole === ROLES.MASTER_ADMIN ? "Master Admin" : "Admin"} always has full access to all modules. Permissions cannot be customized.
                </p>
              </div>
            )}
            {PERMISSION_MODULES.map((module) => {
              const isExpanded = expandedModules[module.key] ?? true;
              const modulePermKeys = module.permissions.map((p) => p.key);
              const enabledCount = modulePermKeys.filter((k) => currentPerms.includes(k)).length;
              const allEnabled = enabledCount === modulePermKeys.length;
              const noneEnabled = enabledCount === 0;

              return (
                <div key={module.key} className="rounded-xl border border-border overflow-hidden">
                  <div className="flex items-center gap-2 p-3 bg-muted/30">
                    <button onClick={() => toggleModule(module.key)} className="p-0.5 hover:bg-muted rounded">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{module.label}</span>
                        <Badge variant="outline" className="text-[10px] py-0">
                          {enabledCount}/{modulePermKeys.length}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{module.description}</p>
                    </div>
                    {![ROLES.ADMIN, ROLES.MASTER_ADMIN].includes(selectedRole) && (
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs px-2"
                          disabled={allEnabled}
                          onClick={() => toggleAllModule(module, true)}
                        >
                          All
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs px-2"
                          disabled={noneEnabled}
                          onClick={() => toggleAllModule(module, false)}
                        >
                          None
                        </Button>
                      </div>
                    )}
                  </div>
                  {isExpanded && (
                    <div className="px-3 pb-3 pt-1 space-y-0.5">
                      {module.permissions.map((perm) => {
                        const isEnabled = currentPerms.includes(perm.key);
                        const isLocked = selectedRole === ROLES.ADMIN || selectedRole === ROLES.MASTER_ADMIN;
                        return (
                          <div
                            key={perm.key}
                            className={`flex items-center justify-between p-2 rounded-lg ${
                              isEnabled ? "bg-primary/5" : ""
                            }`}
                          >
                            <Label className="text-sm font-normal cursor-pointer" htmlFor={perm.key}>
                              {perm.label}
                            </Label>
                            <Switch
                              id={perm.key}
                              checked={isEnabled || isLocked}
                              disabled={isLocked}
                              onCheckedChange={() => !isLocked && togglePermission(perm.key)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Hierarchy reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Club Hierarchy</CardTitle>
          <CardDescription>The permission structure follows this hierarchy</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 flex-wrap text-sm">
            {["Club", "Branch", "Program", "Team", "Family", "Player"].map((level, i, arr) => (
              <React.Fragment key={level}>
                <Badge variant="outline" className="text-sm px-3 py-1">{level}</Badge>
                {i < arr.length - 1 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              </React.Fragment>
            ))}
          </div>
          <Separator className="my-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <p className="font-medium mb-1">Club-wide roles</p>
              <p className="text-muted-foreground text-xs">Admin, Club Director, Club Admin, Bookkeeper, Project Manager — access across all branches</p>
            </div>
            <div>
              <p className="font-medium mb-1">Branch-scoped roles</p>
              <p className="text-muted-foreground text-xs">Branch Director, Branch Admin, Coach — access limited to their assigned branch</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}