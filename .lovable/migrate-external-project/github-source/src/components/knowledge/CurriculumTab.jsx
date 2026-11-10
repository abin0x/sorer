import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AdisalCard, SectionLabel } from "@/components/adisal/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Trash2, FileText, Loader2, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ROLES } from "@/lib/rbac";

const CAN_MANAGE_ROLES = [
  ROLES.MASTER_ADMIN, ROLES.ADMIN, ROLES.CLUB_DIRECTOR,
  ROLES.BRANCH_DIRECTOR, ROLES.PLATFORM_DIRECTOR,
];

const CATEGORIES = [
  { value: "curriculum", label: "Curriculum" },
  { value: "philosophy", label: "Philosophy" },
  { value: "session_plan", label: "Session Plan" },
  { value: "position_guide", label: "Position Guide" },
  { value: "development_framework", label: "Development Framework" },
  { value: "policy", label: "Policy" },
  { value: "other", label: "Other" },
];

export default function CurriculumTab({ user }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", category: "curriculum", description: "", content_text: "", tags: [] });
  const [tagInput, setTagInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const fileRef = useRef(null);

  const canManage = user && CAN_MANAGE_ROLES.includes(user.custom_role || user.role);

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["curriculum-docs"],
    queryFn: () => base44.entities.CurriculumDocument.list("-created_date", 200),
  });

  const filtered = docs.filter((d) =>
    !search || d.title?.toLowerCase().includes(search.toLowerCase()) || d.description?.toLowerCase().includes(search.toLowerCase())
  );

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      setForm((f) => ({ ...f, file_url, file_name: file.name }));

      // Extract text from the file
      const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            content_text: { type: "string", description: "Full text content of the document" },
            title: { type: "string", description: "Document title if found" },
          },
        },
      });
      if (extracted.status === "success" && extracted.output) {
        setForm((f) => ({
          ...f,
          content_text: extracted.output.content_text || f.content_text,
          title: f.title || extracted.output.title || file.name.replace(/\.[^.]+$/, ""),
        }));
      }
      toast.success("File uploaded and text extracted");
    } catch {
      toast.error("Upload failed — you can still paste content manually");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    setSaving(true);
    try {
      const me = await base44.auth.me().catch(() => null);
      await base44.entities.CurriculumDocument.create({
        ...form,
        uploaded_by: me?.email,
        uploaded_by_name: me?.full_name,
        is_active: true,
      });
      setForm({ title: "", category: "curriculum", description: "", content_text: "", tags: [] });
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ["curriculum-docs"] });
      toast.success("Curriculum document added");
    } catch {
      toast.error("Failed to save document");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await base44.entities.CurriculumDocument.delete(id);
      queryClient.invalidateQueries({ queryKey: ["curriculum-docs"] });
      toast.success("Document deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  const toggleActive = async (doc) => {
    try {
      await base44.entities.CurriculumDocument.update(doc.id, { is_active: !doc.is_active });
      queryClient.invalidateQueries({ queryKey: ["curriculum-docs"] });
    } catch {
      toast.error("Failed to update");
    }
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) {
      setForm((f) => ({ ...f, tags: [...f.tags, t] }));
    }
    setTagInput("");
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search curriculum documents…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        {canManage && (
          <Button onClick={() => setShowForm((v) => !v)} className="bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-1.5" /> {showForm ? "Cancel" : "Add Document"}
          </Button>
        )}
      </div>

      {showForm && canManage && (
        <AdisalCard className="p-5 space-y-3">
          <SectionLabel>Upload Curriculum Document</SectionLabel>
          <p className="text-xs text-muted-foreground">Upload a PDF or document file — text will be extracted automatically and used as context when coaches generate player feedback from notes.</p>
          <div>
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt,.md" onChange={handleUpload} className="hidden" />
            <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Upload className="w-4 h-4 mr-1.5" />}
              {form.file_name ? form.file_name : "Choose File"}
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold">Title</label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Document title" />
            </div>
            <div>
              <label className="text-xs font-semibold">Category</label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold">Description</label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Short description" />
          </div>
          <div>
            <label className="text-xs font-semibold">Content (auto-extracted, editable)</label>
            <Textarea value={form.content_text} onChange={(e) => setForm({ ...form, content_text: e.target.value })} className="min-h-[120px]" placeholder="Document text content — used as AI context for feedback generation" />
          </div>
          <div>
            <label className="text-xs font-semibold">Tags</label>
            <div className="flex items-center gap-2 mt-1">
              <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())} placeholder="Type tag and Enter" className="flex-1" />
              <Button size="sm" variant="outline" onClick={addTag}>Add</Button>
            </div>
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.tags.map((t) => (
                  <Badge key={t} variant="secondary" className="cursor-pointer" onClick={() => setForm((f) => ({ ...f, tags: f.tags.filter((x) => x !== t) }))}>{t} ×</Badge>
                ))}
              </div>
            )}
          </div>
          <Button onClick={handleSave} disabled={saving || !form.title.trim()} className="bg-primary hover:bg-primary/90">
            {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null} Save Document
          </Button>
        </AdisalCard>
      )}

      {isLoading ? (
        <div className="text-center py-20 text-muted-foreground">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">No curriculum documents yet. {canManage && "Upload documents to provide context for AI-generated feedback."}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((doc) => (
            <AdisalCard key={doc.id} className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <Badge variant="outline" className="text-[10px] mb-1.5 capitalize">{doc.category?.replace(/_/g, " ")}</Badge>
                  <h3 className="font-bold text-sm">{doc.title}</h3>
                  {doc.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{doc.description}</p>}
                </div>
                {canManage && (
                  <button onClick={() => handleDelete(doc.id)} className="text-muted-foreground hover:text-destructive shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {doc.content_text && (
                <p className="text-xs text-muted-foreground line-clamp-3">{doc.content_text}</p>
              )}
              <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-border">
                {doc.tags?.map((t) => <Badge key={t} variant="secondary" className="text-[9px]">{t}</Badge>)}
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {doc.created_date ? format(new Date(doc.created_date), "MMM d, yyyy") : ""}
                </span>
              </div>
              {canManage && (
                <button
                  onClick={() => toggleActive(doc)}
                  className={`text-[10px] font-medium ${doc.is_active ? "text-emerald-600" : "text-muted-foreground"}`}
                >
                  {doc.is_active ? "● Active (used for Automated generated context)" : "○ Inactive"}
                </button>
              )}
            </AdisalCard>
          ))}
        </div>
      )}
    </div>
  );
}