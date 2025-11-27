"use client";

import { useState } from "react";
import { AlertCircle, ChevronDown, ChevronUp, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorDisplayProps {
  error: string;
  className?: string;
}

export default function ErrorDisplay({ error, className }: ErrorDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(error);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isLongError = error.length > 100;

  return (
    <div
      className={cn(
        "rounded-lg border border-destructive/20 bg-destructive/10 p-4",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium text-destructive">Query Error</p>
              <p className="text-sm text-destructive/80 mt-1">
                {isLongError && !isExpanded
                  ? `${error.substring(0, 100)}...`
                  : error}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopy}
                className="h-8 w-8"
                title="Copy error message"
              >
                <Copy className={cn("h-4 w-4", copied && "text-green-600")} />
              </Button>
              {isLongError && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="h-8 w-8"
                >
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          </div>
          {isExpanded && isLongError && (
            <div className="mt-3 p-3 rounded-md bg-background/50 border border-destructive/10">
              <pre className="text-xs font-mono text-destructive/90 whitespace-pre-wrap break-words">
                {error}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

