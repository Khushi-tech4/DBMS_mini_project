/* ============================================================
   06_ddl_dml_demos.sql
   DDL (CREATE / ALTER / DROP) and DML (INSERT / UPDATE / DELETE)
   demonstrations. Uses a throw-away table plus transactions that
   are rolled back, so your real data is NOT changed.
   Exception: section 3 inserts and then deletes one temporary
   customer (id 900); nothing remains afterwards.

   Run from E:\FinancialFraudProject\web:
     "E:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p -t --force
   then at the mysql> prompt:
     tee ddl_dml_output.txt
     source scripts/06_ddl_dml_demos.sql
     notee
     exit
   ============================================================ */

USE financial_fraud_db;

/* ============================================================
   1. DDL: CREATE, ALTER, DROP (on a throw-away table)
   ============================================================ */

SELECT '===== 1A. CREATE TABLE =====' AS section;
DROP TABLE IF EXISTS demo_ddl;
CREATE TABLE demo_ddl (
    id   INT AUTO_INCREMENT PRIMARY KEY,
    note VARCHAR(50) NOT NULL
);
DESCRIBE demo_ddl;

SELECT '===== 1B. ALTER: add a column and a CHECK constraint =====' AS section;
ALTER TABLE demo_ddl ADD COLUMN amount DECIMAL(15,2) NOT NULL DEFAULT 0;
ALTER TABLE demo_ddl ADD CONSTRAINT chk_demo_amount CHECK (amount >= 0);
DESCRIBE demo_ddl;

SELECT '===== 1C. ALTER: widen a column, add an index, rename a column =====' AS section;
ALTER TABLE demo_ddl MODIFY COLUMN note VARCHAR(100) NOT NULL;
ALTER TABLE demo_ddl ADD INDEX idx_demo_note (note);
ALTER TABLE demo_ddl RENAME COLUMN note TO description;
DESCRIBE demo_ddl;
SHOW INDEX FROM demo_ddl;

SELECT '===== 1D. The new CHECK constraint is enforced =====' AS section;
/* EXPECTED ERROR: Check constraint 'chk_demo_amount' is violated */
INSERT INTO demo_ddl (description, amount) VALUES ('negative amount', -5.00);

SELECT '===== 1E. ALTER: drop the constraint, index and column =====' AS section;
ALTER TABLE demo_ddl DROP CHECK chk_demo_amount;
ALTER TABLE demo_ddl DROP INDEX idx_demo_note;
ALTER TABLE demo_ddl DROP COLUMN amount;
DESCRIBE demo_ddl;


/* ============================================================
   2. DML on the throw-away table: INSERT, UPDATE, DELETE, SELECT
   ============================================================ */

SELECT '===== 2A. INSERT =====' AS section;
INSERT INTO demo_ddl (description) VALUES ('first'), ('second'), ('third');
SELECT * FROM demo_ddl;

SELECT '===== 2B. UPDATE =====' AS section;
UPDATE demo_ddl SET description = 'second (edited)' WHERE id = 2;
SELECT * FROM demo_ddl;

SELECT '===== 2C. DELETE =====' AS section;
DELETE FROM demo_ddl WHERE id = 3;
SELECT * FROM demo_ddl;

SELECT '===== 2D. DROP TABLE =====' AS section;
DROP TABLE demo_ddl;
SELECT COUNT(*) AS demo_ddl_tables_left
  FROM information_schema.TABLES
 WHERE TABLE_SCHEMA = 'financial_fraud_db' AND TABLE_NAME = 'demo_ddl';


/* ============================================================
   3. DML on real tables, kept safe
   ============================================================ */

SELECT '===== 3A. UPDATE on a real table, then ROLLBACK =====' AS section;
START TRANSACTION;
UPDATE CUSTOMER SET address = 'Temporary demo address' WHERE customer_id = 4;
SELECT customer_id, address FROM CUSTOMER WHERE customer_id = 4;
ROLLBACK;
SELECT customer_id, address FROM CUSTOMER WHERE customer_id = 4;

SELECT '===== 3B. INSERT then DELETE one temporary customer =====' AS section;
INSERT INTO CUSTOMER (customer_id, first_name, last_name, email, phone)
VALUES (900, 'Temp', 'User', 'temp900@demo-bank.test', '9000000900');
SELECT customer_id, first_name, last_name, email FROM CUSTOMER WHERE customer_id = 900;
DELETE FROM CUSTOMER WHERE customer_id = 900;
SELECT COUNT(*) AS temp_customers_left FROM CUSTOMER WHERE customer_id = 900;

SELECT '===== 3C. DELETE blocked by a foreign key (ON DELETE RESTRICT) =====' AS section;
START TRANSACTION;
/* EXPECTED ERROR 1451: cannot delete, ACCOUNT rows still reference customer 2 */
DELETE FROM CUSTOMER WHERE customer_id = 2;
ROLLBACK;
SELECT COUNT(*) AS customer_2_still_exists FROM CUSTOMER WHERE customer_id = 2;

SELECT '===== 3D. UNIQUE constraint blocks a duplicate email =====' AS section;
/* EXPECTED ERROR 1062: Duplicate entry for key 'uq_customer_email' */
INSERT INTO CUSTOMER (first_name, last_name, email) VALUES ('Dup', 'Licate', 'aarav@demo-bank.test');

SELECT '===== DONE: no demo tables remain =====' AS section;

/* ------------------------------------------------------------
   OPTIONAL (only if you decide to apply it to the real schema):
   enforce "one TRANSFER row per TRANSACTION" (see docs/ER_SCHEMA_VERIFICATION.md)

   ALTER TABLE TRANSFER
     ADD CONSTRAINT uq_transfer_transaction UNIQUE (transaction_id);
   ------------------------------------------------------------ */
