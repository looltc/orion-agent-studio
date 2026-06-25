import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/theme/ThemeContext";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      className="relative w-9 h-9 rounded-lg flex items-center justify-center
        text-surface-500 hover:text-surface-300 hover:bg-surface-800
        dark:text-surface-500 dark:hover:text-surface-300 dark:hover:bg-surface-800
        transition-colors"
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
