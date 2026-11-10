import React from "react";
import { buildMatrix, cellKey } from "@/lib/tryoutMatrix";
import TryoutMatrixCell from "@/components/tryout/TryoutMatrixCell";

export default function TryoutMatrixGrid({ teams, ageGroups, plans, onCreatePlan }) {
  const { rows, columns, cells } = buildMatrix({ teams, ageGroups, plans });

  if (rows.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
        No teams found yet. Add teams with an age group, gender, and format to see the coverage matrix.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full border-collapse min-w-[1000px]">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-muted/60 text-left text-xs font-semibold text-muted-foreground p-2.5 border-b border-border w-20">
              Age Group
            </th>
            {columns.map((col) => (
              <th
                key={col.key}
                className="bg-muted/60 text-center text-xs font-semibold text-muted-foreground p-2.5 border-b border-l border-border whitespace-nowrap"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((ageGroup) => (
            <tr key={ageGroup}>
              <td className="sticky left-0 z-10 bg-card text-sm font-bold text-foreground p-2.5 border-b border-border">
                {ageGroup}
              </td>
              {columns.map((col) => {
                const cell = cells[cellKey(ageGroup, col.format, col.gender)];
                return (
                  <td key={col.key} className="p-1.5 border-b border-l border-border align-top">
                    <TryoutMatrixCell
                      ageGroup={ageGroup}
                      format={col.format}
                      gender={col.gender}
                      teams={cell.teams}
                      plan={cell.plan}
                      onCreatePlan={onCreatePlan}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}