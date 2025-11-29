"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";

export default function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();

    return (
        <Button
            variant="outline"
            size="icon"
            onClick={toggleTheme}
            className="relative overflow-hidden transition-all duration-300 hover:scale-105"
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        >
            <Sun
                className={`h-[1.2rem] w-[1.2rem] transition-all duration-300 ${theme === "dark"
                        ? "rotate-90 scale-0 opacity-0"
                        : "rotate-0 scale-100 opacity-100"
                    }`}
            />
            <Moon
                className={`absolute h-[1.2rem] w-[1.2rem] transition-all duration-300 ${theme === "dark"
                        ? "rotate-0 scale-100 opacity-100"
                        : "-rotate-90 scale-0 opacity-0"
                    }`}
            />
            <span className="sr-only">Toggle theme</span>
        </Button>
    );
}
