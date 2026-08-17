import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i].replace(/^--/, "");
      const val = args[i + 1] && !args[i + 1].startsWith("--") ? args[++i] : true;
      parsed[key] = val;
    }
  }
  return parsed;
}

function generateSecret({ teamId, keyId, clientId, privateKey }) {
  const header = {
    alg: "ES256",
    kid: keyId,
    typ: "JWT",
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: teamId,
    iat: now,
    exp: now + 86400 * 180, // 180 days (Apple maximum)
    aud: "https://appleid.apple.com",
    sub: clientId,
  };

  const b64Url = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
  const encodedHeader = b64Url(header);
  const encodedPayload = b64Url(payload);
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .sign("SHA256", Buffer.from(signingInput), {
      key: privateKey,
      dsaEncoding: "ieee-p1363",
    })
    .toString("base64url");

  return `${signingInput}.${signature}`;
}

const args = parseArgs();

const teamId = args.teamId || process.env.APPLE_TEAM_ID;
const keyId = args.keyId || process.env.APPLE_KEY_ID;
const clientId = args.clientId || args.servicesId || process.env.APPLE_SERVICES_ID || "com.athlentra.tennis.service";
const p8Path = args.p8Path || args.keyPath || process.env.APPLE_KEY_PATH;

if (!teamId || !keyId || !p8Path) {
  console.log(`
Usage:
  node scripts/generate-apple-secret.mjs --teamId <TEAM_ID> --keyId <KEY_ID> --clientId <SERVICES_ID> --p8Path <PATH_TO_P8>

Parameters:
  --teamId    Apple Developer Team ID (10 chars, e.g. DEF1234567)
  --keyId     Key ID for the downloaded key (10 chars, e.g. ABC1234567)
  --clientId  Services ID (default: com.athlentra.tennis.service)
  --p8Path    Absolute or relative path to AuthKey_XXXXX.p8 file
`);
  process.exit(1);
}

const resolvedPath = path.resolve(process.cwd(), p8Path);
if (!fs.existsSync(resolvedPath)) {
  console.error(`Error: .p8 file not found at ${resolvedPath}`);
  process.exit(1);
}

const privateKey = fs.readFileSync(resolvedPath, "utf8");
const secret = generateSecret({ teamId, keyId, clientId, privateKey });

console.log("\n==================================================");
console.log("🍏 GENERATED APPLE CLIENT SECRET (FOR SUPABASE):");
console.log("==================================================");
console.log(secret);
console.log("==================================================");
console.log(`Expires in: 180 days (~${new Date(Date.now() + 180 * 86400 * 1000).toLocaleDateString()})`);
console.log("==================================================\n");
