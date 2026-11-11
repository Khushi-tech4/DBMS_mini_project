// GET /api/admin/security-events?severity=HIGH   (severity is optional)
import { pool } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

const SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export async function GET(request) {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Not authorised" }, { status: 401 });
  }

  const severity = new URL(request.url).searchParams.get("severity");
  const params = [];
  let where = "";
  if (severity && SEVERITIES.includes(severity)) {
    where = "WHERE e.severity = ?";
    params.push(severity);
  }

  const [events] = await pool.execute(
    `SELECT e.event_id, CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
            e.event_type, e.ip_address, e.severity, e.event_details, e.event_time
       FROM SECURITY_EVENT e
       JOIN CUSTOMER c ON c.customer_id = e.customer_id
       ${where}
      ORDER BY e.event_time DESC, e.event_id DESC
      LIMIT 50`,
    params
  );
  return Response.json({ events });
}
