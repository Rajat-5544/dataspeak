import { ColumnDef } from "@tanstack/react-table";
import React from "react";

export function createColumnsFromData(data: any[]): ColumnDef<any>[] {
  if (!data.length) return [];

  return Object.keys(data[0]).map((key) => ({
    accessorKey: key,
    header: key
      .split(/(?=[A-Z])|_|-/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" "),
    cell: ({ row }: any) => {
      const value = row.original[key];
      if (value === null || value === undefined) {
        return React.createElement("span", { className: "text-muted-foreground italic" }, "null");
      }
      if (typeof value === "number") {
        return value.toLocaleString();
      }
      return String(value);
    },
    enableSorting: true,
  })) as ColumnDef<any>[];
}