import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Upload, Download, AlertCircle, CheckCircle2, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { exportToCsv, parseCsvFile } from "@/lib/csvUtils";
import { base44 } from "@/api/base44Client";

/**
 * Generic CSV import dialog.
 *
 * @param {boolean} open
 * @param {function} onOpenChange
 * @param {string} entityName - SDK entity name (e.g. "Program")
 * @param {Array} csvFields - [{ key, label, type?, isArray? }] field config
 * @param {Array} queryKey - react-query key to invalidate after import
 * @param {string} title - dialog title
 * @param {function} customImport - optional async (item) => void; overrides default entity.create
 * @param {Array} sampleRecords - optional sample rows for template download
 */
export default function CsvImportDialog({
  open,
  onOpenChange,
  entityName,
  csvFields,
  queryKey,
  title = "Import from CSV",
  customImport,
  sampleRecords = [],
}) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState(null);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) {
      if (f.name.endsWith(".csv") || f.name.endsWith(".xlsx") || f.name.endsWith(".xls")) {
        setFile(f);
        setResults(null);
      } else {
        toast.error("Please upload a CSV or Excel file");
      }
    }
  };

  const downloadTemplate = () => {
    const headers = csvFields.map((f) => f.label);
    const sampleRow = sampleRecords.length > 0
      ? csvFields.map((f) => {
          const val = sampleRecords[0][f.key];
          if (val == null) return "";
          if (Array.isArray(val)) return val.join("; ");
          return String(val);
        })
      : csvFields.map(() => "");
    const csv = [headers.join(","), sampleRow.join(",")].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${entityName.toLowerCase()}_import_template.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (!file) return;
    setUploading(true);
    setProgress(0);
    setResults(null);
    try {
      const parsed = await parseCsvFile(file, csvFields);
      let created = 0;
      let failed = 0;
      const errors = [];

      for (let i = 0; i < parsed.length; i++) {
        const item = parsed[i];
        try {
          if (customImport) {
            await customImport(item);
          } else {
            await base44.entities[entityName].create(item);
          }
          created++;
        } catch (err) {
          failed++;
          errors.push(`Row ${i + 2}: ${err.message || "failed"}`);
        }
        setProgress(Math.round(((i + 1) / parsed.length) * 100));
      }

      setResults({ created, failed, total: parsed.length, errors: errors.slice(0, 5) });
      if (created > 0) {
        toast.success(`Imported ${created} record(s)`);
      }
    } catch (err) {
      toast.error(err.message || "Failed to import");
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setResults(null);
    setProgress(0);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" /> {title}
          </DialogTitle>
          <DialogDescription>
            Upload a CSV or Excel file to import records in bulk. Column headers should match the field labels below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!results && (
            <>
              <Alert>
                <FileSpreadsheet className="h-4 w-4" />
                <AlertDescription>
                  <p className="text-sm font-semibold mb-1">Expected columns:</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {csvFields.map((f) => f.label).join(", ")}
                  </p>
                </AlertDescription>
              </Alert>

              <Button variant="outline" onClick={downloadTemplate} className="w-full">
                <Download className="w-4 h-4 mr-2" /> Download CSV Template
              </Button>

              <div className="space-y-2">
                <label className="text-sm font-medium">Select File</label>
                <Input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  disabled={uploading}
                />
                {file && <p className="text-sm text-slate-600">Selected: {file.name}</p>}
              </div>

              {uploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Importing...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
              )}
            </>
          )}

          {results && (
            <Alert className={results.failed > 0 ? "bg-amber-50 border-amber-200" : "bg-green-50 border-green-200"}>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <p className="font-semibold mb-1">Import Complete</p>
                <div className="text-sm space-y-1">
                  <p>{results.created} created, {results.failed} failed (of {results.total})</p>
                  {results.errors.length > 0 && (
                    <div className="mt-2 text-xs text-red-600">
                      {results.errors.map((e, i) => <p key={i}>{e}</p>)}
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        {!results && (
          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" onClick={handleClose} disabled={uploading} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={!file || uploading}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            >
              {uploading ? "Importing..." : "Import"}
            </Button>
          </div>
        )}

        {results && (
          <div className="flex gap-3 pt-4 border-t">
            <Button onClick={handleClose} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}