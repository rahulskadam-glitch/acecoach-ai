import { describe, expect, it } from "vitest";

describe("Authentication & Security Boundaries Workflow Suite", () => {
  it("validates email formatting and sanitizes input", () => {
    function sanitizeEmail(email: string): string {
      const trimmed = email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmed)) {
        throw new Error("Invalid email address format.");
      }
      return trimmed;
    }

    expect(sanitizeEmail("  Athlete@Domain.COM  ")).toBe("athlete@domain.com");
    expect(() => sanitizeEmail("invalid-email")).toThrow("Invalid email address format");
    expect(() => sanitizeEmail("user@")).toThrow("Invalid email address format");
  });

  it("blocks open redirect vulnerabilities on auth callback", () => {
    function sanitizeRedirectUrl(nextUrl: string | null | undefined, appOrigin: string): string {
      if (!nextUrl) return "/dashboard";
      // Allow relative internal paths
      if (nextUrl.startsWith("/") && !nextUrl.startsWith("//")) {
        return nextUrl;
      }
      try {
        const parsed = new URL(nextUrl, appOrigin);
        if (parsed.origin === appOrigin) {
          return parsed.pathname + parsed.search;
        }
      } catch {
        // invalid URL
      }
      return "/dashboard";
    }

    const appOrigin = "https://app.acecoach.ai";
    expect(sanitizeRedirectUrl("/report/123", appOrigin)).toBe("/report/123");
    expect(sanitizeRedirectUrl("https://app.acecoach.ai/profile", appOrigin)).toBe("/profile");
    // Attacks
    expect(sanitizeRedirectUrl("https://malicious-site.com/steal-token", appOrigin)).toBe("/dashboard");
    expect(sanitizeRedirectUrl("//malicious-site.com", appOrigin)).toBe("/dashboard");
    expect(sanitizeRedirectUrl("javascript:alert(1)", appOrigin)).toBe("/dashboard");
  });

  it("enforces strong password policy", () => {
    function validatePasswordStrength(password: string): { isValid: boolean; errors: string[] } {
      const errors: string[] = [];
      if (password.length < 8) errors.push("Password must be at least 8 characters long.");
      if (!/[A-Z]/.test(password) && !/[0-9]/.test(password)) {
        errors.push("Password must contain numbers or capital letters.");
      }
      return { isValid: errors.length === 0, errors };
    }

    expect(validatePasswordStrength("weak").isValid).toBe(false);
    expect(validatePasswordStrength("SecureTennis2026!").isValid).toBe(true);
  });
});
