"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useNow } from "@/components/live-clock";
import { formatStamp } from "@/lib/format";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Pembuat" },
  { href: "/riwayat", label: "Riwayat" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const now = useNow();

  return (
    <header className="sticky top-0 z-40 border-b border-rule-firm bg-paper/92 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-3 px-4 sm:gap-6 sm:px-6 lg:px-10">
        {/* The logo's own wordmark is unreadable at header scale, so the name
            is set in the display face beside the mark — and on narrow screens
            the mark carries the brand by itself. */}
        <Link
          href="/"
          aria-label="Cap Waktu, ke halaman pembuat"
          className="group flex shrink-0 items-center gap-2.5"
        >
          <span aria-hidden className="grid h-7 w-7 shrink-0 place-items-center bg-ink">
            <Image
              src="/capwaktu-mark.png"
              alt=""
              width={36}
              height={36}
              priority
              className="h-[18px] w-[18px]"
            />
          </span>
          <span className="hidden whitespace-nowrap font-display text-[0.95rem] font-extrabold uppercase tracking-[0.1em] sm:inline">
            Cap Waktu
          </span>
        </Link>

        <nav className="flex shrink-0 items-center gap-1" aria-label="Utama">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "px-2.5 py-1 font-mono text-[0.68rem] font-semibold uppercase tracking-[0.12em] transition-colors",
                  active
                    ? "text-ink shadow-[inset_0_-2px_0_0_var(--magenta)]"
                    : "text-ink-45 hover:text-ink",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* The header must stay on one line, so narrow screens keep only the
            hour and minute — the ticking seconds live in the frame itself. */}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <span aria-hidden className="animate-live h-1.5 w-1.5 rounded-full bg-magenta" />
          <span className="tnum font-mono text-[0.7rem] font-medium text-ink-70">
            <span className="hidden sm:inline">
              {now ? formatStamp(now, "DD/MM/YYYY HH:mm:ss") : "––/––/–––– ––:––:––"}
            </span>
            <span className="sm:hidden">{now ? formatStamp(now, "HH:mm") : "––:––"}</span>
          </span>
        </div>
      </div>
    </header>
  );
}
