"use client";

import { cn } from "@/lib/utils";

export function QueryInputSkeleton() {
  return (
    <div className="w-full space-y-4 animate-in fade-in duration-500">
      {/* Mode Toggle Skeleton */}
      <div className="flex items-center gap-2">
        <div className="h-4 w-12 bg-muted rounded shimmer" />
        <div className="inline-flex rounded-lg border border-border bg-muted/50 p-1 gap-1">
          <div className="h-10 w-40 bg-muted rounded-md shimmer" />
          <div className="h-10 w-24 bg-muted rounded-md shimmer" />
        </div>
      </div>

      {/* Query Input Skeleton */}
      <div className="relative glass-card rounded-lg p-4">
        <div className="space-y-2">
          <div className="h-4 w-3/4 bg-muted rounded shimmer" />
          <div className="h-4 w-full bg-muted rounded shimmer" />
          <div className="h-4 w-5/6 bg-muted rounded shimmer" />
          <div className="h-4 w-2/3 bg-muted rounded shimmer" />
        </div>
      </div>

      {/* Helper Text Skeleton */}
      <div className="h-3 w-2/3 bg-muted rounded shimmer" />

      {/* Button Skeleton */}
      <div className="flex justify-end">
        <div className="h-10 w-32 bg-primary/20 rounded-lg shimmer" />
      </div>
    </div>
  );
}

export function TableSkeleton() {
  return (
    <div className="w-full space-y-4 animate-in fade-in duration-500">
      {/* Stats Skeleton */}
      <div className="flex items-center justify-end">
        <div className="h-4 w-24 bg-muted rounded shimmer" />
      </div>

      {/* Table Skeleton */}
      <div className="rounded-lg border glass-card overflow-hidden">
        {/* Header */}
        <div className="bg-muted/50 border-b p-4">
          <div className="flex gap-4">
            <div className="h-5 w-32 bg-muted rounded shimmer" />
            <div className="h-5 w-40 bg-muted rounded shimmer" />
            <div className="h-5 w-36 bg-muted rounded shimmer" />
            <div className="h-5 w-28 bg-muted rounded shimmer" />
          </div>
        </div>

        {/* Rows */}
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className={cn(
              "p-4 border-b transition-opacity",
              i % 2 === 0 ? "bg-background" : "bg-muted/20"
            )}
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="flex gap-4">
              <div className="h-4 w-32 bg-muted rounded shimmer" />
              <div className="h-4 w-40 bg-muted rounded shimmer" />
              <div className="h-4 w-36 bg-muted rounded shimmer" />
              <div className="h-4 w-28 bg-muted rounded shimmer" />
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-4 w-32 bg-muted rounded shimmer" />
        <div className="flex gap-2">
          <div className="h-9 w-24 bg-muted rounded shimmer" />
          <div className="h-9 w-24 bg-muted rounded shimmer" />
        </div>
        <div className="h-9 w-32 bg-muted rounded shimmer" />
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
