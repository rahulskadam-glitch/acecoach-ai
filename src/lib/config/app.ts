import { supportedSports } from "@/lib/sports";

export const appConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME || "AceCoach AI",
  descriptor: "Review-Led Athlete Improvement Intelligence",
  url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  video: {
    maxBytes: 500 * 1024 * 1024,
    acceptedMimeTypes: ["video/mp4", "video/quicktime"] as const,
  },
  roles: ["athlete", "coach", "academy", "admin"] as const,
  sports: supportedSports,
};
