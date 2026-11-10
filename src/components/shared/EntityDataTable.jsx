import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowUpDown, ArrowUp, ArrowDown, Check, X, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";

/**
 * Reusable entity data table with sortable columns, inline editing,
 * individual + bulk delete, and optional row click for detail view.
 *
 * @param {string} entityName - SDK entity name (e.g. "Program")
 * @param {Array} records - data rows
 * @param {Array} columns - [{ key, label, type, options?, badgeMap?, editable?, sortable?, width?, render? }]
 * @param {Array} queryKey - react-query key to invalidate after mutations
 * @param {function} onRowClick - optional: open detail dialog when eye clicked
 * @param {boolean} canEdit
 * @param {boolean} canDelete
 * @param {string} emptyMessage
 * @param {Component} emptyIcon
 */
export default function EntityDataTable({
  entityName,
  records,
  columns,
  queryKey,
  onRowClick,
  canEdit = true,
  canDelete = true,
  emptyMessage = "No records found",
  emptyIcon: EmptyIcon,
  extraActions = [],
}) {
  const queryClient = useQueryClient();
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [selected, setSelected] = useState(new Set());
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState("");

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities[entityName].update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Updated successfully");
      setEditingCell(null);
    },
    onError: () => toast.error("Failed to update"),
  });

  const deleteOne = async (id) => {
    if (!confirm("Delete this record? This cannot be undone.")) return;
    try {
      await base44.entities[entityName].delete(id);
      queryClient.invalidateQueries({ queryKey });
      toast.success("Record deleted");
    } catch {
      toast.error("Failed to delete record");
    }
  };

  const deleteBulk = async () => {
    if (!confirm(`Delete ${selected.size} record(s)? This cannot be undone.`)) return;
    try {
      await base44.entities[entityName].deleteMany({ id: { $in: [...selected] } });
      queryClient.invalidateQueries({ queryKey });
      toast.success(`${selected.size} record(s) deleted`);
      setSelected(new Set());
    } catch {
      toast.error("Failed to delete records");
    }
  };

  const sorted = useMemo(() => {
    if (!sortKey) return records;
    return [...records].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      return sortDir === "asc" ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
  }, [records, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const toggleSelect = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const toggleSelectAll = () => {
    if (selected.size === sorted.length && sorted.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(sorted.map((r) => r.id)));
    }
  };

  const startEdit = (record, col) => {
    if (!col.editable || !canEdit) return;
    setEditingCell({ id: record.id, key: col.key });
    setEditValue(record[col.key] ?? "");
  };

  const saveEdit = (record, col) => {
    let value = editValue;
    if (col.type === "boolean") {
      value = ["yes", "true", "1"].includes(String(editValue).toLowerCase());
    }
    updateMutation.mutate({ id: record.id, data: { [col.key]: value } });
  };

  const renderCell = (record, col) => {
    const value = record[col.key];
    const isEditing = editingCell?.id === record.id && editingCell?.key === col.key;

    if (isEditing) {
      if (col.type === "select" && col.options) {
        return (
          <div className="flex items-center gap-1 min-w-[140px]">
            <Select value={String(editValue ?? "")} onValueChange={setEditValue}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {col.options.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0 text-green-600" onClick={() => saveEdit(record, col)}>
              <Check className="w-3.5 h-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0 text-red-600" onClick={() => setEditingCell(null)}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        );
      }
      return (
        <div className="flex items-center gap-1">
          <Input
            type={col.type === "date" ? "date" : "text"}
            value={editValue ?? ""}
            onChange={(e) => setEditValue(e.target.value)}
            className="h-8 text-xs"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") saveEdit(record, col);
              if (e.key === "Escape") setEditingCell(null);
            }}
          />
          <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0 text-green-600" onClick={() => saveEdit(record, col)}>
            <Check className="w-3.5 h-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0 text-red-600" onClick={() => setEditingCell(null)}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      );
    }

    if (col.render) return col.render(value, record);

    if (col.type === "boolean") {
      return (
        <Badge className={value ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"}>
          {value ? "Yes" : "No"}
        </Badge>
      );
    }

    if (col.badgeMap) {
      const cfg = col.badgeMap[value];
      return (
        <Badge className={cfg?.color || "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"}>
          {cfg?.label || value || "—"}
        </Badge>
      );
    }

    if (col.type === "date" && value) {
      return new Date(value).toLocaleDateString();
    }

    if (Array.isArray(value)) return value.join(", ") || "—";

    return value || "—";
  };

  if (records.length === 0) {
    return (
      <Card className="dark:bg-slate-900 dark:border-slate-800">
        <CardContent className="text-center py-12">
          {EmptyIcon && <EmptyIcon className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-slate-700" />}
          <p className="text-slate-500 dark:text-slate-400">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="dark:bg-slate-900 dark:border-slate-800 shadow-sm">
      {selected.size > 0 && (
        <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/30 border-b border-red-200 dark:border-red-900 rounded-t-xl">
          <span className="text-sm font-medium text-red-700 dark:text-red-400">
            {selected.size} selected
          </span>
          <Button size="sm" variant="destructive" onClick={deleteBulk}>
            <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete Selected
          </Button>
        </div>
      )}
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
              <tr>
                {canDelete && (
                  <th className="p-3 w-10">
                    <Checkbox
                      checked={selected.size === sorted.length && sorted.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </th>
                )}
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`text-left p-3 font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap ${col.sortable ? "cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-800" : ""} ${col.width || ""}`}
                    onClick={() => col.sortable && toggleSort(col.key)}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {col.sortable && sortKey === col.key && (
                        sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      )}
                      {col.sortable && sortKey !== col.key && <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600" />}
                    </div>
                  </th>
                ))}
                {(onRowClick || canEdit || canDelete || extraActions.length > 0) && (
                  <th className="p-3 w-32 text-right">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {sorted.map((record) => (
                <tr
                  key={record.id}
                  className={`border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${selected.has(record.id) ? "bg-emerald-50/50 dark:bg-emerald-950/20" : ""}`}
                >
                  {canDelete && (
                    <td className="p-3">
                      <Checkbox
                        checked={selected.has(record.id)}
                        onCheckedChange={() => toggleSelect(record.id)}
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`p-3 ${col.editable && canEdit ? "cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 rounded" : ""}`}
                      onClick={(e) => {
                        if (col.editable && canEdit) {
                          e.stopPropagation();
                          startEdit(record, col);
                        }
                      }}
                    >
                      {renderCell(record, col)}
                    </td>
                  ))}
                  <td className="p-3">
                    <div className="flex items-center justify-end gap-1">
                      {extraActions.map((action) => {
                        const Icon = action.icon;
                        return (
                          <Button
                            key={action.label}
                            size="icon"
                            variant="ghost"
                            className={`h-7 w-7 ${action.className || ""}`}
                            onClick={(e) => { e.stopPropagation(); action.onClick(record); }}
                            title={action.label}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </Button>
                        );
                      })}
                      {onRowClick && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-slate-500 hover:text-emerald-600"
                          onClick={(e) => { e.stopPropagation(); onRowClick(record); }}
                          title="View details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                          onClick={(e) => { e.stopPropagation(); deleteOne(record.id); }}
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}