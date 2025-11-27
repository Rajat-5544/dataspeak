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
* **Styling:** Tailwind CSS with a custom theme configuration and Shadcn UI components (Buttons, Inputs, Tabs, Toasts).
* **State Management:** React hooks (`useState`, `useRef`) manage the local application state.