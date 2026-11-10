import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Paperclip, Users, Image as ImageIcon } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";

export default function ProjectChat({ programId, currentUser }) {
  const [message, setMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: program } = useQuery({
    queryKey: ["program", programId],
    queryFn: () => base44.entities.Program.filter({ id: programId }).then(data => data[0]),
    enabled: !!programId
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["chatMessages", programId],
    queryFn: () => base44.entities.ChatMessage.filter({ program_id: programId }, "-created_date"),
    refetchInterval: 3000,
    enabled: !!programId
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
    enabled: !!programId && !!currentUser?.email
  });

  const sendMessageMutation = useMutation({
    mutationFn: (data) => base44.entities.ChatMessage.create(data),
    onSuccess: async (newMsg) => {
      if (programId) {
        queryClient.invalidateQueries({ queryKey: ["chatMessages", programId] });
      }
      setMessage("");

      // Send notifications to team members
      if (program?.id && currentUser?.email) {
        try {
          const programTeam = teamMembers.filter(member => {
            if (member.email === currentUser.email) return false; // Don't notify sender
            return member.email === program.assignee || 
                   member.email === program.created_by_email ||
                   member.custom_role === 'admin' ||
                   member.custom_role === 'director';
          });

          const notificationPromises = programTeam.map(member =>
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
    }
  });

  const markAsReadMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ChatMessage.update(id, data),
    onSuccess: () => {
      if (programId) {
        queryClient.invalidateQueries({ queryKey: ["chatMessages", programId] });
      }
    }
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    
    if (!currentUser?.email) return;
    
    messages.forEach(msg => {
      if (msg.sender_email !== currentUser.email && 
          (!msg.read_by || !msg.read_by.includes(currentUser.email))) {
        const updatedReadBy = [...(msg.read_by || []), currentUser.email];
        markAsReadMutation.mutate({
          id: msg.id,
          data: { ...msg, read_by: updatedReadBy }
        });
      }
    });
  }, [messages, currentUser]);

  const handleSendMessage = () => {
    if (!message.trim() || !programId || !currentUser?.email) return;

    const mentionRegex = /@(\S+)/g;
    const mentions = [];
    let match;
    while ((match = mentionRegex.exec(message)) !== null) {
      const mentionedMember = teamMembers.find(m => 
        m.email.includes(match[1]) || m.full_name?.toLowerCase().includes(match[1].toLowerCase())
      );
      if (mentionedMember) {
        mentions.push(mentionedMember.email);
      }
    }

    sendMessageMutation.mutate({
      program_id: programId,
      sender_email: currentUser.email,
      sender_name: currentUser.full_name || currentUser.email,
      message: message.trim(),
      message_type: "text",
      mentioned_users: mentions.length > 0 ? mentions : undefined
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !programId || !currentUser?.email) return;

    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const isImage = file.type.startsWith('image/');
      
      sendMessageMutation.mutate({
        program_id: programId,
        sender_email: currentUser.email,
        sender_name: currentUser.full_name || currentUser.email,
        message: isImage ? `Shared an image: ${file.name}` : `Shared a file: ${file.name}`,
        message_type: "file",
        file_url,
        file_name: file.name
      });
      
      toast.success(isImage ? "Image uploaded" : "File uploaded");
    } catch (error) {
      toast.error("Failed to upload file");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const isImageFile = (url, fileName) => {
    if (!url) return false;
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    const lowerFileName = fileName?.toLowerCase() || '';
    return imageExtensions.some(ext => lowerFileName.endsWith(ext)) || 
           url.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i);
  };

  if (!programId || !currentUser?.email) {
    return (
      <Card className="dark:bg-slate-800 dark:border-slate-700">
        <CardContent className="p-6 text-center">
          <Users className="w-12 h-12 mx-auto mb-3 text-slate-400" />
          <p className="text-slate-600 dark:text-slate-400">Loading chat...</p>
        </CardContent>
      </Card>
    );
  }

  if (!program) {
    return (
      <Card className="dark:bg-slate-800 dark:border-slate-700">
        <CardContent className="p-6 text-center">
          <Users className="w-12 h-12 mx-auto mb-3 text-slate-400" />
          <p className="text-slate-600 dark:text-slate-400">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  const programTeam = teamMembers.filter(member => 
    member.email === program?.assignee || 
    member.email === program?.created_by_email ||
    member.custom_role === 'admin' ||
    member.custom_role === 'director'
  );

  const canAccess = programTeam.some(m => m.email === currentUser.email);

  if (!canAccess) {
    return (
      <Card className="dark:bg-slate-800 dark:border-slate-700">
        <CardContent className="p-6 text-center">
          <Users className="w-12 h-12 mx-auto mb-3 text-slate-400" />
          <p className="text-slate-600 dark:text-slate-400">
            You don't have access to this project's chat room.
          </p>
        </CardContent>
      </Card>
    );
  }

  const sortedMessages = [...messages].sort((a, b) => 
    new Date(a.created_date) - new Date(b.created_date)
  );

  return (
    <Card className="dark:bg-slate-800 dark:border-slate-700 flex flex-col h-[600px]">
      <CardHeader className="border-b dark:border-slate-700">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5" />
            Project Chat
          </CardTitle>
          <Badge variant="outline" className="dark:border-slate-600">
            {programTeam.length} members
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {programTeam.slice(0, 5).map(member => (
            <Badge key={member.id} variant="secondary" className="text-xs dark:bg-slate-700">
              {member.full_name || member.email}
            </Badge>
          ))}
          {programTeam.length > 5 && (
            <Badge variant="secondary" className="text-xs dark:bg-slate-700">
              +{programTeam.length - 5} more
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {sortedMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400">
            <div className="text-center">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No messages yet. Start the conversation!</p>
            </div>
          </div>
        ) : (
          sortedMessages.map((msg, idx) => {
            const isOwnMessage = msg.sender_email === currentUser?.email;
            const isImage = msg.message_type === "file" && isImageFile(msg.file_url, msg.file_name);
            const showDate = idx === 0 || 
              format(new Date(sortedMessages[idx - 1].created_date), "yyyy-MM-dd") !== 
              format(new Date(msg.created_date), "yyyy-MM-dd");

            return (
              <div key={msg.id}>
                {showDate && (
                  <div className="flex items-center justify-center my-4">
                    <Badge variant="outline" className="dark:border-slate-600 text-xs">
                      {format(new Date(msg.created_date), "MMMM d, yyyy")}
                    </Badge>
                  </div>
                )}
                <div className={`flex gap-3 ${isOwnMessage ? "flex-row-reverse" : ""}`}>
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarFallback className="bg-emerald-600 text-white text-xs">
                      {msg.sender_name?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`flex-1 ${isOwnMessage ? "items-end" : "items-start"} flex flex-col`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium dark:text-white">
                        {isOwnMessage ? "You" : msg.sender_name}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {format(new Date(msg.created_date), "h:mm a")}
                      </span>
                      {msg.edited && (
                        <Badge variant="outline" className="text-xs dark:border-slate-600">edited</Badge>
                      )}
                    </div>
                    <div className={`rounded-2xl px-4 py-2 max-w-[70%] ${
                      isOwnMessage 
                        ? "bg-emerald-600 text-white" 
                        : "bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white"
                    }`}>
                      {isImage ? (
                        <div className="space-y-2">
                          <a 
                            href={msg.file_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="block"
                          >
                            <img 
                              src={msg.file_url} 
                              alt={msg.file_name}
                              className="max-w-full rounded-lg max-h-64 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                            />
                          </a>
                          <p className="text-xs opacity-80">{msg.file_name}</p>
                        </div>
                      ) : msg.message_type === "file" ? (
                        <div className="flex items-center gap-2">
                          <Paperclip className="w-4 h-4" />
                          <a 
                            href={msg.file_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="underline hover:no-underline"
                          >
                            {msg.file_name}
                          </a>
                        </div>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                      )}
                    </div>
                    {msg.read_by && msg.read_by.length > 0 && isOwnMessage && (
                      <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Read by {msg.read_by.length}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </CardContent>

      <div className="border-t dark:border-slate-700 p-4">
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            className="hidden"
            accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <Paperclip className="w-4 h-4" />
          </Button>
          <Input
            placeholder="Type a message... (use @ to mention someone)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
            className="flex-1 dark:bg-slate-900 dark:border-slate-700"
          />
          <Button 
            onClick={handleSendMessage}
            disabled={!message.trim() || sendMessageMutation.isPending}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
          Team members will be notified when you send a message
        </p>
      </div>
    </Card>
  );
}