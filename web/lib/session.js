// lib/session.js
// Minimal signed-cookie session. The cookie holds {userId, customerId, role, exp}
// plus an HMAC signature, so the browser cannot change its own role.
import crypto from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "session";
const MAX_AGE_SECONDS = 60 * 60 * 2; // 2 hours

function sign(data) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be set in .env.local (at least 32 characters)");
  }
  return crypto.createHmac("sha256", secret).update(data).digest("base64url");
}

export async function createSession(payload) {
  const body = Buffer.from(
    JSON.stringify({ ...payload, exp: Date.now() + MAX_AGE_SECONDS * 1000 })
  ).toString("base64url");
  const store = await cookies();
  store.set(COOKIE, `${body}.${sign(body)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function getSession() {
  const store = await cookies();
  const raw = store.get(COOKIE)?.value;
  if (!raw) return null;
  const [body, sig] = raw.split(".");
  if (!body || !sig) return null;

  const a = Buffer.from(sig);
  const b = Buffer.from(sign(body));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString());
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE);
}
