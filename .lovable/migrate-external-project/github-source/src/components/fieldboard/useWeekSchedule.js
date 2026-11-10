import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { loadWeek, saveAssignments, syncConflicts } from "@/lib/gridStore";
import { detectConflicts, formatFromName, defaultSplit, kindOf } from "@/lib/gridEngine";

export default function useWeekSchedule(clubId, weekStart) {
  const qc = useQueryClient();
  const key = ["gridWeek", clubId, weekStart];
  const { data, isLoading } = useQuery({ queryKey: key, queryFn: () => loadWeek(clubId, weekStart), enabled: !!clubId && !!weekStart });

  const bookings = useMemo(() => data?.bookings || [], [data]);
  const assignments = useMemo(() => data?.assignments || {}, [data]);
  const formats = useMemo(() => data?.formats || {}, [data]);
  const formatOf = useCallback((b) => formats[b.field_id] || formatFromName(b.field_name), [formats]);
  const conflicts = useMemo(() => detectConflicts(bookings, assignments, formatOf), [bookings, assignments, formatOf]);
  const byBooking = useMemo(() => {
    const m = {};
    conflicts.forEach((c) => (m[c.booking_id] ||= []).push(c));
    return m;
  }, [conflicts]);

  /** Optimistically apply a new assignments map, then persist the bookings that changed. */
  const update = useCallback(
    async (next) => {
      const changed = [...new Set([...Object.keys(assignments), ...Object.keys(next)])].filter(
        (id) => (assignments[id] || []).join() !== (next[id] || []).join()
      );
      if (!changed.length) return;
      qc.setQueryData(key, (d) => ({ ...d, assignments: next }));
      try {
        await saveAssignments({ clubId, weekStart, changed, next, bookings });
        await syncConflicts(clubId, weekStart, detectConflicts(bookings, next, formatOf));
      } catch (e) {
        qc.invalidateQueries({ queryKey: key });
        throw e;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [assignments, bookings, formatOf, clubId, weekStart]
  );

  /** Fill in grids for every training session that doesn't have one (preserves manual assignments). */
  const autoAssign = useCallback(async () => {
    const next = defaultSplit(bookings, assignments, formatOf);
    const changed = bookings.filter((b) => kindOf(b) === "training" && (assignments[b.id] || []).join() !== (next[b.id] || []).join()).map((b) => b.id);
    if (changed.length) await update(next);
    return { changed: changed.length };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings, assignments, formatOf, update]);

  return { clubId, weekStart, bookings, assignments, formatOf, conflicts, byBooking, update, autoAssign, loading: isLoading };
}