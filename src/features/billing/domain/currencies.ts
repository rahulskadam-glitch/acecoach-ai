export type CountryCode =
  | "US"
  | "IN"
  | "GB"
  | "EU"
  | "DE"
  | "FR"
  | "ES"
  | "PT"
  | "IT"
  | "NL"
  | "BE"
  | "AT"
  | "CH"
  | "SE"
  | "CA"
  | "JP"
  | "GLOBAL";

export type LocalizedPricing = {
  countryCode: CountryCode;
  countryName: string;
  flag: string;
  currencyCode: "USD" | "INR" | "GBP" | "EUR" | "CAD" | "JPY";
  currencySymbol: string;
  singleVideo: {
    price: number;
    formatted: string;
  };
  proMonthly: {
    price: number;
    formatted: string;
  };
};

const EUROZONE_PRICING = {
  currencyCode: "EUR" as const,
  currencySymbol: "€",
  singleVideo: {
    price: 1.99,
    formatted: "1,99 €",
  },
  proMonthly: {
    price: 9.99,
    formatted: "9,99 €",
  },
};

export const COUNTRY_PRICING: Record<CountryCode, LocalizedPricing> = {
  US: {
    countryCode: "US",
    countryName: "United States",
    flag: "🇺🇸",
    currencyCode: "USD",
    currencySymbol: "$",
    singleVideo: {
      price: 1.99,
      formatted: "$1.99",
    },
    proMonthly: {
      price: 9.99,
      formatted: "$9.99",
    },
  },
  IN: {
    countryCode: "IN",
    countryName: "India",
    flag: "🇮🇳",
    currencyCode: "INR",
    currencySymbol: "₹",
    singleVideo: {
      price: 199,
      formatted: "₹199",
    },
    proMonthly: {
      price: 999,
      formatted: "₹999",
    },
  },
  GB: {
    countryCode: "GB",
    countryName: "United Kingdom",
    flag: "🇬🇧",
    currencyCode: "GBP",
    currencySymbol: "£",
    singleVideo: {
      price: 1.99,
      formatted: "£1.99",
    },
    proMonthly: {
      price: 8.99,
      formatted: "£8.99",
    },
  },
  EU: {
    countryCode: "EU",
    countryName: "Europe / Eurozone (All European Countries)",
    flag: "🇪🇺",
    ...EUROZONE_PRICING,
  },
  DE: {
    countryCode: "DE",
    countryName: "Germany",
    flag: "🇩🇪",
    ...EUROZONE_PRICING,
  },
  FR: {
    countryCode: "FR",
    countryName: "France",
    flag: "🇫🇷",
    ...EUROZONE_PRICING,
  },
  ES: {
    countryCode: "ES",
    countryName: "Spain",
    flag: "🇪🇸",
    ...EUROZONE_PRICING,
  },
  PT: {
    countryCode: "PT",
    countryName: "Portugal",
    flag: "🇵🇹",
    ...EUROZONE_PRICING,
  },
  IT: {
    countryCode: "IT",
    countryName: "Italy",
    flag: "🇮🇹",
    ...EUROZONE_PRICING,
  },
  NL: {
    countryCode: "NL",
    countryName: "Netherlands",
    flag: "🇳🇱",
    ...EUROZONE_PRICING,
  },
  BE: {
    countryCode: "BE",
    countryName: "Belgium",
    flag: "🇧🇪",
    ...EUROZONE_PRICING,
  },
  AT: {
    countryCode: "AT",
    countryName: "Austria",
    flag: "🇦🇹",
    ...EUROZONE_PRICING,
  },
  CH: {
    countryCode: "CH",
    countryName: "Switzerland",
    flag: "🇨🇭",
    ...EUROZONE_PRICING,
  },
  SE: {
    countryCode: "SE",
    countryName: "Sweden / Nordics",
    flag: "🇸🇪",
    ...EUROZONE_PRICING,
  },
  CA: {
    countryCode: "CA",
    countryName: "Canada",
    flag: "🇨🇦",
    currencyCode: "CAD",
    currencySymbol: "CA$",
    singleVideo: {
      price: 2.99,
      formatted: "CA$2.99",
    },
    proMonthly: {
      price: 13.99,
      formatted: "CA$13.99",
    },
  },
  JP: {
    countryCode: "JP",
    countryName: "Japan",
    flag: "🇯🇵",
    currencyCode: "JPY",
    currencySymbol: "¥",
    singleVideo: {
      price: 300,
      formatted: "¥300",
    },
    proMonthly: {
      price: 1500,
      formatted: "¥1,500",
    },
  },
  GLOBAL: {
    countryCode: "GLOBAL",
    countryName: "Global / Other (USD)",
    flag: "🌐",
    currencyCode: "USD",
    currencySymbol: "$",
    singleVideo: {
      price: 1.99,
      formatted: "$1.99",
    },
    proMonthly: {
      price: 9.99,
      formatted: "$9.99",
    },
  },
};

export const SUPPORTED_COUNTRIES: CountryCode[] = [
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

export function detectDefaultCountry(): CountryCode {
  if (typeof Intl === "undefined" || !Intl.DateTimeFormat) {
    return "US";
  }

  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    
    // India
    if (tz.includes("Calcutta") || tz.includes("Kolkata") || tz.startsWith("Asia/Kolkata")) return "IN";
    
    // United Kingdom
    if (tz.includes("London") || tz.includes("Europe/Belfast")) return "GB";
    
    // All European Countries map to Eurozone (EUR)
    if (tz.startsWith("Europe/")) {
      if (tz.includes("Berlin")) return "DE";
      if (tz.includes("Paris")) return "FR";
      if (tz.includes("Madrid") || tz.includes("Canary")) return "ES";
      if (tz.includes("Lisbon") || tz.includes("Madeira") || tz.includes("Azores")) return "PT";
      if (tz.includes("Rome")) return "IT";
      if (tz.includes("Amsterdam")) return "NL";
      if (tz.includes("Brussels")) return "BE";
      if (tz.includes("Vienna")) return "AT";
      if (tz.includes("Zurich")) return "CH";
      if (tz.includes("Stockholm") || tz.includes("Oslo") || tz.includes("Copenhagen") || tz.includes("Helsinki")) return "SE";
      return "EU"; // Catch-all for any other European timezone (e.g. Warsaw, Prague, Athens, Dublin, etc.)
    }
    
    // Canada
    if (tz.includes("Toronto") || tz.includes("Vancouver") || tz.includes("Montreal") || tz.includes("Edmonton") || tz.includes("Winnipeg") || tz.includes("Halifax")) return "CA";
    
    // Japan
    if (tz.includes("Tokyo") || tz.startsWith("Asia/Tokyo")) return "JP";
    
    // USA
    if (tz.includes("New_York") || tz.includes("Los_Angeles") || tz.includes("Chicago") || tz.includes("Denver") || tz.includes("Phoenix") || tz.startsWith("America/")) return "US";
  } catch {
    // fallback
  }

  return "US";
}
