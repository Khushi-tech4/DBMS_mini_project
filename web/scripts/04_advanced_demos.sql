/* ============================================================
   04_advanced_demos.sql
   Advanced DBMS concept demonstrations (run as root).

   HOW TO RUN (from E:\FinancialFraudProject\web):
     1. First run 05_reset_demo_data.sql so balances are the seed values.
     2. Open the client:
          "E:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p -t --force
     3. At the mysql> prompt type these three lines:
          tee demo_output.txt
          source scripts/04_advanced_demos.sql
          notee
        "--force" lets the script continue past the errors that are
        EXPECTED in some demos (marked "EXPECTED ERROR" below).
        demo_output.txt is your evidence file for the report.
   ============================================================ */

USE financial_fraud_db;

SELECT '===== 0. STARTING BALANCES =====' AS section;
SELECT account_id, account_number, balance FROM ACCOUNT ORDER BY account_id;


/* ============================================================
   1. TRANSACTIONS, ACID, ROLLBACK
   ============================================================ */

SELECT '===== 1A. ATOMICITY: debit + credit, then ROLLBACK =====' AS section;
START TRANSACTION;
UPDATE ACCOUNT SET balance = balance - 1000 WHERE account_id = 1;
UPDATE ACCOUNT SET balance = balance + 1000 WHERE account_id = 2;
SELECT 'Inside the transaction: changes visible only to this session' AS note;
SELECT account_id, balance FROM ACCOUNT WHERE account_id IN (1, 2) ORDER BY account_id;
ROLLBACK;
SELECT 'After ROLLBACK: balances are back to the starting values' AS note;
SELECT account_id, balance FROM ACCOUNT WHERE account_id IN (1, 2) ORDER BY account_id;

SELECT '===== 1B. CONSISTENCY: CHECK constraint stops a bad update =====' AS section;
START TRANSACTION;
UPDATE ACCOUNT SET balance = balance - 1000 WHERE account_id = 1;
/* EXPECTED ERROR: Check constraint 'chk_account_balance' is violated */
UPDATE ACCOUNT SET balance = balance - 99999999 WHERE account_id = 3;
ROLLBACK;
SELECT 'After ROLLBACK: the first (valid) update was undone too' AS note;
SELECT account_id, balance FROM ACCOUNT WHERE account_id IN (1, 3) ORDER BY account_id;

SELECT '===== 1C. STORED PROCEDURE sp_transfer_funds: success =====' AS section;
SET @tid = NULL;
CALL sp_transfer_funds(1, 2, 2500.00, 'Demo: successful transfer', @tid);
SELECT @tid AS new_transaction_id;
SELECT account_id, balance FROM ACCOUNT WHERE account_id IN (1, 2) ORDER BY account_id;
SELECT 'Expected: account 1 = start - 2500, account 2 = start + 2500' AS note;

SELECT '===== 1D. STORED PROCEDURE: failures roll back, nothing changes =====' AS section;
/* EXPECTED ERROR: Insufficient balance (minimum balance rule) */
CALL sp_transfer_funds(3, 1, 999999.00, 'Demo: insufficient balance', @tid);
/* EXPECTED ERROR: Sender and receiver accounts must be different */
CALL sp_transfer_funds(1, 1, 100.00, 'Demo: same account', @tid);
/* EXPECTED ERROR: Amount must be greater than zero */
CALL sp_transfer_funds(1, 2, -50.00, 'Demo: negative amount', @tid);
SELECT 'Balances must be unchanged by the three failed calls' AS note;
SELECT account_id, balance FROM ACCOUNT ORDER BY account_id;
SELECT COUNT(*) AS transactions_recorded_so_far FROM `TRANSACTION`;


/* ============================================================
   2. TRIGGERS
   ============================================================ */

SELECT '===== 2A. trg_before_withdrawal: insufficient funds blocked =====' AS section;
/* EXPECTED ERROR: Insufficient account balance */
INSERT INTO WITHDRAWAL (account_id, amount, withdrawal_method) VALUES (3, 50000.00, 'DEMO');

SELECT '===== 2B. trg_after_deposit / trg_after_withdrawal: balance maintained automatically =====' AS section;
SELECT balance AS balance_before FROM ACCOUNT WHERE account_id = 4;
INSERT INTO DEPOSIT (account_id, amount, deposit_method) VALUES (4, 500.00, 'DEMO');
SELECT balance AS after_deposit_of_500 FROM ACCOUNT WHERE account_id = 4;
INSERT INTO WITHDRAWAL (account_id, amount, withdrawal_method) VALUES (4, 200.00, 'DEMO');
SELECT balance AS after_withdrawal_of_200 FROM ACCOUNT WHERE account_id = 4;

SELECT '===== 2C. trg_validate_transaction_accounts: same account blocked =====' AS section;
/* EXPECTED ERROR: Sender and receiver accounts must be different */
INSERT INTO `TRANSACTION`
    (sender_account_id, receiver_account_id, transaction_type_id, amount, transaction_status, reference_number)
VALUES (1, 1, 1, 100.00, 'COMPLETED', 'TXN-DEMO-SAME');

SELECT '===== 2D. trg_high_value_transaction: transfer above 50,000 raises a fraud alert =====' AS section;
CALL sp_transfer_funds(1, 2, 60000.00, 'Demo: high value transfer', @tid);
SELECT alert_id, customer_name, fraud_type, risk_score, severity, alert_status, reason
  FROM fraud_monitoring_view
 WHERE transaction_id = @tid;

SELECT '===== 2E. trg_rapid_transactions: 3 transfers in 5 minutes raise an alert =====' AS section;
CALL sp_transfer_funds(3, 4, 100.00, 'Demo: rapid 1', @tid);
CALL sp_transfer_funds(3, 4, 100.00, 'Demo: rapid 2', @tid);
CALL sp_transfer_funds(3, 4, 100.00, 'Demo: rapid 3', @tid);
SELECT alert_id, customer_name, fraud_type, risk_score, severity, reason
  FROM fraud_monitoring_view
 WHERE fraud_type = 'RAPID_TRANSFERS'
 ORDER BY alert_id DESC;

SELECT '===== 2F. All triggers in the database =====' AS section;
SELECT TRIGGER_NAME, EVENT_MANIPULATION AS fires_on, EVENT_OBJECT_TABLE AS on_table, ACTION_TIMING AS timing
  FROM information_schema.TRIGGERS
 WHERE TRIGGER_SCHEMA = 'financial_fraud_db'
 ORDER BY EVENT_OBJECT_TABLE, ACTION_TIMING;


/* ============================================================
   3. VIEWS
   ============================================================ */

SELECT '===== 3A. customer_account_view =====' AS section;
SELECT * FROM customer_account_view ORDER BY customer_id, account_id;

SELECT '===== 3B. transaction_history_view =====' AS section;
SELECT transaction_id, reference_number, sender_account_number, receiver_account_number,
       transaction_type, amount, transaction_status
  FROM transaction_history_view
 ORDER BY transaction_id;

SELECT '===== 3C. fraud_monitoring_view =====' AS section;
SELECT alert_id, customer_name, fraud_type, severity, alert_status, rule_name
  FROM fraud_monitoring_view
 ORDER BY alert_id;


/* ============================================================
   4. JOINS, AGGREGATES, GROUP BY / HAVING, SUBQUERIES
   ============================================================ */

SELECT '===== 4A. JOIN + GROUP BY + HAVING: customers holding more than 20,000 in total =====' AS section;
SELECT customer_name, COUNT(*) AS accounts, SUM(balance) AS total_balance
  FROM customer_account_view
 GROUP BY customer_id, customer_name
HAVING SUM(balance) > 20000
 ORDER BY total_balance DESC;

SELECT '===== 4B. Aggregate functions: transaction statistics by status =====' AS section;
SELECT transaction_status, COUNT(*) AS txns, SUM(amount) AS total, AVG(amount) AS average, MAX(amount) AS largest
  FROM `TRANSACTION`
 GROUP BY transaction_status;

SELECT '===== 4C. Subquery (IN): customers who have at least one fraud alert =====' AS section;
SELECT customer_id, CONCAT(first_name, ' ', last_name) AS customer_name
  FROM CUSTOMER
 WHERE customer_id IN (SELECT customer_id FROM FRAUD_ALERT);

SELECT '===== 4D. Correlated subquery: accounts above the average of their account type =====' AS section;
SELECT a.account_number, a.balance, t.type_name
  FROM ACCOUNT a
  JOIN ACCOUNT_TYPE t ON t.account_type_id = a.account_type_id
 WHERE a.balance > (SELECT AVG(x.balance) FROM ACCOUNT x WHERE x.account_type_id = a.account_type_id);

SELECT '===== 4E. Multi-table JOIN: who sent money to whom =====' AS section;
SELECT t.reference_number,
       CONCAT(cs.first_name, ' ', cs.last_name) AS sender,
       CONCAT(cr.first_name, ' ', cr.last_name) AS receiver,
       t.amount
  FROM `TRANSACTION` t
  JOIN ACCOUNT  s  ON s.account_id  = t.sender_account_id
  JOIN CUSTOMER cs ON cs.customer_id = s.customer_id
  JOIN ACCOUNT  r  ON r.account_id  = t.receiver_account_id
  JOIN CUSTOMER cr ON cr.customer_id = r.customer_id
 ORDER BY t.transaction_id;


/* ============================================================
   5. INDEXES: EXPLAIN before and after
   Uses a throw-away table with 100,000 rows (dropped at the end).
   ============================================================ */

SELECT '===== 5A. Existing indexes on TRANSACTION =====' AS section;
SHOW INDEX FROM `TRANSACTION`;

SELECT '===== 5B. Build a 100,000 row test table =====' AS section;
DROP TABLE IF EXISTS demo_index_test;
CREATE TABLE demo_index_test (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    account_id INT NOT NULL,
    amount     DECIMAL(15,2) NOT NULL,
    created_at DATETIME NOT NULL
);

INSERT INTO demo_index_test (account_id, amount, created_at)
SELECT (a.d + b.d * 10 + c.d * 100 + e.d * 1000 + f.d * 10000) % 5000 + 1,
       ROUND(RAND() * 10000, 2),
       NOW() - INTERVAL (a.d + b.d * 10) DAY
  FROM (SELECT 0 d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
        UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) a,
       (SELECT 0 d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
        UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) b,
       (SELECT 0 d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
        UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) c,
       (SELECT 0 d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
        UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) e,
       (SELECT 0 d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
        UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) f;

SELECT COUNT(*) AS rows_in_test_table FROM demo_index_test;

SELECT '===== 5C. BEFORE the index: expect type=ALL (full table scan), rows ~100000 =====' AS section;
EXPLAIN SELECT COUNT(*), SUM(amount) FROM demo_index_test WHERE account_id = 1234;
EXPLAIN ANALYZE SELECT COUNT(*), SUM(amount) FROM demo_index_test WHERE account_id = 1234;

CREATE INDEX idx_demo_account ON demo_index_test (account_id);

SELECT '===== 5D. AFTER the index: expect type=ref, key=idx_demo_account, rows ~20 =====' AS section;
EXPLAIN SELECT COUNT(*), SUM(amount) FROM demo_index_test WHERE account_id = 1234;
EXPLAIN ANALYZE SELECT COUNT(*), SUM(amount) FROM demo_index_test WHERE account_id = 1234;

DROP TABLE demo_index_test;


/* ============================================================
   6. CONCURRENCY: isolation level (the locking demo is in
      docs/ADVANCED_CONCEPTS.md and scripts/concurrency-test.mjs)
   ============================================================ */

SELECT '===== 6. Isolation level and locking approach =====' AS section;
SELECT @@transaction_isolation AS isolation_level;
SELECT 'sp_transfer_funds uses SELECT ... FOR UPDATE row locks, taken in account_id order (deadlock avoidance)' AS note;

SELECT '===== FINAL BALANCES (run 05_reset_demo_data.sql to restore) =====' AS section;
SELECT account_id, account_number, balance FROM ACCOUNT ORDER BY account_id;
