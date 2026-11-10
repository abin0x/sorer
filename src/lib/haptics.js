/** Light "haptic" feedback: vibrates on phones that support it, silent everywhere else. */
export function haptic(kind = "tap") {
  const pattern = { tap: 8, success: [10, 40, 18], warn: [30, 30, 30] }[kind] ?? 8;
  try { if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(pattern); } catch { /* unsupported */ }
}
