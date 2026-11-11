// POST /api/transfer   body: { fromAccountId, toAccountNumber, amount, description }
// All the money logic is inside the MySQL stored procedure sp_transfer_funds.
import { pool } from "@/lib/db";
import { getSession } from "@/lib/session";
import { parseAmount, parseId, cleanText } from "@/lib/validate";
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

  const fromId = parseId(body.fromAccountId);
  const toNumber = cleanText(body.toAccountNumber, 30);
  const amount = parseAmount(body.amount);
  const description = cleanText(body.description);

  if (!fromId) return Response.json({ error: "Choose the account to send from" }, { status: 400 });
  if (!toNumber) return Response.json({ error: "Enter the receiver account number" }, { status: 400 });
  if (amount === null) {
    return Response.json({ error: "Enter a valid amount (max 2 decimals, up to 1,000,000)" }, { status: 400 });
  }

  // Authorization: the sender account must belong to the logged-in customer
  const [own] = await pool.execute(
    "SELECT account_id FROM ACCOUNT WHERE account_id = ? AND customer_id = ?",
    [fromId, session.customerId]
  );
  const meta = requestMeta(request);
  const who = { userId: session.userId, customerId: session.customerId, ...meta };
  if (!own[0]) {
    logActivity("TRANSFER", "FAILURE", {
      ...who,
      details: { fromAccountId: fromId, toAccountNumber: toNumber, amount, reason: "sender account not owned by user" },
    });
    return Response.json({ error: "You do not own that account" }, { status: 403 });
  }

  const [rec] = await pool.execute("SELECT account_id FROM ACCOUNT WHERE account_number = ?", [toNumber]);
  if (!rec[0]) return Response.json({ error: "Receiver account not found" }, { status: 404 });

  const conn = await pool.getConnection();
  try {
    await conn.query("CALL sp_transfer_funds(?, ?, ?, ?, @tid)", [
      fromId,
      rec[0].account_id,
      amount,
      description,
    ]);
    const [out] = await conn.query("SELECT @tid AS transactionId");
    logActivity("TRANSFER", "SUCCESS", {
      ...who,
      details: { fromAccountId: fromId, toAccountNumber: toNumber, amount, transactionId: Number(out[0].transactionId) },
    });
    return Response.json({
      message: `Transfer successful (transaction #${out[0].transactionId})`,
    });
  } catch (err) {
    // Errors raised with SIGNAL SQLSTATE '45000' are our own business-rule messages
    if (err.sqlState === "45000") {
      logActivity("TRANSFER", "FAILURE", {
        ...who,
        details: { fromAccountId: fromId, toAccountNumber: toNumber, amount, reason: err.sqlMessage },
      });
      return Response.json({ error: err.sqlMessage }, { status: 400 });
    }
    console.error(err);
    return Response.json({ error: "Transfer failed" }, { status: 500 });
  } finally {
    conn.release();
  }
}
