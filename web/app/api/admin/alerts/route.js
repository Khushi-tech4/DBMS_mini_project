// GET /api/admin/alerts?status=OPEN   (status is optional)
import { pool } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

const STATUSES = ["OPEN", "INVESTIGATING", "CONFIRMED", "FALSE_POSITIVE", "RESOLVED"];

export async function GET(request) {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Not authorised" }, { status: 401 });
  }

  const status = new URL(request.url).searchParams.get("status");
  const params = [];
  let where = "";
  if (status && STATUSES.includes(status)) {
    where = "WHERE alert_status = ?";
    params.push(status);
  }

  // Uses the fraud_monitoring_view (a JOIN of FRAUD_ALERT, CUSTOMER and FRAUD_RULE)
  const [alerts] = await pool.execute(
    `SELECT alert_id, transaction_id, customer_name, fraud_type, risk_score,
            severity, alert_status, reason, rule_name, detected_at
       FROM fraud_monitoring_view
       ${where}
      ORDER BY detected_at DESC, alert_id DESC
      LIMIT 100`,
    params
  );

  // Aggregate query: GROUP BY + HAVING + aggregate functions
  const [summary] = await pool.query(
    `SELECT fraud_type, COUNT(*) AS alerts, ROUND(AVG(risk_score), 1) AS avg_risk
       FROM FRAUD_ALERT
      GROUP BY fraud_type
     HAVING COUNT(*) >= 1
      ORDER BY alerts DESC`
  );

  return Response.json({ alerts, summary });
}
