"use client";

import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModificationBadgeProps {
  className?: string;
}

export default function ModificationBadge({ className }: ModificationBadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium",
        "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
        "border border-amber-200 dark:border-amber-800",
        "animate-in fade-in slide-in-from-top-2 duration-300",
        className
      )}
    >
      <AlertCircle className="h-3.5 w-3.5" />
      <span>Data Modified</span>
    </div>
  );
}

