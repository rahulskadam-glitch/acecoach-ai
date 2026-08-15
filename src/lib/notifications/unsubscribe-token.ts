import { createHmac, timingSafeEqual } from "node:crypto";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function secret() {
  const value = process.env.UNSUBSCRIBE_TOKEN_SECRET;
  if (!value) throw new Error("UNSUBSCRIBE_TOKEN_SECRET is not configured.");
  return value;
}

function sign(userId: string) {
  return createHmac("sha256", secret()).update(userId).digest("base64url");
}

// Stateless signed token (userId + HMAC signature): stable across every
// email send, so an unsubscribe link never goes stale after a later
// reminder is sent, and no per-user token needs to be stored.
export function createUnsubscribeToken(userId: string) {
  return `${Buffer.from(userId, "utf8").toString("base64url")}.${sign(userId)}`;
}

export function verifyUnsubscribeToken(token: string): string | null {
  const [encodedUserId, signature] = token.split(".");
  if (!encodedUserId || !signature) return null;

  let userId: string;
  try {
    userId = Buffer.from(encodedUserId, "base64url").toString("utf8");
  } catch {
    return null;
  }
  if (!UUID_PATTERN.test(userId)) return null;

  const expected = Buffer.from(sign(userId));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  return userId;
}
