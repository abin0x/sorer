import React from "react";
import { format } from "date-fns";
import { ChevronUp, ChevronDown, ChevronsUpDown, Loader2, ChevronRight } from "lucide-react";
import AsyncState from "@/components/shared/AsyncState";

function fmtCell(row, col) {
  const value = col.compute ? col.compute(row) : row[col.key];
  if (value == null || value === "") return "—";
  switch (col.type) {
    case "currency":
      return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
    case "number":
      return new Intl.NumberFormat("en-US").format(value);
    case "date":
      try { return format(new Date(value), "MMM d, yyyy"); } catch { return String(value); }
    case "boolean":
      return value ? "Yes" : "No";
    case "array":
      return Array.isArray(value) ? value.join(", ") : String(value);
    case "status":
      return String(value).replace(/_/g, " ");
    default:
      return String(value);
  }
}

function SortIcon({ col, sort }) {
  if (!col.sortable) return null;
  const isAsc = sort === col.key;
  const isDesc = sort === `-${col.key}`;
  if (isAsc) return <ChevronUp className="w-3 h-3 inline ml-0.5" />;
  if (isDesc) return <ChevronDown className="w-3 h-3 inline ml-0.5" />;
  return <ChevronsUpDown className="w-3 h-3 inline ml-0.5 opacity-30" />;
}

/**
 * Report data table with sortable headers, totals row, and load-more pagination.
 * props: { columns, rows, totals, sort, onSort, hasMore, isFetchingMore, onLoadMore, isLoading, groupBy }
 */
export default function ReportTable({ columns, rows, totals, sort, onSort, hasMore, isFetchingMore, onLoadMore, isLoading, groupBy }) {
  if (isLoading) return <AsyncState isLoading loadingLabel="Loading report…" />;

  const displayCols = groupBy
    ? [{ key: groupBy, label: columns.find((c) => c.key === groupBy)?.label || groupBy, type: "text" },
       { key: "count", label: "Count", type: "number", totalable: true },
       ...columns.filter((c) => c.totalable)]
    : columns;

  const totalableKeys = displayCols.filter((c) => c.totalable).map((c) => c.key);

  if (rows.length === 0) {
    return <AsyncState empty emptyTitle="No records" emptyMessage="No data matches the current filters." />;
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              {displayCols.map((col) => (
                <th
                  key={col.key}
                  className={`px-3 py-2 text-left font-semibold text-xs uppercase tracking-wider text-muted-foreground whitespace-nowrap ${col.sortable ? "cursor-pointer select-none hover:text-foreground" : ""}`}
                  onClick={() => col.sortable && onSort?.(sort === col.key ? `-${col.key}` : col.key)}
                >
                  {col.label} <SortIcon col={col} sort={sort} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                {displayCols.map((col) => (
                  <td key={col.key} className="px-3 py-2 whitespace-nowrap tabular-nums">
                    {col.type === "currency" ? (
                      <span className={Number(fmtCell(row, col).replace(/[^0-9.-]/g, "")) < 0 ? "text-red-600 dark:text-red-400" : ""}>
                        {fmtCell(row, col)}
                      </span>
                    ) : col.type === "status" ? (
                      <span className="capitalize">{fmtCell(row, col)}</span>
                    ) : (
                      fmtCell(row, col)
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {totalableKeys.length > 0 && (
            <tfoot>
              <tr className="border-t-2 bg-muted/30 font-semibold">
                {displayCols.map((col) => (
                  <td key={col.key} className="px-3 py-2 whitespace-nowrap tabular-nums">
                    {totalableKeys.includes(col.key) ? fmtCell(totals, col) : col.key === displayCols[0].key ? "TOTAL" : ""}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {hasMore && (
        <div className="p-3 text-center border-t">
          <button
            onClick={onLoadMore}
            disabled={isFetchingMore}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5 rounded-lg disabled:opacity-50 touch-target"
          >
            {isFetchingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
            Load more
          </button>
        </div>
      )}
    </div>
  );
}