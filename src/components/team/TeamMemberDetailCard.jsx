import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
  MessageSquare
} from "lucide-react";

const ROLE_CONFIG = {
  admin: { label: "Admin", color: "bg-red-100 text-red-700 border-red-200" },
  director: { label: "Director", color: "bg-blue-100 text-blue-700 border-blue-200" },
  branch_director: { label: "Branch Director", color: "bg-purple-100 text-purple-700 border-purple-200" },
  staff: { label: "Staff", color: "bg-emerald-100 text-emerald-700 border-emerald-200" }
};

export default function TeamMemberDetailCard({ member, stats, onClick, notes = [], expenses = [], messages = [] }) {
  const roleConfig = ROLE_CONFIG[member.role] || ROLE_CONFIG.staff;

  return (
    <Card 
      className="hover:shadow-lg transition-all duration-200"
    >
      <CardHeader className="border-b border-slate-100 cursor-pointer" onClick={() => onClick(member)}>
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-full flex items-center justify-center shadow-lg flex-shrink-0">
            <span className="text-white font-bold text-xl">
              {member.full_name?.[0]?.toUpperCase() || member.email?.[0]?.toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-slate-900 text-lg truncate">
              {member.full_name || 'Unnamed User'}
            </h3>
            <div className="flex flex-wrap gap-1.5 mt-2">
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
      </CardHeader>

      <ScrollArea className="h-[600px]">
        <CardContent className="pt-4 space-y-6">
        {/* Contact Info */}
        <div className="space-y-2.5 text-sm">
          {member.title && (
            <div className="flex items-center gap-2 text-slate-600">
              <Briefcase className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{member.title}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-slate-600">
            <Mail className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{member.email}</span>
          </div>
          {member.phone && (
            <div className="flex items-center gap-2 text-slate-600">
              <Phone className="w-4 h-4 flex-shrink-0" />
              <span>{member.phone}</span>
            </div>
          )}
          {member.address && (
            <div className="flex items-center gap-2 text-slate-600">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span className="line-clamp-1">{member.address}</span>
            </div>
          )}
        </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
              <div className="text-xs text-slate-500">Programs</div>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.tasks.length}</div>
              <div className="text-xs text-slate-500">Tasks</div>
            </div>
            <div className="p-3 bg-emerald-50 rounded-lg">
              <div className="text-2xl font-bold text-emerald-600">{stats.completed}</div>
              <div className="text-xs text-slate-500">Done</div>
            </div>
          </div>

          <Separator />

          {/* Programs Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <LayoutDashboard className="w-4 h-4 text-emerald-600" />
              <h4 className="font-semibold text-slate-900">Programs ({stats.programs.length})</h4>
            </div>
            {stats.programs.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No programs assigned</p>
            ) : (
              <div className="space-y-2">
                {stats.programs.map((program) => (
                  <div key={program.id} className="p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                    <div className="font-medium text-slate-900 text-sm mb-1">{program.title}</div>
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
              <ListTodo className="w-4 h-4 text-blue-600" />
              <h4 className="font-semibold text-slate-900">Tasks ({stats.tasks.length})</h4>
            </div>
            {stats.tasks.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No tasks assigned</p>
            ) : (
              <div className="space-y-2">
                {stats.tasks.map((task) => (
                  <div key={task.id} className="p-3 bg-blue-50 rounded-lg">
                    <div className="font-medium text-slate-900 text-sm mb-1">{task.title}</div>
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
              <FileText className="w-4 h-4 text-purple-600" />
              <h4 className="font-semibold text-slate-900">Notes ({notes.length})</h4>
            </div>
            {notes.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No notes</p>
            ) : (
              <div className="space-y-2">
                {notes.slice(0, 5).map((note) => (
                  <div key={note.id} className="p-3 bg-purple-50 rounded-lg">
                    <p className="text-sm text-slate-700 line-clamp-3">{note.content}</p>
                    <div className="text-xs text-slate-500 mt-1">
                      {new Date(note.created_date).toLocaleDateString()}
                    </div>
                  </div>
                ))}
                {notes.length > 5 && (
                  <p className="text-xs text-slate-500 text-center">+{notes.length - 5} more notes</p>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Expenses Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Receipt className="w-4 h-4 text-orange-600" />
              <h4 className="font-semibold text-slate-900">Expenses ({expenses.length})</h4>
            </div>
            {expenses.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No expenses</p>
            ) : (
              <div className="space-y-2">
                {expenses.slice(0, 5).map((expense) => (
                  <div key={expense.id} className="p-3 bg-orange-50 rounded-lg">
                    <div className="flex justify-between items-start mb-1">
                      <div className="font-medium text-slate-900 text-sm flex-1">{expense.description}</div>
                      <div className="font-bold text-orange-600 text-sm">${expense.amount.toLocaleString()}</div>
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
                {expenses.length > 5 && (
                  <p className="text-xs text-slate-500 text-center">+{expenses.length - 5} more expenses</p>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Staff Pay Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <h4 className="font-semibold text-slate-900">Staff Pay ({stats.staffPay.length})</h4>
            </div>
            {stats.staffPay.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No staff pay records</p>
            ) : (
              <>
                <div className="text-center p-4 bg-emerald-50 rounded-lg mb-3">
                  <div className="text-2xl font-bold text-emerald-700">
                    ${stats.totalStaffPay.toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-600">Total Staff Pay</div>
                </div>
                <div className="space-y-2">
                  {stats.staffPay.map((pay) => (
                    <div key={pay.id} className="p-3 bg-emerald-50 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium text-slate-900 text-sm">{pay.role || 'Staff'}</div>
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
              <MessageSquare className="w-4 h-4 text-indigo-600" />
              <h4 className="font-semibold text-slate-900">Messages ({messages.length})</h4>
            </div>
            {messages.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No messages</p>
            ) : (
              <div className="space-y-2">
                {messages.slice(0, 5).map((message) => (
                  <div key={message.id} className="p-3 bg-indigo-50 rounded-lg">
                    {message.is_announcement && (
                      <Badge className="bg-indigo-600 text-white text-xs mb-2">Announcement</Badge>
                    )}
                    <p className="text-sm text-slate-700 line-clamp-2">{message.content}</p>
                    <div className="text-xs text-slate-500 mt-1">
                      {message.sender_name} · {new Date(message.created_date).toLocaleDateString()}
                    </div>
                  </div>
                ))}
                {messages.length > 5 && (
                  <p className="text-xs text-slate-500 text-center">+{messages.length - 5} more messages</p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </ScrollArea>
    </Card>
  );
}