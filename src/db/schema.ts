import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Gambar asli yang diunggah pengguna. Berkasnya disimpan di disk; tabel ini
 * hanya menyimpan lokasinya.
 */
export const uploads = sqliteTable("uploads", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  filePath: text("file_path").notNull(),
  // Di luar PRD, tetapi dibutuhkan agar Detail Riwayat bisa menyebut berkas
  // asalnya dengan nama yang dikenali pengguna.
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

/** Satu gambar hasil ber-legenda, beserta pengaturan yang dipakai membuatnya. */
export const results = sqliteTable(
  "results",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    uploadId: integer("upload_id")
      .notNull()
      .references(() => uploads.id, { onDelete: "cascade" }),
    /** Keterangan bebas dari pengguna, misalnya nama gudang atau patok. */
    locationName: text("location_name").notNull().default(""),
    /**
     * Kode wilayah terdalam yang dipilih, mis. "32.75.01.1001". Namanya
     * disimpan sekali jadi (regionLabel) supaya legenda pada hasil lama tidak
     * ikut berubah bila data wilayah diperbarui.
     */
    regionCode: text("region_code"),
    regionLabel: text("region_label"),
    // Disimpan sebagai teks sesuai PRD: nilai GPS dipakai apa adanya dan boleh
    // kosong bila pengguna tidak memberikannya.
    latitude: text("latitude"),
    longitude: text("longitude"),
    dateFormat: text("date_format").notNull(),
    legendPosition: text("legend_position", {
      enum: ["bawah", "atas", "kiri", "kanan"],
    }).notNull(),
    fontSize: integer("font_size").notNull(),
    fontColor: text("font_color").notNull(),
    fontFamily: text("font_family", {
      enum: ["android", "ios", "sans", "mono", "serif"],
    }).notNull(),
    // Bagian dari gaya legenda, di luar daftar kolom PRD.
    showPlate: integer("show_plate", { mode: "boolean" }).notNull().default(true),
    outputPath: text("output_path").notNull(),
    outputFormat: text("output_format", { enum: ["jpg", "png"] }).notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    /**
     * Waktu yang tercetak di legenda. Berbeda dari createdAt: legenda merekam
     * kapan fotonya diambil, createdAt merekam kapan hasilnya diunduh.
     */
    stampedAt: integer("stamped_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [index("results_created_at_idx").on(table.createdAt)],
);

/**
 * Wilayah administratif Indonesia (Permendagri), empat tingkat dalam satu
 * tabel. Kode berjenjang dengan titik: 32 / 32.75 / 32.75.01 / 32.75.01.1001,
 * sehingga induk selalu bisa diturunkan dari kodenya sendiri.
 */
export const regions = sqliteTable(
  "regions",
  {
    code: text("code").primaryKey(),
    parentCode: text("parent_code"),
    /** 1 provinsi, 2 kabupaten/kota, 3 kecamatan, 4 kelurahan/desa. */
    level: integer("level").notNull(),
    name: text("name").notNull(),
  },
  (table) => [index("regions_parent_idx").on(table.parentCode, table.name)],
);

export const uploadsRelations = relations(uploads, ({ many }) => ({
  results: many(results),
}));

export const resultsRelations = relations(results, ({ one }) => ({
  upload: one(uploads, {
    fields: [results.uploadId],
    references: [uploads.id],
  }),
}));

export type Upload = typeof uploads.$inferSelect;
export type Result = typeof results.$inferSelect;
