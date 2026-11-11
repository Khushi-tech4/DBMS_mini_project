/* ============================================================
   05_reset_demo_data.sql
   Run as root. RESTORES THE DEMO TO ITS STARTING STATE.

   !! This DELETES all transactions, transfers, deposits, withdrawals,
   !! fraud alerts, audit log rows and security events in MySQL, and
   !! resets the four demo account balances to the seed values.
   !! It KEEPS customers, accounts, users, roles and fraud rules.
   !! It does NOT touch MongoDB.

   Run:  "E:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p -t < scripts\05_reset_demo_data.sql
   ============================================================ */

USE financial_fraud_db;

DROP TABLE IF EXISTS demo_index_test;

/* Delete children before parents (foreign key order) */
DELETE FROM FRAUD_ALERT;
DELETE FROM TRANSFER;
DELETE FROM TRANSACTION_CHANNEL;
DELETE FROM `TRANSACTION`;
DELETE FROM DEPOSIT;
DELETE FROM WITHDRAWAL;
DELETE FROM AUDIT_LOG;
DELETE FROM SECURITY_EVENT_DETAIL;
DELETE FROM SECURITY_EVENT;

ALTER TABLE FRAUD_ALERT         AUTO_INCREMENT = 1;
ALTER TABLE TRANSFER            AUTO_INCREMENT = 1;
ALTER TABLE `TRANSACTION`       AUTO_INCREMENT = 1;
ALTER TABLE DEPOSIT             AUTO_INCREMENT = 1;
ALTER TABLE WITHDRAWAL          AUTO_INCREMENT = 1;
ALTER TABLE AUDIT_LOG           AUTO_INCREMENT = 1;
ALTER TABLE SECURITY_EVENT      AUTO_INCREMENT = 1;

UPDATE ACCOUNT SET balance = 100000.00 WHERE account_id = 1;
UPDATE ACCOUNT SET balance =  75000.00 WHERE account_id = 2;
UPDATE ACCOUNT SET balance =  20000.00 WHERE account_id = 3;
UPDATE ACCOUNT SET balance =  10000.00 WHERE account_id = 4;

SELECT account_id, account_number, balance FROM ACCOUNT ORDER BY account_id;
SELECT (SELECT COUNT(*) FROM `TRANSACTION`) AS transactions,
       (SELECT COUNT(*) FROM FRAUD_ALERT)   AS alerts,
       (SELECT COUNT(*) FROM DEPOSIT)       AS deposits,
       (SELECT COUNT(*) FROM WITHDRAWAL)    AS withdrawals;
