"use client";

import {
  Activity,
  ArrowLeft,
  BarChart3,
  BookOpenCheck,
  CreditCard,
  HelpCircle,
  LayoutGrid,
  Library,
  LogOut,
  Menu,
  MessageSquareHeart,
  Plus,
  Settings,
  Shield,
  User,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import AthlentraMark from "@/components/design-system/AthlentraMark";
import { signOutUser } from "@/app/actions/auth-actions";

export type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutGrid;
  matchPrefix?: boolean;
};

export const PRIMARY_NAV_ITEMS: NavItem[] = [
  { href: "/home", label: "Home", icon: LayoutGrid },
  { href: "/library", label: "Videos", icon: Library, matchPrefix: true },
  { href: "/practice", label: "Practice", icon: BookOpenCheck, matchPrefix: true },
  { href: "/progress", label: "Progress", icon: BarChart3, matchPrefix: true },
];

type Props = {
  backHref?: string;
  backLabel?: string;
  maxWidth?: string;
  hidePrimaryLinks?: boolean;
};

export default function GlobalNavigationBar({
  backHref,
  backLabel,
  maxWidth = "max-w-7xl",
  hidePrimaryLinks = false,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    const result = await signOutUser();
    router.replace(result.next ?? "/auth");
    router.refresh();
  }

  // Close dropdowns on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsProfileMenuOpen(false);
  }, [pathname]);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    }
    if (isProfileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isProfileMenuOpen]);

  // Auto-detect contextual back link if not explicitly provided
  let resolvedBackHref = backHref;
  let resolvedBackLabel = backLabel;

  if (!resolvedBackHref) {
    if (pathname.startsWith("/report/")) {
      resolvedBackHref = "/library";
      resolvedBackLabel = "My Videos";
    } else if (pathname === "/settings" || pathname === "/profile" || pathname === "/feedback" || pathname === "/support") {
      resolvedBackHref = "/home";
      resolvedBackLabel = "Dashboard";
    } else if (pathname === "/start" || pathname === "/upload") {
      resolvedBackHref = "/home";
      resolvedBackLabel = "Home";
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#09131e]/90 shadow-lg shadow-black/20 backdrop-blur-2xl transition-all">
      <div className={`mx-auto flex ${maxWidth} h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8`}>
        {/* Left Section: Logo & Contextual Back Breadcrumb */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          {resolvedBackHref ? (
            <Link
              href={resolvedBackHref}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-bold text-slate-300 transition hover:border-white/20 hover:bg-white/10 hover:text-white active:scale-95 shrink-0"
              aria-label={`Go back to ${resolvedBackLabel || "previous page"}`}
            >
              <ArrowLeft className="h-4 w-4 text-ath-lime" />
              <span className="hidden sm:inline">{resolvedBackLabel || "Back"}</span>
            </Link>
          ) : null}

          <AthlentraMark href="/home" inverse />
        </div>

        {/* Center Section: Primary Navigation Pills (Desktop & Tablet) */}
        {!hidePrimaryLinks && (
          <nav
            aria-label="Main Navigation"
            className="hidden md:flex items-center gap-1 rounded-2xl border border-white/10 bg-white/[0.04] p-1 shadow-inner backdrop-blur-md"
          >
            {PRIMARY_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = item.matchPrefix
                ? pathname === item.href || pathname.startsWith(`${item.href}/`)
                : pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition duration-150 active:scale-95 ${
                    isActive
                      ? "bg-ath-lime text-ath-navy shadow-md font-black"
                      : "text-slate-300 hover:bg-white/[0.08] hover:text-white"
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${isActive ? "text-ath-navy" : "text-slate-400"}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        )}

        {/* Right Section: Action Cluster & Profile Popover */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Action: New Analysis CTA */}
          <Link
            href="/start"
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-ath-lime to-[#c4ce1f] px-3 py-1.5 text-xs font-black text-ath-navy shadow-md shadow-ath-lime/20 transition hover:opacity-95 hover:shadow-ath-lime/30 active:scale-95 shrink-0"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            <span className="hidden sm:inline">New Analysis</span>
            <span className="sm:hidden">Analyze</span>
          </Link>

          {/* Feedback Icon Button */}
          <Link
            href="/feedback"
            aria-label="Give feedback"
            className="hidden sm:flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:border-white/20 hover:bg-white/10 hover:text-white active:scale-95"
          >
            <MessageSquareHeart className="h-4 w-4" />
          </Link>

          {/* Profile / Account Dropdown Trigger */}
          <div className="relative" ref={profileMenuRef}>
            <button
              type="button"
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              aria-expanded={isProfileMenuOpen}
              aria-label="User Account Menu"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-gradient-to-tr from-ath-navy to-[#18283b] text-white shadow-sm transition hover:border-ath-lime/50 active:scale-95"
            >
              <User className="h-4 w-4 text-ath-lime" />
            </button>

            {/* Glassmorphic Dropdown Popover */}
            {isProfileMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-64 rounded-2xl border border-white/15 bg-[#09131e]/95 p-2 text-white shadow-2xl backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150 z-50"
                role="menu"
              >
                <div className="border-b border-white/10 px-3 py-2.5 mb-1">
                  <p className="text-xs font-bold text-white">Athlete Account</p>
                  <p className="text-[0.68rem] text-slate-400">Tennis Biomechanics Hub</p>
                </div>

                <div className="space-y-0.5">
                  <Link
                    href="/profile"
                    role="menuitem"
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10 hover:text-white transition"
                  >
                    <User className="h-4 w-4 text-ath-lime" />
                    <span>Athlete Profile</span>
                  </Link>

                  <Link
                    href="/settings"
                    role="menuitem"
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10 hover:text-white transition"
                  >
                    <Settings className="h-4 w-4 text-ath-sky" />
                    <span>Preferences & Setup</span>
                  </Link>

                  <Link
                    href="/pricing"
                    role="menuitem"
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10 hover:text-white transition"
                  >
                    <CreditCard className="h-4 w-4 text-ath-green" />
                    <span>Subscription & Tier</span>
                  </Link>

                  <Link
                    href="/support"
                    role="menuitem"
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10 hover:text-white transition"
                  >
                    <HelpCircle className="h-4 w-4 text-amber-400" />
                    <span>Help & Knowledge Base</span>
                  </Link>
                </div>

                <div className="border-t border-white/10 mt-1 pt-1">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => void handleSignOut()}
                    disabled={signingOut}
                    className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition text-left disabled:opacity-60"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>{signingOut ? "Signing out…" : "Log Out"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Drawer Toggle (Mobile Viewports) */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            className="md:hidden flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10 active:scale-95"
          >
            {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Slide-Out Drawer (Clean overlay, zero persistent obstruction) */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-white/10 bg-[#09131e]/98 px-4 py-4 backdrop-blur-2xl animate-in slide-in-from-top-4 duration-200">
          <nav className="space-y-1" aria-label="Mobile Navigation Drawer">
            {PRIMARY_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = item.matchPrefix
                ? pathname === item.href || pathname.startsWith(`${item.href}/`)
                : pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition ${
                    isActive
                      ? "bg-ath-lime text-ath-navy font-black shadow-md"
                      : "text-slate-200 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? "text-ath-navy" : "text-slate-400"}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-4 border-t border-white/10 pt-3 flex items-center justify-between text-xs text-slate-400 px-1">
            <Link href="/feedback" className="hover:text-white transition">Give Feedback</Link>
            <Link href="/support" className="hover:text-white transition">Help & Docs</Link>
            <Link href="/privacy" className="hover:text-white transition">Privacy</Link>
          </div>
        </div>
      )}
    </header>
  );
}
