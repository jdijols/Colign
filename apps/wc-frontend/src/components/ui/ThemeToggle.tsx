import { HiSun, HiMoon, HiDesktopComputer } from "react-icons/hi";
import { useTheme, type Theme } from "@/lib/theme";
import { cn } from "@/lib/cn";

const ORDER: Theme[] = ["light", "dark", "system"];

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const cycle = () => {
    const idx = ORDER.indexOf(theme);
    setTheme(ORDER[(idx + 1) % ORDER.length]);
  };
  const Icon = theme === "light" ? HiSun : theme === "dark" ? HiMoon : HiDesktopComputer;
  const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
  return (
    <button
      type="button"
      onClick={cycle}
      title={`Theme: ${theme} (click for ${next})`}
      aria-label={`Theme: ${theme}. Click to switch to ${next}.`}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors",
        className
      )}
    >
      <Icon className="h-4 w-4" aria-hidden />
    </button>
  );
}
