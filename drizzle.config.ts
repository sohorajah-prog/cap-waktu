import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.CAP_WAKTU_DATA_DIR
      ? `${process.env.CAP_WAKTU_DATA_DIR}/cap-waktu.db`
      : "./data/cap-waktu.db",
  },
} satisfies Config;
