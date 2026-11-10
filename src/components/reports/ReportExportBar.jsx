import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Printer, Loader2 } from "lucide-react";
import { exportReportCsv, openPrintView } from "@/lib/reports/exportReport";

/**
 * Export bar with CSV download (chunked, with progress) and print-friendly PDF view.
 * props: { report, query, sort, columns, totalCount, access }
 */
export default function ReportExportBar({ report, query, sort, columns, totalCount, access }) {
  const [csvState, setCsvState] = useState({ exporting: false, progress: 0 });
  const [pdfState, setPdfState] = useState({ exporting: false, progress: 0 });

  if (!access?.canExport) return null;

  const handleCsv = async () => {
    setCsvState({ exporting: true, progress: 0 });
    try {
      await exportReportCsv({
        report, query, sort, columns,
        onProgress: (done, total) => setCsvState({ exporting: true, progress: total > 0 ? Math.round((done / total) * 100) : 0 }),
      });
    } catch (e) {
      console.error("CSV export failed:", e);
    } finally {
      setCsvState({ exporting: false, progress: 0 });
    }
  };

  const handlePdf = async () => {
    setPdfState({ exporting: true, progress: 0 });
    try {
      await openPrintView({
        report, query, sort, columns,
        onProgress: (done, total) => setPdfState({ exporting: true, progress: total > 0 ? Math.round((done / total) * 100) : 0 }),
      });
    } catch (e) {
      console.error("PDF export failed:", e);
    } finally {
      setPdfState({ exporting: false, progress: 0 });
    }
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-sm text-muted-foreground tabular-nums">{totalCount.toLocaleString()} rows</span>
      <Button variant="outline" size="sm" onClick={handleCsv} disabled={csvState.exporting || pdfState.exporting || totalCount === 0} className="touch-target">
        {csvState.exporting ? (
          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Exporting {csvState.progress}%</>
        ) : (
          <><Download className="w-3.5 h-3.5" /> Export CSV</>
        )}
      </Button>
      <Button variant="outline" size="sm" onClick={handlePdf} disabled={csvState.exporting || pdfState.exporting || totalCount === 0} className="touch-target">
        {pdfState.exporting ? (
          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Preparing {pdfState.progress}%</>
        ) : (
          <><Printer className="w-3.5 h-3.5" /> Print / PDF</>
        )}
      </Button>
    </div>
  );
}