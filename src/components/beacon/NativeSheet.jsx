import React, { useEffect, useRef, useState } from "react";

/** Mobile bottom sheet: drag handle, swipe-down to dismiss, safe-area padding. */
export default function NativeSheet({ open, onClose, title, children }) {
  const [dy, setDy] = useState(0);
  const start = useRef(null);
  useEffect(() => {
    if (!open) return;
    setDy(0);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [open, onClose]);
  if (!open) return null;
  const down = (e) => { start.current = e.clientY; e.currentTarget.setPointerCapture?.(e.pointerId); };
  const move = (e) => { if (start.current != null) setDy(Math.max(0, e.clientY - start.current)); };
  const up = () => { if (start.current == null) return; start.current = null; if (dy > 90) onClose(); else setDy(0); };
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-foreground/40 animate-in fade-in" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title}
        className="mx-auto w-full max-w-md rounded-t-3xl bg-background shadow-2xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-200"
        style={{ transform: `translateY(${dy}px)`, transition: start.current == null ? "transform 180ms ease-out" : "none" }}
        onClick={(e) => e.stopPropagation()}>
        <div className="pt-2 pb-1 cursor-grab touch-none" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
          <div className="mx-auto h-1.5 w-10 rounded-full bg-muted-foreground/40" />
          {title && <h2 className="text-lg font-bold px-4 pt-3">{title}</h2>}
        </div>
        <div className="overflow-y-auto overscroll-contain px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </div>
  );
}
