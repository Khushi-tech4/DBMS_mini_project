# Test Cases and Results

**How to use:** run each test, then fill the **Actual result**, **Pass/Fail** and **Screenshot** columns yourselves. Do not write results you did not observe. Save screenshots in `docs/screenshots/` named by test ID (for example `TC-07.png`).

**Before testing:** run `web/scripts/05_reset_demo_data.sql` (this deletes test transactions and restores the four balances). Demo logins: `admin`, `aarav`, `priya`, `rohan` (password `Demo@1234`). Accounts: 1 SAVINGS Aarav 100000, 2 SAVINGS Priya 75000, 3 CURRENT Rohan 20000, 4 CURRENT Aarav 10000.

**Browser-console snippets** (for TC-14 to TC-17): log in, open the page, press F12 → Console, paste, press Enter.

## A. Authentication and authorization

| ID | Test | Steps | Expected result | Actual result | Pass/Fail | Screenshot |
|---|---|---|---|---|---|---|
| TC-01 | Customer login | Log in as `aarav` | Redirected to the customer dashboard showing 2 accounts | |pass | TC-02|
| TC-02 | Admin login | Log in as `admin` | Redirected to the admin dashboard | | | |
| TC-03 | Wrong password | `aarav` with a wrong password | Red message "Invalid username or password"; no session | | |TC-03 |
| TC-04 | Unknown username | `nobody` / any password | Same message as TC-03 (no hint which part was wrong) | | | TC-04|
| TC-05 | SQL injection attempt | Username `' OR '1'='1`, any password | "Invalid username or password" | | | TC-05|
| TC-06 | Repeated failed logins | 3 wrong passwords for `priya` within 10 minutes | Admin → Security events: 3 LOGIN_FAILED plus one HIGH BRUTE_FORCE_SUSPECTED | | | TC-06|
| TC-07 | Password stored hashed | `SELECT username, LEFT(password_hash,7) FROM financial_fraud_db.USER_ACCOUNT;` in mysql | Hashes start with `$2a$` or `$2b$`; no plaintext | +----------+------------+-------------+
| username | hash_start | hash_length |
+----------+------------+-------------+
| admin    | $2b$10$    |          60 |
| aarav    | $2b$10$    |          60 |
| priya    | $2b$10$    |          60 |
| rohan    | $2b$10$    |          60 |
+----------+------------+-------------+ | TC-07|
| TC-08 | Customer cannot open admin page | Logged in as `aarav`, visit `/admin` | Redirected to `/dashboard` | | | TC-08|
| TC-09 | Logged-out access | Log out, visit `/dashboard` | Redirected to `/login` | | |TC-09 |

## B. Financial operations

| ID | Test | Steps | Expected result | Actual result | Pass/Fail | Screenshot |
|---|---|---|---|---|---|---|
| TC-10 | Valid deposit | As `aarav`, deposit 500 into the CURRENT account | Green message; balance 10,500; DEPOSIT row in history | | | TC-10|
| TC-11 | Valid withdrawal | Withdraw 200 from the same account | Balance 10,300 | | | TC-11|
| TC-12 | Valid transfer | `aarav` SAVINGS to `DEMO0000000002`, 5000 | Success with a transaction number; Aarav 95,000; Priya (log in to check) 80,000 | | | TC-12|
| TC-13 | Insufficient balance | Withdraw 50,000 from the CURRENT account (10,300) | Red error "Insufficient balance"; balance unchanged | | | TC-13|
| TC-14 | Transfer from someone else's account | As `priya`, console: `fetch('/api/transfer',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fromAccountId:1,toAccountNumber:'DEMO0000000003',amount:100})}).then(r=>r.json()).then(console.log)` | `{error: "You do not own that account"}` (HTTP 403); no money moves |fetch('/api/transfer',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fromAccountId:1,toAccountNumber:'DEMO0000000003',amount:100})}).then(r=>r.json()).then(console.log) | | TC-14|
| TC-15 | Withdraw from someone else's account | As `priya`, console: same pattern with `/api/withdraw` and body `{accountId:1,amount:100}` | `{error: "Account not found"}` | fetch('/api/withdraw',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({accountId:1,amount:100})}).then(r=>r.json()).then(console.log)| |TC-15 |
| TC-16 | Customer calls an admin API | As `aarav`, console: `fetch('/api/admin/alerts').then(r=>r.status)` | `401` | | |TC-16 |
| TC-17 | Admin calls a customer API | As `admin`, console: `fetch('/api/accounts').then(r=>r.status)` | `401` | | | TC-17|
| TC-18 | Invalid amounts | Transfer `-5`, `0`, `abc`, `10.555`, `2000000` | Each rejected with "Enter a valid amount..."; nothing changes | | | TC-18|
| TC-19 | Transfer to a non-existent account | Receiver `DEMO9999999999` | "Receiver account not found" | | |TC-19 |
| TC-20 | Transfer to the same account | From account 1 to `DEMO0000000001` | Rejected ("Sender and receiver accounts must be different") | | |TC-20|
| TC-21 | Minimum balance rule | `aarav` SAVINGS account (minimum 1,000): note its balance, then transfer (balance − 500) so less than 1,000 would remain | Rejected: "Insufficient balance (minimum balance rule)"; balance unchanged | | |TC-21 |
| TC-22 | Failed transfer rolls back | SQL demo 1D (`04_advanced_demos.sql`) | Balances unchanged after each failed `CALL` |cd /d E:\FinancialFraudProject\web
"E:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p -t --force
tee rollback_output.txt
source scripts/04_advanced_demos.sql
notee
exit
 |ERROR 1644 (45000): Insufficient balance (minimum balance rule)
ERROR 1644 (45000): Sender and receiver accounts must be different
ERROR 1644 (45000): Amount must be greater than zero

Balances must be unchanged by the three failed calls
| account_id | balance   |
|          1 | 147500.00 |
|          2 |  27500.00 |
|          3 |  20000.00 |
|          4 |      0.00 |

transactions_recorded_so_far = 2 | TC-22|
| TC-23 | History accuracy | Compare the dashboard history with `SELECT * FROM transaction_history_view;` | Same transfers, amounts and references | | |TC-23 |

## C. Fraud detection and admin

| ID | Test | Steps | Expected result | Actual result | Pass/Fail | Screenshot |
|---|---|---|---|---|---|---|
| TC-24 | High-value alert | `aarav` SAVINGS to `DEMO0000000002`, 60,000 | Admin → Fraud alerts: new OPEN HIGH_VALUE_TRANSACTION alert | | | TC-24|
| TC-25 | Threshold boundary | Transfer exactly 50,000 | **No** alert (rule is "greater than" 50,000) | | |TC-25 |
| TC-26 | Rapid-transfer alert | `rohan` makes 3 transfers of 100 to `DEMO0000000004` within 5 minutes | RAPID_TRANSFERS alert, MEDIUM, after the third | | |TC-26 |
| TC-27 | Review an alert | Admin changes an alert to INVESTIGATING, then RESOLVED | Status updates; `resolved_at` set on RESOLVED; two AUDIT_LOG rows with old and new status | | | TC-27|
| TC-28 | Filter alerts | Filter by OPEN, then INVESTIGATING | Table shows only matching rows | | |TC-28 |
| TC-29 | Empty result | Filter security events by CRITICAL | "No events found." (no crash) | | |TC-29|
| TC-30 | Deposits are not fraud-checked | Deposit 600,000 | No fraud alert. **Known limitation** (deposits are not rows in TRANSACTION). | | | TC-30|

## D. Concurrency and integrity

| ID | Test | Steps | Expected result | Actual result | Pass/Fail | Screenshot |
|---|---|---|---|---|---|---|
| TC-31 | Concurrent transfers (safe) | Reset; `node --env-file=.env.local scripts/concurrency-test.mjs` | Exactly 2 of 5 succeed; sender 4,000; receiver +16,000; `PASS` | | | TC-31|
| TC-32 | Race condition without locks | Reset; same command with `--naive` | All 5 "succeed" but only 8,000 deducted; `RACE CONDITION` message | | |TC-32 |
| TC-33 | Two-window lock wait | Manual demo in ADVANCED_CONCEPTS.md | Window B waits, then fails with insufficient balance | | | TC-33|
| TC-34 | CHECK constraint | SQL demo 1B | `chk_account_balance` violation error; rollback restores balances | | | TC-34|
| TC-35 | Foreign key | `DELETE FROM CUSTOMER WHERE customer_id = 2;` in mysql | Error 1451: cannot delete (child rows exist; RESTRICT) | | |TC-35 |
| TC-36 | Unique constraint | Insert a CUSTOMER with an existing email | Error 1062 duplicate entry | | | TC-36|

## E. MongoDB

| ID | Test | Steps | Expected result | Actual result | Pass/Fail | Screenshot |
|---|---|---|---|---|---|---|
| TC-37 | Connection | Open `/api/health/mongo` | `{"mongodb":"connected","activityLogs":N}` | | | TC-37|
| TC-38 | Activity is logged | Do a login, transfer, deposit | New documents in Atlas and in the admin "Activity (MongoDB)" tab | | | TC-38|
| TC-39 | Failed attempts are logged | Wrong password; failing transfer | Documents with `outcome: "FAILURE"` and a `reason` in `details` | | | TC-39|
| TC-40 | Aggregations | Admin Activity tab | Cards for events by type, failed logins by IP, transfers per customer match Atlas aggregation results | | | TC-40|
| TC-41 | Schema validation | In Atlas or Compass insert `{eventType:"HACK", outcome:"SUCCESS", createdAt:new Date()}` | Rejected: document failed validation | | | TC-41|
| TC-42 | **MongoDB outage does not break money** | Stop the server; in `.env.local` put a wrong password in `MONGODB_URI`; `npm run dev`; make a transfer | Transfer **succeeds**; terminal prints "MongoDB activity log failed"; admin Activity tab shows "MongoDB is unavailable right now". Restore the correct URI afterwards. | | | TC-42|

## F. Search, DDL and DML

| ID | Test | Steps | Expected result | Actual result | Pass/Fail | Screenshot |
|---|---|---|---|---|---|---|
| TC-43 | History filter by type | As `aarav` with several transactions, choose DEPOSIT in the history filter | Only DEPOSIT rows are shown | | |TC-43 |
| TC-44 | History search | Type part of an account number (for example `0004`) or a reference | Only matching rows are shown; a nonsense term shows "No matching transactions." | | | TC-44|
| TC-45 | DDL: CREATE / ALTER / DROP | `web/scripts/06_ddl_dml_demos.sql` (instructions inside) | `DESCRIBE` shows the table changing after each ALTER; the table is dropped at the end | | | TC-45|
| TC-46 | DML: INSERT / UPDATE / DELETE | Same script | Rows inserted, updated and deleted as the printed results show; deleting a customer that has accounts fails with error 1451 | | | TC-46|



-
