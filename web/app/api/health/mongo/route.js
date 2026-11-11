// GET /api/health/mongo -> checks the MongoDB (Atlas) connection
import { getDb } from "@/lib/mongo";

export async function GET() {
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    const count = await db.collection("activity_logs").countDocuments();
    return Response.json({ mongodb: "connected", activityLogs: count });
  } catch (err) {
    return Response.json({ mongodb: "error", message: err.message }, { status: 500 });
  }
}
