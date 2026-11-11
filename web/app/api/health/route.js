// web/app/api/health/route.js
// Visit http://localhost:3000/api/health to check the MySQL connection.
import { pool } from "@/lib/db";

export async function GET() {
  try {
    const [rows] = await pool.query(
      "SELECT (SELECT COUNT(*) FROM CUSTOMER) AS customers, (SELECT COUNT(*) FROM ACCOUNT) AS accounts, (SELECT COUNT(*) FROM USER_ACCOUNT) AS users"
    );
    return Response.json({ mysql: "connected", counts: rows[0] });
  } catch (err) {
    return Response.json({ mysql: "error", message: err.message }, { status: 500 });
  }
}
