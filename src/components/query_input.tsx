"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Code2, Sparkles, Play, Loader2, X } from "lucide-react";

export type QueryMode = "natural" | "sql";

interface QueryInputProps {
  onExecute: (query: string, mode: QueryMode) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export default function QueryInput({
  onExecute,
  isLoading = false,
  disabled = false,
}: QueryInputProps) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<QueryMode>("natural");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    if (!query.trim() || isLoading || disabled) return;
    onExecute(query.trim(), mode);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Cmd/Ctrl + Enter
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleClear = () => {
    setQuery("");
    textareaRef.current?.focus();
  };

  return (
    <div className="w-full space-y-4">
      {/* Mode Toggle */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Mode:</span>
        <div className="inline-flex rounded-lg border border-border bg-muted/50 p-1">
          <button
            type="button"
            onClick={() => setMode("natural")}
            disabled={disabled || isLoading}
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all",
              "disabled:cursor-not-allowed disabled:opacity-50",
              mode === "natural"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Sparkles className="h-4 w-4" />
            Natural Language
          </button>
          <button
            type="button"
            onClick={() => setMode("sql")}
            disabled={disabled || isLoading}
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all",
              "disabled:cursor-not-allowed disabled:opacity-50",
              mode === "sql"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Code2 className="h-4 w-4" />
            SQL
          </button>
        </div>
      </div>

      {/* Query Input */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            mode === "natural"
              ? "Ask a question in plain English... (e.g., 'Show total sales by region')"
              : "Enter your SQL query... (e.g., SELECT * FROM data LIMIT 10)"
          }
          disabled={disabled || isLoading}
          className={cn(
            "w-full min-h-[120px] rounded-lg border border-input bg-background px-4 py-3 text-sm",
            "placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "resize-y font-mono"
          )}
          rows={4}
        />
        {query && !isLoading && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-2 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Clear query"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Helper Text */}
      <p className="text-xs text-muted-foreground">
        {mode === "natural" ? (
          <>
            Ask questions in plain English. The AI will convert it to SQL automatically (SELECT queries only, UPDATE queries will require a review).
          </>
        ) : (
          <>
            Write SQL queries directly. All SQL operations are allowed (SELECT, UPDATE, DELETE, etc.). Press <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">Cmd/Ctrl + Enter</kbd> to execute.
          </>
        )}
      </p>

      {/* Submit Button */}
      <div className="flex items-center justify-end gap-2">
        {isLoading ? (
          <div className="flex items-center gap-2 min-w-[120px] justify-end">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">
              {mode === "natural" ? "Generating..." : "Executing..."}
            </span>
          </div>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={!query.trim() || disabled}
            className="min-w-[120px]"
          >
            <Play className="h-4 w-4" />
            Execute Query
          </Button>
        )}
      </div>
    </div>
  );
}

