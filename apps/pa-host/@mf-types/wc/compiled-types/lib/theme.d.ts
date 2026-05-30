export type Theme = "light" | "dark" | "system";
/**
 * Manages light/dark/system theme. Persists choice to localStorage. Updates
 * `class="dark"` on <html> for Tailwind's class-strategy dark mode.
 */
export declare function useTheme(): {
    theme: Theme;
    setTheme: (next: Theme) => void;
    cycle: () => void;
};
