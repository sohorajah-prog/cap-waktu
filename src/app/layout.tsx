import type { Metadata, Viewport } from "next";
import { Archivo, Public_Sans, Martian_Mono, Roboto } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
});

// Android's system face. Loaded rather than assumed, so the stamp renders the
// same whether the app is used from a phone or a desktop.
const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const martianMono = Martian_Mono({
  variable: "--font-martian-mono",
  subsets: ["latin"],
  axes: ["wdth"],
});

const description =
  "Unggah foto, isi lokasi, ambil koordinat GPS, lalu unduh gambar ber-legenda. Semua diproses di perangkat Anda.";

export const metadata: Metadata = {
  title: "Cap Waktu — bubuhkan waktu, tanggal, dan lokasi pada foto",
  description,
  applicationName: "Cap Waktu",
  openGraph: {
    title: "Cap Waktu",
    description,
    locale: "id_ID",
    type: "website",
    images: [{ url: "/capwaktu-logo.png", width: 1254, height: 1254, alt: "Cap Waktu" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0c2333",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${archivo.variable} ${publicSans.variable} ${martianMono.variable} ${roboto.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
