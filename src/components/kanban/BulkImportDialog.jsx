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
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { base44 } from "@/api/base44Client";
import { Upload, Download, AlertCircle, CheckCircle2, XCircle, FileSpreadsheet, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const BATCH_SIZE = 50; // Process 50 items at a time
const RATE_LIMIT_RETRY_DELAY = 1000; // 1 second delay between batches

export default function BulkImportDialog({ open, onOpenChange, onImportComplete }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState(null);
  const [conflicts, setConflicts] = useState([]);
  const [newItemsToImport, setNewItemsToImport] = useState([]);
  const [showConflicts, setShowConflicts] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [rateLimitError, setRateLimitError] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const validTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv'
      ];
      if (validTypes.includes(selectedFile.type) || selectedFile.name.endsWith('.csv') || selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls')) {
        setFile(selectedFile);
        setResults(null);
        setConflicts([]);
        setNewItemsToImport([]);
        setShowConflicts(false);
        setProgress(0);
        setRateLimitError(false);
      } else {
        toast.error('Please upload a valid Excel (.xlsx, .xls) or CSV file');
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setRateLimitError(false);
    try {
      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Define the expected schema for programs import - maps CSV columns exactly
      const schema = {
        type: "array",
        items: {
          type: "object",
          properties: {
            ID: { type: "string" },
            Workstream: { type: "string" },
            Year: { type: "string" },
            Season: { type: "string" },
            "Branch/Location": { type: "string" },
            Project: { type: "string" },
            Description: { type: "string" },
            "Program dates": { type: "string" },
            "Program Times": { type: "string" },
            "Field Location/Address": { type: "string" },
            "Field Number": { type: "string" },
            "Age Eligibility": { type: "string" },
            "Gender Eligibility": { type: "string" },
            "Suggested Start Date": { type: "string" },
            Started: { type: "string" },
            Due: { type: "string" },
            Completed: { type: "string" },
            "Budget approval": { type: "string" },
            Status: { type: "string" },
            Owner: { type: "string" }
          },
          required: ["Project"]
        }
      };

      // Extract data from file
      const extraction = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: schema
      });

      if (extraction.status === "error") {
        toast.error(extraction.details || "Failed to extract data from file");
        setUploading(false);
        return;
      }

      const extractedData = extraction.output;

      if (!Array.isArray(extractedData) || extractedData.length === 0) {
        toast.error("No valid data found in the file");
        setUploading(false);
        return;
      }

      // Check for conflicts (existing programs with same unique_id)
      const existingPrograms = await base44.entities.Program.list();
      const conflictingItems = [];
      const newItems = [];

      // Helper function to validate and format dates
      const formatDate = (dateStr) => {
        if (!dateStr || typeof dateStr !== 'string') {
          return null;
        }
        const trimmed = dateStr.trim();
        if (trimmed === '' || trimmed.toLowerCase() === 'n/a' || trimmed === '-') {
          return null;
        }
        try {
          const date = new Date(trimmed);
          if (isNaN(date.getTime())) {
            return null;
          }
          return date.toISOString().split('T')[0];
        } catch (e) {
          console.warn(`Invalid date: ${dateStr}`);
          return null;
        }
      };

      extractedData.forEach(item => {
        // Map CSV columns to Program entity fields
        const mappedItem = {
          unique_id: item.ID || null,
          workstream: item.Workstream || '',
          year: item.Year || '',
          title: item.Project || '',
          description: item.Description || '',
          season: item.Season || '',
          branches: item["Branch/Location"] ? 
            (typeof item["Branch/Location"] === 'string' 
              ? item["Branch/Location"].split(',').map(b => b.trim()).filter(b => b)
              : Array.isArray(item["Branch/Location"]) ? item["Branch/Location"] : [])
            : [],
          program_dates: item["Program dates"] || '',
          program_time: item["Program Times"] || '',
          field_location: item["Field Location/Address"] || '',
          field_number: item["Field Number"] || '',
          age_eligibility: item["Age Eligibility"] || '',
          gender_eligibility: item["Gender Eligibility"] || '',
          suggested_start_date: formatDate(item["Suggested Start Date"]) || new Date().toISOString().split('T')[0],
          started_date: formatDate(item.Started) || null,
          due_date: formatDate(item.Due) || new Date().toISOString().split('T')[0],
          completed_date: formatDate(item.Completed) || null,
          budget_approval: item["Budget approval"] || '',
          status: (item.Status || 'todo').toLowerCase(),
          assignee: item.Owner || ''
        };

        if (mappedItem.unique_id) {
          const existing = existingPrograms.find(p => p.unique_id === mappedItem.unique_id);
          if (existing) {
            conflictingItems.push({
              newData: mappedItem,
              existingData: existing
            });
          } else {
            newItems.push(mappedItem);
          }
        } else {
          newItems.push(mappedItem);
        }
      });

      setNewItemsToImport(newItems);

      if (conflictingItems.length > 0) {
        setConflicts(conflictingItems);
        setShowConflicts(true);
        toast.warning(`Found ${conflictingItems.length} existing program(s) with matching IDs`);
        setUploading(false);
      } else {
        // No conflicts, proceed with import
        await processImport(newItems, []);
      }
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Failed to import programs");
      setUploading(false);
    }
  };

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const processImport = async (newItems, overwriteItems) => {
    setUploading(true);
    setProgress(0);
    setRateLimitError(false);

    try {
      let created = 0;
      let updated = 0;
      let failed = 0;
      const allItems = [...newItems, ...overwriteItems];
      const totalItems = allItems.length;

      // Process new items one by one for better error tracking
       if (newItems.length > 0) {
         for (let i = 0; i < newItems.length; i++) {
           const item = newItems[i];
           setCurrentBatch(Math.floor(i / BATCH_SIZE) + 1);

           try {
             // Validate item before creating
             if (!item.title) {
               console.warn(`Skipping program: missing title`);
               failed++;
               continue;
             }
             
             // Ensure required dates are valid ISO strings, not empty or invalid
             if (!item.suggested_start_date) {
               item.suggested_start_date = new Date().toISOString().split('T')[0];
             }
             if (!item.due_date) {
               item.due_date = new Date().toISOString().split('T')[0];
             }
             
             // Remove null date fields to avoid validation errors
             if (item.started_date === null) delete item.started_date;
             if (item.completed_date === null) delete item.completed_date;

             await base44.entities.Program.create(item);
             created++;
             setProgress(Math.round(((i + 1) / totalItems) * 100));
           } catch (error) {
             if (error.response?.status === 429) {
               setRateLimitError(true);
               await sleep(RATE_LIMIT_RETRY_DELAY);
               // Retry single item
               try {
                 await base44.entities.Program.create(item);
                 created++;
               } catch (retryError) {
                 console.error(`Failed to create program ${item.title}:`, retryError);
                 failed++;
               }
             } else {
               console.error(`Failed to create program ${item.title}:`, error);
               failed++;
             }
           }

           // Add delay between items to avoid rate limiting
           if ((i + 1) % BATCH_SIZE === 0) {
             await sleep(RATE_LIMIT_RETRY_DELAY);
           }
         }
       }

      // Update existing items in batches
      if (overwriteItems.length > 0) {
        for (let i = 0; i < overwriteItems.length; i += BATCH_SIZE) {
          const batch = overwriteItems.slice(i, i + BATCH_SIZE);
          setCurrentBatch(Math.floor((newItems.length + i) / BATCH_SIZE) + 1);

          for (const item of batch) {
            try {
              if (item.data.branches && typeof item.data.branches === 'string') {
                item.data.branches = item.data.branches.split(',').map(b => b.trim());
              }
              await base44.entities.Program.update(item.id, item.data);
              updated++;
              setProgress(Math.round(((newItems.length + i + 1) / totalItems) * 100));
            } catch (error) {
              if (error.response?.status === 429) {
                setRateLimitError(true);
                toast.warning("Rate limit reached. Slowing down import...");
                await sleep(RATE_LIMIT_RETRY_DELAY * 2);
              }
              console.error("Update error:", error);
              failed++;
            }
          }

          if (i + BATCH_SIZE < overwriteItems.length) {
            await sleep(RATE_LIMIT_RETRY_DELAY);
          }
        }
      }

      setResults({
        created,
        updated,
        failed,
        total: newItems.length + overwriteItems.length
      });

      toast.success(`Import complete: ${created} created, ${updated} updated${failed > 0 ? `, ${failed} failed` : ''}`);
      setShowConflicts(false);
      setProgress(100);

      if (onImportComplete) {
        onImportComplete();
      }
    } catch (error) {
      console.error("Process import error:", error);
      toast.error("Failed to process import");
    }
    setUploading(false);
  };

  const handleResolveConflicts = (action) => {
    const overwriteItems = [];

    if (action === 'overwrite') {
      conflicts.forEach(conflict => {
        overwriteItems.push({
          id: conflict.existingData.id,
          data: conflict.newData
        });
      });
    }

    processImport(newItemsToImport, overwriteItems);
  };

  const downloadTemplate = () => {
    const template = `ID,Workstream,Year,Season,Branch/Location,Project,Description,Program dates,Program Times,Field Location/Address,Field Number,Age Eligibility,Gender Eligibility,Suggested Start Date,Started,Due,Completed,Budget approval,Status,Owner
PROG001,Marketing,2026,Summer,"Dearborn,Detroit",Summer Camp,Description here,June 1 - June 30,6:00 PM - 8:00 PM,Field Location,Field 1,2010-2012,Boys,2025-06-01,2025-06-15,2025-06-30,,Approved,todo,user@example.com`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'programs_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Import Programs from CSV/Excel
          </DialogTitle>
          <DialogDescription>
            Upload a CSV or Excel file to import or update programs in bulk. Large files are processed efficiently in batches.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-200px)]">
          <div className="space-y-4 p-1">
            {!showConflicts && (
              <>
                <Alert>
                  <FileSpreadsheet className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2 text-sm">
                      <p className="font-semibold">Required columns:</p>
                      <ul className="list-disc list-inside ml-2 space-y-1">
                        <li><strong>unique_id:</strong> Unique identifier for the program (for updates)</li>
                        <li><strong>title:</strong> Program name (required)</li>
                      </ul>
                      <p className="mt-2 font-semibold">Optional columns:</p>
                      <p className="ml-2 text-xs">Your CSV should have these exact column headers: ID, Workstream, Year, Season, Branch/Location, Project, Description, Program dates, Program Times, Field Location/Address, Field Number, Age Eligibility, Gender Eligibility, Suggested Start Date, Started, Due, Completed, Budget approval, Status, Owner</p>
                      <p className="mt-2 text-xs text-slate-500">💡 Tip: For multiple branches, use comma-separated values like "Dearborn,Detroit"</p>
                    </div>
                  </AlertDescription>
                </Alert>

                <Button
                  variant="outline"
                  onClick={downloadTemplate}
                  className="w-full"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download CSV Template
                </Button>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Select File</label>
                  <Input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileChange}
                    disabled={uploading}
                  />
                  {file && (
                    <p className="text-sm text-slate-600">
                      Selected: {file.name}
                    </p>
                  )}
                </div>

                {uploading && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span>Importing... (Batch {currentBatch})</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="w-full" />
                    {rateLimitError && (
                      <Alert className="bg-amber-50 border-amber-200">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <AlertDescription className="text-xs text-amber-700">
                          Rate limit detected. Import continues with optimized spacing between batches.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}

                {results && (
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription>
                      <div className="space-y-1 text-sm">
                        <p className="font-semibold text-green-900">Import Completed!</p>
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          <div>
                            <span className="font-semibold text-green-700">{results.created}</span>
                            <span className="text-green-600"> created</span>
                          </div>
                          <div>
                            <span className="font-semibold text-blue-700">{results.updated}</span>
                            <span className="text-blue-600"> updated</span>
                          </div>
                          {results.failed > 0 && (
                            <div>
                              <span className="font-semibold text-red-700">{results.failed}</span>
                              <span className="text-red-600"> failed</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}

            {showConflicts && (
              <div className="space-y-4">
                <Alert className="bg-amber-50 border-amber-200">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription>
                    <p className="font-semibold text-amber-900">
                      {conflicts.length} program(s) with matching IDs found
                    </p>
                    <p className="text-sm text-amber-800 mt-1">
                      Choose how to handle these conflicts. {newItemsToImport.length} new programs will also be imported.
                    </p>
                  </AlertDescription>
                </Alert>

                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {conflicts.map((conflict, idx) => (
                    <div key={idx} className="p-3 border border-amber-200 rounded-lg bg-amber-50">
                      <div className="flex justify-between items-start mb-2">
                        <Badge variant="outline" className="bg-white">
                          ID: {conflict.newData.unique_id}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="font-semibold text-slate-700 mb-1">Existing:</p>
                          <p className="text-slate-600">{conflict.existingData.title}</p>
                          <p className="text-slate-500">{conflict.existingData.status}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-700 mb-1">New:</p>
                          <p className="text-slate-600">{conflict.newData.title}</p>
                          <p className="text-slate-500">{conflict.newData.status || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => handleResolveConflicts('overwrite')}
                    className="flex-1 bg-orange-600 hover:bg-orange-700"
                    disabled={uploading}
                  >
                    Overwrite All ({conflicts.length})
                  </Button>
                  <Button
                    onClick={() => handleResolveConflicts('skip')}
                    variant="outline"
                    className="flex-1"
                    disabled={uploading}
                  >
                    Skip Conflicts
                  </Button>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {!showConflicts && !results && (
          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={uploading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            >
              {uploading ? "Importing..." : "Import Programs"}
            </Button>
          </div>
        )}

        {results && (
          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={() => onOpenChange(false)}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            >
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}