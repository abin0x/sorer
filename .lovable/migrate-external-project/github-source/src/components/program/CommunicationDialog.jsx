import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { MessageSquare, Send, Megaphone, User } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function CommunicationDialog({ open, onOpenChange, program, currentUser }) {
  const [messageContent, setMessageContent] = useState("");
  const [isAnnouncement, setIsAnnouncement] = useState(false);
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["messages", program?.id],
    queryFn: () => base44.entities.Message.filter({ program_id: program.id }, "-created_date"),
    enabled: !!program?.id && open,
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  const createMessageMutation = useMutation({
    mutationFn: (messageData) => base44.entities.Message.create(messageData),
    onSuccess: async (newMessage) => {
      queryClient.invalidateQueries({ queryKey: ["messages", program.id] });
      setMessageContent("");
      setIsAnnouncement(false);
      
      // Send email notifications to all team members except sender
      if (isAnnouncement) {
        const recipients = teamMembers.filter(member => member.email !== currentUser?.email);
        
        for (const recipient of recipients) {
          try {
            await base44.integrations.Core.SendEmail({
              to: recipient.email,
              subject: `📢 New Announcement: ${program.title}`,
              body: `
Hello ${recipient.full_name},

A new announcement has been posted for program "${program.title}":

${newMessage.content}

Posted by: ${currentUser?.full_name || currentUser?.email}

---
This is an automated message from your Program Management System.
              `.trim()
            });
          } catch (error) {
            console.error("Failed to send email to", recipient.email, error);
          }
        }
        toast.success("Announcement posted and notifications sent!");
      } else {
        toast.success("Message sent!");
      }
    },
  });

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageContent.trim()) return;

    createMessageMutation.mutate({
      program_id: program.id,
      content: messageContent,
      sender_email: currentUser?.email,
      sender_name: currentUser?.full_name || currentUser?.email,
      is_announcement: isAnnouncement,
    });
  };

  if (!program) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] h-[600px] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-slate-700" />
            <DialogTitle>Communication - {program.title}</DialogTitle>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`p-4 rounded-lg border ${
                    message.is_announcement
                      ? "bg-blue-50 border-blue-200"
                      : "bg-white border-slate-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-semibold text-xs">
                          {message.sender_name?.[0]?.toUpperCase() || 'U'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 text-sm">
                          {message.sender_name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {format(new Date(message.created_date), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                    </div>
                    {message.is_announcement && (
                      <Badge className="bg-blue-600 text-white flex items-center gap-1">
                        <Megaphone className="w-3 h-3" />
                        Announcement
                      </Badge>
                    )}
                  </div>
                  <p className="text-slate-700 text-sm whitespace-pre-wrap ml-10">
                    {message.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <form onSubmit={handleSendMessage} className="space-y-3 pt-4 border-t">
          <Textarea
            value={messageContent}
            onChange={(e) => setMessageContent(e.target.value)}
            placeholder="Type your message..."
            rows={3}
            className="border-slate-300 resize-none"
          />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="announcement"
                checked={isAnnouncement}
                onCheckedChange={setIsAnnouncement}
              />
              <Label htmlFor="announcement" className="cursor-pointer text-sm flex items-center gap-1">
                <Megaphone className="w-3.5 h-3.5" />
                Send as announcement (notifies all team)
              </Label>
            </div>
            
            <Button
              type="submit"
              className="bg-slate-800 hover:bg-slate-900"
              disabled={!messageContent.trim() || createMessageMutation.isPending}
            >
              {createMessageMutation.isPending ? (
                <>Sending...</>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}