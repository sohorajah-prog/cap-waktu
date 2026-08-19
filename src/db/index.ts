import "server-only";

import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";

export const DATA_DIR = process.env.CAP_WAKTU_DATA_DIR
  ? path.resolve(process.env.CAP_WAKTU_DATA_DIR)
  : path.join(process.cwd(), "data");

const DB_FILE = path.join(DATA_DIR, "cap-waktu.db");
const MIGRATIONS_DIR = path.join(process.cwd(), "src", "db", "migrations");

function create() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const sqlite = new Database(DB_FILE);
  // WAL keeps reads from blocking the write that happens on every download.
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  const db = drizzle(sqlite, { schema });
  if (fs.existsSync(MIGRATIONS_DIR)) {
    migrate(db, { migrationsFolder: MIGRATIONS_DIR });
  }
  return db;
}

// Next reloads modules on every edit in dev; without this the process would
// pile up open handles to the same file.
const globalForDb = globalThis as unknown as {
  capWaktuDb?: ReturnType<typeof create>;
};

export const db = globalForDb.capWaktuDb ?? create();
if (process.env.NODE_ENV !== "production") globalForDb.capWaktuDb = db;

export { schema };
