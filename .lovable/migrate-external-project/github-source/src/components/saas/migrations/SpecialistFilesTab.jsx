import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, FileText, AlertCircle, UploadCloud, Check } from "lucide-react";

export default function SpecialistFilesTab({ job, onReplaced }) {
  const { toast } = useToast();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadingKey, setUploadingKey] = useState(null);
  const fileInputRef = useRef(null);
  const [pendingKey, setPendingKey] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await base44.functions.invoke("migration-approve-and-run", {
        migrationJobId: job.id,
        action: "get_files",
      });
      setFiles(data.files || []);
    } catch (e) {
      toast({ title: "Could not load files", description: e?.response?.data?.error || e?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [job.id, job.files]);

  const handleReplace = async (fileKey, file) => {
    if (!file) return;
    setUploadingKey(fileKey);
    try {
      // Step 1: Upload the corrected file to private storage
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      // Step 2: Update the job's files object with the new file_uri
      await base44.functions.invoke("migration-approve-and-run", {
        migrationJobId: job.id,
        action: "replace_file",
        file_key: fileKey,
        file_uri,
        file_name: file.name,
      });
      toast({ title: "File replaced", description: `${file.name} uploaded. Re-process the migration to apply fixes.` });
      await load();
      if (onReplaced) onReplaced();
    } catch (e) {
      toast({ title: "Upload failed", description: e?.response?.data?.error || e?.message, variant: "destructive" });
    } finally {
      setUploadingKey(null);
      setPendingKey(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const triggerFileInput = (key) => {
    setPendingKey(key);
    // Use a data attribute to track which key's input was triggered
    const input = document.getElementById(`file-input-${key}`);
    if (input) input.click();
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  if (files.length === 0) {
    return (
      <div className="text-center py-10 text-sm text-slate-400">
        <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
        No files uploaded for this migration.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 flex items-start gap-2.5">
        <UploadCloud className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-blue-800">Re-upload corrected files</p>
          <p className="text-xs text-blue-600 mt-0.5">Download a file, fix the data in Excel/Google Sheets, then re-upload the corrected version here. The old file is replaced.</p>
        </div>
      </div>

      <div className="space-y-2">
        {files.map((f) => (
          <div key={f.key} className="rounded-xl border border-slate-200 p-3.5 flex items-center gap-3 hover:border-primary/30 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-slate-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{f.file_name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge className="text-[10px] bg-slate-100 text-slate-600 capitalize">{f.key.replace(/_/g, " ")}</Badge>
                {f.replaced_at && <Badge className="text-[10px] bg-emerald-100 text-emerald-700 gap-0.5"><Check className="w-2.5 h-2.5" /> Replaced</Badge>}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {f.error ? (
                <div className="flex items-center gap-1 text-xs text-rose-600">
                  <AlertCircle className="w-3.5 h-3.5" /> {f.error}
                </div>
              ) : (
                <>
                  {f.signed_url && (
                    <a href={f.signed_url} target="_blank" rel="noopener noreferrer" download>
                      <Button size="sm" variant="outline" className="gap-1.5 h-8">
                        <Download className="w-3.5 h-3.5" /> Download
                      </Button>
                    </a>
                  )}
                  <input
                    id={`file-input-${f.key}`}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    className="hidden"
                    onChange={(e) => handleReplace(f.key, e.target.files?.[0])}
                  />
                  <Button size="sm" variant="default" className="gap-1.5 h-8"
                    disabled={!!uploadingKey}
                    onClick={() => triggerFileInput(f.key)}>
                    {uploadingKey === f.key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                    Re-upload
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}