"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Database, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { TableSchema } from "@/lib/schema";

interface SchemaViewerProps {
  schema: TableSchema;
  className?: string;
}

export default function SchemaViewer({ schema, className }: SchemaViewerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={cn("border border-border rounded-lg bg-card", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">Table Schema: {schema.tableName}</span>
          <span className="text-xs text-muted-foreground">
            ({schema.columns.length} columns)
          </span>
        </div>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {isOpen && (
        <div className="border-t border-border p-4">
          <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Info className="h-4 w-4" />
            <span>Use these exact column names when writing SQL queries</span>
          </div>
          <div className="space-y-2">
            {schema.columns.map((col, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 rounded-md bg-muted/30 border border-border/50"
              >
                <div className="flex items-center gap-3">
                  <code className="text-sm font-mono font-semibold text-foreground">
                    {col.column}
                  </code>
                  <span className="text-xs text-muted-foreground">
                    {col.type}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {col.nullable && (
                    <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground">
                      nullable
                    </span>
                  )}
                  {col.default && (
                    <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground">
                      default: {col.default}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

