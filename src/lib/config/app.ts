import { supportedSports } from "@/lib/sports";

export const appConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME || "Athlentra Tennis",
  storeName: "Athlentra Tennis – AI Coach",
  shortName: "Athlentra",
  assistantName: "Athlentra Coach",
  descriptor: "AI tennis coaching from your video",
  url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  mobile: {
    appId: "com.athlentra.tennis",
    scheme: "athlentratennis",
    authCallback: "athlentratennis://auth/callback",
  },
  video: {
    maxBytes: 500 * 1024 * 1024,
    acceptedMimeTypes: ["video/mp4", "video/quicktime"] as const,
  },
  roles: ["athlete", "coach", "academy", "admin"] as const,
  sports: supportedSports,
};
