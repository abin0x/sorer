import React from "react";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { toast } from "sonner";

export async function exportToPDF(data, filename, title) {
  try {
    // Create HTML content for PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; }
          h1 { color: #0f172a; border-bottom: 3px solid #d97706; padding-bottom: 10px; }
          h2 { color: #334155; margin-top: 30px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background-color: #f1f5f9; padding: 12px; text-align: left; border-bottom: 2px solid #cbd5e1; }
          td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
          .summary { background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .metric { display: inline-block; margin: 10px 20px 10px 0; }
          .metric-value { font-size: 24px; font-weight: bold; color: #0f172a; }
          .metric-label { font-size: 12px; color: #64748b; }
        </style>
      </head>
      <body>
        ${data}
      </body>
      </html>
    `;

    // Create a blob and download
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.html`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success("Report exported! Open in browser and print to PDF");
  } catch (error) {
    console.error("PDF export error:", error);
    toast.error("Failed to export report");
  }
}

export function PDFExportButton({ onExport, label = "Export PDF", disabled = false }) {
  return (
    <Button
      onClick={onExport}
      variant="outline"
      disabled={disabled}
      className="dark:border-slate-700"
    >
      <FileText className="w-4 h-4 mr-2" />
      {label}
    </Button>
  );
}