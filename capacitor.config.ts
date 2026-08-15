import type { CapacitorConfig } from "@capacitor/cli";

const serverUrl = process.env.CAPACITOR_SERVER_URL?.trim().replace(/\/+$/, "");

if (serverUrl && !/^https:\/\//.test(serverUrl)) {
  throw new Error("CAPACITOR_SERVER_URL must use HTTPS.");
}

const config: CapacitorConfig = {
  appId: "com.athlentra.tennis",
  appName: "Athlentra Tennis",
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
          cleartext: false,
          allowNavigation: [new URL(serverUrl).host],
        },
      }
    : {}),
};

export default config;
