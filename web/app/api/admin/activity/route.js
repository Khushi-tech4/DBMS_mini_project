// GET /api/admin/activity?type=LOGIN&outcome=FAILURE   (both optional)
// Reads the MongoDB activity log and runs three aggregation pipelines.
import { getDb } from "@/lib/mongo";
import { requireAdmin } from "@/lib/admin";

const TYPES = ["LOGIN", "TRANSFER", "DEPOSIT", "WITHDRAWAL", "ALERT_REVIEW"];
const OUTCOMES = ["SUCCESS", "FAILURE"];

export async function GET(request) {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Not authorised" }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  const filter = {};
  if (TYPES.includes(params.get("type"))) filter.eventType = params.get("type");
  if (OUTCOMES.includes(params.get("outcome"))) filter.outcome = params.get("outcome");

  try {
    const col = (await getDb()).collection("activity_logs");

    const [logs, byType, topFailedIps, transferStats] = await Promise.all([
      // 1. find + filter + sort + limit (uses the createdAt / eventType indexes)
      col.find(filter).sort({ createdAt: -1 }).limit(50).toArray(),

      // 2. Aggregation: number of events per type and outcome
      col.aggregate([
        { $group: { _id: { eventType: "$eventType", outcome: "$outcome" }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]).toArray(),

      // 3. Aggregation: IP addresses with the most failed logins
      col.aggregate([
        { $match: { eventType: "LOGIN", outcome: "FAILURE" } },
        { $group: {
            _id: "$ip",
            failures: { $sum: 1 },
            usernames: { $addToSet: "$username" },
            lastAttempt: { $max: "$createdAt" },
        } },
        { $sort: { failures: -1 } },
        { $limit: 5 },
      ]).toArray(),

      // 4. Aggregation: successful transfer totals per customer
      col.aggregate([
        { $match: { eventType: "TRANSFER", outcome: "SUCCESS" } },
        { $group: {
            _id: "$customerId",
            transfers: { $sum: 1 },
            totalAmount: { $sum: "$details.amount" },
            avgAmount: { $avg: "$details.amount" },
        } },
        { $sort: { totalAmount: -1 } },
      ]).toArray(),
    ]);

    return Response.json({
      logs: logs.map((l) => ({ ...l, _id: String(l._id) })),
      byType,
      topFailedIps,
      transferStats,
    });
  } catch (err) {
    console.error("MongoDB read failed:", err.message);
    return Response.json({ error: "MongoDB is unavailable right now" }, { status: 503 });
  }
}
