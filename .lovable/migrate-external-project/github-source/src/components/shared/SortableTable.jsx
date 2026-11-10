import React, { useState } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function SortableTable({ data, columns, onRowClick, className }) {
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState("asc");

  const handleSort = (columnKey) => {
    if (sortColumn === columnKey) {
      // Toggle direction
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(columnKey);
      setSortDirection("asc");
    }
  };

  const sortedData = React.useMemo(() => {
    if (!sortColumn) return data;

    return [...data].sort((a, b) => {
      let aVal = a[sortColumn];
      let bVal = b[sortColumn];

      // Handle null/undefined
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      // Handle dates
      if (sortColumn.includes('date')) {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }

      // Handle numbers
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }

      // Handle strings
      const comparison = String(aVal).localeCompare(String(bVal));
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [data, sortColumn, sortDirection]);

  const getSortIcon = (columnKey) => {
    if (sortColumn !== columnKey) return <ArrowUpDown className="w-3 h-3 ml-1" />;
    return sortDirection === "asc" 
      ? <ArrowUp className="w-3 h-3 ml-1" />
      : <ArrowDown className="w-3 h-3 ml-1" />;
  };

  return (
    <Table className={className}>
      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHead key={column.key} className="dark:text-slate-300">
              {column.sortable !== false ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort(column.key)}
                  className="h-auto p-0 font-semibold hover:bg-transparent"
                >
                  {column.label}
                  {getSortIcon(column.key)}
                </Button>
              ) : (
                <span className="font-semibold">{column.label}</span>
              )}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedData.length === 0 ? (
          <TableRow>
            <TableCell colSpan={columns.length} className="text-center py-8 text-slate-500 dark:text-slate-400">
              No data available
            </TableCell>
          </TableRow>
        ) : (
          sortedData.map((row, index) => (
            <TableRow 
              key={index}
              onClick={() => onRowClick && onRowClick(row)}
              className={onRowClick ? "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800" : ""}
            >
              {columns.map((column) => (
                <TableCell key={column.key} className="dark:text-slate-300">
                  {column.render ? column.render(row) : row[column.key]}
                </TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}