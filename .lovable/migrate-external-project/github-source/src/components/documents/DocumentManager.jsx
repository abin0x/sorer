import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Upload, Search, FileText, Trash2, Download, History, 
  Tag, Filter, X, Plus 
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const CATEGORIES = ["contract", "budget", "marketing", "registration", "legal", "report", "other"];
const STAGES = ["todo", "in_progress", "in_review", "done"];

export default function DocumentManager({ programId, currentUser }) {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [versionDialogOpen, setVersionDialogOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [uploadData, setUploadData] = useState({
    file: null,
    category: "other",
    stage: "",
    task_id: "",
    description: "",
    tags: []
  });
  const [tagInput, setTagInput] = useState("");
  
  const queryClient = useQueryClient();

  const { data: documents = [] } = useQuery({
    queryKey: ["documents", programId],
    queryFn: () => base44.entities.Document.filter({ program_id: programId }),
    enabled: !!programId
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", programId],
    queryFn: () => base44.entities.Task.filter({ program_id: programId }),
    enabled: !!programId
  });

  const uploadMutation = useMutation({
    mutationFn: async (data) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: data.file });
      return base44.entities.Document.create({
        program_id: programId,
        file_name: data.file.name,
        file_url,
        file_type: data.file.type,
        file_size: data.file.size,
        category: data.category,
        stage: data.stage,
        task_id: data.task_id || null,
        description: data.description,
        tags: data.tags,
        uploaded_by: currentUser?.email,
        version: 1
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", programId] });
      toast.success("Document uploaded");
      setUploadDialogOpen(false);
      setUploadData({ file: null, category: "other", stage: "", task_id: "", description: "", tags: [] });
    }
  });

  const uploadVersionMutation = useMutation({
    mutationFn: async (data) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: data.file });
      return base44.entities.Document.create({
        program_id: programId,
        file_name: data.file.name,
        file_url,
        file_type: data.file.type,
        file_size: data.file.size,
        category: selectedDoc.category,
        stage: selectedDoc.stage,
        task_id: selectedDoc.task_id,
        description: data.description || selectedDoc.description,
        tags: selectedDoc.tags,
        uploaded_by: currentUser?.email,
        version: selectedDoc.version + 1,
        previous_version_id: selectedDoc.id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", programId] });
      toast.success("New version uploaded");
      setVersionDialogOpen(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Document.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", programId] });
      toast.success("Document deleted");
    }
  });

  const handleAddTag = () => {
    if (tagInput && !uploadData.tags.includes(tagInput)) {
      setUploadData({ ...uploadData, tags: [...uploadData.tags, tagInput] });
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag) => {
    setUploadData({ ...uploadData, tags: uploadData.tags.filter(t => t !== tag) });
  };

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.file_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === "all" || doc.category === categoryFilter;
    const matchesStage = stageFilter === "all" || doc.stage === stageFilter;
    return matchesSearch && matchesCategory && matchesStage;
  });

  // Group by latest versions
  const latestVersions = {};
  filteredDocs.forEach(doc => {
    const key = doc.previous_version_id ? 
      (latestVersions[doc.previous_version_id]?.id || doc.previous_version_id) : 
      doc.id;
    if (!latestVersions[key] || doc.version > latestVersions[key].version) {
      latestVersions[key] = doc;
    }
  });

  const getCategoryColor = (category) => {
    const colors = {
      contract: "bg-blue-100 text-blue-700 border-blue-300",
      budget: "bg-emerald-100 text-emerald-700 border-emerald-300",
      marketing: "bg-purple-100 text-purple-700 border-purple-300",
      registration: "bg-amber-100 text-amber-700 border-amber-300",
      legal: "bg-red-100 text-red-700 border-red-300",
      report: "bg-indigo-100 text-indigo-700 border-indigo-300",
      other: "bg-slate-100 text-slate-700 border-slate-300"
    };
    return colors[category] || colors.other;
  };

  const getVersionHistory = (docId) => {
    const versions = [documents.find(d => d.id === docId)];
    let current = versions[0];
    while (current?.previous_version_id) {
      const prev = documents.find(d => d.id === current.previous_version_id);
      if (prev) {
        versions.push(prev);
        current = prev;
      } else break;
    }
    return versions.reverse();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Documents ({Object.keys(latestVersions).length})</h3>
        <Button onClick={() => setUploadDialogOpen(true)} size="sm" className="bg-emerald-600 hover:bg-emerald-700">
          <Upload className="w-4 h-4 mr-2" />
          Upload Document
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {STAGES.map(stage => (
              <SelectItem key={stage} value={stage}>{stage.replace(/_/g, ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Documents List */}
      <ScrollArea className="h-[400px]">
        <div className="space-y-2">
          {Object.values(latestVersions).map((doc) => (
            <Card key={doc.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-emerald-600" />
                      <span className="font-medium">{doc.file_name}</span>
                      {doc.version > 1 && (
                        <Badge variant="outline" className="text-xs">v{doc.version}</Badge>
                      )}
                    </div>
                    {doc.description && (
                      <p className="text-sm text-slate-600 mb-2">{doc.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1 mb-2">
                      <Badge className={getCategoryColor(doc.category)} variant="outline">
                        {doc.category}
                      </Badge>
                      {doc.stage && (
                        <Badge variant="outline">{doc.stage.replace(/_/g, ' ')}</Badge>
                      )}
                      {doc.tags?.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          <Tag className="w-3 h-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500">
                      Uploaded by {doc.uploaded_by} • {format(new Date(doc.created_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => window.open(doc.file_url, '_blank')}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => { setSelectedDoc(doc); setVersionDialogOpen(true); }}
                    >
                      <History className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (confirm("Delete this document?")) {
                          deleteMutation.mutate(doc.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {Object.keys(latestVersions).length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No documents yet</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>File *</Label>
              <Input
                type="file"
                onChange={(e) => setUploadData({ ...uploadData, file: e.target.files[0] })}
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={uploadData.category} onValueChange={(v) => setUploadData({ ...uploadData, category: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Program Stage</Label>
              <Select value={uploadData.stage} onValueChange={(v) => setUploadData({ ...uploadData, stage: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  {STAGES.map(stage => (
                    <SelectItem key={stage} value={stage}>{stage.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Associated Task (Optional)</Label>
              <Select value={uploadData.task_id} onValueChange={(v) => setUploadData({ ...uploadData, task_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select task" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>None</SelectItem>
                  {tasks.map(task => (
                    <SelectItem key={task.id} value={task.id}>{task.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={uploadData.description}
                onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
                placeholder="Document description..."
              />
            </div>
            <div>
              <Label>Tags</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Add tag..."
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                />
                <Button type="button" size="icon" onClick={handleAddTag}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {uploadData.tags.map(tag => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                    <button onClick={() => handleRemoveTag(tag)} className="ml-1">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>Cancel</Button>
              <Button
                onClick={() => uploadMutation.mutate(uploadData)}
                disabled={!uploadData.file}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Upload
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Version History Dialog */}
      <Dialog open={versionDialogOpen} onOpenChange={setVersionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Version History - {selectedDoc?.file_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Upload New Version</Label>
              <Input type="file" onChange={(e) => {
                if (e.target.files[0]) {
                  uploadVersionMutation.mutate({ file: e.target.files[0] });
                }
              }} />
            </div>
            <div>
              <Label>Previous Versions</Label>
              <ScrollArea className="h-[300px] border rounded-lg p-2">
                {selectedDoc && getVersionHistory(selectedDoc.id).map(v => (
                  <div key={v.id} className="p-3 bg-slate-50 rounded mb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <Badge variant="outline">v{v.version}</Badge>
                        <p className="text-sm mt-1">{format(new Date(v.created_date), 'MMM d, yyyy h:mm a')}</p>
                        <p className="text-xs text-slate-500">by {v.uploaded_by}</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => window.open(v.file_url, '_blank')}>
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}