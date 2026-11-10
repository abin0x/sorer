import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { callImport, uploadMigrationFile } from "@/lib/migrationImport";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, ArrowLeft, FileText, CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import MappingReview from "./MappingReview";

const ENTITY_LABEL = { Player: "Players", Guardian: "Guardians", Team: "Teams" };

export default function ProjectView({ projectId, onBack }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [reviewingFileId, setReviewingFileId] = useState(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["migrationProject", projectId],
    queryFn: () => callImport({ action: "get_project", project_id: projectId }),
    enabled: !!projectId,
  });

  const refresh = () => refetch();

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploading(true);
    try {
      const file_uri = await uploadMigrationFile(file);
      await callImport({
        action: "register_file",
        project_id: projectId,
        file_uri,
        original_name: file.name,
      });
      refresh();
      toast({ title: "File analyzed", description: "Columns have been auto-mapped for review." });
    } catch (e) {
      toast({ title: "Upload failed", description: e?.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const { project, files = [], mappings = [], targets } = data || {};
  const reviewingFile = reviewingFileId ? files.find((f) => f.id === reviewingFileId) : null;

  if (reviewingFile) {
    const fileMappings = mappings.filter((m) => m.file_id === reviewingFile.id);
    return (
      <MappingReview
        file={reviewingFile}
        mappings={fileMappings}
        targets={targets}
        onBack={() => setReviewingFileId(null)}
        onRefresh={refresh}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="w-4 h-4" /> All projects</Button>
      </div>
      <div>
        <h2 className="text-lg font-bold text-slate-900">{project?.name}</h2>
        <p className="text-sm text-slate-500">{project?.source_system} · {project?.season || "no season"} · status: {project?.status}</p>
      </div>

      <div className="flex items-center gap-3">
        <label>
          <input type="file" accept=".csv,.txt" className="hidden" onChange={handleUpload} disabled={uploading} />
          <Button asChild disabled={uploading}><span><Upload className="w-4 h-4" /> {uploading ? "Uploading…" : "Upload CSV"}</span></Button>
        </label>
        <span className="text-xs text-slate-400">Players, guardians, teams — one entity per file.</span>
      </div>

      {files.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-slate-500">No files uploaded yet. Upload a CSV export to begin.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {files.map((f) => (
            <button key={f.id} onClick={() => setReviewingFileId(f.id)} className="w-full text-left">
              <Card className="hover:border-primary/40 transition-colors"><CardContent className="p-4 flex items-center gap-3">
                <FileText className="w-5 h-5 text-slate-400" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate">{f.original_name}</p>
                  <p className="text-xs text-slate-500">
                    {ENTITY_LABEL[f.selected_entity] || f.selected_entity} · {f.row_count} rows · {f.column_count} columns
                  </p>
                </div>
                {f.status === "confirmed" ? (
                  <span className="flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 className="w-4 h-4" /> Confirmed</span>
                ) : (
                  <span className="text-xs text-amber-600">Review mapping</span>
                )}
              </CardContent></Card>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}