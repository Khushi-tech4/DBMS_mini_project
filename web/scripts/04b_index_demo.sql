/* ============================================================
   04b_index_demo.sql  (section 5 of 04_advanced_demos.sql on its own)
   Safe to run any time: it only creates and drops a throw-away table.

   Run from E:\FinancialFraudProject\web:
     "E:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p -t --force
   then at the mysql> prompt:
     tee index_output.txt
     source scripts/04b_index_demo.sql
     notee
     exit
   The insert of 100,000 rows can take a few seconds. WAIT for the
   prompt to come back; do not press Ctrl+C.
   ============================================================ */

USE financial_fraud_db;

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


