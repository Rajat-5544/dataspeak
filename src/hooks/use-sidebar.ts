"use client";

import { useState, useEffect } from "react";

export function useSidebar() {
    const [isOpen, setIsOpen] = useState(true);

    // Load sidebar state from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem("sidebar-open");
        if (stored !== null) {
            setIsOpen(stored === "true");
        }
    }, []);

    // Save sidebar state to localStorage
    const toggle = () => {
        setIsOpen((prev) => {
            const newState = !prev;
            localStorage.setItem("sidebar-open", String(newState));
            return newState;
        });
    };

    const open = () => {
        setIsOpen(true);
        localStorage.setItem("sidebar-open", "true");
    };

    const close = () => {
        setIsOpen(false);
        localStorage.setItem("sidebar-open", "false");
    };

    return {
        isOpen,
        toggle,
        open,
        close,
    };
}
