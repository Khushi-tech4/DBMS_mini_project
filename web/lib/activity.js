// lib/activity.js
// Writes one document to the MongoDB "activity_logs" collection.
//
// Failure strategy: MySQL is the source of truth for money. Logging is
// "fire and forget": if MongoDB is down, the error is printed to the server
// console and the user's transfer/login still works. (MySQL and MongoDB cannot
// share one ACID transaction, so we never make a financial operation depend
// on the log write.)
import { getDb } from "@/lib/mongo";
import { clientIp } from "@/lib/security";

export function requestMeta(request) {
  return {
    ip: clientIp(request),
    userAgent: (request.headers.get("user-agent") || "").slice(0, 300),
  };
}

// eventType: LOGIN | TRANSFER | DEPOSIT | WITHDRAWAL | ALERT_REVIEW
// outcome:   SUCCESS | FAILURE
// fields:    { userId, customerId, username, ip, userAgent, details: {...any shape...} }
export function logActivity(eventType, outcome, fields = {}) {
  (async () => {
    try {
      const db = await getDb();
      await db.collection("activity_logs").insertOne({
        eventType,
        outcome,
        ...fields,
        createdAt: new Date(),
      });
    } catch (err) {
      console.error("MongoDB activity log failed:", err.message);
    }
  })();
}
