import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowUp, ArrowDown, ArrowUpDown, Check, X } from "lucide-react";
import { createPageUrl } from "@/utils";

export default function COEDataTable({ tableData, title, editable = false, skillTests = [], onSaveScore }) {
  const { columns, rows, totalCount } = tableData;
  const [sortBy, setSortBy] = useState(null);
  const [sortDir, setSortDir] = useState("desc");
  const [editing, setEditing] = useState(null); // { rowId, colIdx }
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

  const sortedRows = useMemo(() => {
    if (!sortBy) return rows;
    return [...rows].sort((a, b) => {
      let aVal, bVal;
      if (sortBy === "name") { aVal = a.name; bVal = b.name; return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal); }
      if (sortBy === "team") { aVal = a.team; bVal = b.team; return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal); }
      const idx = parseInt(sortBy);
      aVal = a.values[idx] ?? -1; bVal = b.values[idx] ?? -1;
      return sortDir === "desc" ? bVal - aVal : aVal - bVal;
    });
  }, [rows, sortBy, sortDir]);

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir(sortDir === "desc" ? "asc" : "desc");
    else { setSortBy(col); setSortDir("desc"); }
  };
  const SortIcon = ({ col }) => sortBy === col ? (sortDir === "desc" ? <ArrowDown className="w-2.5 h-2.5 inline" /> : <ArrowUp className="w-2.5 h-2.5 inline" />) : <ArrowUpDown className="w-2.5 h-2.5 inline opacity-20" />;

  const startEdit = (rowId, colIdx, currentVal) => {
    if (!editable || !onSaveScore) return;
    setEditing({ rowId, colIdx });
    setEditValue(currentVal != null ? String(currentVal) : "");
  };

  const cancelEdit = () => { setEditing(null); setEditValue(""); };

  const saveEdit = async () => {
    if (!editing) return;
    const test = skillTests[editing.colIdx];
    if (!test) { cancelEdit(); return; }
    const val = parseFloat(editValue);
    if (isNaN(val)) { cancelEdit(); return; }
    setSaving(true);
    try {
      await onSaveScore(editing.rowId, test.id, val);
      cancelEdit();
    } catch { /* keep editing on error */ }
    finally { setSaving(false); }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-3 py-2 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">{title} ({totalCount} Players)</h3>
        {editable && <span className="text-[10px] text-gray-400">Click any score cell to edit inline</span>}
      </div>
      <div className="overflow-auto max-h-[500px]">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-gray-50 z-10">
            <tr className="text-left text-[10px] text-gray-500 font-semibold uppercase border-b border-gray-200">
              <th className="py-2 px-3 cursor-pointer hover:text-gray-900" onClick={() => toggleSort("name")}>Player <SortIcon col="name" /></th>
              <th className="py-2 px-3 cursor-pointer hover:text-gray-900" onClick={() => toggleSort("team")}>Team <SortIcon col="team" /></th>
              <th className="py-2 px-3">Age</th>
              {columns.map((col, i) => (
                <th key={i} className="py-2 px-3 cursor-pointer hover:text-gray-900" onClick={() => toggleSort(String(i))}>{col} <SortIcon col={String(i)} /></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map(row => (
              <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="py-1.5 px-3">
                  <Link to={`${createPageUrl("PlayerDetail")}?id=${row.id}`} className="font-medium text-gray-900 hover:text-[#2ecc71]">
                    {row.name}
                  </Link>
                  {row.position && <span className="block text-[10px] text-gray-400">{row.position}</span>}
                </td>
                <td className="py-1.5 px-3 text-gray-600">{row.team}</td>
                <td className="py-1.5 px-3 text-gray-600">{row.age ?? "—"}</td>
                {row.values.map((v, i) => {
                  const isEditing = editing?.rowId === row.id && editing?.colIdx === i;
                  if (isEditing) {
                    return (
                      <td key={i} className="py-1 px-2">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
                            autoFocus
                            className="w-14 h-6 text-xs border border-primary rounded px-1 focus:outline-none"
                          />
                          <button onClick={saveEdit} disabled={saving} className="text-emerald-600 hover:text-emerald-700"><Check className="w-3.5 h-3.5" /></button>
                          <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    );
                  }
                  return (
                    <td
                      key={i}
                      className={`py-1.5 px-3 ${editable ? "cursor-text hover:bg-primary/5 rounded" : ""}`}
                      onClick={() => editable && startEdit(row.id, i, v)}
                    >
                      {v != null ? (
                        i === row.values.length - 1 ? (
                          <span className="inline-block px-2 py-0.5 rounded-full bg-[#2ecc71]/15 text-[#2ecc71] font-bold text-[11px]">{v}</span>
                        ) : (
                          <span className="text-gray-700">{v}</span>
                        )
                      ) : (
                        <span className="text-gray-300">{editable ? "—" : "—"}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-3 py-1.5 border-t border-gray-200 text-[10px] text-gray-400">
        Click any player row to view their player dashboard, or a team name to view the team dashboard.
      </div>
    </div>
  );
}