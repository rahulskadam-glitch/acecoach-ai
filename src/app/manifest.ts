import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AceCoach AI",
    short_name: "AceCoach",
    description: "A simple path from sports video to a clear coaching conversation.",
    start_url: "/",
    display: "standalone",
    background_color: "#F6F8FB",
    theme_color: "#F6F8FB",
    orientation: "any",
    categories: ["sports", "education"],
    icons: [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }],
  };
}
