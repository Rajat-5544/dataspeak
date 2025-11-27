"use client";

import { cn } from "@/lib/utils";

interface LoadingSkeletonProps {
  className?: string;
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 5, columns = 4 }: LoadingSkeletonProps) {
  return (
    <div className="w-full space-y-3">
      {/* Header skeleton */}
      <div className="flex gap-4 pb-3 border-b border-border">
        {Array.from({ length: columns }).map((_, i) => (
          <div
            key={i}
            className="h-4 bg-muted rounded animate-pulse flex-1"
            style={{ maxWidth: `${100 / columns}%` }}
          />
        ))}
      </div>
      {/* Row skeletons */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div
              key={colIndex}
              className="h-4 bg-muted rounded animate-pulse flex-1"
              style={{
                maxWidth: `${100 / columns}%`,
                animationDelay: `${rowIndex * 50}ms`,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function QueryInputSkeleton() {
  return (
    <div className="w-full space-y-4">
      {/* Mode toggle skeleton */}
      <div className="flex items-center gap-2">
        <div className="h-4 w-12 bg-muted rounded animate-pulse" />
        <div className="h-10 w-48 bg-muted rounded-lg animate-pulse" />
      </div>
      {/* Textarea skeleton */}
      <div className="h-32 bg-muted rounded-lg animate-pulse" />
      {/* Button skeleton */}
      <div className="flex justify-end">
        <div className="h-9 w-32 bg-muted rounded animate-pulse" />
      </div>
    </div>
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-6 space-y-4",
        className
      )}
    >
      <div className="h-6 w-48 bg-muted rounded animate-pulse" />
      <div className="h-4 w-32 bg-muted rounded animate-pulse" />
      <div className="space-y-2">
        <div className="h-4 w-full bg-muted rounded animate-pulse" />
        <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
      </div>
    </div>
  );
}

