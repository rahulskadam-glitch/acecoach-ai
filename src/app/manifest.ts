import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Athlentra Tennis – AI Coach",
    short_name: "Athlentra",
    description: "Personalized tennis stroke analysis and coaching from your video.",
    start_url: "/start?sport=tennis",
    scope: "/",
    display: "standalone",
    background_color: "#1b4332",
    theme_color: "#1b4332",
    categories: ["sports", "education"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
