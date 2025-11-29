"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

export function useTheme() {
    const [theme, setTheme] = useState<Theme>("light");
    const [mounted, setMounted] = useState(false);

    const applyTheme = (newTheme: Theme) => {
        const root = document.documentElement;
        if (newTheme === "dark") {
            root.classList.add("dark");
        } else {
            root.classList.remove("dark");
        }
    };

    useEffect(() => {
        setMounted(true);

        // Get theme from localStorage or system preference
        const storedTheme = localStorage.getItem("theme") as Theme | null;

        if (storedTheme) {
            setTheme(storedTheme);
            applyTheme(storedTheme);
        } else {
            // Check system preference
            const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
            const systemTheme = prefersDark ? "dark" : "light";
            setTheme(systemTheme);
            applyTheme(systemTheme);
        }

        // Listen for system theme changes (only if user hasn't set a preference)
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const handleChange = (e: MediaQueryListEvent) => {
            // Only auto-update if user hasn't manually set a theme
            if (!localStorage.getItem("theme")) {
                const newTheme = e.matches ? "dark" : "light";
                setTheme(newTheme);
                applyTheme(newTheme);
            }
        };

        mediaQuery.addEventListener("change", handleChange);
        return () => mediaQuery.removeEventListener("change", handleChange);
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === "light" ? "dark" : "light";
        setTheme(newTheme);
        applyTheme(newTheme);
        localStorage.setItem("theme", newTheme);
    };

    // Return light theme during SSR to prevent hydration mismatch
    if (!mounted) {
        return { theme: "light" as Theme, toggleTheme: () => { } };
    }

    return { theme, toggleTheme };
}
