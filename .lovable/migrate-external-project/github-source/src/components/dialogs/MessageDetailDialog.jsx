import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function MessageDetailDialog({ open, onOpenChange, message, onSave, onUpdate }) {
  const [formData, setFormData] = useState({
    content: message?.content || "",
    is_announcement: message?.is_announcement || false,
  });

  const queryClient = useQueryClient();

  const updateMessageMutation = useMutation({
    mutationFn: (data) => base44.entities.Message.update(message.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      queryClient.invalidateQueries({ queryKey: ["messages", message.program_id] });
      toast.success("Message updated");
      onUpdate?.();
      onOpenChange(false);
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: () => base44.entities.Message.delete(message.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      queryClient.invalidateQueries({ queryKey: ["messages", message.program_id] });
      toast.success("Message deleted");
      onUpdate?.();
      onOpenChange(false);
    },
  });

  React.useEffect(() => {
    if (message) {
      setFormData({
        content: message.content || "",
        is_announcement: message.is_announcement || false,
      });
    }
  }, [message]);

  const handleSave = () => {
    if (!formData.content.trim()) {
      toast.error("Message content is required");
      return;
    }

    if (message?.id) {
      updateMessageMutation.mutate(formData);
    } else if (onSave) {
      onSave(formData);
      onOpenChange(false);
    }
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this message?")) {
      deleteMessageMutation.mutate();
    }
  };

  if (!message) return null;

  const isNewMessage = !message.id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] dark:bg-slate-900">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 dark:text-white">
            {isNewMessage ? "Post Message" : "Message Details"}
            {message.is_announcement && !isNewMessage && (
              <Badge className="bg-indigo-600 text-white">Announcement</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 p-1">
            {isNewMessage ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="content">Message *</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Type your message here..."
                    rows={6}
                    className="dark:bg-slate-800 dark:border-slate-700"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-indigo-50 dark:bg-indigo-950 rounded-lg border border-indigo-200 dark:border-indigo-800">
                  <div>
                    <Label htmlFor="is_announcement" className="cursor-pointer">Send as Announcement</Label>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      Announcements will notify all team members via email
                    </p>
                  </div>
                  <Switch
                    id="is_announcement"
                    checked={formData.is_announcement}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_announcement: checked })}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <p className="text-slate-900 dark:text-white whitespace-pre-wrap">{message.content}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500 dark:text-slate-400 mb-1">Sender</p>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {message.sender_name || message.sender_email}
                    </p>
                    {message.sender_name && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">{message.sender_email}</p>
                    )}
                  </div>

                  <div>
                    <p className="text-slate-500 dark:text-slate-400 mb-1">Date</p>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {new Date(message.created_date).toLocaleString()}
                    </p>
                  </div>
                </div>

                {message.is_announcement && (
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 rounded-lg">
                    <p className="text-sm text-indigo-900 dark:text-indigo-300">
                      📢 This message was sent as an announcement to all program team members
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="flex gap-2">
          {!isNewMessage && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMessageMutation.isPending}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {isNewMessage && (
            <Button 
              onClick={handleSave}
              disabled={updateMessageMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              Send Message
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}