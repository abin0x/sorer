import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Database, Download, Upload, Trash2, AlertTriangle, Loader2, CheckCircle2,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { createPageUrl } from "@/utils";

const CLUB_ENTITIES = [
  "Location", "Program", "Team", "Coach", "Player", "Guardian",
  "TryoutEvent", "TryoutRegistration", "Registration",
];

export default function DatabaseManagement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [importRef] = useState(React.createRef());

  const handleExportAll = async () => {
    setExporting(true);
    try {
      const allData = {};
      for (const entity of CLUB_ENTITIES) {
        try {
          const records = await base44.entities[entity].list("-created_date", 500);
          allData[entity] = records;
        } catch (err) {
          console.warn(`Failed to export ${entity}:`, err);
          allData[entity] = [];
        }
      }

      // Create a combined CSV with entity type column
      const lines = [];
      for (const [entity, records] of Object.entries(allData)) {
        if (records.length === 0) continue;
        const headers = Object.keys(records[0]).filter((k) => !["id", "created_date", "updated_date", "created_by_id"].includes(k));
        lines.push(`# ${entity}`);
        lines.push(["_entity_type", ...headers].join(","));
        for (const rec of records) {
          const row = [entity, ...headers.map((h) => {
            const val = rec[h];
            if (val === null || val === undefined) return "";
            if (Array.isArray(val)) return `"${val.join(";")}"`;
            if (typeof val === "object") return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
            const str = String(val);
            if (str.includes(",") || str.includes("\n") || str.includes('"')) return `"${str.replace(/"/g, '""')}"`;
            return str;
          })];
          lines.push(row.join(","));
        }
        lines.push("");
      }

      const csv = lines.join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `club_database_export_${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      const totalRecords = Object.values(allData).reduce((s, r) => s + r.length, 0);
      toast({ title: "Export complete", description: `${totalRecords} records exported from ${Object.keys(allData).filter((k) => allData[k].length > 0).length} entities.` });
    } catch (err) {
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAll = async () => {
    setDeleting(true);
    try {
      const results = {};
      // Delete in reverse dependency order
      const deleteOrder = ["Registration", "TryoutRegistration", "TryoutEvent", "Player", "Coach", "Team", "Guardian", "Program", "Location"];
      for (const entity of deleteOrder) {
        try {
          const res = await base44.entities[entity].deleteMany({});
          results[entity] = "deleted";
        } catch (err) {
          results[entity] = "error";
        }
      }
      queryClient.invalidateQueries();
      toast({ title: "All data deleted", description: "Club database has been cleared." });
      setConfirmDelete(false);
    } catch (err) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-slate-600" />
              Database Management
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">Export, import, or clear all club data</p>
          </div>
          <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">
            Admin only
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Export */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
            <div className="w-9 h-9 bg-blue-500 rounded-lg flex items-center justify-center mb-2.5">
              <Download className="w-5 h-5 text-white" />
            </div>
            <p className="font-semibold text-sm text-slate-800">Export All Data</p>
            <p className="text-xs text-slate-500 mt-1 mb-3">Download all entities as a single CSV file</p>
            <Button onClick={handleExportAll} disabled={exporting} className="w-full bg-blue-600 hover:bg-blue-700" size="sm">
              {exporting ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Exporting...</> : <><Download className="w-3.5 h-3.5 mr-1.5" /> Export CSV</>}
            </Button>
          </div>

          {/* Import */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
            <div className="w-9 h-9 bg-emerald-500 rounded-lg flex items-center justify-center mb-2.5">
              <Upload className="w-5 h-5 text-white" />
            </div>
            <p className="font-semibold text-sm text-slate-800">Import Data</p>
            <p className="text-xs text-slate-500 mt-1 mb-3">Import records from a CSV file per entity</p>
            <Button
              onClick={() => window.open(createPageUrl("ProgramsList"), "_self")}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              size="sm"
            >
              <Upload className="w-3.5 h-3.5 mr-1.5" /> Go to Import
            </Button>
          </div>

          {/* Delete */}
          <div className="p-4 rounded-xl border border-red-200 bg-red-50">
            <div className="w-9 h-9 bg-red-500 rounded-lg flex items-center justify-center mb-2.5">
              <Trash2 className="w-5 h-5 text-white" />
            </div>
            <p className="font-semibold text-sm text-slate-800">Delete All Data</p>
            <p className="text-xs text-slate-500 mt-1 mb-3">Clear all dummy or test data from the club</p>
            {!confirmDelete ? (
              <Button onClick={() => setConfirmDelete(true)} variant="outline" className="w-full border-red-300 text-red-600 hover:bg-red-100" size="sm">
                <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Clear Database
              </Button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-start gap-1.5 p-2 rounded-lg bg-red-100 text-red-700 text-xs">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>This deletes ALL records. This cannot be undone.</span>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleDeleteAll} disabled={deleting} className="flex-1 bg-red-600 hover:bg-red-700" size="sm">
                    {deleting ? <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Deleting...</> : "Yes, Delete All"}
                  </Button>
                  <Button onClick={() => setConfirmDelete(false)} variant="outline" size="sm" className="border-slate-300">
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}