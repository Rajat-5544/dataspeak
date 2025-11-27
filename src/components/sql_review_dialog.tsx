"use client";

import { Button } from "@/components/ui/button";
import { Code2, AlertTriangle, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SQLReviewDialogProps {
  sql: string;
  isOpen: boolean;
  onApprove: () => void;
  onCancel: () => void;
}

export default function SQLReviewDialog({
  sql,
  isOpen,
  onApprove,
  onCancel,
}: SQLReviewDialogProps) {
  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(sql);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 p-6 border-b border-border">
          <div className="rounded-full bg-amber-500/10 p-2">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold">Review Generated SQL</h2>
            <p className="text-sm text-muted-foreground mt-1">
              This query will modify your data. Please review before executing.
            </p>
          </div>
        </div>

        {/* SQL Display */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                Generated SQL:
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="gap-2"
            >
              Copy SQL
            </Button>
          </div>
          <pre className="text-sm font-mono bg-muted/50 p-4 rounded-lg border border-border overflow-x-auto">
            <code>{sql}</code>
          </pre>
        </div>

        {/* Warning Message */}
        <div className="px-6 pb-4">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-amber-700 dark:text-amber-400 mb-1">Warning</p>
              <p className="text-muted-foreground">
                This query will modify your data. Make sure you understand what
                it does before approving. You can download the modified data
                after execution.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
          <Button variant="outline" onClick={onCancel} className="gap-2">
            <X className="h-4 w-4" />
            Cancel
          </Button>
          <Button onClick={onApprove} className="gap-2">
            <Check className="h-4 w-4" />
            Approve & Execute
          </Button>
        </div>
      </div>
    </div>
  );
}

