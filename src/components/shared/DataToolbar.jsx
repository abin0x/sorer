import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Upload, Download, Table as TableIcon, LayoutGrid } from "lucide-react";
import { exportToCsv } from "@/lib/csvUtils";
import CsvImportDialog from "./CsvImportDialog";

/**
 * Toolbar with CSV import/export buttons and optional card/table view toggle.
 * Invalidates the given queryKey after a successful import.
 */
export default function DataToolbar({
  entityName,
  records,
  csvFields,
  queryKey,
  viewMode,
  setViewMode,
  showViewToggle = true,
  importTitle,
  customImport,
  sampleRecords,
  canEdit = true,
}) {
  const [importOpen, setImportOpen] = useState(false);
  const queryClient = useQueryClient();

  const handleExport = () => {
    if (!records || records.length === 0) return;
    exportToCsv(
      `${entityName.toLowerCase()}_export_${new Date().toISOString().split("T")[0]}.csv`,
      records,
      csvFields
    );
  };

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        {canEdit && (
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="w-4 h-4 mr-1.5" /> Import CSV
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={handleExport} disabled={!records || records.length === 0}>
          <Download className="w-4 h-4 mr-1.5" /> Export CSV
        </Button>
        {showViewToggle && setViewMode && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === "cards" ? "table" : "cards")}
          >
            {viewMode === "table" ? (
              <><LayoutGrid className="w-4 h-4 mr-1.5" /> Card View</>
            ) : (
              <><TableIcon className="w-4 h-4 mr-1.5" /> Table View</>
            )}
          </Button>
        )}
      </div>

      {canEdit && (
        <CsvImportDialog
          open={importOpen}
          onOpenChange={(open) => {
            setImportOpen(open);
            if (!open && queryKey) {
              queryClient.invalidateQueries({ queryKey });
            }
          }}
          entityName={entityName}
          csvFields={csvFields}
          queryKey={queryKey}
          title={importTitle || `Import ${entityName}s from CSV`}
          customImport={customImport}
          sampleRecords={sampleRecords}
        />
      )}
    </>
  );
}