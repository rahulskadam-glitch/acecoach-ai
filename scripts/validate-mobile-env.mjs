const rawUrl = process.env.CAPACITOR_SERVER_URL?.trim();

if (!rawUrl) {
  console.error("CAPACITOR_SERVER_URL is required for a store build.");
  process.exit(1);
}

const url = new URL(rawUrl);
if (url.protocol !== "https:") {
  console.error("CAPACITOR_SERVER_URL must use HTTPS for a store build.");
  process.exit(1);
}

console.log(`Preparing Athlentra Tennis mobile shell for ${url.origin}`);
