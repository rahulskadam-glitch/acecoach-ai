import type { Metadata, Viewport } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "AceCoach AI",
  description: "A simple six-step path from sports video to a clear coaching conversation.",
  applicationName: "AceCoach AI",
  appleWebApp: { capable: true, title: "AceCoach", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#F6F8FB",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
