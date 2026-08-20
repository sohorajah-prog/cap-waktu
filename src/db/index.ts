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
  seedRegions(sqlite);
  return db;
}

const SEED_FILE = path.join(process.cwd(), "seed", "wilayah.tsv");

/**
 * Fills the regions table from the bundled Permendagri list on first run.
 * 91k rows insert in about a second inside one transaction, and every later
 * start finds the table populated and returns immediately.
 */
function seedRegions(sqlite: Database.Database) {
  const count = sqlite.prepare("SELECT COUNT(*) AS n FROM regions").get() as {
    n: number;
  };
  if (count.n > 0) return;

  if (!fs.existsSync(SEED_FILE)) {
    console.warn(
      `[cap-waktu] seed/wilayah.tsv tidak ditemukan — daftar wilayah akan kosong.`,
    );
    return;
  }

  const insert = sqlite.prepare(
    "INSERT OR IGNORE INTO regions (code, parent_code, level, name) VALUES (?, ?, ?, ?)",
  );
  const load = sqlite.transaction((lines: string[]) => {
    for (const line of lines) {
      if (!line) continue;
      const tab = line.indexOf("\t");
      if (tab < 0) continue;
      const code = line.slice(0, tab);
      // A handful of source rows carry a trailing space; it would otherwise
      // show up in dropdowns and break name matching.
      const name = line.slice(tab + 1).trim();
      const parts = code.split(".");
      const parent = parts.length > 1 ? parts.slice(0, -1).join(".") : null;
      insert.run(code, parent, parts.length, name);
    }
  });

  const started = Date.now();
  load(fs.readFileSync(SEED_FILE, "utf8").split("\n"));
  const seeded = sqlite.prepare("SELECT COUNT(*) AS n FROM regions").get() as {
    n: number;
  };
  console.log(
    `[cap-waktu] ${seeded.n.toLocaleString("id-ID")} wilayah dimuat dalam ${Date.now() - started} ms`,
  );
}

// Next reloads modules on every edit in dev; without this the process would
// pile up open handles to the same file.
const globalForDb = globalThis as unknown as {
  capWaktuDb?: ReturnType<typeof create>;
};

let instance: ReturnType<typeof create> | null = null;

function connect() {
  if (!instance) {
    instance = globalForDb.capWaktuDb ?? create();
    if (process.env.NODE_ENV !== "production") globalForDb.capWaktuDb = instance;
  }
  return instance;
}

/**
 * Connects on first use, not on import.
 *
 * `next build` imports every route module to collect its config, and it does
 * so across many workers at once. Connecting at import time meant the build
 * itself opened the database and raced its own workers through the migrations
 * — invisible on a machine where the file already existed, fatal in a clean
 * container. Nothing here touches disk until a request actually asks for data.
 */
export const db = new Proxy({} as ReturnType<typeof create>, {
  get(_target, property, receiver) {
    const real = connect() as object;
    const value = Reflect.get(real, property, receiver);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export { schema };
