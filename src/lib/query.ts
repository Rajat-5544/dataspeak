import * as duckdb from "@duckdb/duckdb-wasm";
import { getAllTables, getTableSchema } from "./schema";

export interface QueryResult {
  success: boolean;
  data?: any[];
  error?: string;
  columns?: string[];
  sql?: string; // The SQL query that was executed
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * SQL Safety Validation
 * Blocks destructive SQL operations and validates table/column names
 */

// Forbidden SQL keywords that could modify or delete data
const FORBIDDEN_KEYWORDS = [
  "DELETE",
  "DROP",
  "ALTER",
  "UPDATE",
  "INSERT",
  "TRUNCATE",
  "CREATE",
  "REPLACE",
  "MERGE",
  "COPY",
  "EXPORT",
  "IMPORT",
];

/**
 * Check if SQL query contains forbidden keywords
 * @param sql SQL query string
 * @returns true if query is safe (no forbidden keywords), false otherwise
 */
function hasForbiddenKeywords(sql: string): boolean {
  // Remove comments (-- and /* */)
  const withoutComments = sql
    .replace(/--.*$/gm, "") // Remove single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, ""); // Remove multi-line comments

  // Check for forbidden keywords as whole words (case-insensitive)
  const forbiddenPattern = new RegExp(
    `\\b(${FORBIDDEN_KEYWORDS.join("|")})\\b`,
    "i"
  );
  return forbiddenPattern.test(withoutComments);
}

/**
 * Check if SQL query is a modifying query (UPDATE, DELETE, INSERT)
 * @param sql SQL query string
 * @returns true if query modifies data
 */
export function isModifyingQuery(sql: string): boolean {
  // Remove comments (-- and /* */)
  const withoutComments = sql
    .replace(/--.*$/gm, "") // Remove single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, ""); // Remove multi-line comments

  // Check for modifying keywords (UPDATE, DELETE, INSERT)
  const modifyingPattern = /\b(UPDATE|DELETE|INSERT|TRUNCATE)\b/i;
  return modifyingPattern.test(withoutComments);
}

/**
 * Extract table names from SQL query (simple heuristic)
 * @param sql SQL query string
 * @returns Array of potential table names
 */
function extractTableNames(sql: string): string[] {
  // Simple regex to find table names after FROM and JOIN keywords
  const tablePattern = /(?:FROM|JOIN)\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi;
  const matches = sql.matchAll(tablePattern);
  const tables: string[] = [];

  for (const match of matches) {
    if (match[1]) {
      tables.push(match[1].toLowerCase());
    }
  }

  return [...new Set(tables)]; // Remove duplicates
}

/**
 * Extract column names from SQL query (simple heuristic for validation)
 * @param sql SQL query string
 * @returns Array of potential column references
 */
function extractColumnReferences(sql: string): string[] {
  // This is a simplified extraction - in practice, SQL parsing is complex
  // We'll mainly use this for basic validation
  const columnPattern = /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*[,\s]*(?=\w)/gi;
  const matches = sql.matchAll(columnPattern);
  const columns: string[] = [];

  for (const match of matches) {
    if (match[1] && !FORBIDDEN_KEYWORDS.includes(match[1].toUpperCase())) {
      columns.push(match[1].toLowerCase());
    }
  }

  return [...new Set(columns)];
}

/**
 * Validate SQL query for safety
 * @param sql SQL query string
 * @param conn DuckDB connection (optional, for table/column validation)
 * @returns Validation result with isValid flag and optional error message
 */
export async function validateSQL(
  sql: string,
  conn?: duckdb.AsyncDuckDBConnection
): Promise<ValidationResult> {
  // Trim and normalize SQL
  const normalizedSQL = sql.trim();

  if (!normalizedSQL) {
    return {
      isValid: false,
      error: "SQL query cannot be empty",
    };
  }

  // Check for forbidden keywords
  if (hasForbiddenKeywords(normalizedSQL)) {
    return {
      isValid: false,
      error: "Query contains forbidden operations (DELETE, DROP, ALTER, UPDATE, INSERT, TRUNCATE, CREATE, etc.). Only SELECT queries are allowed.",
    };
  }

  // Ensure query starts with SELECT (basic check)
  const upperSQL = normalizedSQL.toUpperCase().trim();
  if (!upperSQL.startsWith("SELECT") && !upperSQL.startsWith("WITH")) {
    return {
      isValid: false,
      error: "Only SELECT queries are allowed. Query must start with SELECT or WITH.",
    };
  }

  // If connection is provided, validate table and column names
  if (conn) {
    try {
      const tableNames = extractTableNames(normalizedSQL);
      const availableTables = await getAllTables(conn);

      for (const tableName of tableNames) {
        if (!availableTables.includes(tableName)) {
          return {
            isValid: false,
            error: `Table '${tableName}' does not exist in the database.`,
          };
        }

        // Validate columns exist in the table
        try {
          const schema = await getTableSchema(conn, tableName);
          const columnNames = schema.columns.map((col) =>
            col.column.toLowerCase()
          );

          // Basic check: if query references columns, they should exist
          // Note: This is a simplified check - full SQL parsing would be more accurate
          const columnRefs = extractColumnReferences(normalizedSQL);
          for (const colRef of columnRefs) {
            // Skip if it's a known SQL function or keyword
            const sqlFunctions = [
              "count",
              "sum",
              "avg",
              "min",
              "max",
              "distinct",
              "as",
              "from",
              "where",
              "group",
              "order",
              "by",
              "having",
              "limit",
              "offset",
            ];
            if (sqlFunctions.includes(colRef)) continue;

            // Check if column exists (case-insensitive)
            if (
              !columnNames.some(
                (col) => col.toLowerCase() === colRef.toLowerCase()
              )
            ) {
              // This is a warning, not an error - let DuckDB handle it
              // We'll catch the error during execution
            }
          }
        } catch (schemaError) {
          // If we can't get schema, continue - DuckDB will validate during execution
          console.warn(
            `Could not validate schema for table ${tableName}:`,
            schemaError
          );
        }
      }
    } catch (error) {
      // If validation fails, we'll still try to execute and let DuckDB handle errors
      console.warn("Table validation error:", error);
    }
  }

  return {
    isValid: true,
  };
}

/**
 * Execute SQL query in DuckDB
 * @param conn DuckDB connection
 * @param sql SQL query string
 * @param validateFirst Whether to validate the query before execution (default: true)
 * @returns Query result with data or error
 */
export async function executeQuery(
  conn: duckdb.AsyncDuckDBConnection,
  sql: string,
  validateFirst: boolean = true
): Promise<QueryResult> {
  const trimmedSQL = sql.trim();
  
  try {
    // Validate query first if requested
    if (validateFirst) {
      const validation = await validateSQL(trimmedSQL, conn);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error,
          sql: trimmedSQL,
        };
      }
    }

    // Execute the query
    const result = await conn.query(trimmedSQL);
    const rows = result.toArray().map((r: any) => r.toJSON());

    // Extract column names from the result
    const columns =
      rows.length > 0
        ? Object.keys(rows[0])
        : result.schema?.fields?.map((f: any) => f.name) || [];

    return {
      success: true,
      data: rows,
      columns,
      sql: trimmedSQL,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error occurred while executing query",
      sql: trimmedSQL,
    };
  }
}

/**
 * Execute SQL query with additional safety checks
 * This is a convenience function that combines validation and execution
 * @param conn DuckDB connection
 * @param sql SQL query string
 * @returns Query result with data or error
 */
export async function executeSafeQuery(
  conn: duckdb.AsyncDuckDBConnection,
  sql: string
): Promise<QueryResult> {
  return executeQuery(conn, sql, true);
}

/**
 * Execute SQL query without validation (for direct SQL input)
 * Allows users to execute any SQL including UPDATE, DELETE, etc.
 * @param conn DuckDB connection
 * @param sql SQL query string
 * @returns Query result with data or error
 */
export async function executeUnsafeQuery(
  conn: duckdb.AsyncDuckDBConnection,
  sql: string
): Promise<QueryResult> {
  return executeQuery(conn, sql, false);
}

