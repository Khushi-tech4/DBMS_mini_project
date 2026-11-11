// POST /api/admin/alerts/update   body: { alertId, status }
// Changes an alert's status and writes an AUDIT_LOG row, in ONE transaction.
import { pool } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { parseId } from "@/lib/validate";
import { clientIp } from "@/lib/security";
import { logActivity, requestMeta } from "@/lib/activity";

const NEW_STATUSES = ["INVESTIGATING", "CONFIRMED", "FALSE_POSITIVE", "RESOLVED"];
const FINAL_STATUSES = ["CONFIRMED", "FALSE_POSITIVE", "RESOLVED"];

export async function POST(request) {
  const session = await requireAdmin();
  if (!session) return Response.json({ error: "Not authorised" }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const alertId = parseId(body.alertId);
  const status = String(body.status || "");
  if (!alertId) return Response.json({ error: "Invalid alert" }, { status: 400 });
  if (!NEW_STATUSES.includes(status)) {
    return Response.json({ error: "Invalid status" }, { status: 400 });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.execute(
      "SELECT alert_status FROM FRAUD_ALERT WHERE alert_id = ? FOR UPDATE",
      [alertId]
    );
    if (!rows[0]) {
      await conn.rollback();
      return Response.json({ error: "Alert not found" }, { status: 404 });
    }
    const oldStatus = rows[0].alert_status;

    await conn.execute(
      `UPDATE FRAUD_ALERT
          SET alert_status = ?,
              resolved_at = ${FINAL_STATUSES.includes(status) ? "NOW()" : "NULL"}
        WHERE alert_id = ?`,
      [status, alertId]
    );

    await conn.execute(
      `INSERT INTO AUDIT_LOG (user_id, action, table_name, record_id, old_value, new_value, ip_address)
       VALUES (?, 'ALERT_STATUS_CHANGE', 'FRAUD_ALERT', ?, ?, ?, ?)`,
      [session.userId, alertId, oldStatus, status, clientIp(request)]
    );

    await conn.commit();
    logActivity("ALERT_REVIEW", "SUCCESS", {
      userId: session.userId,
      customerId: session.customerId,
      ...requestMeta(request),
      details: { alertId, oldStatus, newStatus: status },
    });
    return Response.json({ message: `Alert #${alertId} marked ${status}` });
  } catch (err) {
    try { await conn.rollback(); } catch {}
    console.error(err);
    return Response.json({ error: "Could not update alert" }, { status: 500 });
  } finally {
    conn.release();
  }
}
