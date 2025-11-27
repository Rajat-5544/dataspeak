"use client";

import { useState } from "react";
import FileUpload from "@/components/file_upload";
import QueryInput, { QueryMode } from "@/components/query_input";
import { DataTable } from "@/components/data_table";
import { ToastContainer } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { createColumnsFromData } from "@/lib/columns";
import { getDuckDB } from "@/lib/duckdb";
import { getTableSchema, formatSchemaAsMarkdown } from "@/lib/schema";
import { executeSafeQuery, executeUnsafeQuery, QueryResult, isModifyingQuery } from "@/lib/query";
import SchemaViewer from "@/components/schema_viewer";
import SQLReviewDialog from "@/components/sql_review_dialog";
import ModificationBadge from "@/components/modification_badge";
import ErrorDisplay from "@/components/error_display";
import SuccessAnimation from "@/components/success_animation";
import { QueryInputSkeleton, TableSkeleton } from "@/components/loading_skeleton";
import { downloadData, generateFilenameWithTimestamp } from "@/lib/export";
import { Database, FileSpreadsheet, FileText, Sparkles, Code2, Eye, EyeOff, Download } from "lucide-react";

export default function Home() {
  const [rows, setRows] = useState<any[]>([]);
  const [columns, setColumns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [queryColumns, setQueryColumns] = useState<any[]>([]);
  const [isExecutingQuery, setIsExecutingQuery] = useState(false);
  const [showSQL, setShowSQL] = useState(false);
  const [tableSchema, setTableSchema] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>("full");
  const [showSQLReview, setShowSQLReview] = useState(false);
  const [pendingSQL, setPendingSQL] = useState<string | null>(null);
  const [pendingMode, setPendingMode] = useState<QueryMode | null>(null);
  const [originalFileName, setOriginalFileName] = useState<string>("");
  const [fileFormat, setFileFormat] = useState<"csv" | "xlsx" | null>(null);
  const [hasModifications, setHasModifications] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>("");
  const { toasts, toast, removeToast } = useToast();

  async function loadFile(file: File) {
    setIsLoading(true);
    const db = await getDuckDB();
    const conn = await db.connect();

    try {
      // Drop existing table if it exists
      await conn.query(`DROP TABLE IF EXISTS data;`);

      if (file.name.endsWith(".csv")) {
        const text = await file.text();
        const blob = new Blob([text], { type: "text/csv" });
        await db.registerFileBuffer("input.csv", new Uint8Array(await blob.arrayBuffer()));

        await conn.query(`
          CREATE TABLE data AS 
          SELECT * FROM read_csv('input.csv', AUTO_DETECT=TRUE);
        `);
      } else if (file.name.endsWith(".xlsx")) {
        // Register Excel file directly with DuckDB
        const arrayBuffer = await file.arrayBuffer();
        await db.registerFileBuffer("input.xlsx", new Uint8Array(arrayBuffer));

        await conn.query(`
          CREATE TABLE data AS 
          SELECT * FROM read_xlsx('input.xlsx');
        `);
      } else {
        throw new Error("Unsupported file type. Please upload a .csv or .xlsx file.");
      }

      const result: any = await conn.query(`SELECT * FROM data;`);
      const values = result.toArray().map((r: any) => r.toJSON());
      //const result = await conn.send("SELECT * FROM data;");

      //const values = [];
      //for await (const batch of result) {
      //  for (let i = 0; i < batch.numRows; i++) {
      //    values.push(batch.get(i));  // Already JS objects
      //  }
      //}

      setRows(values);
      setColumns(createColumnsFromData(values));
      
      // Store file information
      setOriginalFileName(file.name);
      setFileFormat(file.name.endsWith(".csv") ? "csv" : "xlsx");
      setHasModifications(false); // Reset modifications on new file
      
      // Get and store table schema for schema viewer
      try {
        const schema = await getTableSchema(conn, "data");
        setTableSchema(schema);
      } catch (error) {
        console.warn("Failed to get table schema:", error);
      }
      
      toast.success(
        "File loaded successfully!",
        `${values.length} rows loaded from ${file.name}`
      );
    } catch (error) {
      console.error("Error loading file:", error);
      toast.error(
        "Failed to load file",
        error instanceof Error ? error.message : "Unknown error occurred"
      );
    } finally {
      conn.close();
      setIsLoading(false);
    }
  }

  async function executeQuery(query: string, mode: QueryMode) {
    if (!rows.length) {
      toast.error("No data loaded", "Please upload a file first");
      return;
    }

    setIsExecutingQuery(true);
    setQueryResult(null);
    setShowSQL(false); // Reset SQL visibility
    setActiveTab("query"); // Switch to query results tab when executing
    const db = await getDuckDB();
    const conn = await db.connect();

    try {
      let sql = query;
      let generatedSQL = null;

      // If natural language mode, convert to SQL using LLM
      if (mode === "natural") {
        try {
          // Get schema for the data table
          const schema = await getTableSchema(conn, "data");
          const schemaMarkdown = formatSchemaAsMarkdown(schema);

          // Call LLM API to generate SQL
          const response = await fetch("/api/llm", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              question: query,
              schema: schemaMarkdown,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to generate SQL");
          }

          const data = await response.json();
          if (!data.success || !data.sql) {
            throw new Error(data.error || "Failed to generate SQL");
          }

          sql = data.sql;
          generatedSQL = sql;
        } catch (error) {
          console.error("LLM error:", error);
          toast.error(
            "Failed to generate SQL",
            error instanceof Error ? error.message : "Unknown error"
          );
          setIsExecutingQuery(false);
          conn.close();
          return;
        }
      }

      // Check if this is a modifying query (UPDATE, DELETE, INSERT)
      const isModifying = isModifyingQuery(sql);

      // If modifying query from natural language, show review dialog
      if (isModifying && mode === "natural") {
        setPendingSQL(sql);
        setPendingMode(mode);
        setShowSQLReview(true);
        setIsExecutingQuery(false);
        conn.close();
        return;
      }

      // Execute the SQL query
      await executeQueryInternal(conn, sql, generatedSQL, mode);
    } catch (error) {
      console.error("Query execution error:", error);
      toast.error(
        "Query execution failed",
        error instanceof Error ? error.message : "Unknown error occurred"
      );
      setQueryResult({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      setIsExecutingQuery(false);
      conn.close();
    }
  }

  async function executeQueryInternal(
    conn: any,
    sql: string,
    generatedSQL: string | null,
    mode: QueryMode
  ) {
    try {
      // Execute the SQL query
      // Use executeUnsafeQuery for direct SQL (allows UPDATE, DELETE, etc.)
      // Use executeSafeQuery for AI-generated SELECT queries
      const isModifying = isModifyingQuery(sql);
      const result = mode === "sql" || isModifying
        ? await executeUnsafeQuery(conn, sql)
        : await executeSafeQuery(conn, sql);
      
      // Store the SQL that was executed
      if (generatedSQL) {
        result.sql = generatedSQL;
      } else {
        result.sql = sql;
      }

      // Check if query modified data
      if (result.success && isModifying) {
        setHasModifications(true);
        // Refresh the full data after modification
        const refreshResult: any = await conn.query(`SELECT * FROM data;`);
        const refreshValues = refreshResult.toArray().map((r: any) => r.toJSON());
        setRows(refreshValues);
        setColumns(createColumnsFromData(refreshValues));
      }

      if (result.success && result.data) {
        setQueryResult(result);
        setQueryColumns(createColumnsFromData(result.data));
        const message = `Query executed successfully - ${result.data.length} row${result.data.length !== 1 ? "s" : ""} returned`;
        setSuccessMessage(message);
        setShowSuccessAnimation(true);
        toast.success(
          "Query executed successfully",
          `Returned ${result.data.length} row${result.data.length !== 1 ? "s" : ""}`
        );
      } else {
        setQueryResult(result);
        toast.error(
          "Query failed",
          result.error || "Unknown error occurred"
        );
      }
    } finally {
      conn.close();
      setIsExecutingQuery(false);
    }
  }

  async function handleApproveSQL() {
    if (!pendingSQL || !pendingMode) return;

    setShowSQLReview(false);
    setIsExecutingQuery(true);
    setActiveTab("query");

    const db = await getDuckDB();
    const conn = await db.connect();

    try {
      await executeQueryInternal(conn, pendingSQL, pendingSQL, pendingMode);
      toast.success("SQL Approved", "Query executed successfully");
    } catch (error) {
      console.error("Query execution error:", error);
      toast.error(
        "Query execution failed",
        error instanceof Error ? error.message : "Unknown error occurred"
      );
    } finally {
      setPendingSQL(null);
      setPendingMode(null);
    }
  }

  async function handleDownloadData() {
    if (!fileFormat || !rows.length) {
      toast.error("No data to download", "Please upload a file first");
      return;
    }

    try {
      const db = await getDuckDB();
      const conn = await db.connect();

      // Get all current data from DuckDB
      const result: any = await conn.query(`SELECT * FROM data;`);
      const data = result.toArray().map((r: any) => r.toJSON());

      // Generate filename with timestamp
      const filename = generateFilenameWithTimestamp(originalFileName);

      // Download the data
      downloadData(data, filename, fileFormat);

      toast.success(
        "Download started",
        `Data exported as ${fileFormat.toUpperCase()}`
      );

      conn.close();
    } catch (error) {
      console.error("Download error:", error);
      toast.error(
        "Download failed",
        error instanceof Error ? error.message : "Unknown error occurred"
      );
    }
  }

  return (
    <>
      <main className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 max-w-7xl">
          {/* Hero Section */}
          <div className="text-center mb-12 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="rounded-full bg-primary/10 p-3">
                <Database className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                DataSpeak
              </h1>
            </div>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              Upload CSV or Excel files and explore/update your data with powerful DuckDB-powered analytics
            </p>
            <div className="flex items-center justify-center gap-6 pt-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span>CSV Support</span>
              </div>
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                <span>Excel Support</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                <span>Instant Analysis</span>
              </div>
            </div>
          </div>

          {/* Upload Section */}
          <div className="mb-12 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-150">
            <FileUpload onFileSelect={loadFile} isLoading={isLoading} />
          </div>

          {/* Query Interface */}
          {rows.length > 0 && (
            <div className="mb-12 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300 space-y-6">
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-semibold mb-2">Query Your Data</h2>
                  <p className="text-sm text-muted-foreground">
                    Ask questions in natural language or write SQL queries directly
                  </p>
                </div>
                <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
                  {isExecutingQuery ? (
                    <QueryInputSkeleton />
                  ) : (
                    <QueryInput
                      onExecute={executeQuery}
                      isLoading={isExecutingQuery}
                      disabled={isLoading}
                    />
                  )}
                </div>
              </div>

              {/* Schema Viewer */}
              {tableSchema && (
                <SchemaViewer schema={tableSchema} />
              )}
            </div>
          )}

          {/* Data Views with Tabs */}
          {rows.length > 0 && (
            <div className="mb-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-semibold">Data Views</h2>
                    {hasModifications && <ModificationBadge />}
                  </div>
                  <div className="flex items-center gap-2">
                    {hasModifications && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleDownloadData}
                        className="gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Download {fileFormat?.toUpperCase()}
                      </Button>
                    )}
                    {queryResult?.sql && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowSQL(!showSQL)}
                        className="gap-2"
                      >
                        {showSQL ? (
                          <>
                            <EyeOff className="h-4 w-4" />
                            Hide SQL
                          </>
                        ) : (
                          <>
                            <Eye className="h-4 w-4" />
                            Show SQL
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Switch between query results and full dataset
                </p>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="query" disabled={!queryResult}>
                    Query Results
                    {queryResult?.success && queryResult.data && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({queryResult.data.length})
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="full">
                    Full Data
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({rows.length})
                    </span>
                  </TabsTrigger>
                </TabsList>

                {/* Query Results Tab */}
                <TabsContent value="query">
                  {queryResult ? (
                    <>
                      {/* SQL Display */}
                      {showSQL && queryResult.sql && (
                        <div className="mb-6 p-4 bg-muted/50 rounded-lg border border-border">
                          <div className="flex items-center gap-2 mb-2">
                            <Code2 className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-muted-foreground">Executed SQL:</span>
                          </div>
                          <pre className="text-sm font-mono bg-background p-3 rounded border border-border overflow-x-auto">
                            <code>{queryResult.sql}</code>
                          </pre>
                        </div>
                      )}

                      {/* Query Result Status */}
                      <div className="mb-4">
                        {queryResult.success ? (
                          <p className="text-sm text-muted-foreground">
                            {queryResult.data?.length || 0} row{queryResult.data?.length !== 1 ? "s" : ""} returned
                          </p>
                        ) : (
                          <ErrorDisplay error={queryResult.error || "Query execution failed"} />
                        )}
                      </div>

                      {/* Query Results Table */}
                      {queryResult.success && queryResult.data && queryResult.data.length > 0 ? (
                        <DataTable columns={queryColumns} data={queryResult.data} />
                      ) : queryResult.success ? (
                        <div className="text-center py-12 bg-muted/50 rounded-lg border border-border">
                          <p className="text-muted-foreground">Query returned no results</p>
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <div className="text-center py-12 bg-muted/50 rounded-lg border border-border">
                      <p className="text-muted-foreground">No query executed yet</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Run a query above to see results here
                      </p>
                    </div>
                  )}
                </TabsContent>

                {/* Full Data Tab */}
                <TabsContent value="full">
                  <DataTable columns={columns} data={rows} />
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* Empty State */}
          {rows.length === 0 && (
            <div className="text-center py-16 animate-in fade-in duration-700 delay-300">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-4">
                <Database className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No data loaded yet</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Upload a CSV or Excel file above to get started. Your data will appear here once loaded.
              </p>
            </div>
          )}
        </div>
      </main>
      <ToastContainer toasts={toasts} onClose={removeToast} />
      <SQLReviewDialog
        sql={pendingSQL || ""}
        isOpen={showSQLReview}
        onApprove={handleApproveSQL}
        onCancel={() => {
          setShowSQLReview(false);
          setPendingSQL(null);
          setPendingMode(null);
          setIsExecutingQuery(false);
        }}
      />
      <SuccessAnimation
        show={showSuccessAnimation}
        message={successMessage}
        onComplete={() => {
          setShowSuccessAnimation(false);
          setSuccessMessage("");
        }}
      />
    </>
  );
}