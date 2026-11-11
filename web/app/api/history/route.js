// GET /api/history -> last 50 transfers, deposits and withdrawals for the customer
import { pool } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET(request) {
  const session = await getSession();
  if (!session || session.role !== "CUSTOMER") {
    return Response.json({ error: "Not authorised" }, { status: 401 });
  }
  const id = session.customerId;

  // Optional filters: ?type=TRANSFER|DEPOSIT|WITHDRAWAL and ?q=text (reference or account number)
  const params = new URL(request.url).searchParams;
  const type = ["TRANSFER", "DEPOSIT", "WITHDRAWAL"].includes(params.get("type")) ? params.get("type") : "";
  const q = (params.get("q") || "").trim().slice(0, 50);
  const like = `%${q}%`;

  // UNION ALL combines three different tables into one history list
  const [rows] = await pool.execute(
    `SELECT * FROM (
     (SELECT v.transaction_date AS tx_date, 'TRANSFER' AS tx_type, v.reference_number AS ref,
             v.amount AS amount,
             CASE WHEN s.customer_id = ? THEN 'DEBIT' ELSE 'CREDIT' END AS direction,
             v.sender_account_number AS from_account, v.receiver_account_number AS to_account,
             v.transaction_status AS tx_status
        FROM transaction_history_view v
        JOIN ACCOUNT s ON s.account_id = v.sender_account_id
        JOIN ACCOUNT r ON r.account_id = v.receiver_account_id
       WHERE s.customer_id = ? OR r.customer_id = ?)
     UNION ALL
     (SELECT d.deposit_date, 'DEPOSIT', CONCAT('DEP-', d.deposit_id), d.amount, 'CREDIT',
             NULL, a.account_number, d.status
        FROM DEPOSIT d JOIN ACCOUNT a ON a.account_id = d.account_id
       WHERE a.customer_id = ?)
     UNION ALL
     (SELECT w.withdrawal_date, 'WITHDRAWAL', CONCAT('WDR-', w.withdrawal_id), w.amount, 'DEBIT',
             a.account_number, NULL, w.status
        FROM WITHDRAWAL w JOIN ACCOUNT a ON a.account_id = w.account_id
       WHERE a.customer_id = ?)
     ) h
     WHERE (? = '' OR h.tx_type = ?)
       AND (? = '' OR h.ref LIKE ? OR h.from_account LIKE ? OR h.to_account LIKE ?)
     ORDER BY h.tx_date DESC
     LIMIT 50`,
    [id, id, id, id, id, type, type, q, like, like, like]
  );
  return Response.json({ history: rows });
}
