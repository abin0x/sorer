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
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function NoteDetailDialog({ open, onOpenChange, note, onUpdate, onSave }) {
  const [content, setContent] = useState(note?.content || "");

  const queryClient = useQueryClient();

  const updateNoteMutation = useMutation({
    mutationFn: (data) => base44.entities.Note.update(note.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["notes", note.program_id] });
      toast.success("Note updated successfully");
      onUpdate?.();
      onOpenChange(false);
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: () => base44.entities.Note.delete(note.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["notes", note.program_id] });
      toast.success("Note deleted successfully");
      onUpdate?.();
      onOpenChange(false);
    },
  });

  React.useEffect(() => {
    if (note) {
      setContent(note.content || "");
    }
  }, [note]);

  const handleSave = () => {
    if (note?.id) {
      updateNoteMutation.mutate({ content });
    } else if (onSave) {
      onSave({ content });
      onOpenChange(false);
    }
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this note?")) {
      deleteNoteMutation.mutate();
    }
  };

  if (!note) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] dark:bg-slate-900">
        <DialogHeader>
          <DialogTitle className="dark:text-white">Note Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              placeholder="Enter note content..."
              className="dark:bg-slate-800 dark:border-slate-700"
            />
          </div>

          <div className="pt-4 border-t dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
            <p>Created: {new Date(note.created_date).toLocaleString()}</p>
            {note.created_by && <p>Created by: {note.created_by}</p>}
            {note.updated_date && <p>Last updated: {new Date(note.updated_date).toLocaleString()}</p>}
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteNoteMutation.isPending}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={updateNoteMutation.isPending}
            className="bg-purple-600 hover:bg-purple-700"
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}