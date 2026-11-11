// lib/admin.js
// Returns the session if the logged-in user is an ADMIN, otherwise null.
import { getSession } from "@/lib/session";

export async function requireAdmin() {
  const session = await getSession();
  return session && session.role === "ADMIN" ? session : null;
}
