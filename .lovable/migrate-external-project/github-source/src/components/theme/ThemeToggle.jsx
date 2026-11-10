import React from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";

const MODES = ["light", "dark", "system"];
const ICONS = { light: Sun, dark: Moon, system: Monitor };

function resolveDark(mode) {
  if (mode === "dark") return true;
  if (mode === "light") return false;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

function applyTheme(mode) {
  const isDark = resolveDark(mode);
  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.style.colorScheme = isDark ? "dark" : "light";
}

export default function ThemeToggle() {
  const [mode, setMode] = React.useState(() => localStorage.getItem("themeMode") || "system");

  React.useEffect(() => {
    applyTheme(mode);
    localStorage.setItem("themeMode", mode);
  }, [mode]);

  React.useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [mode]);

  const cycleTheme = () => {
    const next = MODES[(MODES.indexOf(mode) + 1) % MODES.length];
    setMode(next);
  };

  const Icon = ICONS[mode];

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycleTheme}
      title={`Theme: ${mode} (tap to change)`}
      className="transition-colors min-h-[44px] min-w-[44px] select-none"
      style={{ WebkitUserSelect: "none" }}
    >
      <Icon className="w-5 h-5" />
    </Button>
  );
}