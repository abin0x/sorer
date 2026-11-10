import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Simple entity to track who's typing
export function useTypingIndicator(programId, currentUser) {
  const [typingUsers, setTypingUsers] = useState([]);
  const queryClient = useQueryClient();

  const { data: indicators = [] } = useQuery({
    queryKey: ["typingIndicators", programId],
    queryFn: async () => {
      if (!programId) return [];
      try {
        // We'll use chat messages with a special flag to track typing
        // In a real app, this would be a real-time websocket connection
        const recentMessages = await base44.entities.ChatMessage.filter(
          { program_id: programId },
          "-created_date",
          50
        );
        return recentMessages;
      } catch {
        return [];
      }
    },
    enabled: !!programId,
    refetchInterval: 2000,
  });

  // For demo purposes, we'll show typing if someone sent a message in last 3 seconds
  useEffect(() => {
    if (!programId || !currentUser) return;
    
    const now = new Date();
    const typing = [];
    
    indicators.forEach(msg => {
      if (msg.sender_email === currentUser.email) return;
      const msgTime = new Date(msg.created_date);
      const diff = (now - msgTime) / 1000;
      
      // If message was sent in last 3 seconds, consider user as typing
      if (diff < 3 && !typing.find(u => u.email === msg.sender_email)) {
        typing.push({
          email: msg.sender_email,
          name: msg.sender_name
        });
      }
    });
    
    setTypingUsers(typing.slice(0, 3)); // Max 3 users shown
  }, [indicators, programId, currentUser]);

  return typingUsers;
}

export function TypingIndicator({ users }) {
  if (users.length === 0) return null;

  const names = users.map(u => u.name).join(", ");
  const text = users.length === 1 
    ? `${names} is typing...` 
    : `${names} are typing...`;

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 dark:text-slate-400">
      <div className="flex gap-1">
        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span>{text}</span>
    </div>
  );
}