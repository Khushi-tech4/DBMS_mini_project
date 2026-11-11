// POST /api/deposit   body: { accountId, amount }
// Inserting into DEPOSIT fires trigger trg_after_deposit, which adds to the balance.
import { pool } from "@/lib/db";
import { getSession } from "@/lib/session";
import { parseAmount, parseId } from "@/lib/validate";
import { logActivity, requestMeta } from "@/lib/activity";

export async function POST(request) {
  const session = await getSession();
  if (!session || session.role !== "CUSTOMER") {
    return Response.json({ error: "Not authorised" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const accountId = parseId(body.accountId);
  const amount = parseAmount(body.amount);
  if (!accountId) return Response.json({ error: "Choose a valid account" }, { status: 400 });
  if (amount === null) {
    return Response.json({ error: "Enter a valid amount (max 2 decimals, up to 1,000,000)" }, { status: 400 });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // The customer_id condition makes sure the account really belongs to this user
    const [rows] = await conn.execute(
      "SELECT status FROM ACCOUNT WHERE account_id = ? AND customer_id = ? FOR UPDATE",
      [accountId, session.customerId]
    );
    if (!rows[0]) {
      await conn.rollback();
      return Response.json({ error: "Account not found" }, { status: 404 });
    }
    if (rows[0].status !== "ACTIVE") {
      await conn.rollback();
      return Response.json({ error: "Account is not active" }, { status: 400 });
    }

    await conn.execute(
      "INSERT INTO DEPOSIT (account_id, amount, deposit_method) VALUES (?, ?, 'WEB')",
      [accountId, amount]
    );
    await conn.commit();
    logActivity("DEPOSIT", "SUCCESS", {
      userId: session.userId,
      customerId: session.customerId,
      ...requestMeta(request),
      details: { accountId, amount },
    });
    return Response.json({ message: "Deposit successful" });
  } catch (err) {
    try { await conn.rollback(); } catch {}
    if (err.sqlState === "45000") return Response.json({ error: err.sqlMessage }, { status: 400 });
    console.error(err);
    return Response.json({ error: "Deposit failed" }, { status: 500 });
  } finally {
    conn.release();
  }
}
