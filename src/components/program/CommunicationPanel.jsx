import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Send, Megaphone, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function CommunicationPanel({ program, currentUser, tasks = [] }) {
  const [message, setMessage] = useState("");
  const [isAnnouncement, setIsAnnouncement] = useState(false);
  const queryClient = useQueryClient();

  const { data: messages = [] } = useQuery({
    queryKey: ["messages", program.id],
    queryFn: () => base44.entities.Message.filter({ program_id: program.id }, "-created_date"),
  });

  const { data: allTeamMembers = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  const createMessageMutation = useMutation({
    mutationFn: (messageData) => base44.entities.Message.create(messageData),
    onSuccess: async (newMessage) => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      setMessage("");
      setIsAnnouncement(false);
      
      if (newMessage.is_announcement) {
        // Send email notifications to relevant team members
        const relevantMembers = getRelevantTeamMembers();
        for (const member of relevantMembers) {
          try {
            await base44.integrations.Core.SendEmail({
              to: member.email,
              subject: `Announcement: ${program.title}`,
              body: `
Hello ${member.full_name},

New announcement for program: ${program.title}

${newMessage.content}

From: ${currentUser?.full_name || currentUser?.email}

---
This is an automated message from your Program Management System.
              `.trim()
            });
          } catch (error) {
            console.error("Failed to send announcement email", error);
          }
        }
      }
    },
  });

  const getRelevantTeamMembers = () => {
    const memberEmails = new Set();
    
    // Add program assignee
    if (program.assignee) {
      memberEmails.add(program.assignee);
    }
    
    // Add task assignees
    tasks.forEach(task => {
      if (task.assignee) {
        memberEmails.add(task.assignee);
      }
    });
    
    // Filter team members
    return allTeamMembers.filter(member => memberEmails.has(member.email));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    createMessageMutation.mutate({
      program_id: program.id,
      content: message,
      sender_email: currentUser?.email,
      sender_name: currentUser?.full_name || currentUser?.email,
      is_announcement: isAnnouncement,
    });
  };

  const relevantMembers = getRelevantTeamMembers();

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-slate-700 mb-2">
              Team Members in this Program
            </h4>
            <div className="flex flex-wrap gap-2">
              {relevantMembers.length > 0 ? (
                relevantMembers.map(member => (
                  <div 
                    key={member.email}
                    className="px-3 py-1 bg-slate-100 rounded-full text-sm text-slate-700"
                  >
                    {member.full_name || member.email}
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No team members assigned</p>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              rows={4}
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="announcement"
                  checked={isAnnouncement}
                  onCheckedChange={setIsAnnouncement}
                />
                <Label htmlFor="announcement" className="text-sm cursor-pointer">
                  Send as announcement (email notification)
                </Label>
              </div>
              <Button 
                type="submit" 
                disabled={createMessageMutation.isPending || !message.trim()}
              >
                <Send className="w-4 h-4 mr-2" />
                Send
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3 max-h-[500px] overflow-y-auto">
        {messages.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No messages yet</p>
          </div>
        ) : (
          messages.map((msg) => (
            <Card key={msg.id} className={msg.is_announcement ? "border-blue-200 bg-blue-50" : ""}>
              <CardContent className="pt-6">
                {msg.is_announcement && (
                  <div className="flex items-center gap-1 text-blue-600 text-sm font-semibold mb-2">
                    <Megaphone className="w-4 h-4" />
                    Announcement
                  </div>
                )}
                <p className="text-slate-700 whitespace-pre-wrap">{msg.content}</p>
                <div className="flex items-center gap-2 mt-3 text-xs text-slate-500">
                  <span className="font-semibold">{msg.sender_name}</span>
                  {msg.created_date && (
                    <>
                      <span>•</span>
                      <span>{format(new Date(msg.created_date), "PPp")}</span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}