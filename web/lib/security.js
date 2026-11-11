// lib/security.js
// Writes a row to SECURITY_EVENT. A logging failure must never break the
// user's request, so errors are swallowed (and printed to the server console).
import { pool } from "@/lib/db";

export async function logSecurityEvent(customerId, eventType, ip, details, severity = "LOW") {
  try {
    await pool.execute(
      "INSERT INTO SECURITY_EVENT (customer_id, event_type, ip_address, event_details, severity) VALUES (?, ?, ?, ?, ?)",
      [customerId, eventType, ip || null, details || null, severity]
    );
  } catch (err) {
    console.error("Could not write security event:", err.message);
  }
}

export function clientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded ? forwarded.split(",")[0].trim() : "local";
}
