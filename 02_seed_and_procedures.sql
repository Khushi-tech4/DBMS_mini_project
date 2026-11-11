/* ============================================================
   02_seed_and_procedures.sql
   Run AFTER database.sql. Does NOT drop the database.
   Contains: reference data, demo customers/accounts,
   transfer stored procedure, and a limited app DB user.
   ============================================================ */

USE financial_fraud_db;

/* ---------- Reference data ---------- */

INSERT INTO `ROLE` (role_id, role_name, description) VALUES
(1, 'ADMIN',    'Bank administrator: manages fraud alerts and audit data'),
(2, 'CUSTOMER', 'Bank customer: manages own accounts and transactions');

INSERT INTO ACCOUNT_TYPE (account_type_id, type_name, minimum_balance, description) VALUES
(1, 'SAVINGS', 1000.00, 'Savings account with minimum balance'),
(2, 'CURRENT', 0.00,    'Current account with no minimum balance');

INSERT INTO TRANSACTION_TYPE (transaction_type_id, type_name, description) VALUES
(1, 'TRANSFER',   'Account to account transfer'),
(2, 'DEPOSIT',    'Cash/demo deposit'),
(3, 'WITHDRAWAL', 'Cash/demo withdrawal');

INSERT INTO FRAUD_RULE (rule_id, rule_name, rule_type, rule_description, threshold_value, is_active) VALUES
(1, 'High Value Transfer', 'HIGH_VALUE',
    'Flags any transaction above the threshold amount', 50000.00, TRUE);

/* ---------- Demo customers (id 1 is the bank admin staff record) ---------- */

INSERT INTO CUSTOMER (customer_id, first_name, last_name, email, phone, date_of_birth, address) VALUES
(1, 'Bank',  'Admin',  'admin@demo-bank.test',  '9000000001', '1990-01-01', 'Head Office, Bengaluru'),
(2, 'Aarav', 'Sharma', 'aarav@demo-bank.test',  '9000000002', '2001-05-14', 'Indiranagar, Bengaluru'),
(3, 'Priya', 'Nair',   'priya@demo-bank.test',  '9000000003', '2000-11-02', 'Koramangala, Bengaluru'),
(4, 'Rohan', 'Verma',  'rohan@demo-bank.test',  '9000000004', '1999-08-21', 'Whitefield, Bengaluru');

/* ---------- Demo accounts (simulated funds only) ---------- */

INSERT INTO ACCOUNT (account_id, customer_id, account_type_id, account_number, balance, currency, opened_date) VALUES
(1, 2, 1, 'DEMO0000000001', 100000.00, 'INR', '2026-01-10'),
(2, 3, 1, 'DEMO0000000002',  75000.00, 'INR', '2026-02-15'),
(3, 4, 2, 'DEMO0000000003',  20000.00, 'INR', '2026-03-20'),
(4, 2, 2, 'DEMO0000000004',  10000.00, 'INR', '2026-04-01');

/* USER_ACCOUNT rows are created by the Node script (bcrypt hashes). */

/* ============================================================
   TRANSFER STORED PROCEDURE
   Atomic: either both balances change and the transaction is
   recorded, or nothing changes (ROLLBACK).
   Locks rows in account_id order to avoid deadlocks.
   ============================================================ */

DROP PROCEDURE IF EXISTS sp_transfer_funds;

DELIMITER $$

CREATE PROCEDURE sp_transfer_funds(
    IN  p_sender_account_id   INT,
    IN  p_receiver_account_id INT,
    IN  p_amount              DECIMAL(15,2),
    IN  p_description         VARCHAR(255),
    OUT p_transaction_id      BIGINT
)
BEGIN
    DECLARE v_balance    DECIMAL(15,2);
    DECLARE v_min        DECIMAL(15,2);
    DECLARE v_s_status   VARCHAR(20);
    DECLARE v_r_status   VARCHAR(20);
    DECLARE v_type_id    INT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    IF p_amount IS NULL OR p_amount <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Amount must be greater than zero';
    END IF;

    IF p_sender_account_id = p_receiver_account_id THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Sender and receiver accounts must be different';
    END IF;

    START TRANSACTION;

    /* Lock both rows in a fixed order (lowest id first) */
    IF p_sender_account_id < p_receiver_account_id THEN
        SELECT balance, status INTO v_balance, v_s_status
        FROM ACCOUNT WHERE account_id = p_sender_account_id FOR UPDATE;
        SELECT status INTO v_r_status
        FROM ACCOUNT WHERE account_id = p_receiver_account_id FOR UPDATE;
    ELSE
        SELECT status INTO v_r_status
        FROM ACCOUNT WHERE account_id = p_receiver_account_id FOR UPDATE;
        SELECT balance, status INTO v_balance, v_s_status
        FROM ACCOUNT WHERE account_id = p_sender_account_id FOR UPDATE;
    END IF;

    IF v_s_status IS NULL OR v_r_status IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Sender or receiver account not found';
    END IF;

    IF v_s_status <> 'ACTIVE' OR v_r_status <> 'ACTIVE' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Both accounts must be ACTIVE';
    END IF;

    SELECT atype.minimum_balance INTO v_min
    FROM ACCOUNT a
    JOIN ACCOUNT_TYPE atype ON a.account_type_id = atype.account_type_id
    WHERE a.account_id = p_sender_account_id;

    IF v_balance - p_amount < v_min THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Insufficient balance (minimum balance rule)';
    END IF;

    SELECT transaction_type_id INTO v_type_id
    FROM TRANSACTION_TYPE WHERE type_name = 'TRANSFER';

    UPDATE ACCOUNT SET balance = balance - p_amount WHERE account_id = p_sender_account_id;
    UPDATE ACCOUNT SET balance = balance + p_amount WHERE account_id = p_receiver_account_id;

    INSERT INTO `TRANSACTION`
        (sender_account_id, receiver_account_id, transaction_type_id,
         amount, transaction_status, reference_number, description)
    VALUES
        (p_sender_account_id, p_receiver_account_id, v_type_id,
         p_amount, 'COMPLETED', CONCAT('TXN-', REPLACE(UUID(), '-', '')), p_description);

    SET p_transaction_id = LAST_INSERT_ID();

    INSERT INTO TRANSFER (transaction_id, amount, status)
    VALUES (p_transaction_id, p_amount, 'COMPLETED');

    INSERT INTO TRANSACTION_CHANNEL (transaction_id, channel)
    VALUES (p_transaction_id, 'WEB');

    COMMIT;
END$$

DELIMITER ;

/* ============================================================
   Limited database user for the web app (do NOT use root in the app)
   CHANGE THE PASSWORD below, then use the same one in .env.local
   ============================================================ */

CREATE USER IF NOT EXISTS 'fraud_app'@'localhost' IDENTIFIED BY 'ChangeMe_App#2026';
GRANT SELECT, INSERT, UPDATE, DELETE, EXECUTE ON financial_fraud_db.* TO 'fraud_app'@'localhost';
FLUSH PRIVILEGES;

/* ---------- Quick checks ---------- */
SELECT * FROM customer_account_view;
