"use client";

import { useEffect, useState } from "react";
import * as duckdb from "@duckdb/duckdb-wasm";
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
import { PaginationState } from "@tanstack/react-table";
import Sidebar from "@/components/sidebar";
import { useSidebar } from "@/hooks/use-sidebar";

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

  // Sidebar state
  const { isOpen: sidebarOpen, toggle: toggleSidebar } = useSidebar();

  // Pagination State
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10, // Default to 50 rows per page
  });
  // Query pagination state
  const [queryPagination, setQueryPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const [queryTotalCount, setQueryTotalCount] = useState(0);
  const [queryRows, setQueryRows] = useState<any[]>([]);

  const [totalRowCount, setTotalRowCount] = useState(0);
  const { toasts, toast, removeToast } = useToast();

  useEffect(() => {
    // Only fetch if we have a file loaded (totalRowCount > 0) and we are not in the middle of loading a new file
    if (totalRowCount > 0 && !isLoading && originalFileName) {
      fetchPageData(pagination.pageIndex, pagination.pageSize);
    }
  }, [pagination.pageIndex, pagination.pageSize, totalRowCount]);

  useEffect(() => {
    if (queryTotalCount === 0) return; // No results yet
    fetchQueryPage(queryPagination.pageIndex, queryPagination.pageSize);
  }, [queryPagination.pageIndex, queryPagination.pageSize]);

  async function fetchQueryPage(pageIndex: number, pageSize: number) {
    const db = await getDuckDB();
    const conn = await db.connect();
    try {
      const offset = pageIndex * pageSize;
      const result = await conn.query(`SELECT * FROM query_data LIMIT ${pageSize} OFFSET ${offset}`);

      const rows = result.toArray().map((r: any) => r.toJSON());
      setQueryRows(rows);
    } finally {
      conn.close();
    }
  }


  async function fetchPageData(pageIndex: number, pageSize: number) {
    // Don't set global isLoading here to avoid UI flickering, possibly add a local "isFetching" if needed
    const db = await getDuckDB();
    const conn = await db.connect();

    try {
      const offset = pageIndex * pageSize;
      // Fetch only the slice of data needed
      const result: any = await conn.query(`SELECT * FROM data LIMIT ${pageSize} OFFSET ${offset};`);
      const values = result.toArray().map((r: any) => r.toJSON());
      setRows(values);
    } catch (error) {
      console.error("Error fetching page:", error);
      toast.error("Failed to fetch data page");
    } finally {
      conn.close();
    }
  }

  async function loadFile(file: File) {
    setIsLoading(true);
    const db = await getDuckDB();
    const conn = await db.connect();

    try {
      // Drop existing table if it exists
      await conn.query(`DROP TABLE IF EXISTS data;`);

      if (file.name.endsWith(".csv")) {
        await db.registerFileHandle(file.name, file, duckdb.DuckDBDataProtocol.BROWSER_FILEREADER, true);

        await conn.query(`
          CREATE TABLE data AS 
          SELECT * FROM read_csv('${file.name}', AUTO_DETECT=TRUE);
        `);
      } else if (file.name.endsWith(".xlsx")) {
        await db.registerFileHandle(file.name, file, duckdb.DuckDBDataProtocol.BROWSER_FILEREADER, true);

        await conn.query(`
          CREATE TABLE data AS 
          SELECT * FROM read_xlsx('${file.name}');
        `);
      } else {
        throw new Error("Unsupported file type. Please upload a .csv or .xlsx file.");
      }

      const countResult: any = await conn.query(`SELECT COUNT(*) as c FROM data;`);
      const totalRows = Number(countResult.toArray()[0].c);
      setTotalRowCount(totalRows);

      const initialPageSize = 10;
      setPagination({ pageIndex: 0, pageSize: initialPageSize });

      const previewResult: any = await conn.query(`SELECT * FROM data LIMIT ${initialPageSize};`);
      const values = previewResult.toArray().map((r: any) => r.toJSON());

      setRows(values);
      // Create columns based on the first page of data
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
        `${totalRows.toLocaleString()} total rows available`
      );

      // Auto-scroll to query section
      setTimeout(() => {
        const querySection = document.getElementById("query");
        if (querySection) {
          querySection.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
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
    if (totalRowCount === 0) {
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
        // Refresh Total Count
        const countResult: any = await conn.query(`SELECT COUNT(*) as c FROM data;`);
        const newTotal = Number(countResult.toArray()[0].c);
        setTotalRowCount(newTotal);

        // Refresh current page view
        const offset = pagination.pageIndex * pagination.pageSize;
        const refreshResult: any = await conn.query(`SELECT * FROM data LIMIT ${pagination.pageSize} OFFSET ${offset};`);

        const refreshValues = refreshResult.toArray().map((r: any) => r.toJSON());
        setRows(refreshValues);
        setColumns(createColumnsFromData(refreshValues));
      }

      if (result.success && result.data) {
        if (isModifying) {
          setQueryResult(result);
          setQueryRows(result.data);
          setQueryColumns(createColumnsFromData(result.data));
          setQueryTotalCount(1);
          const message = `Query executed successfully - ${result.data.length} row${result.data.length !== 1 ? "s" : ""} returned`;
          setSuccessMessage(message);
          setShowSuccessAnimation(true);

          toast.success(
            "Query executed successfully",
            `Returned ${result.data.length} row${result.data.length !== 1 ? "s" : ""}`
          );
          return;
        }

        const db = await getDuckDB();
        const conn = await db.connect();

        // Create query_data table from the result of the SELECT
        await conn.query("DROP TABLE IF EXISTS query_data;");

        // Turn the user query into the source of the new table
        await conn.query(`CREATE TABLE query_data AS ${sql}`);

        // Count rows in query_data
        const countResult = await conn.query("SELECT COUNT(*) AS c FROM query_data;");
        const total = Number(countResult.toArray()[0].c);
        setQueryTotalCount(total);

        // Reset pagination to first page
        setQueryPagination({
          pageIndex: 0,
          pageSize: queryPagination.pageSize,
        });

        // Fetch the first page
        const page1 = await conn.query(`SELECT * FROM query_data LIMIT ${queryPagination.pageSize} OFFSET 0`);

        const rows = page1.toArray().map((r: any) => r.toJSON());

        setQueryRows(rows);

        // Build columns dynamically from the rows
        setQueryColumns(createColumnsFromData(rows));

        conn.close();

        setQueryResult({
          success: true,
          data: rows,
          sql: generatedSQL || sql,
        });
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
    if (!fileFormat || totalRowCount === 0) {
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
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />

      {/* Main Content */}
      <main
        className="min-h-screen bg-background transition-all duration-300"
        style={{
          marginLeft: sidebarOpen ? '16rem' : '4rem',
        }}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 max-w-7xl">
          {/* Hero Section */}
          <div id="home" className="text-center mb-12 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="rounded-full bg-primary/10 p-3">
                <Database className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                DataSpeak
              </h1>
            </div>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              Upload CSV or Excel files and explore/update your data with powerful DuckDB-powered analytics
            </p>
            <div className="flex items-center justify-center gap-6 pt-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2 scale-hover">
                <FileText className="h-4 w-4" />
                <span>CSV Support</span>
              </div>
              <div className="flex items-center gap-2 scale-hover">
                <FileSpreadsheet className="h-4 w-4" />
                <span>Excel Support</span>
              </div>
              <div className="flex items-center gap-2 scale-hover">
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
            <div id="query" className="mb-12 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300 space-y-6">
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-semibold mb-2">Query Your Data</h2>
                  <p className="text-sm text-muted-foreground">
                    Ask questions in natural language or write SQL queries directly
                  </p>
                </div>
                <div className="glass-card rounded-lg p-6 shadow-lg hover-glow">
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
                <div className="glass-card rounded-lg p-6 shadow-lg">
                  <SchemaViewer schema={tableSchema} />
                </div>
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
                        className="gap-2 scale-hover"
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
                        className="gap-2 scale-hover"
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
                        ({queryTotalCount.toLocaleString()})
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="full">
                    Full Data
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({totalRowCount.toLocaleString()})
                    </span>
                  </TabsTrigger>
                </TabsList>

                {/* Query Results Tab */}
                <TabsContent value="query">
                  {queryResult ? (
                    <>
                      {/* SQL Display */}
                      {showSQL && queryResult.sql && (
                        <div className="mb-6 glass rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Code2 className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-muted-foreground">Executed SQL:</span>
                          </div>
                          <pre className="text-sm font-mono bg-background/50 p-3 rounded border border-border overflow-x-auto">
                            <code>{queryResult.sql}</code>
                          </pre>
                        </div>
                      )}

                      {/* Query Results Table */}
                      {queryResult.success && queryResult.data && queryResult.data.length > 0 ? (
                        <DataTable columns={queryColumns} data={queryRows} rowCount={queryTotalCount} pagination={queryPagination} onPaginationChange={setQueryPagination} />
                      ) : queryResult.success ? (
                        <div className="text-center py-12 glass-card rounded-lg">
                          <p className="text-muted-foreground">Query returned no results</p>
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <div className="text-center py-12 glass-card rounded-lg">
                      <p className="text-muted-foreground">No query executed yet</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Run a query above to see results here
                      </p>
                    </div>
                  )}
                </TabsContent>

                {/* Full Data Tab */}
                <TabsContent value="full">
                  <DataTable columns={columns} data={rows} rowCount={totalRowCount} pagination={pagination} onPaginationChange={setPagination} />
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* Empty State */}
          {rows.length === 0 && (
            <div className="text-center py-16 animate-in fade-in duration-700 delay-300">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full glass-card mb-4">
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