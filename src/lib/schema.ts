import * as duckdb from "@duckdb/duckdb-wasm";

export interface ColumnInfo {
  column: string;
  type: string;
  nullable: boolean;
  default: string | null;
}

export interface TableSchema {
  tableName: string;
  columns: ColumnInfo[];
}

/**
 * Extract schema information for a table from DuckDB
 * @param conn DuckDB connection
 * @param tableName Name of the table
 * @returns Table schema with column information
 */
export async function getTableSchema(
  conn: duckdb.AsyncDuckDBConnection,
  tableName: string
): Promise<TableSchema> {
  try {
    // Use DESCRIBE to get column information (DuckDB syntax)
    const result = await conn.query(`DESCRIBE ${tableName};`);
    console.log("Describe executed successfully!")
    const rows = result.toArray().map((r: any) => r.toJSON());

    const columns: ColumnInfo[] = rows.map((row: any) => ({
      column: row.column_name || row.name,
      type: row.column_type || row.type || "VARCHAR",
      nullable: row.null === "YES" || row.null === true,
      default: row.default || null,
    }));

    return {
      tableName,
      columns,
    };
  } catch (error) {
    throw new Error(
      `Failed to extract schema for table '${tableName}': ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Format table schema as Markdown for LLM prompts
 * @param schema Table schema object
 * @returns Markdown formatted string
 */
export function formatSchemaAsMarkdown(schema: TableSchema): string {
  const lines: string[] = [];
  lines.push(`## ${schema.tableName}`);
  lines.push("");

  if (schema.columns.length === 0) {
    lines.push("*No columns found*");
  } else {
    schema.columns.forEach((col) => {
      const nullable = col.nullable ? " (nullable)" : "";
      lines.push(`- ${col.column} (${col.type})${nullable}`);
    });
  }

  return lines.join("\n");
}

/**
 * Get all table names in the database
 * @param conn DuckDB connection
 * @returns Array of table names
 */
export async function getAllTables(
  conn: duckdb.AsyncDuckDBConnection
): Promise<string[]> {
  try {
    const result = await conn.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'main'
    `);
    const rows = result.toArray().map((r: any) => r.toJSON());
    return rows.map((row: any) => row.table_name || row.tableName).filter(Boolean);
  } catch (error) {
    // Fallback: try SHOW TABLES if information_schema doesn't work
    try {
      const result = await conn.query(`SHOW TABLES;`);
      const rows = result.toArray().map((r: any) => r.toJSON());
      return rows.map((row: any) => row.name || row.table_name).filter(Boolean);
    } catch (fallbackError) {
      throw new Error(
        `Failed to get table list: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}

/**
 * Get schema for all tables in the database, formatted as Markdown
 * @param conn DuckDB connection
 * @returns Markdown string with all table schemas
 */
export async function getAllSchemasAsMarkdown(
  conn: duckdb.AsyncDuckDBConnection
): Promise<string> {
  const tables = await getAllTables(conn);
  const schemas: string[] = [];

  for (const tableName of tables) {
    const schema = await getTableSchema(conn, tableName);
    schemas.push(formatSchemaAsMarkdown(schema));
  }

  return schemas.join("\n\n");
}