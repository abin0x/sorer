import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, Users, Image as ImageIcon } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";

export default function TeamChat({ program, currentUser }) {
  const [newMessage, setNewMessage] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: chatMessages = [] } = useQuery({
    queryKey: ["chatMessages", program?.id],
    queryFn: () => base44.entities.ChatMessage.filter({ program_id: program.id }, "-created_date"),
    enabled: !!program?.id,
    refetchInterval: 5000,
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
    enabled: !!program?.id && !!currentUser?.email,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", program?.id],
    queryFn: () => base44.entities.Task.filter({ program_id: program.id }),
    enabled: !!program?.id,
  });

  const sendMessageMutation = useMutation({
    mutationFn: (messageData) => base44.entities.ChatMessage.create(messageData),
    onSuccess: async (newMsg) => {
      if (program?.id) {
        queryClient.invalidateQueries({ queryKey: ["chatMessages", program.id] });
      }
      setNewMessage("");
      scrollToBottom();

      // Send notifications to team members
      if (program?.id && currentUser?.email) {
        try {
          const programTeamMembers = teamMembers.filter(member => {
            if (member.email === currentUser.email) return false; // Don't notify sender
            return member.email === program.assignee || 
                   tasks.some(task => task.assignee === member.email) ||
                   member.custom_role === 'admin' ||
                   member.custom_role === 'director';
          });

          const notificationPromises = programTeamMembers.map(member =>
            base44.entities.Notification.create({
              user_email: member.email,
              type: "mention",
              title: `New message in ${program.title}`,
              message: `${currentUser.full_name || currentUser.email}: ${newMsg.message.substring(0, 100)}${newMsg.message.length > 100 ? '...' : ''}`,
              link: createPageUrl("Kanban"),
              program_id: program.id
            })
          );

          await Promise.all(notificationPromises);
        } catch (error) {
          console.error("Failed to send notifications:", error);
        }
      }
    },
    onError: (error) => {
      console.error("Failed to send message:", error);
      toast.error("Failed to send message");
    }
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !program?.id || !currentUser?.email) return;

    setUploadingFile(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const isImage = file.type.startsWith('image/');
      
      sendMessageMutation.mutate({
        program_id: program.id,
        sender_email: currentUser.email,
        sender_name: currentUser.full_name || currentUser.email,
        message: isImage ? `Shared an image: ${file.name}` : `Shared a file: ${file.name}`,
        message_type: "file",
        file_url,
        file_name: file.name
      });
      
      toast.success(isImage ? "Image uploaded" : "File uploaded");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload file");
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !program?.id || !currentUser?.email) return;

    sendMessageMutation.mutate({
      program_id: program.id,
      sender_email: currentUser.email,
      sender_name: currentUser.full_name || currentUser.email,
      message: newMessage.trim(),
      message_type: "text"
    });
  };

  const formatMessageDate = (date) => {
    const messageDate = new Date(date);
    if (isToday(messageDate)) {
      return format(messageDate, 'h:mm a');
    } else if (isYesterday(messageDate)) {
      return `Yesterday ${format(messageDate, 'h:mm a')}`;
    } else {
      return format(messageDate, 'MMM d, h:mm a');
    }
  };

  const isImageFile = (url, fileName) => {
    if (!url) return false;
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    const lowerFileName = fileName?.toLowerCase() || '';
    return imageExtensions.some(ext => lowerFileName.endsWith(ext)) || 
           url.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i);
  };

  // Early return check AFTER all hooks
  if (!program?.id || !currentUser?.email) {
    return (
      <Card className="dark:bg-slate-900 dark:border-slate-800 h-[600px] flex items-center justify-center">
        <CardContent>
          <p className="text-slate-500 dark:text-slate-400">Loading chat...</p>
        </CardContent>
      </Card>
    );
  }

  // Get team members who are part of this program
  const programTeamMembers = teamMembers.filter(member => {
    if (currentUser?.custom_role === 'admin' || currentUser?.custom_role === 'director') {
      return true;
    }
    return member.email === program?.assignee || 
           tasks.some(task => task.assignee === member.email) ||
           member.email === currentUser.email;
  });

  // Filter messages - show all to admins, only team messages to others
  const visibleMessages = chatMessages.filter(msg => {
    if (currentUser?.custom_role === 'admin' || currentUser?.custom_role === 'director') {
      return true;
    }
    return programTeamMembers.some(member => member.email === msg.sender_email);
  }).reverse();

  return (
    <Card className="dark:bg-slate-900 dark:border-slate-800 h-[600px] flex flex-col">
      <CardHeader className="border-b dark:border-slate-800">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 dark:text-white">
            <Users className="w-5 h-5" />
            Team Chat
          </CardTitle>
          <Badge variant="outline" className="dark:border-slate-700">
            {programTeamMembers.length} {programTeamMembers.length === 1 ? 'member' : 'members'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {visibleMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <Users className="w-16 h-16 text-slate-300 dark:text-slate-700 mb-4" />
            <p className="text-slate-500 dark:text-slate-400 mb-2">No messages yet</p>
            <p className="text-sm text-slate-400 dark:text-slate-500">
              Start the conversation with your team
            </p>
          </div>
        ) : (
          <>
            {visibleMessages.map((message) => {
              const isOwnMessage = message.sender_email === currentUser?.email;
              const isImage = message.message_type === "file" && isImageFile(message.file_url, message.file_name);
              
              return (
                <div
                  key={message.id}
                  className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white text-sm font-semibold">
                      {message.sender_name?.[0]?.toUpperCase() || 'U'}
                    </div>
                  </div>
                  <div className={`flex-1 ${isOwnMessage ? 'flex flex-col items-end' : ''}`}>
                    <div className={`max-w-[80%] ${isOwnMessage ? 'text-right' : 'text-left'}`}>
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className={`text-sm font-medium text-slate-900 dark:text-white ${isOwnMessage ? 'order-2' : 'order-1'}`}>
                          {isOwnMessage ? 'You' : message.sender_name}
                        </span>
                        <span className={`text-xs text-slate-500 dark:text-slate-400 ${isOwnMessage ? 'order-1' : 'order-2'}`}>
                          {formatMessageDate(message.created_date)}
                        </span>
                      </div>
                      <div
                        className={`rounded-2xl px-4 py-2 ${
                          isOwnMessage
                            ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                        }`}
                      >
                        {isImage ? (
                          <div className="space-y-2">
                            <a 
                              href={message.file_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="block"
                            >
                              <img 
                                src={message.file_url} 
                                alt={message.file_name}
                                className="max-w-full rounded-lg max-h-64 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                              />
                            </a>
                            <p className="text-xs opacity-80">{message.file_name}</p>
                          </div>
                        ) : message.message_type === "file" ? (
                          <div className="flex items-center gap-2">
                            <ImageIcon className="w-4 h-4" />
                            <a 
                              href={message.file_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm underline hover:no-underline"
                            >
                              {message.file_name || 'Download file'}
                            </a>
                          </div>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap break-words">
                            {message.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </CardContent>

      <div className="border-t dark:border-slate-800 p-4">
        <form onSubmit={handleSendMessage} className="space-y-2">
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              className="hidden"
              accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingFile}
              className="dark:border-slate-700"
            >
              <ImageIcon className="w-4 h-4" />
            </Button>
            <Input
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 dark:bg-slate-800 dark:border-slate-700"
            />
            <Button
              type="submit"
              disabled={!newMessage.trim() || sendMessageMutation.isPending}
              className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Team members will be notified when you send a message
          </p>
        </form>
      </div>
    </Card>
  );
}