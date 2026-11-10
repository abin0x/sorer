import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

function BulkUploadDialog({ open, onOpenChange, onSuccess }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const fileType = selectedFile.name.split('.').pop().toLowerCase();
      if (!['xlsx', 'xls', 'csv'].includes(fileType)) {
        toast.error("Please upload an Excel or CSV file");
        return;
      }
      setFile(selectedFile);
      setResults(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setResults(null);

    try {
      // Step 1: Upload the file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Step 2: Extract data from the file using the program schema
      const schema = {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            season: { type: "string" },
            branch: { type: "string" },
            program_dates: { type: "string" },
            program_time: { type: "string" },
            field_location: { type: "string" },
            field_number: { type: "string" },
            age_eligibility: { type: "string" },
            gender_eligibility: { type: "string" },
            program_director: { type: "string" },
            suggested_start_date: { type: "string" },
            due_date: { type: "string" },
            status: { type: "string" },
            priority: { type: "string" },
            assignee: { type: "string" }
          },
          required: ["title"]
        }
      };

      const extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: schema
      });

      if (extractResult.status === "error") {
        toast.error(`Failed to parse file: ${extractResult.details}`);
        setResults({ success: false, error: extractResult.details });
        return;
      }

      // Step 3: Create programs in bulk
      const programsData = extractResult.output.map(program => ({
        ...program,
        status: program.status || "todo",
        priority: program.priority || "medium",
      }));

      const createdPrograms = await base44.entities.Program.bulkCreate(programsData);

      setResults({
        success: true,
        count: createdPrograms.length,
        programs: createdPrograms
      });

      toast.success(`Successfully created ${createdPrograms.length} programs!`);
      
      // Wait a bit before closing to show success message
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onOpenChange(false);
        setFile(null);
        setResults(null);
      }, 2000);

    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload and process file");
      setResults({ success: false, error: error.message });
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      onOpenChange(false);
      setFile(null);
      setResults(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Bulk Upload Programs from Excel
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Excel File Format</h3>
            <p className="text-sm text-blue-800 mb-2">
              Your Excel file should have columns matching these fields:
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs text-blue-700">
              <div>• title (required)</div>
              <div>• description</div>
              <div>• season</div>
              <div>• branch</div>
              <div>• program_dates</div>
              <div>• program_time</div>
              <div>• field_location</div>
              <div>• field_number</div>
              <div>• age_eligibility</div>
              <div>• gender_eligibility</div>
              <div>• program_director</div>
              <div>• suggested_start_date</div>
              <div>• due_date</div>
              <div>• status</div>
              <div>• priority</div>
              <div>• assignee (email)</div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="excel-file">Select Excel File</Label>
            <div className="flex gap-2">
              <Input
                id="excel-file"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                disabled={uploading}
                className="flex-1"
              />
              {file && (
                <Button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="bg-slate-800 hover:bg-slate-900"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload
                    </>
                  )}
                </Button>
              )}
            </div>
            {file && !uploading && !results && (
              <p className="text-sm text-slate-600">
                Selected: {file.name}
              </p>
            )}
          </div>

          {results && (
            <div className={`p-4 rounded-lg border ${
              results.success 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-start gap-2">
                {results.success ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-green-900">Upload Successful!</h3>
                      <p className="text-sm text-green-800">
                        Created {results.count} program{results.count !== 1 ? 's' : ''} successfully.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-red-900">Upload Failed</h3>
                      <p className="text-sm text-red-800">{results.error}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const template = [
                  ['title', 'description', 'season', 'branch', 'program_dates', 'program_time', 'field_location', 'field_number', 'age_eligibility', 'gender_eligibility', 'program_director', 'suggested_start_date', 'due_date', 'status', 'priority', 'assignee'],
                  ['Sample Program', 'Program description', 'Summer', 'Dearborn', 'June 1-30', '6:00 PM - 8:00 PM', 'Main Field', '1', '2010-2015', 'Boys', 'John Doe', '2024-06-01', '2024-06-30', 'todo', 'medium', 'user@example.com']
                ].map(row => row.join(',')).join('\n');
                
                const blob = new Blob([template], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'program_template.csv';
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Download Template
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default BulkUploadDialog;