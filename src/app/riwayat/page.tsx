import type { Metadata } from "next";
import { HistoryBoard } from "@/components/history-board";

export const metadata: Metadata = {
  title: "Riwayat Hasil — Cap Waktu",
  description: "Semua gambar ber-legenda yang pernah Anda unduh, lengkap dengan lokasi dan waktunya.",
};

export default function Page() {
  return <HistoryBoard />;
}
