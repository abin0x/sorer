import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

export default function RealtimeCollaboration({ programId, currentUser }) {
  const [activeUsers, setActiveUsers] = useState([]);

  useEffect(() => {
    // Subscribe to real-time updates for active users viewing this program
    const unsubscribe = base44.entities.Program.subscribe((event) => {
      if (event.id === programId && event.type === 'update') {
        // Program updated - refresh active users
        checkActiveUsers();
      }
    });

    checkActiveUsers();

    return () => unsubscribe?.();
  }, [programId]);

  const checkActiveUsers = async () => {
    try {
      // In a real scenario, you'd track user sessions per program
      // For now, we'll just show the current user as active
      setActiveUsers(currentUser ? [currentUser] : []);
    } catch (error) {
      console.error('Error checking active users:', error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-2">
      
      <span className="text-xs dark:text-slate-400 text-[hsl(var(--card))]">Active:</span>
      <div className="flex gap-1">
        {activeUsers.map((user) =>
        <motion.div
          key={user.id}
          whileHover={{ scale: 1.1 }}
          className="relative"
          title={user.full_name}>
          
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-xs font-semibold shadow-lg">
              {user.full_name?.[0]?.toUpperCase()}
            </div>
            <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full border border-white dark:border-slate-900 animate-pulse"></div>
          </motion.div>
        )}
      </div>
    </motion.div>);

}