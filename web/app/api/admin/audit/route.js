// GET /api/admin/audit -> latest 50 audit log rows
import { pool } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

export async function GET() {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Not authorised" }, { status: 401 });
  }

  const [rows] = await pool.query(
    `SELECT a.audit_id, u.username, a.action, a.table_name, a.record_id,
            a.old_value, a.new_value, a.action_timestamp
       FROM AUDIT_LOG a
       JOIN USER_ACCOUNT u ON u.user_id = a.user_id
      ORDER BY a.action_timestamp DESC, a.audit_id DESC
      LIMIT 50`
  );
  return Response.json({ audit: rows });
}
