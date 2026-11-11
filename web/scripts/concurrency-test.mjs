// scripts/concurrency-test.mjs
// Fires several transfers AT THE SAME TIME from one account and checks that
// the database never lets the account be overspent.
//
//   Safe version (uses the stored procedure with row locks):
//     node --env-file=.env.local scripts/concurrency-test.mjs
//   Broken version (no locks, shows the race condition / lost update):
//     node --env-file=.env.local scripts/concurrency-test.mjs --naive
//
// Run scripts/05_reset_demo_data.sql BEFORE each run (and after, to clean up).
import mysql from "mysql2/promise";

const SENDER = 3;       // Rohan's CURRENT account, balance 20000, minimum 0
const RECEIVER = 1;
const AMOUNT = 8000;
const ATTEMPTS = 5;     // 5 x 8000 = 40000 requested, but only 20000 exists
const naive = process.argv.includes("--naive");

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  connectionLimit: ATTEMPTS + 2,
  decimalNumbers: true,
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const money = (n) => Math.round(n * 100) / 100;

async function accountInfo(id) {
  const [rows] = await pool.query(
    `SELECT a.balance, t.minimum_balance
       FROM ACCOUNT a JOIN ACCOUNT_TYPE t ON t.account_type_id = a.account_type_id
      WHERE a.account_id = ?`,
    [id]
  );
  return rows[0];
}

const before = await accountInfo(SENDER);
const recvBefore = await accountInfo(RECEIVER);
const expectedSuccesses = Math.floor(money(before.balance - before.minimum_balance) / AMOUNT);

console.log(`Mode: ${naive ? "NAIVE (no locking)" : "SAFE (sp_transfer_funds with row locks)"}`);
console.log(`Sender balance before: ${before.balance}, minimum: ${before.minimum_balance}`);
console.log(`${ATTEMPTS} simultaneous transfers of ${AMOUNT} requested (total ${ATTEMPTS * AMOUNT})`);
console.log(`Correct behaviour: exactly ${expectedSuccesses} succeed\n`);

if (naive && expectedSuccesses < 1) {
  console.log("The naive demo needs enough money in the account to show the race.");
  console.log("Run scripts/05_reset_demo_data.sql first, then run this again.");
  await pool.end();
  process.exit(0);
}

// Get all connections first so the requests really start together
const conns = await Promise.all(Array.from({ length: ATTEMPTS }, () => pool.getConnection()));

async function safeTransfer(conn) {
  await conn.query("CALL sp_transfer_funds(?, ?, ?, ?, @tid)", [
    SENDER, RECEIVER, AMOUNT, "Concurrency test",
  ]);
}

// Deliberately WRONG: read, think, then write an absolute value (classic lost update)
async function naiveTransfer(conn) {
  const [rows] = await conn.query("SELECT balance FROM ACCOUNT WHERE account_id = ?", [SENDER]);
  const bal = rows[0].balance;
  await sleep(150); // widen the race window so every request reads the same balance
  if (bal - AMOUNT < before.minimum_balance) throw new Error("Insufficient balance (naive check)");
  await conn.query("UPDATE ACCOUNT SET balance = ? WHERE account_id = ?", [money(bal - AMOUNT), SENDER]);
}

const results = await Promise.all(
  conns.map(async (conn, i) => {
    try {
      await (naive ? naiveTransfer(conn) : safeTransfer(conn));
      return { attempt: i + 1, ok: true, message: "SUCCESS" };
    } catch (err) {
      return { attempt: i + 1, ok: false, message: err.sqlMessage || err.message };
    } finally {
      conn.release();
    }
  })
);

console.table(results);

const after = await accountInfo(SENDER);
const recvAfter = await accountInfo(RECEIVER);
const successes = results.filter((r) => r.ok).length;

console.log(`\nSucceeded: ${successes} (correct: ${expectedSuccesses})`);
console.log(`Sender balance after:   ${after.balance}  (correct: ${money(before.balance - expectedSuccesses * AMOUNT)})`);
console.log(`Receiver balance after: ${recvAfter.balance}  (change: ${money(recvAfter.balance - recvBefore.balance)})`);

if (naive) {
  const moneyThatLeft = successes * AMOUNT;
  const actuallyDeducted = money(before.balance - after.balance);
  console.log(
    successes > expectedSuccesses || actuallyDeducted !== moneyThatLeft
      ? `\nRACE CONDITION: ${successes} transfers "succeeded" (${moneyThatLeft}) but only ${actuallyDeducted} was deducted: updates were lost.`
      : "\nNo race happened this time; run again."
  );
} else {
  const senderOk = money(after.balance) === money(before.balance - successes * AMOUNT);
  const recvOk = money(recvAfter.balance - recvBefore.balance) === money(successes * AMOUNT);
  const pass = successes === expectedSuccesses && senderOk && recvOk && after.balance >= after.minimum_balance;
  console.log(pass
    ? "\nPASS: locking prevented overspending and money was conserved."
    : "\nFAIL: results do not match the expected behaviour.");
}

await pool.end();
