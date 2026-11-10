import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { 
  Mail, 
  Phone, 
  MapPin, 
  Briefcase, 
  LayoutDashboard,
  ListTodo,
  DollarSign,
  Calendar,
  FileText,
  Receipt,
  MessageSquare,
  Edit,
  ExternalLink
} from "lucide-react";

const ROLE_CONFIG = {
  admin: { label: "Admin", color: "bg-red-100 text-red-700 border-red-200" },
  director: { label: "Director", color: "bg-blue-100 text-blue-700 border-blue-200" },
  branch_director: { label: "Branch Director", color: "bg-purple-100 text-purple-700 border-purple-200" },
  staff: { label: "Staff", color: "bg-emerald-100 text-emerald-700 border-emerald-200" }
};

export default function TeamMemberDetailsDialog({ 
  open, 
  onOpenChange, 
  member, 
  stats, 
  onEdit,
  onItemClick 
}) {
  const navigate = useNavigate();
  if (!member) return null;

  const roleConfig = ROLE_CONFIG[member.role] || ROLE_CONFIG.staff;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[900px] max-h-[95vh] p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-xl">
                  {member.full_name?.[0]?.toUpperCase() || member.email?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-slate-900">
                  {member.full_name || 'Unnamed User'}
                </DialogTitle>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge className={`text-xs border ${roleConfig.color}`}>
                    {roleConfig.label}
                  </Badge>
                  {member.branch && member.role === 'branch_director' && (
                    <Badge variant="outline" className="text-xs">
                      {member.branch}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  navigate(`/UserProfileView?id=${member.id}`);
                }}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Full Profile
              </Button>
              <Button variant="outline" size="sm" onClick={() => onEdit(member)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit User
              </Button>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(95vh-120px)]">
          <div className="px-6 py-4 space-y-6">
            {/* Contact Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              {member.title && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Briefcase className="w-4 h-4" />
                  <span>{member.title}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-slate-600">
                <Mail className="w-4 h-4" />
                <span>{member.email}</span>
              </div>
              {member.phone && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="w-4 h-4" />
                  <span>{member.phone}</span>
                </div>
              )}
              {member.address && (
                <div className="flex items-center gap-2 text-slate-600">
                  <MapPin className="w-4 h-4" />
                  <span>{member.address}</span>
                </div>
              )}
            </div>

            {member.bio && (
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-700">{member.bio}</p>
              </div>
            )}

            {/* Stats Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-4 bg-slate-50 rounded-lg text-center">
                <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
                <div className="text-xs text-slate-500">Programs</div>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.tasks.length}</div>
                <div className="text-xs text-slate-500">Tasks</div>
              </div>
              <div className="p-4 bg-emerald-50 rounded-lg text-center">
                <div className="text-2xl font-bold text-emerald-600">{stats.completed}</div>
                <div className="text-xs text-slate-500">Completed</div>
              </div>
            </div>

            <Separator />

            {/* Programs Section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <LayoutDashboard className="w-5 h-5 text-emerald-600" />
                <h3 className="font-semibold text-slate-900 text-lg">Programs ({stats.programs.length})</h3>
              </div>
              {stats.programs.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">No programs assigned</p>
              ) : (
                <div className="space-y-2">
                  {stats.programs.map((program) => (
                    <div 
                      key={program.id} 
                      className="p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                      onClick={() => onItemClick?.('program', program)}
                    >
                      <div className="font-medium text-slate-900 mb-1">{program.title}</div>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="secondary" className="text-xs">{program.status.replace(/_/g, ' ')}</Badge>
                        {program.priority && (
                          <Badge className={`text-xs ${
                            program.priority === 'high' ? 'bg-red-100 text-red-700' :
                            program.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                            'bg-emerald-100 text-emerald-700'
                          }`}>
                            {program.priority}
                          </Badge>
                        )}
                        {program.branch && (
                          <Badge variant="outline" className="text-xs">{program.branch}</Badge>
                        )}
                      </div>
                      {program.due_date && (
                        <div className="flex items-center gap-1 mt-1.5 text-xs text-slate-500">
                          <Calendar className="w-3 h-3" />
                          Due: {new Date(program.due_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Tasks Section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <ListTodo className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-slate-900 text-lg">Tasks ({stats.tasks.length})</h3>
              </div>
              {stats.tasks.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">No tasks assigned</p>
              ) : (
                <div className="space-y-2">
                  {stats.tasks.map((task) => (
                    <div 
                      key={task.id} 
                      className="p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
                      onClick={() => onItemClick?.('task', task)}
                    >
                      <div className="font-medium text-slate-900 mb-1">{task.title}</div>
                      {task.description && (
                        <p className="text-xs text-slate-600 mb-2 line-clamp-2">{task.description}</p>
                      )}
                      <div className="flex items-center gap-2">
                        <Badge className={task.completed ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}>
                          {task.completed ? "✓ Completed" : "○ Pending"}
                        </Badge>
                        {task.due_date && (
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(task.due_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Notes Section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold text-slate-900 text-lg">Notes ({stats.notes?.length || 0})</h3>
              </div>
              {!stats.notes || stats.notes.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">No notes</p>
              ) : (
                <div className="space-y-2">
                  {stats.notes.map((note) => (
                    <div 
                      key={note.id} 
                      className="p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors cursor-pointer"
                      onClick={() => onItemClick?.('note', note)}
                    >
                      <p className="text-sm text-slate-700 line-clamp-3">{note.content}</p>
                      <div className="text-xs text-slate-500 mt-1">
                        {new Date(note.created_date).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Expenses Section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Receipt className="w-5 h-5 text-orange-600" />
                <h3 className="font-semibold text-slate-900 text-lg">Expenses ({stats.expenses?.length || 0})</h3>
              </div>
              {!stats.expenses || stats.expenses.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">No expenses</p>
              ) : (
                <div className="space-y-2">
                  {stats.expenses.map((expense) => (
                    <div 
                      key={expense.id} 
                      className="p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors cursor-pointer"
                      onClick={() => onItemClick?.('expense', expense)}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <div className="font-medium text-slate-900 flex-1">{expense.description}</div>
                        <div className="font-bold text-orange-600">${expense.amount.toLocaleString()}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={
                          expense.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                          expense.status === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }>
                          {expense.status}
                        </Badge>
                        {expense.category && (
                          <span className="text-xs text-slate-500">{expense.category}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Staff Pay Section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <h3 className="font-semibold text-slate-900 text-lg">Staff Pay ({stats.staffPay.length})</h3>
              </div>
              {stats.staffPay.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">No staff pay records</p>
              ) : (
                <>
                  <div className="text-center p-4 bg-emerald-50 rounded-lg mb-3">
                    <div className="text-3xl font-bold text-emerald-700">
                      ${stats.totalStaffPay.toLocaleString()}
                    </div>
                    <div className="text-sm text-slate-600">Total Staff Pay</div>
                  </div>
                  <div className="space-y-2">
                    {stats.staffPay.map((pay) => (
                      <div 
                        key={pay.id} 
                        className="p-3 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer"
                        onClick={() => onItemClick?.('staffpay', pay)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-medium text-slate-900">{pay.role || 'Staff'}</div>
                            {pay.notes && (
                              <p className="text-xs text-slate-600 mt-1 line-clamp-2">{pay.notes}</p>
                            )}
                          </div>
                          <div className="font-bold text-emerald-600">${pay.amount.toLocaleString()}</div>
                        </div>
                        {pay.date && (
                          <div className="text-xs text-slate-500 mt-1">
                            {new Date(pay.date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <Separator />

            {/* Messages Section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="w-5 h-5 text-indigo-600" />
                <h3 className="font-semibold text-slate-900 text-lg">Messages ({stats.messages?.length || 0})</h3>
              </div>
              {!stats.messages || stats.messages.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">No messages</p>
              ) : (
                <div className="space-y-2">
                  {stats.messages.map((message) => (
                    <div 
                      key={message.id} 
                      className="p-3 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors cursor-pointer"
                      onClick={() => onItemClick?.('message', message)}
                    >
                      {message.is_announcement && (
                        <Badge className="bg-indigo-600 text-white text-xs mb-2">Announcement</Badge>
                      )}
                      <p className="text-sm text-slate-700 line-clamp-2">{message.content}</p>
                      <div className="text-xs text-slate-500 mt-1">
                        {message.sender_name} · {new Date(message.created_date).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}