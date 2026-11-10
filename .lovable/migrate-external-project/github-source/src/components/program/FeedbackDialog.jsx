import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export default function FeedbackDialog({ open, onOpenChange, program, currentUser, onSubmit }) {
  const [formData, setFormData] = useState({
    rating: 0,
    feedback_type: "overall",
    comment: "",
    is_anonymous: false
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.rating) {
      toast.error("Please provide a rating");
      return;
    }

    onSubmit({
      ...formData,
      program_id: program.id,
      user_email: currentUser.email,
      user_name: currentUser.full_name || currentUser.email
    });

    setFormData({
      rating: 0,
      feedback_type: "overall",
      comment: "",
      is_anonymous: false
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Provide Feedback</DialogTitle>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Share your thoughts on {program?.title}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Rating *</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setFormData({ ...formData, rating: star })}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= formData.rating
                        ? "fill-amber-500 text-amber-500"
                        : "text-slate-300"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Feedback Type</Label>
            <Select
              value={formData.feedback_type}
              onValueChange={(value) => setFormData({ ...formData, feedback_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="execution">Execution</SelectItem>
                <SelectItem value="planning">Planning</SelectItem>
                <SelectItem value="communication">Communication</SelectItem>
                <SelectItem value="overall">Overall</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Comments</Label>
            <Textarea
              value={formData.comment}
              onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
              placeholder="Share your thoughts..."
              rows={4}
              className="resize-none"
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <Label htmlFor="anonymous" className="cursor-pointer">
              Submit anonymously
            </Label>
            <Switch
              id="anonymous"
              checked={formData.is_anonymous}
              onCheckedChange={(checked) => setFormData({ ...formData, is_anonymous: checked })}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button 
              type="submit"
              className="flex-1 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 shadow-lg"
            >
              Submit Feedback
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}