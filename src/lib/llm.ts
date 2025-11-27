import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";

/**
 * Initialize Google Gemini chat model
 * @param apiKey Google Gemini API key (from environment variable)
 * @returns ChatGoogleGenerativeAI instance
 */
export function getGeminiModel(apiKey?: string): ChatGoogleGenerativeAI {
  const key = apiKey || process.env.GOOGLE_GEMINI_API_KEY;

  if (!key) {
    throw new Error(
      "Google Gemini API key is required. Set GOOGLE_GEMINI_API_KEY environment variable."
    );
  }

  return new ChatGoogleGenerativeAI({
    model: "gemini-2.0-flash",
    temperature: 0,
    apiKey: key,
  });
}

/**
 * Generate SQL query from natural language question using LLM
 * @param question Natural language question
 * @param schema Table schema in Markdown format
 * @param apiKey Optional API key (defaults to environment variable)
 * @returns Generated SQL query
 */
export async function generateSQLFromQuestion(
  question: string,
  schema: string,
  apiKey?: string
): Promise<string> {
  const model = getGeminiModel(apiKey);

  // Create prompt template
  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      `You are an expert data analyst and SQL query generator. Your task is to convert natural language questions into valid DuckDB SQL queries.

IMPORTANT RULES:
1. Generate appropriate SQL queries based on the user's request. This can include SELECT, UPDATE, DELETE, or INSERT queries.
2. Use only the columns and tables that exist in the provided schema.
3. Never make up or hallucinate column names or table names.
4. Output ONLY the SQL query, no explanations, no markdown code blocks, no additional text.
5. The SQL should be valid DuckDB syntax.
6. If the question is ambiguous, make reasonable assumptions based on the schema.
7. Use proper SQL formatting with appropriate WHERE, GROUP BY, ORDER BY clauses as needed.
8. For UPDATE queries, ensure you include a WHERE clause to specify which rows to update.
9. For DELETE queries, ensure you include a WHERE clause to specify which rows to delete.
10. Never use DROP, ALTER, TRUNCATE, or CREATE TABLE statements.

The schema will be provided below.`,
    ],
    [
      "human",
      `### Schema

{schema}

### User Question

{question}

### SQL Query:
`,
    ],
  ]);

  try {
    const chain = prompt.pipe(model);
    const response = await chain.invoke({
      schema,
      question,
    });

    // Extract SQL from response
    let sql = response.content as string;

    // Remove markdown code blocks if present
    sql = sql
      .replace(/```sql\n?/gi, "")
      .replace(/```\n?/g, "")
      .trim();

    // Remove any leading/trailing whitespace or newlines
    sql = sql.trim();

    // Ensure it ends with semicolon if it doesn't already
    if (sql && !sql.endsWith(";")) {
      sql += ";";
    }

    return sql;
  } catch (error) {
    throw new Error(
      `Failed to generate SQL: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Validate that the response is a valid SQL query
 * @param sql Generated SQL string
 * @returns true if it looks like valid SQL
 */
export function isValidSQLResponse(sql: string): boolean {
  if (!sql || sql.trim().length === 0) {
    return false;
  }

  const upperSQL = sql.toUpperCase().trim();
  return (
    upperSQL.startsWith("SELECT") ||
    upperSQL.startsWith("WITH") ||
    upperSQL.startsWith("(") // Could be a subquery
  );
}

