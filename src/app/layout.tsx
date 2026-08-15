import type { Metadata, Viewport } from "next";

import NativeAppBridge from "@/components/mobile/NativeAppBridge";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: { default: "Athlentra Tennis – AI Coach", template: "%s · Athlentra Tennis" },
  description: "Personalized tennis stroke analysis and coaching from your video.",
  applicationName: "Athlentra Tennis",
  appleWebApp: { capable: true, title: "Athlentra", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  icons: {
    icon: [{ url: "/icons/icon-192.png", type: "image/png", sizes: "192x192" }],
    apple: [{ url: "/icons/apple-touch-icon.png", type: "image/png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#071b2d",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased" data-scroll-behavior="smooth">
      <body className="min-h-full flex flex-col font-sans">
        <NativeAppBridge />
        {children}
      </body>
    </html>
  );
}
