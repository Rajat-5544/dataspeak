### 1. Project Overview
DataSpeak is a **Next.js 16** application that empowers users to upload CSV or Excel files and perform instant analytics. Its standout feature is the use of **DuckDB-Wasm**, which allows an SQL database to run entirely inside the user's browser. This means data processing happens locally on the client side, ensuring speed and data privacy, while Google's Gemini AI is used solely for translating natural language questions into SQL queries.

### 2. Key Features

* **File Support:** Users can upload `.csv` and `.xlsx` files. The app automatically detects the format and loads it into the in-browser DuckDB instance.
* **Dual Query Modes:**
    * **Natural Language:** Users can ask questions like "Show total sales by region." The app uses Google Gemini (via LangChain) to interpret the schema and generate the corresponding SQL query.
    * **Direct SQL:** Power users can write and execute raw SQL queries directly against the database.
* **Data Modification & Safety:**
    * The app supports modifying data (UPDATE, DELETE, INSERT) but includes a safety mechanism. "Unsafe" queries trigger a **SQL Review Dialog**, forcing the user to approve destructive changes before execution.
    * A "Data Modified" badge appears when the dataset has been altered.
* **Data Visualization:** Results are displayed in a responsive data table with pagination and sorting capabilities, built using `@tanstack/react-table`.
* **Export:** Users can download their modified datasets back into CSV or Excel formats.

### 3. Technical Stack

* **Framework:** Next.js 16 (App Router) with React 19.
* **Database:** `@duckdb/duckdb-wasm` for high-performance, in-browser SQL processing.
* **AI/LLM:** `@langchain/google-genai` using the `gemini-2.0-flash` model to convert natural language to SQL.
* **Styling:** Tailwind CSS v4 with a custom theme configuration and Shadcn UI components (Buttons, Inputs, Tabs, Toasts).
* **State Management:** React hooks (`useState`, `useRef`) manage the local application state.

### 4. Code Architecture Highlights

* **In-Browser Database (`src/lib/duckdb.ts`):**
    You have a robust setup for DuckDB that handles worker instantiation. You are creating a `Blob` from the worker script to bypass potential CORS issues when loading the DuckDB worker, ensuring the app runs smoothly in various browser environments.

* **AI-Powered SQL Generation (`src/lib/llm.ts` & `src/app/api/llm/route.ts`):**
    The backend API route is lightweight. It receives the user's question and the table schema (converted to Markdown), then prompts Gemini to act as an expert data analyst. The system instructions explicitly forbid the AI from hallucinating columns or using forbidden statements like `DROP` or `TRUNCATE` in the generated response.

* **Query Safety Layer (`src/lib/query.ts`):**
    You implemented a validation layer that distinguishes between "safe" (SELECT) and "unsafe" (UPDATE/DELETE) operations.
    * `validateSQL`: Checks for forbidden keywords to prevent accidental data loss during standard querying.
    * `executeSafeQuery` vs `executeUnsafeQuery`: You have separate execution paths, allowing the UI to prompt the user for confirmation only when necessary.

* **Schema Awareness (`src/lib/schema.ts`):**
    The app dynamically extracts the schema (column names, types, nullability) from the uploaded file using `DESCRIBE` queries. This schema is then formatted into Markdown to provide context to the LLM, ensuring accurate query generation.