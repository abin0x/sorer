import { useRef, useState } from "react";
import { addMonths, eachDayOfInterval, format, parseISO, startOfDay } from "date-fns";
export default function useDateCalendar({ dates, onChange, unavailable = {}, allowPast = false }) {
  const [month, setMonth] = useState(() => startOfDay(dates[0] ? parseISO(dates[0]) : new Date()));
  const [mode, setMode] = useState("specific");
  const anchor = useRef(null), lastSelected = useRef(null), touch = useRef(null);
  const [hover, setHover] = useState(null);
  const key = (date) => format(date, "yyyy-MM-dd");
  const reason = (date) => unavailable[key(date)] || (!allowPast && startOfDay(date) < startOfDay(new Date()) ? "Past date" : "");
  const available = (values) => values.filter((d) => !reason(parseISO(d)));
  const click = (day, modifiers, event) => {
    if (reason(day)) return;
    const value = key(day);
    const from = anchor.current || (event.shiftKey ? lastSelected.current : null);
    lastSelected.current = value;
    if (dates.includes(value) && !event.shiftKey) { onChange(dates.filter((d) => d !== value)); anchor.current = value; return; }
    if (mode === "range" && from) {
      const bounds = [from, value].sort();
      onChange(available(eachDayOfInterval({ start: parseISO(bounds[0]), end: parseISO(bounds[1]) }).map(key)));
      if (!event.shiftKey) anchor.current = null;
    } else { onChange(mode === "range" ? [value] : [...dates, value].sort()); anchor.current = value; }
  };
  return { month, setMonth, mode, setMode, reason, click, available, setHover,
    preview: (day) => mode === "range" && anchor.current && hover && !reason(day) && key(day) >= [anchor.current, hover].sort()[0] && key(day) <= [anchor.current, hover].sort()[1],
    clear: () => { anchor.current = null; lastSelected.current = null; onChange([]); },
    touchStart: (e) => { touch.current = [e.touches[0].clientX, e.touches[0].clientY]; },
    touchEnd: (e) => { if (!touch.current) return; const [x, y] = touch.current; const dx = e.changedTouches[0].clientX - x, dy = e.changedTouches[0].clientY - y; if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) setMonth((m) => addMonths(m, dx < 0 ? 1 : -1)); touch.current = null; }
  };
}