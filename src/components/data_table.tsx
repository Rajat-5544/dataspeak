"use client";

import { useState } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  PaginationState,
  OnChangeFn,
} from "@tanstack/react-table";

import { Button } from "./ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, ArrowUp, ArrowDown, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "../lib/utils";
import { useEffect } from "react";

export interface DataTableProps<TData> {
  columns: ColumnDef<TData>[];
  data: TData[];
  rowCount?: number; // Optional: Total rows in the database (for manual pagination)
  pagination?: PaginationState; // Optional: External pagination state
  onPaginationChange?: OnChangeFn<PaginationState>; // Optional: Handler for pagination changes
}

export function DataTable<TData>({
  columns,
  data,
  rowCount,
  pagination,
  onPaginationChange
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // If rowCount is provided, we assume manual (server-side) pagination
  const isManualPagination = rowCount !== undefined;

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,

    // Manual Pagination Configuration
    manualPagination: isManualPagination,
    rowCount: rowCount,
    onPaginationChange: onPaginationChange,

    state: {
      sorting,
      // Only pass pagination state if we are controlling it manually
      ...(isManualPagination && pagination ? { pagination } : {}),
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  // Handle escape key to exit fullscreen
  // Handle escape key to exit fullscreen and manage body scroll
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    if (isFullscreen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isFullscreen]);

  return (
    <div className={cn(
      "w-full space-y-4",
      isFullscreen && "fixed inset-0 z-50 bg-background p-6 overflow-auto"
    )}>
      {/* Stats and Fullscreen Toggle */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="gap-2"
        >
          {isFullscreen ? (
            <>
              <Minimize2 className="h-4 w-4" />
              Exit Fullscreen
            </>
          ) : (
            <>
              <Maximize2 className="h-4 w-4" />
              Fullscreen
            </>
          )}
        </Button>
        <div className="text-sm text-muted-foreground mt-2">
          {/* Show total row count from prop if manual, otherwise table length */}
          {isManualPagination
            ? `${rowCount?.toLocaleString()} total rows`
            : `${data.length} ${data.length === 1 ? "row" : "rows"}`}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border glass-card shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b backdrop-blur-sm">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort();
                    const isSorted = header.column.getIsSorted();
                    return (
                      <th
                        key={header.id}
                        className={cn(
                          "p-4 text-left text-sm font-semibold text-foreground",
                          canSort && "cursor-pointer select-none hover:bg-muted/80 transition-all duration-200 hover:scale-[1.01]"
                        )}
                        onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                      >
                        <div className="flex items-center gap-2">
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                          {canSort && (
                            <span className="text-muted-foreground transition-transform duration-200">
                              {isSorted === "asc" ? (
                                <ArrowUp className="h-4 w-4" />
                              ) : isSorted === "desc" ? (
                                <ArrowDown className="h-4 w-4" />
                              ) : (
                                <ArrowUpDown className="h-4 w-4 opacity-50" />
                              )}
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row, index) => (
                  <tr
                    key={row.id}
                    className={cn(
                      "border-b transition-all duration-200",
                      "hover:bg-primary/5 hover:scale-[1.001] hover:shadow-sm",
                      index % 2 === 0 ? "bg-background" : "bg-muted/20"
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="p-4 text-sm">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <p className="text-sm font-medium">No data found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-sm text-muted-foreground">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            className="hidden sm:flex"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
            className="hidden sm:flex"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows per page:</span>
          <select
            value={table.getState().pagination.pageSize}
            onChange={(e) => {
              table.setPageSize(Number(e.target.value));
            }}
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
          >
            {[10, 20, 30, 50, 100].map((pageSize) => (
              <option key={pageSize} value={pageSize}>
                {pageSize}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}