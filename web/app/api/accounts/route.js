// GET /api/accounts -> only the logged-in customer's own accounts
import { pool } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "CUSTOMER") {
    return Response.json({ error: "Not authorised" }, { status: 401 });
  }

  // Uses the customer_account_view created in database.sql
  const [rows] = await pool.execute(
    `SELECT account_id, account_number, account_type, balance, currency, account_status
       FROM customer_account_view
      WHERE customer_id = ?
      ORDER BY account_id`,
    [session.customerId]
  );
  return Response.json({ accounts: rows });
}
