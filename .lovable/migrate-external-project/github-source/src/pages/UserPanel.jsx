import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Search, Save, X, Shield, AlertCircle, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";
import InviteMemberDialog from "@/components/admin/InviteMemberDialog";

const ROLE_CONFIG = {
  master_admin: { label: "Master Admin", color: "bg-gradient-to-r from-rose-100 to-amber-100 text-rose-800 dark:from-rose-900 dark:to-amber-900 dark:text-rose-200" },
  admin: { label: "Admin", color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
  club_director: { label: "Club Director", color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300" },
  club_admin: { label: "Club Admin", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  branch_director: { label: "Branch Director", color: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" },
  branch_admin: { label: "Branch Admin", color: "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300" },
  bookkeeper: { label: "Bookkeeper", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" },
  project_manager: { label: "Project Manager", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300" },
  coach: { label: "Coach", color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" },
  team_manager: { label: "Team Manager", color: "bg-lime-100 text-lime-700 dark:bg-lime-900 dark:text-lime-300" },
  parent_guardian: { label: "Parent/Guardian", color: "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300" },
  player: { label: "Player", color: "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300" },
  staff: { label: "Staff", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
};

const SAFE_ROLE_CONFIG = { label: "User", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" };

const BRANCHES = [
  "Dearborn", "Downriver", "Genesee", "Girls Academy", "Huron Valley",
  "Jackson", "Lansing", "Marshall", "MLS Next", "Northville", "Novi/CW3",
  "Pre GA", "Pre MLS Next", "United", "West Bloomfield"
];

export default function UserPanel() {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingUsers, setEditingUsers] = useState({});
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list("-created_date"),
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return await base44.entities.User.update(id, data);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User updated successfully");
      handleCancelEdit(variables.id);
    },
    onError: (error) => {
      toast.error(`Failed to update user: ${error.message}`);
    }
  });

  const canManageUsers = ["master_admin", "admin", "club_director", "club_admin"].includes(currentUser?.custom_role);
  const canEditBranch = ["master_admin", "admin", "club_director", "club_admin"].includes(currentUser?.custom_role);

  if (!canManageUsers) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-950">
        <Card className="max-w-md dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Access Restricted</h2>
            <p className="text-slate-600 dark:text-slate-400">
              Only Admins and Directors can manage users.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.title?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const handleStartEdit = (user) => {
    setEditingUsers({
      ...editingUsers,
      [user.id]: {
        full_name: user.full_name || "",
        custom_role: user.custom_role || "staff",
        title: user.title || "",
        phone: user.phone || "",
        address: user.address || "",
        branch: user.branch || "",
        bio: user.bio || ""
      }
    });
  };

  const handleCancelEdit = (userId) => {
    const newEditing = { ...editingUsers };
    delete newEditing[userId];
    setEditingUsers(newEditing);
  };

  const handleFieldChange = (userId, field, value) => {
    setEditingUsers({
      ...editingUsers,
      [userId]: {
        ...editingUsers[userId],
        [field]: value
      }
    });
  };

  const handleSaveUser = (userId) => {
    const userData = editingUsers[userId];
    if (!userData) return;

    const dataToSave = {
      title: userData.title || "",
      phone: userData.phone || "",
      address: userData.address || "",
      bio: userData.bio || "",
      custom_role: userData.custom_role,
    };

    // Only include branch if user has permission to edit it
    if (canEditBranch) {
      dataToSave.branch = ["branch_director", "branch_admin", "coach"].includes(userData.custom_role) ? userData.branch : "";
    }

    updateUserMutation.mutate({ id: userId, data: dataToSave });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-700" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">User Management</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">Manage team members and their access levels</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 dark:bg-slate-800 dark:border-slate-700"
              />
            </div>
            <Button
              onClick={() => setAddUserDialogOpen(true)}
              className="bg-emerald-700 hover:bg-emerald-800 w-full sm:w-auto"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </div>
        </div>

        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 dark:text-white">
              <Users className="w-5 h-5" />
              Team Members ({filteredUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredUsers.map((user) => {
                const isEditing = editingUsers[user.id];
                const roleConfig = ROLE_CONFIG[user.custom_role] || SAFE_ROLE_CONFIG;
                
                return (
                  <div
                    key={user.id}
                    className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                  >
                    {isEditing ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 block">Email</label>
                            <Input
                              value={user.email}
                              disabled
                              className="dark:bg-slate-900 dark:border-slate-700 opacity-60"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                              Full Name (built-in - readonly)
                            </label>
                            <Input
                              value={user.full_name}
                              disabled
                              className="dark:bg-slate-900 dark:border-slate-700 opacity-60"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 block">Access Level *</label>
                            <Select
                              value={isEditing.custom_role}
                              onValueChange={(value) => handleFieldChange(user.id, 'custom_role', value)}
                            >
                              <SelectTrigger className="dark:bg-slate-900 dark:border-slate-700">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="master_admin">Master Admin</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="club_director">Club Director</SelectItem>
                                <SelectItem value="club_admin">Club Admin</SelectItem>
                                <SelectItem value="branch_director">Branch Director</SelectItem>
                                <SelectItem value="branch_admin">Branch Admin</SelectItem>
                                <SelectItem value="bookkeeper">Bookkeeper</SelectItem>
                                <SelectItem value="project_manager">Project Manager</SelectItem>
                                <SelectItem value="coach">Coach</SelectItem>
                                <SelectItem value="team_manager">Team Manager</SelectItem>
                                <SelectItem value="parent_guardian">Parent/Guardian</SelectItem>
                                <SelectItem value="player">Player</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {["branch_director", "branch_admin", "coach"].includes(isEditing.custom_role) && canEditBranch && (
                            <div>
                              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 block">Branch *</label>
                              <Select
                                value={isEditing.branch}
                                onValueChange={(value) => handleFieldChange(user.id, 'branch', value)}
                              >
                                <SelectTrigger className="dark:bg-slate-900 dark:border-slate-700">
                                  <SelectValue placeholder="Select branch" />
                                </SelectTrigger>
                                <SelectContent>
                                  {BRANCHES.map((branch) => (
                                    <SelectItem key={branch} value={branch}>{branch}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          <div>
                            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 block">Job Title</label>
                            <Input
                              value={isEditing.title}
                              onChange={(e) => handleFieldChange(user.id, 'title', e.target.value)}
                              placeholder="e.g., Program Manager"
                              className="dark:bg-slate-900 dark:border-slate-700"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 block">Phone</label>
                            <Input
                              value={isEditing.phone}
                              onChange={(e) => handleFieldChange(user.id, 'phone', e.target.value)}
                              placeholder="Phone number"
                              className="dark:bg-slate-900 dark:border-slate-700"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 block">Address</label>
                            <Input
                              value={isEditing.address}
                              onChange={(e) => handleFieldChange(user.id, 'address', e.target.value)}
                              placeholder="Address"
                              className="dark:bg-slate-900 dark:border-slate-700"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 block">Bio</label>
                          <Textarea
                            value={isEditing.bio}
                            onChange={(e) => handleFieldChange(user.id, 'bio', e.target.value)}
                            placeholder="Brief biography..."
                            rows={2}
                            className="dark:bg-slate-900 dark:border-slate-700"
                          />
                        </div>

                        <div className="flex gap-2 pt-2">
                          <Button
                            onClick={() => handleSaveUser(user.id)}
                            className="bg-emerald-700 hover:bg-emerald-800"
                            size="sm"
                            disabled={updateUserMutation.isPending}
                          >
                            <Save className="w-4 h-4 mr-2" />
                            {updateUserMutation.isPending ? "Saving..." : "Save Changes"}
                          </Button>
                          <Button
                            onClick={() => handleCancelEdit(user.id)}
                            variant="outline"
                            size="sm"
                            disabled={updateUserMutation.isPending}
                          >
                            <X className="w-4 h-4 mr-2" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-12 h-12 bg-emerald-700 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-bold text-lg">
                              {user.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                            </span>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                                {user.full_name || 'Unnamed User'}
                              </h3>
                              <Badge className={`text-xs ${roleConfig.color}`}>
                                {roleConfig.label}
                              </Badge>
                              {user.branch && ["branch_director", "branch_admin", "coach"].includes(user.custom_role) && (
                                <Badge variant="outline" className="text-xs dark:border-slate-600">
                                  {user.branch}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400">{user.email}</p>
                            <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500 dark:text-slate-400">
                              {user.title && <span>📋 {user.title}</span>}
                              {user.phone && <span>📞 {user.phone}</span>}
                              {user.address && <span>📍 {user.address}</span>}
                            </div>
                            {user.bio && (
                              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 line-clamp-2">
                                {user.bio}
                              </p>
                            )}
                          </div>
                        </div>

                        <Button
                          onClick={() => handleStartEdit(user)}
                          variant="outline"
                          size="sm"
                        >
                          Edit
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredUsers.length === 0 && (
                <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No users found</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg dark:text-white">
              <Shield className="w-5 h-5" />
              Access Level Permissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {Object.entries(ROLE_CONFIG).map(([key, cfg]) => (
                <div key={key} className="flex items-start gap-3">
                  <Badge className={`${cfg.color} mt-0.5`}>{cfg.label}</Badge>
                  <p className="text-slate-700 dark:text-slate-300 text-xs">
                    {key === "admin" && "Full system access including user management and settings"}
                    {key === "club_director" && "Club-wide management — all branches, programs, teams"}
                    {key === "club_admin" && "Club-wide administration — users, settings, finance"}
                    {key === "branch_director" && "Branch-level management within assigned branch"}
                    {key === "branch_admin" && "Branch-level administration within assigned branch"}
                    {key === "bookkeeper" && "Financial focus — payments, expenses, reports"}
                    {key === "project_manager" && "Program focus — programs, tasks, timelines"}
                    {key === "coach" && "Team focus — own teams, roster, evaluations"}
                    {key === "parent_guardian" && "Family focus — own children, registrations, payments"}
                    {key === "player" && "Self focus — own profile, team, schedule"}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <InviteMemberDialog open={addUserDialogOpen} onOpenChange={setAddUserDialogOpen} user={currentUser} />
    </div>
  );
}