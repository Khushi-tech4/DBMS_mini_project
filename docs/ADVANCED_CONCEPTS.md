# Advanced DBMS Concepts: where they are and how to demonstrate them

| # | Concept | Where it lives | Demo |
|---|---|---|---|
| 1 | Transactions, ACID, rollback | `sp_transfer_funds`; deposit/withdraw/alert-update API routes | Demos 1A to 1D |
| 2 | Stored procedure | `sp_transfer_funds` (`02_seed_and_procedures.sql`) | Demos 1C, 1D |
| 3 | Triggers (6) | `01_database.sql`, `03_fraud_rules.sql` | Demos 2A to 2F |
| 4 | Views (3) | `01_database.sql` | Demos 3A to 3C |
| 5 | Indexes | 20 indexes in `01_database.sql` | Demos 5A to 5D (`EXPLAIN` before/after) |
| 6 | Concurrency control (row locks) | `FOR UPDATE` in `sp_transfer_funds` and the withdraw route | Section below |
| 7 | Joins, aggregates, GROUP BY / HAVING, subqueries | admin alert summary, history `UNION ALL`, views | Demos 4A to 4E |
| 8 | NoSQL: schema validation, indexes, aggregation pipelines | MongoDB `activity_logs`, admin "Activity (MongoDB)" tab | Section below |

## How to run the SQL demos

All commands from `E:\FinancialFraudProject\web` in Command Prompt.

1. Reset to the starting state (**deletes your test transactions**, see the warning in the file):
   ```
   "E:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p -t < scripts\05_reset_demo_data.sql
   ```
   Expected: balances 100000.00, 75000.00, 20000.00, 10000.00 and all counts 0.
2. Open the client and record the output:
   ```
   "E:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p -t --force
   ```
   then at the `mysql>` prompt:
   ```
   tee demo_output.txt
   source scripts/04_advanced_demos.sql
   notee
   exit
   ```
   `--force` is needed: several demos are *supposed* to fail, and the script must continue after those errors. `demo_output.txt` appears in the `web` folder; keep it for the report (do not commit anything containing secrets; this file has none).

### What you should see (expected results, assuming the reset was run first)

| Demo | Expected |
|---|---|
| 1A | Inside the transaction: account 1 = 99000, account 2 = 76000. After ROLLBACK: 100000 and 75000. |
| 1B | `ERROR 3819 ... Check constraint 'chk_account_balance' is violated`. After ROLLBACK, account 1 is still 100000 and account 3 is 20000. |
| 1C | A new transaction id (1). Account 1 = 97500, account 2 = 77500. |
| 1D | Three errors: `Insufficient balance (minimum balance rule)`, `Sender and receiver accounts must be different`, `Amount must be greater than zero`. Balances unchanged; 1 transaction recorded. |
| 2A | `ERROR 1644 ... Insufficient account balance` |
| 2B | Account 4: 10000, then 10500 after the deposit, then 10300 after the withdrawal |
| 2C | `ERROR 1644 ... Sender and receiver accounts must be different` |
| 2D | One alert: HIGH_VALUE_TRANSACTION, risk 75.00, severity HIGH, status OPEN |
| 2E | One alert: RAPID_TRANSFERS, risk 60.00, severity MEDIUM, reason "3 transfers from the same account within 5 minutes" (created by the third transfer) |
| 2F | A list of the 6 triggers |
| 4A | Aarav (2 accounts) and Priya, each above 20,000 total |
| 5C | `type: ALL`, `rows` about 100000 (full table scan) |
| 5D | `type: ref`, `key: idx_demo_account`, `rows` about 20 |
| 6 | `REPEATABLE-READ` |

If a number differs slightly, explain the reason instead of editing it (for example, after 2D and 2E the final balances include those transfers).

## Concurrency control

### What the problem is
Two transfers read the same balance at the same time, both think there is enough money, and both write. The account is overspent, or one update overwrites the other (a *lost update*).

### What the project does
`sp_transfer_funds` starts a transaction and reads each account row with `SELECT ... FOR UPDATE`. That takes an exclusive row lock, so a second transfer on the same account **waits** until the first commits or rolls back, and then sees the updated balance. Rows are always locked lowest `account_id` first, so two opposite transfers (A to B and B to A) cannot deadlock. The default isolation level is REPEATABLE READ.

### Automated test (recommended for the demo)
1. Run `05_reset_demo_data.sql`.
2. Safe version:
   ```
   node --env-file=.env.local scripts/concurrency-test.mjs
   ```
   Five simultaneous transfers of 8,000 are requested from an account holding 20,000. Expected: **exactly 2 succeed**, 3 fail with `Insufficient balance (minimum balance rule)`, the sender ends at 4,000, the receiver gains 16,000, and the script prints `PASS`.
3. Run `05_reset_demo_data.sql` again.
4. Broken version, to show what the locks prevent:
   ```
   node --env-file=.env.local scripts/concurrency-test.mjs --naive
   ```
   This version reads the balance without a lock and writes an absolute value. Expected: all 5 "succeed", but only 8,000 is actually deducted, and the script prints `RACE CONDITION ... updates were lost`.
5. Run `05_reset_demo_data.sql` once more to clean up.

The rapid-transfer fraud trigger will also fire during the safe test (3+ transfers from one account within 5 minutes). That is correct behaviour.

### Manual two-window demo (shows the waiting)
Open **two** Command Prompt windows, each with `mysql.exe -u root -p -t financial_fraud_db`. Reset first.

| Step | Window A | Window B |
|---|---|---|
| 1 | `START TRANSACTION;` | |
| 2 | `SELECT balance FROM ACCOUNT WHERE account_id = 3 FOR UPDATE;` (shows 20000.00) | |
| 3 | | `SET @t = NULL; CALL sp_transfer_funds(3, 1, 15000, 'B', @t);` → **it hangs (waiting for A's lock)** |
| 4 | `UPDATE ACCOUNT SET balance = balance - 15000 WHERE account_id = 3; COMMIT;` | B now continues and fails with `Insufficient balance` (only 5000 is left) |
| 5 | `SELECT balance FROM ACCOUNT WHERE account_id = 3;` → 5000.00 | |

Take a screenshot of step 3 (hung prompt) and step 4 (B's error).

## MongoDB demo

1. Run the app and perform some activity (see TEST_CASES.md).
2. Admin → **Activity (MongoDB)**: the table shows `details` objects with different shapes per event; the three cards are aggregation pipelines (`$match`, `$group`, `$sum`, `$avg`, `$addToSet`, `$max`, `$sort`, `$limit`).
3. Validation: `scripts/setup-mongo.mjs` created the `$jsonSchema` validator. Show it in Atlas (Collections → activity_logs → Validation) and try inserting a document with `eventType: "HACK"`; it is rejected.
4. Indexes: Atlas → activity_logs → Indexes shows the four indexes.
5. In Atlas, you can also run this in the aggregation tab to see the same numbers as the admin page:
   ```json
   [
     { "$match": { "eventType": "LOGIN", "outcome": "FAILURE" } },
     { "$group": { "_id": "$ip", "failures": { "$sum": 1 } } },
     { "$sort": { "failures": -1 } }
   ]
   ```

## What to say about each concept (one line each)
* **Transaction / ACID:** the transfer is all-or-nothing; a failure anywhere rolls everything back.
* **Stored procedure:** the money logic runs inside the database, so every client gets the same rules.
* **Triggers:** integrity and fraud checks fire automatically, whichever application inserts the row.
* **Views:** saved joins that give the app and reports a simple, consistent read model.
* **Indexes:** the same query changes from scanning 100,000 rows to reading about 20.
* **Locks:** `FOR UPDATE` makes concurrent transfers take turns; lock order prevents deadlocks.
* **MongoDB:** flexible event documents, schema validation, indexes and aggregations for log analysis; MySQL keeps the money.
