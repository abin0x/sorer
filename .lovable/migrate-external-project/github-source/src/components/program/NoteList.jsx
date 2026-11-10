import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, FileText } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function NoteList({ programId }) {
  const [isAdding, setIsAdding] = useState(false);
  const [content, setContent] = useState("");
  const queryClient = useQueryClient();

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["notes", programId],
    queryFn: () => base44.entities.Note.filter({ program_id: programId }),
  });

  const createNoteMutation = useMutation({
    mutationFn: (noteData) => base44.entities.Note.create(noteData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      toast.success("Note added successfully");
      setContent("");
      setIsAdding(false);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    createNoteMutation.mutate({
      content,
      program_id: programId,
    });
  };

  return (
    <div className="space-y-4">
      {!isAdding && (
        <Button onClick={() => setIsAdding(true)} className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Add Note
        </Button>
      )}

      {isAdding && (
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter your note..."
                rows={4}
                required
              />
              <div className="flex gap-2">
                <Button type="submit" disabled={createNoteMutation.isPending}>
                  Add Note
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAdding(false);
                    setContent("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800 mx-auto" />
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No notes yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <Card key={note.id}>
              <CardContent className="pt-6">
                <p className="text-slate-700 whitespace-pre-wrap">{note.content}</p>
                <div className="flex items-center gap-2 mt-3 text-xs text-slate-500">
                  {note.created_by && <span>By {note.created_by}</span>}
                  {note.created_date && (
                    <>
                      <span>•</span>
                      <span>{format(new Date(note.created_date), "PPp")}</span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}