import type { CapacitorConfig } from "@capacitor/cli";

const serverUrl = process.env.CAPACITOR_SERVER_URL?.trim().replace(/\/+$/, "");
const isLocalUrl = Boolean(serverUrl && /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.|[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)/.test(serverUrl));

if (serverUrl && !isLocalUrl && !/^https:\/\//.test(serverUrl)) {
  throw new Error("CAPACITOR_SERVER_URL must use HTTPS for remote hosts.");
}

const config: CapacitorConfig = {
  appId: "com.athlentra.tennis",
  appName: "Athlentra: AI Tennis Coach 3D",
  webDir: "mobile-shell",
  backgroundColor: "#071b2d",
  loggingBehavior: process.env.NODE_ENV === "production" ? "none" : "debug",
  ios: {
    contentInset: "always",
    preferredContentMode: "mobile",
    backgroundColor: "#071b2d",
  },
  android: {
    backgroundColor: "#071b2d",
    allowMixedContent: false,
  },
  ...(serverUrl
    ? {
      server: {
        url: serverUrl,
        cleartext: isLocalUrl,
        allowNavigation: [new URL(serverUrl).host],
      },
    }
    : {}),
};

export default config;
