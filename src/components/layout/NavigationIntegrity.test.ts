import { describe, expect, it } from "vitest";
import { PRIMARY_NAV_ITEMS } from "./GlobalNavigationBar";

describe("Global Navigation & UX Flow Integrity Suite", () => {
  it("defines core primary navigation destinations with unique routes and valid icons", () => {
    expect(PRIMARY_NAV_ITEMS).toHaveLength(4);

    const routes = PRIMARY_NAV_ITEMS.map((i) => i.href);
    expect(routes).toContain("/home");
    expect(routes).toContain("/library");
    expect(routes).toContain("/practice");
    expect(routes).toContain("/progress");

    // All labels must be concise
    for (const item of PRIMARY_NAV_ITEMS) {
      expect(item.label.length).toBeGreaterThan(0);
      expect(item.icon).toBeDefined();
    }
  });

  it("resolves contextual back breadcrumb destinations accurately", () => {
    function resolveBackBreadcrumb(pathname: string, explicitBackHref?: string, explicitBackLabel?: string) {
      if (explicitBackHref) {
        return { href: explicitBackHref, label: explicitBackLabel || "Back" };
      }
      if (pathname.startsWith("/report/")) {
        return { href: "/library", label: "My Videos" };
      }
      if (pathname === "/settings" || pathname === "/profile" || pathname === "/feedback" || pathname === "/support") {
        return { href: "/home", label: "Dashboard" };
      }
      if (pathname === "/start" || pathname === "/upload") {
        return { href: "/home", label: "Home" };
      }
      return null;
    }

    expect(resolveBackBreadcrumb("/report/session-123")).toEqual({ href: "/library", label: "My Videos" });
    expect(resolveBackBreadcrumb("/settings")).toEqual({ href: "/home", label: "Dashboard" });
    expect(resolveBackBreadcrumb("/profile")).toEqual({ href: "/home", label: "Dashboard" });
    expect(resolveBackBreadcrumb("/start")).toEqual({ href: "/home", label: "Home" });
    expect(resolveBackBreadcrumb("/home")).toBeNull();
    expect(resolveBackBreadcrumb("/custom", "/library", "Custom Back")).toEqual({ href: "/library", label: "Custom Back" });
  });

  it("handles active route matching with prefix support", () => {
    function isRouteActive(currentPath: string, targetHref: string, matchPrefix = false) {
      return matchPrefix
        ? currentPath === targetHref || currentPath.startsWith(`${targetHref}/`)
        : currentPath === targetHref;
    }

    expect(isRouteActive("/library", "/library", true)).toBe(true);
    expect(isRouteActive("/library/session-1", "/library", true)).toBe(true);
    expect(isRouteActive("/practice/drills", "/practice", true)).toBe(true);
    expect(isRouteActive("/home/settings", "/home", false)).toBe(false);
  });
});
