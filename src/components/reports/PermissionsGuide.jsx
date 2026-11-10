import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Check, X } from "lucide-react";

const ROLE_PERMISSIONS_MATRIX = [
{
  category: "Programs",
  permissions: [
  { action: "View All Programs", admin: true, director: true, branch_director: false, staff: false },
  { action: "View Branch Programs", admin: true, director: true, branch_director: true, staff: false },
  { action: "View Own Programs", admin: true, director: true, branch_director: true, staff: true },
  { action: "Create Programs", admin: true, director: true, branch_director: true, staff: false },
  { action: "Edit Any Program", admin: true, director: true, branch_director: false, staff: false },
  { action: "Edit Branch Programs", admin: true, director: true, branch_director: true, staff: false },
  { action: "Edit Own Programs", admin: true, director: true, branch_director: true, staff: true },
  { action: "Delete Any Program", admin: true, director: true, branch_director: false, staff: false },
  { action: "Delete Branch Programs", admin: true, director: true, branch_director: true, staff: false }]

},
{
  category: "Tasks",
  permissions: [
  { action: "View All Tasks", admin: true, director: true, branch_director: false, staff: false },
  { action: "View Branch Tasks", admin: true, director: true, branch_director: true, staff: false },
  { action: "View Own Tasks", admin: true, director: true, branch_director: true, staff: true },
  { action: "Create Tasks", admin: true, director: true, branch_director: true, staff: true },
  { action: "Edit All Tasks", admin: true, director: true, branch_director: false, staff: false },
  { action: "Edit Branch Tasks", admin: true, director: true, branch_director: true, staff: false },
  { action: "Edit Own Tasks", admin: true, director: true, branch_director: true, staff: true }]

},
{
  category: "Expenses",
  permissions: [
  { action: "View All Expenses", admin: true, director: true, branch_director: false, staff: false },
  { action: "View Branch Expenses", admin: true, director: true, branch_director: true, staff: false },
  { action: "View Own Expenses", admin: true, director: true, branch_director: true, staff: true },
  { action: "Create Expenses", admin: true, director: true, branch_director: true, staff: true },
  { action: "Approve Expenses", admin: true, director: true, branch_director: true, staff: false },
  { action: "Edit All Expenses", admin: true, director: true, branch_director: false, staff: false },
  { action: "Edit Own Expenses", admin: true, director: true, branch_director: true, staff: true }]

},
{
  category: "User Management",
  permissions: [
  { action: "View All Users", admin: true, director: true, branch_director: false, staff: false },
  { action: "View Branch Users", admin: true, director: true, branch_director: true, staff: false },
  { action: "Create Users", admin: true, director: true, branch_director: true, staff: false },
  { action: "Edit All Users", admin: true, director: true, branch_director: false, staff: false },
  { action: "Edit Branch Users", admin: true, director: true, branch_director: true, staff: false },
  { action: "Edit User Roles", admin: true, director: false, branch_director: false, staff: false },
  { action: "Delete Users", admin: true, director: true, branch_director: false, staff: false }]

},
{
  category: "Reports",
  permissions: [
  { action: "View All Reports", admin: true, director: true, branch_director: false, staff: false },
  { action: "View Branch Reports", admin: true, director: true, branch_director: true, staff: false },
  { action: "Export Reports", admin: true, director: true, branch_director: true, staff: false }]

}];


const ROLE_COLORS = {
  admin: "bg-red-100 text-red-700 border-red-300",
  director: "bg-blue-100 text-blue-700 border-blue-300",
  branch_director: "bg-purple-100 text-purple-700 border-purple-300",
  staff: "bg-green-100 text-green-700 border-green-300"
};

export default function PermissionsGuide() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-slate-700" />
          <CardTitle>Role-Based Access Control (RBAC) Permissions</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Role Descriptions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <Badge className={ROLE_COLORS.admin}>Admin</Badge>
            <p className="text-sm text-slate-700 mt-2">
              Full access to all features, including user role management. Can view, edit, and delete all programs, tasks, expenses, and users across all branches.
            </p>
          </div>
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <Badge className={ROLE_COLORS.director}>Director</Badge>
            <p className="text-sm text-slate-700 mt-2">
              Access to all features except user role management. Can view and manage all programs, tasks, expenses, and users, but cannot change user roles.
            </p>
          </div>
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <Badge className={ROLE_COLORS.branch_director}>Branch Director</Badge>
            <p className="text-sm text-slate-700 mt-2">
              Can only manage users and programs within their assigned branch. Has approval rights for expenses in their branch.
            </p>
          </div>
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <Badge className={ROLE_COLORS.staff}>Staff</Badge>
            <p className="text-sm text-slate-700 mt-2">
              Limited access to only view and edit programs and tasks assigned to them. Can create expenses and tasks, but cannot approve or delete items.
            </p>
          </div>
        </div>

        {/* Permissions Matrix */}
        <div className="space-y-4">
          {ROLE_PERMISSIONS_MATRIX.map((category, idx) =>
          <div key={idx} className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-100 px-4 py-2">
                <h3 className="font-semibold text-slate-900">{category.category}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-4 py-2 font-semibold text-slate-700">Permission</th>
                      <th className="text-center px-4 py-2 font-semibold text-slate-700">Admin</th>
                      <th className="text-center px-4 py-2 font-semibold text-slate-700">Director</th>
                      <th className="text-center px-4 py-2 font-semibold text-slate-700">Branch Dir.</th>
                      <th className="text-center px-4 py-2 font-semibold text-slate-700">Staff</th>
                    </tr>
                  </thead>
                  <tbody>
                    {category.permissions.map((perm, permIdx) =>
                  <tr key={permIdx} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="text-slate-800 px-4 py-2">{perm.action}</td>
                        <td className="text-center px-4 py-2">
                          {perm.admin ?
                      <Check className="w-4 h-4 text-green-600 mx-auto" /> :

                      <X className="w-4 h-4 text-red-600 mx-auto" />
                      }
                        </td>
                        <td className="text-center px-4 py-2">
                          {perm.director ?
                      <Check className="w-4 h-4 text-green-600 mx-auto" /> :

                      <X className="w-4 h-4 text-red-600 mx-auto" />
                      }
                        </td>
                        <td className="text-center px-4 py-2">
                          {perm.branch_director ?
                      <Check className="w-4 h-4 text-green-600 mx-auto" /> :

                      <X className="w-4 h-4 text-red-600 mx-auto" />
                      }
                        </td>
                        <td className="text-center px-4 py-2">
                          {perm.staff ?
                      <Check className="w-4 h-4 text-green-600 mx-auto" /> :

                      <X className="w-4 h-4 text-red-600 mx-auto" />
                      }
                        </td>
                      </tr>
                  )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Key Notes */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">Key Notes:</h4>
          <ul className="space-y-1 text-sm text-blue-800">
            <li>• <strong>Branch Directors</strong> can only access programs and users in their assigned branch</li>
            <li>• <strong>Directors</strong> cannot edit user roles (only Admins can)</li>
            <li>• <strong>Staff</strong> members can only see and edit items assigned to them</li>
            <li>• All users can edit their own profile information</li>
            <li>• Expense approval requires Admin, Director, or Branch Director role</li>
          </ul>
        </div>
      </CardContent>
    </Card>);

}