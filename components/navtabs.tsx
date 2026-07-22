"use client";

/**
 * components/NavTabs.tsx
 * Nav bar dikongsi antara semua page (Dashboard, Liputan Rangkaian, dan lain-lain
 * yang bakal ditambah). Letak `<NavTabs />` di atas sekali setiap page.
 *
 * Nak tambah page baru? Cukup tambah satu entri dalam array `NAV_ITEMS` di
 * bawah — tak perlu ubah apa-apa logik lain.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Antenna, type LucideIcon } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/coverage-net", label: "Liputan Rangkaian", icon: Antenna },
  // Tambah page baru di sini, contoh:
  // { href: "/settings", label: "Tetapan", icon: Settings },
];

export default function NavTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1.5 bg-[#FFFFFF] border border-[#E3DFD3] rounded-xl p-1.5 mb-6 w-fit">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-1.5 text-sm font-medium rounded-lg px-3 py-2 transition-colors ${
              isActive
                ? "bg-[#12805F] text-white"
                : "text-[#6E7568] hover:bg-[#F0EDE4] hover:text-[#1C211D]"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}