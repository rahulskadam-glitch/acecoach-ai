"use client";

import { BarChart3, BookOpenCheck, LayoutGrid, Library, Plus } from "lucide-react";

export const playerLinks = [
  { href: "/home", label: "Home", icon: LayoutGrid },
  { href: "/start", label: "Analyze", icon: Plus },
  { href: "/library", label: "Videos", icon: Library },
  { href: "/practice", label: "Practice", icon: BookOpenCheck },
  { href: "/progress", label: "Progress", icon: BarChart3 },
];

/** Deprecated: Mobile bottom navigation bar has been merged into the unified GlobalNavigationBar to maximize screen real estate. */
export default function MobileTabBar() {
  return null;
}
