import { describe, expect, it } from "vitest";
import {
  COUNTRY_PRICING,
  type CountryCode,
  detectDefaultCountry,
  SUPPORTED_COUNTRIES,
} from "./currencies";

describe("Localized Country Pricing with Eurozone across Europe", () => {
  it("includes all requested countries with local currencies", () => {
    const requiredCountries: CountryCode[] = [
      "US",
      "IN",
      "GB",
      "EU",
      "DE",
      "FR",
      "ES",
      "PT",
      "IT",
      "NL",
      "BE",
      "AT",
      "CH",
      "SE",
      "CA",
      "JP",
      "GLOBAL",
    ];

    for (const code of requiredCountries) {
      expect(SUPPORTED_COUNTRIES).toContain(code);
      const pricing = COUNTRY_PRICING[code];
      expect(pricing).toBeDefined();
      expect(pricing.currencySymbol).toBeTruthy();
      expect(pricing.singleVideo.price).toBeGreaterThan(0);
      expect(pricing.proMonthly.price).toBeGreaterThan(0);
    }
  });

  it("applies Eurozone EUR pricing to all European countries", () => {
    const europeanCodes: CountryCode[] = [
      "EU",
      "DE",
      "FR",
      "ES",
      "PT",
      "IT",
      "NL",
      "BE",
      "AT",
      "CH",
      "SE",
    ];

    for (const code of europeanCodes) {
      const p = COUNTRY_PRICING[code];
      expect(p.currencyCode).toBe("EUR");
      expect(p.currencySymbol).toBe("€");
      expect(p.singleVideo.price).toBe(1.99);
      expect(p.singleVideo.formatted).toBe("1,99 €");
      expect(p.proMonthly.price).toBe(9.99);
      expect(p.proMonthly.formatted).toBe("9,99 €");
    }
  });

  it("applies the requested pricing tiers for US/Global ($1.99 per video, $9.99/month)", () => {
    const us = COUNTRY_PRICING.US;
    expect(us.singleVideo.price).toBe(1.99);
    expect(us.singleVideo.formatted).toBe("$1.99");
    expect(us.proMonthly.price).toBe(9.99);
    expect(us.proMonthly.formatted).toBe("$9.99");
  });

  it("applies India pricing with no discount (₹199, ₹999)", () => {
    const india = COUNTRY_PRICING.IN;
    expect(india.currencyCode).toBe("INR");
    expect(india.currencySymbol).toBe("₹");
    expect(india.singleVideo.price).toBe(199);
    expect(india.singleVideo.formatted).toBe("₹199");
    expect(india.proMonthly.price).toBe(999);
    expect(india.proMonthly.formatted).toBe("₹999");
  });

  it("returns default country safely", () => {
    const country = detectDefaultCountry();
    expect(SUPPORTED_COUNTRIES).toContain(country);
  });
});
