import * as duckdb from "@duckdb/duckdb-wasm";

let db: duckdb.AsyncDuckDB | null = null;

export async function getDuckDB() {
  if (db) return db;

  const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
  const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);

  // Fetch the worker script and create a Blob URL to avoid CORS issues
  // This works because Blob URLs are same-origin
  let worker: Worker;
  if (bundle.mainWorker) {
    try {
      const workerResponse = await fetch(bundle.mainWorker);
      const workerScript = await workerResponse.text();
      const workerBlob = new Blob([workerScript], { type: "application/javascript" });
      const workerUrl = URL.createObjectURL(workerBlob);
      worker = new Worker(workerUrl);
    } catch (error) {
      // Fallback: try to create worker directly (may fail due to CORS)
      worker = new Worker(bundle.mainWorker);
    }
  } else {
    throw new Error("No worker bundle available");
  }

  const logger = new duckdb.ConsoleLogger();
  db = new duckdb.AsyncDuckDB(logger, worker);
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);

  return db;
}