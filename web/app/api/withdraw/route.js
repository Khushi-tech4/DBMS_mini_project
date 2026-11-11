// POST /api/withdraw   body: { accountId, amount }
// Inserting into WITHDRAWAL fires trg_before_withdrawal (balance check)
// and trg_after_withdrawal (subtracts the balance).
import { pool } from "@/lib/db";
import { getSession } from "@/lib/session";
import { parseAmount, parseId, round2 } from "@/lib/validate";
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

    // FOR UPDATE locks this account row until commit/rollback (concurrency control)
    const [rows] = await conn.execute(
      `SELECT a.balance, a.status, t.minimum_balance
         FROM ACCOUNT a
         JOIN ACCOUNT_TYPE t ON t.account_type_id = a.account_type_id
        WHERE a.account_id = ? AND a.customer_id = ?
          FOR UPDATE OF a`,
      [accountId, session.customerId]
    );
    const acc = rows[0];
    if (!acc) {
      await conn.rollback();
      return Response.json({ error: "Account not found" }, { status: 404 });
    }
    if (acc.status !== "ACTIVE") {
      await conn.rollback();
      return Response.json({ error: "Account is not active" }, { status: 400 });
    }
    if (round2(acc.balance - amount) < acc.minimum_balance) {
      await conn.rollback();
      logActivity("WITHDRAWAL", "FAILURE", {
        userId: session.userId,
        customerId: session.customerId,
        ...requestMeta(request),
        details: { accountId, amount, reason: "Insufficient balance (minimum balance rule)" },
      });
      return Response.json({ error: "Insufficient balance (minimum balance rule)" }, { status: 400 });
    }

    await conn.execute(
      "INSERT INTO WITHDRAWAL (account_id, amount, withdrawal_method) VALUES (?, ?, 'WEB')",
      [accountId, amount]
    );
    await conn.commit();
    logActivity("WITHDRAWAL", "SUCCESS", {
      userId: session.userId,
      customerId: session.customerId,
      ...requestMeta(request),
      details: { accountId, amount },
    });
    return Response.json({ message: "Withdrawal successful" });
  } catch (err) {
    try { await conn.rollback(); } catch {}
    if (err.sqlState === "45000") return Response.json({ error: err.sqlMessage }, { status: 400 });
    console.error(err);
    return Response.json({ error: "Withdrawal failed" }, { status: 500 });
  } finally {
    conn.release();
  }
}
