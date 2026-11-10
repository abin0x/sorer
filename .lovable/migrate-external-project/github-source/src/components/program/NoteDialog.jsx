import React, { useState } from "react";
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
import { toast } from "sonner";

export default function NoteDialog({ open, onOpenChange, programId, onSave }) {
  const [content, setContent] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!content.trim()) {
      toast.error("Note content is required");
      return;
    }
    
    onSave({
      content,
      program_id: programId,
    });
    setContent("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] dark:bg-slate-900">
        <DialogHeader>
          <DialogTitle className="dark:text-white">Add Note</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="note_content">Note Content *</Label>
            <Textarea
              id="note_content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter your note..."
              rows={6}
              required
              className="border-slate-300 resize-none"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="hover:scale-105 transition-transform">
              Cancel
            </Button>
            <Button type="submit" className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:scale-105 transition-all">
              Add Note
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}