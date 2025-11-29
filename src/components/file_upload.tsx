"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, FileText, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isLoading?: boolean;
}

const VALID_EXTENSIONS = [".csv", ".xlsx"];

export default function FileUpload({
  onFileSelect,
  isLoading = false,
}: FileUploadProps) {
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const isValidExtension = (name: string) => {
    const lower = name.toLowerCase();
    return VALID_EXTENSIONS.some((ext) => lower.endsWith(ext));
  };

  const handleFile = useCallback(
    (file: File) => {
      if (!isValidExtension(file.name)) {
        setError("Invalid file type. Please upload a CSV or XLSX file.");
        return;
      }

      setError(null);
      setFileName(file.name);
      setFileSize(file.size);
      onFileSelect(file);
    },
    [onFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const fileList = Array.from(e.dataTransfer.files);
      const file = fileList.find((f) => isValidExtension(f.name));

      if (!file) {
        setError("No valid file found. Only CSV or XLSX allowed.");
        return;
      }

      handleFile(file);
    },
    [handleFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleClear = useCallback(() => {
    setFileName("");
    setFileSize(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const getFileIcon = () => {
    const lower = fileName.toLowerCase();
    if (lower.endsWith(".xlsx")) {
      return <FileSpreadsheet className="h-8 w-8 text-blue-500" />;
    }
    if (lower.endsWith(".csv")) {
      return <FileText className="h-8 w-8 text-green-500" />;
    }
    return <FileText className="h-8 w-8" />;
  };

  return (
    <div className="w-full">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "relative border-2 border-dashed rounded-xl p-8 transition-all duration-300 cursor-pointer",
          "glass-card scale-hover",
          isDragging
            ? "border-primary bg-primary/10 scale-[1.03] shadow-lg shadow-primary/20"
            : "border-border hover:border-primary/50 hover-glow",
          isLoading && "opacity-50 pointer-events-none",
          fileName && "hover:shadow-xl"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx"
          className="hidden"
          id="file-input"
          onChange={handleFileInput}
          disabled={isLoading}
        />

        {!fileName ? (
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <div className="rounded-full bg-primary/10 p-4">
              <Upload className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">
                Drop your file here or click to browse
              </h3>
              <p className="text-sm text-muted-foreground">
                Supports CSV and Excel (.xlsx) files
              </p>
            </div>
            <Button disabled={isLoading} className="mt-2">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Select File
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">{getFileIcon()}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{fileName}</p>
              {fileSize !== null && (
                <p className="text-xs text-muted-foreground mt-1">
                  {formatFileSize(fileSize)}
                </p>
              )}
            </div>

            {!isLoading && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
                className="flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            {isLoading && (
              <Loader2 className="h-5 w-5 animate-spin text-primary flex-shrink-0" />
            )}
          </div>
        )}
      </div>

      {/* Optional error text (rendered only if needed) */}
      {error && (
        <p className="mt-2 text-sm text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}