import { useMemo } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const PAGE_SIZE = 50;

/**
 * Fetches report data — rows (paginated or grouped), total count, and column totals.
 * @param {Object} params
 * @param {Object} params.report - report definition from reportLibrary
 * @param {Object} params.query - pre-built query object (from report.buildQuery)
 * @param {string} params.sort - sort field (prefixed with - for descending)
 * @param {string|null} params.groupBy - field to group by, or null for flat rows
 * @param {Object} params.scope - { scopeReady } from useReportScope
 */
export function useReportData({ report, query, sort, groupBy, scope }) {
  const enabled = !!scope?.scopeReady;

  // Columns that can be summed server-side (entity fields, not computed)
  const totalableFields = useMemo(
    () => report.columns.filter((c) => c.totalable && !c.compute).map((c) => c.key),
    [report]
  );

  // ── Grouped view: single aggregate call ──
  const groupedQuery = useQuery({
    queryKey: ["report-grouped", report.id, query, groupBy, sort],
    queryFn: () =>
      base44.entities[report.entity].aggregate({
        query,
        groupBy,
        sum: totalableFields.length > 0 ? totalableFields : undefined,
        sort: sort || undefined,
      }),
    enabled: enabled && !!groupBy,
  });

  // ── Flat view: infinite query for paginated rows ──
  const rowsQuery = useInfiniteQuery({
    queryKey: ["report-rows", report.id, query, sort],
    queryFn: ({ pageParam }) =>
      base44.entities[report.entity].filter(query, { sort, limit: PAGE_SIZE, cursor: pageParam }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => (lastPage.has_more ? lastPage.next_cursor : undefined),
    enabled: enabled && !groupBy,
  });

  // ── Total count (flat view only) ──
  const countQuery = useQuery({
    queryKey: ["report-count", report.id, query],
    queryFn: () => base44.entities[report.entity].count(query),
    enabled: enabled && !groupBy,
  });

  // ── Column totals (flat view only, server-side aggregate) ──
  const totalsQuery = useQuery({
    queryKey: ["report-totals", report.id, query],
    queryFn: () =>
      base44.entities[report.entity].aggregate({
        query,
        sum: totalableFields.length > 0 ? totalableFields : undefined,
      }),
    enabled: enabled && !groupBy && totalableFields.length > 0,
  });

  // ── Assemble result ──
  if (groupBy) {
    const rows = (groupedQuery.data?.rows || []).map((r) => {
      const row = { [groupBy]: r[groupBy] || r._id || "(blank)", count: r.count || 0 };
      for (const f of totalableFields) row[f] = r[`sum_${f}`] || 0;
      return row;
    });
    const totals = {};
    for (const f of totalableFields) totals[f] = rows.reduce((s, r) => s + (r[f] || 0), 0);
    totals.count = rows.reduce((s, r) => s + (r.count || 0), 0);
    return { rows, totalCount: rows.length, totals, hasMore: false, isLoading: groupedQuery.isLoading };
  }

  const rows = rowsQuery.data?.pages?.flatMap((p) => p.items) || [];
  const totals = {};
  for (const f of totalableFields) totals[f] = totalsQuery.data?.rows?.[0]?.[`sum_${f}`] || 0;

  return {
    rows,
    totalCount: countQuery.data || 0,
    totals,
    hasMore: rowsQuery.hasNextPage,
    isFetchingMore: rowsQuery.isFetchingNextPage,
    fetchNextPage: rowsQuery.fetchNextPage,
    isLoading: rowsQuery.isLoading || countQuery.isLoading,
  };
}