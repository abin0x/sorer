import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from '@/lib/router-compat';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, MessageSquare, Search, Paperclip, ChevronLeft } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import ConversationListItem from "@/components/communication/ConversationListItem";
import MessageBubble from "@/components/communication/MessageBubble";

export default function ConversationsTab({ user }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: programs = [] } = useQuery({ queryKey: ["programs"], queryFn: () => base44.entities.Program.list("-created_date") });

  // The open chat lives in the URL (?chat=<program id>), so opening a
  // conversation is a real navigation: the system back button returns to the
  // conversation list instead of leaving the portal, and a chat can be linked to.
  const openChatId = searchParams.get("chat");
  const selectedConversation = openChatId ? programs.find((p) => p.id === openChatId) || null : null;
  const openChat = (program) => {
    const next = new URLSearchParams(searchParams);
    next.set("chat", program.id);
    setSearchParams(next);
  };
  const closeChat = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("chat");
    setSearchParams(next, { replace: true });
  };
  const { data: allMessages = [] } = useQuery({
    queryKey: ["allChatMessages"],
    queryFn: () => base44.entities.ChatMessage.list("-created_date"),
    refetchInterval: 5000,
  });
  const { data: teamMembers = [] } = useQuery({ queryKey: ["users"], queryFn: () => base44.entities.User.list() });

  const sendMessageMutation = useMutation({
    mutationFn: (data) => base44.entities.ChatMessage.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["allChatMessages"] }); setMessage(""); },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async ({ messageIds, userEmail }) => {
      await Promise.all(
        messageIds.map((id) => {
          const msg = allMessages.find((m) => m.id === id);
          if (!msg) return Promise.resolve();
          const newReadBy = [...new Set([...(msg.read_by || []), userEmail])];
          return base44.entities.ChatMessage.update(id, { read_by: newReadBy });
        })
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["allChatMessages"] }),
  });

  const userPrograms = programs.filter((p) => {
    if (!user?.email) return false;
    return p.assignee === user.email || p.created_by_email === user.email ||
      (p.accountable || []).includes(user.email) || (p.responsible || []).includes(user.email) ||
      ["admin", "master_admin", "club_director", "club_admin"].includes(user.custom_role);
  });

  const conversations = userPrograms
    .map((program) => {
      const programMessages = allMessages.filter((m) => m.program_id === program.id);
      const lastMessage = programMessages[0];
      const unreadCount = programMessages.filter((m) => m.sender_email !== user?.email && (!m.read_by || !m.read_by.includes(user?.email))).length;
      return { program, messages: programMessages.sort((a, b) => new Date(a.created_date) - new Date(b.created_date)), lastMessage, unreadCount };
    })
    .filter((c) => c.messages.length > 0);

  const filteredConversations = conversations.filter((c) => c.program.title.toLowerCase().includes(searchTerm.toLowerCase()));
  const selectedMessages = selectedConversation ? conversations.find((c) => c.program.id === selectedConversation.id)?.messages || [] : [];

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [selectedMessages]);

  useEffect(() => {
    if (!selectedConversation || !user?.email || selectedMessages.length === 0) return;
    const unread = selectedMessages.filter((m) => m.sender_email !== user.email && (!m.read_by || !m.read_by.includes(user.email)));
    if (unread.length > 0) markAsReadMutation.mutate({ messageIds: unread.map((m) => m.id), userEmail: user.email });
  }, [selectedConversation?.id, selectedMessages.length, user?.email]);

  const handleSend = () => {
    if (!message.trim() || !selectedConversation || !user?.email) return;
    const text = message.trim();
    const mentionRegex = /@(\S+)/g;
    const mentions = [];
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      const mentioned = teamMembers.find((m) => m.email?.toLowerCase().startsWith(match[1].toLowerCase()) || m.full_name?.toLowerCase().includes(match[1].toLowerCase()));
      if (mentioned && !mentions.includes(mentioned.email)) mentions.push(mentioned.email);
    }
    sendMessageMutation.mutate({
      program_id: selectedConversation.id,
      sender_email: user.email,
      sender_name: user.full_name || user.email,
      message: text,
      message_type: "text",
      mentioned_users: mentions,
    });
    mentions.forEach(async (email) => {
      try {
        await base44.entities.Notification.create({
          user_email: email, type: "mention",
          title: `${user.full_name || user.email} mentioned you`,
          message: `In ${selectedConversation.title}: ${text.substring(0, 100)}`,
          program_id: selectedConversation.id, read: false,
        });
      } catch (e) { /* ignore */ }
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConversation || !user?.email) return;
    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      const isImage = file.type.startsWith("image/");
      sendMessageMutation.mutate({
        program_id: selectedConversation.id,
        sender_email: user.email, sender_name: user.full_name || user.email,
        message: isImage ? `Shared an image: ${file.name}` : `Shared a file: ${file.name}`,
        message_type: "file", file_url, file_name: file.name,
      });
      toast.success(isImage ? "Image uploaded" : "File uploaded");
    } catch (err) { toast.error("Failed to upload file"); }
    finally { setIsUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-220px)] min-h-[420px]">
      {/* Conversations list — hidden on mobile once a chat is open */}
      <div className={`w-full md:w-80 lg:w-96 shrink-0 flex-col rounded-2xl border border-border/60 bg-card overflow-hidden ${selectedConversation ? "hidden md:flex" : "flex"}`}>
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search conversations..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-9 rounded-full" />
          </div>
        </div>
        <ScrollArea className="flex-1">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
              <MessageSquare className="w-10 h-10 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No conversations yet</p>
            </div>
          ) : (
            <div className="p-1.5 space-y-1">
              {filteredConversations.map((c) => (
                <ConversationListItem
                  key={c.program.id}
                  program={c.program}
                  lastMessage={c.lastMessage}
                  unreadCount={c.unreadCount}
                  active={selectedConversation?.id === c.program.id}
                  onClick={() => openChat(c.program)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Messages view — full-width on mobile when a chat is open */}
      <div className={`flex-1 flex-col rounded-2xl border border-border/60 bg-card overflow-hidden ${selectedConversation ? "flex" : "hidden md:flex"}`}>
        {!selectedConversation ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Select a conversation to start messaging</p>
            </div>
          </div>
        ) : (
          <>
            <div className="p-3 border-b border-border flex items-center gap-2 bg-card">
              <Button variant="ghost" size="icon" className="md:hidden shrink-0 -ml-1" onClick={closeChat} aria-label="Back to conversations">
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-[11px] font-bold shrink-0">
                {selectedConversation.title?.[0]?.toUpperCase() || "#"}
              </div>
              <div className="min-w-0">
                <h2 className="font-bold text-foreground text-sm truncate">{selectedConversation.title}</h2>
                <p className="text-xs text-muted-foreground truncate">{selectedConversation.branch || "—"} · {selectedConversation.season || "—"}</p>
              </div>
            </div>
            <ScrollArea className="flex-1 p-3 sm:p-4">
              <div className="space-y-3 max-w-3xl mx-auto">
                {selectedMessages.map((msg, idx) => {
                  const isOwn = msg.sender_email === user?.email;
                  const showDate = idx === 0 || format(new Date(selectedMessages[idx - 1].created_date), "yyyy-MM-dd") !== format(new Date(msg.created_date), "yyyy-MM-dd");
                  return (
                    <div key={msg.id}>
                      {showDate && (
                        <div className="flex items-center justify-center my-3">
                          <Badge variant="outline" className="text-[10px] bg-background">{format(new Date(msg.created_date), "MMMM d, yyyy")}</Badge>
                        </div>
                      )}
                      <MessageBubble message={msg} isOwn={isOwn} />
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
            <div className="p-2.5 sm:p-3 border-t border-border bg-card">
              <input ref={fileInputRef} type="file" onChange={handleFileUpload} className="hidden" accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx" />
              <div className="flex gap-2 max-w-3xl mx-auto">
                <Button variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="shrink-0 rounded-full">
                  <Paperclip className="w-4 h-4" />
                </Button>
                <Input
                  placeholder="Type a message... (use @ to mention)"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  className="flex-1 rounded-full"
                />
                <Button onClick={handleSend} disabled={!message.trim() || sendMessageMutation.isPending} className="bg-primary hover:bg-primary/90 shrink-0 rounded-full">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}