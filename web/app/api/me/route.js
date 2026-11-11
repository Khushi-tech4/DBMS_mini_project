// GET /api/me  -> who is logged in?
import { pool } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ error: "Not logged in" }, { status: 401 });

  const [rows] = await pool.execute(
    "SELECT first_name, last_name FROM CUSTOMER WHERE customer_id = ?",
    [session.customerId]
  );
  const c = rows[0];
  return Response.json({
    role: session.role,
    name: c ? `${c.first_name} ${c.last_name}` : "User",
  });
}
