import * as XLSX from "xlsx";

/**
 * Convert array of objects to CSV string
 * @param data Array of objects
 * @returns CSV string
 */
export function arrayToCSV(data: any[]): string {
  if (data.length === 0) return "";

  // Get headers from first object
  const headers = Object.keys(data[0]);

  // Create CSV rows
  const rows = data.map((row) => {
    return headers.map((header) => {
      const value = row[header];
      // Handle values that contain commas, quotes, or newlines
      if (value === null || value === undefined) {
        return "";
      }
      const stringValue = String(value);
      if (
        stringValue.includes(",") ||
        stringValue.includes('"') ||
        stringValue.includes("\n")
      ) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    });
  });

  // Combine headers and rows
  const csvRows = [headers.join(","), ...rows.map((row) => row.join(","))];

  return csvRows.join("\n");
}

/**
 * Convert array of objects to Excel file (Blob)
 * @param data Array of objects
 * @param sheetName Name of the Excel sheet
 * @returns Blob containing Excel file
 */
export function arrayToExcel(
  data: any[],
  sheetName: string = "Sheet1"
): Blob {
  // Create a new workbook
  const workbook = XLSX.utils.book_new();

  // Convert array of objects to worksheet
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Convert workbook to binary string
  const excelBuffer = XLSX.write(workbook, {
    type: "array",
    bookType: "xlsx",
  });

  // Create blob from buffer
  return new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

/**
 * Download data as file
 * @param data Array of objects
 * @param filename Filename (without extension)
 * @param format File format ('csv' | 'xlsx')
 */
export function downloadData(
  data: any[],
  filename: string,
  format: "csv" | "xlsx"
): void {
  let blob: Blob;
  let mimeType: string;
  let extension: string;

  if (format === "csv") {
    const csvString = arrayToCSV(data);
    blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    mimeType = "text/csv";
    extension = "csv";
  } else {
    blob = arrayToExcel(data);
    mimeType =
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    extension = "xlsx";
  }

  // Create download link
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.${extension}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate filename with timestamp
 * @param originalFilename Original filename (without extension)
 * @returns Filename with timestamp
 */
export function generateFilenameWithTimestamp(
  originalFilename: string
): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
  const nameWithoutExt = originalFilename.replace(/\.[^/.]+$/, "");
  return `${nameWithoutExt}_${timestamp}`;
}

