"use client";

import { cn } from "@/lib/utils";
import { Database, Upload, Search, Settings, ChevronLeft, ChevronRight } from "lucide-react";
import ThemeToggle from "./theme_toggle";

interface SidebarProps {
    isOpen: boolean;
    onToggle: () => void;
}

export default function Sidebar({ isOpen, onToggle }: SidebarProps) {
    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    };

    const navItems = [
        { icon: Database, label: "Home", id: "home" },
        { icon: Search, label: "Query", id: "query" },
    ];

    return (
        <>
            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed left-0 top-0 h-screen glass-strong border-r border-border z-40",
                    "transition-all duration-300 ease-in-out",
                    isOpen ? "w-64" : "w-16"
                )}
            >
                <div className="flex flex-col h-full p-4">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        {isOpen && (
                            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left duration-300">
                                <div className="rounded-full bg-primary/10 p-2">
                                    <Database className="h-5 w-5 text-primary" />
                                </div>
                                <span className="font-bold text-lg">DataSpeak</span>
                            </div>
                        )}
                        <button
                            onClick={onToggle}
                            className={cn(
                                "rounded-lg p-2 hover:bg-muted transition-all duration-200",
                                "hover:scale-110 active:scale-95",
                                !isOpen && "mx-auto"
                            )}
                            aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
                        >
                            {isOpen ? (
                                <ChevronLeft className="h-5 w-5" />
                            ) : (
                                <ChevronRight className="h-5 w-5" />
                            )}
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 space-y-2">
                        {navItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => scrollToSection(item.id)}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg",
                                    "text-muted-foreground hover:text-foreground",
                                    "hover:bg-primary/10 transition-all duration-200",
                                    "hover:scale-105 active:scale-95",
                                    !isOpen && "justify-center"
                                )}
                                title={!isOpen ? item.label : undefined}
                            >
                                <item.icon className="h-5 w-5 flex-shrink-0" />
                                {isOpen && (
                                    <span className="text-sm font-medium animate-in fade-in slide-in-from-left duration-300">
                                        {item.label}
                                    </span>
                                )}
                            </button>
                        ))}
                    </nav>

                    {/* Footer */}
                    <div className="mt-auto pt-4 border-t border-border">
                        <div
                            className={cn(
                                "flex items-center gap-3",
                                !isOpen && "justify-center"
                            )}
                        >
                            <ThemeToggle />
                            {isOpen && (
                                <span className="text-xs text-muted-foreground animate-in fade-in slide-in-from-left duration-300">
                                    Toggle Theme
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </aside>

            {/* Overlay for mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 lg:hidden"
                    onClick={onToggle}
                />
            )}
        </>
    );
}
