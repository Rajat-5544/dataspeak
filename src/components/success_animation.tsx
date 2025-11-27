"use client";

import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SuccessAnimationProps {
  show: boolean;
  message?: string;
  onComplete?: () => void;
  className?: string;
}

export default function SuccessAnimation({
  show,
  message,
  onComplete,
  className,
}: SuccessAnimationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (show) {
      setShouldRender(true);
      // Trigger animation after a brief delay
      setTimeout(() => setIsVisible(true), 10);
      // Hide after animation completes
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => {
          setShouldRender(false);
          onComplete?.();
        }, 300);
      }, 2000);

      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!shouldRender) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center pointer-events-none",
        className
      )}
    >
      <div
        className={cn(
          "flex flex-col items-center gap-3 p-6 rounded-lg bg-background border border-border shadow-lg",
          "transition-all duration-300",
          isVisible
            ? "opacity-100 scale-100"
            : "opacity-0 scale-95"
        )}
      >
        <div className="relative">
          <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-75" />
          <CheckCircle2 className="relative h-12 w-12 text-green-500 animate-in zoom-in duration-300" />
        </div>
        {message && (
          <p className="text-sm font-medium text-foreground animate-in fade-in slide-in-from-bottom-2 duration-300">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

