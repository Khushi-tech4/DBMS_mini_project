/* ============================================================
   DISTRIBUTED FINANCIAL TRANSACTION & FRAUD MANAGEMENT SYSTEM
   DBMS MINI PROJECT
   MySQL 8.0.33
   ============================================================ */


/* ============================================================
   1. DATABASE
   ============================================================ */

DROP DATABASE IF EXISTS financial_fraud_db;

CREATE DATABASE financial_fraud_db;

USE financial_fraud_db;


/* ============================================================
   2. CUSTOMER
   ============================================================ */

CREATE TABLE CUSTOMER (
    customer_id INT AUTO_INCREMENT,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    date_of_birth DATE,
    address VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_customer
        PRIMARY KEY (customer_id),

    CONSTRAINT uq_customer_email
        UNIQUE (email),

    CONSTRAINT uq_customer_phone
        UNIQUE (phone),

    CONSTRAINT chk_customer_status
        CHECK (status IN ('ACTIVE', 'INACTIVE', 'BLOCKED'))
);


/* ============================================================
   3. ACCOUNT TYPE
   ============================================================ */

CREATE TABLE ACCOUNT_TYPE (
    account_type_id INT AUTO_INCREMENT,
    type_name VARCHAR(50) NOT NULL,
    minimum_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
    description VARCHAR(255),

    CONSTRAINT pk_account_type
        PRIMARY KEY (account_type_id),

    CONSTRAINT uq_account_type_name
        UNIQUE (type_name),

    CONSTRAINT chk_minimum_balance
        CHECK (minimum_balance >= 0)
);


/* ============================================================
   4. ACCOUNT
   ============================================================ */

CREATE TABLE ACCOUNT (
    account_id INT AUTO_INCREMENT,
    customer_id INT NOT NULL,
    account_type_id INT NOT NULL,
    account_number VARCHAR(30) NOT NULL,
    balance DECIMAL(15,2) NOT NULL DEFAULT 0,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    opened_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT pk_account
        PRIMARY KEY (account_id),

    CONSTRAINT uq_account_number
        UNIQUE (account_number),

    CONSTRAINT fk_account_customer
        FOREIGN KEY (customer_id)
        REFERENCES CUSTOMER(customer_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_account_type
        FOREIGN KEY (account_type_id)
        REFERENCES ACCOUNT_TYPE(account_type_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT chk_account_balance
        CHECK (balance >= 0),

    CONSTRAINT chk_account_status
        CHECK (
            status IN ('ACTIVE', 'INACTIVE', 'BLOCKED', 'CLOSED')
        )
);


/* ============================================================
   5. ROLE
   ============================================================ */

CREATE TABLE `ROLE` (
    role_id INT AUTO_INCREMENT,
    role_name VARCHAR(50) NOT NULL,
    description VARCHAR(255),

    CONSTRAINT pk_role
        PRIMARY KEY (role_id),

    CONSTRAINT uq_role_name
        UNIQUE (role_name)
);


/* ============================================================
   6. USER ACCOUNT
   ============================================================ */

CREATE TABLE USER_ACCOUNT (
    user_id INT AUTO_INCREMENT,
    customer_id INT NOT NULL,
    role_id INT NOT NULL,
    username VARCHAR(50) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login TIMESTAMP NULL,

    CONSTRAINT pk_user_account
        PRIMARY KEY (user_id),

    CONSTRAINT uq_username
        UNIQUE (username),

    CONSTRAINT fk_user_customer
        FOREIGN KEY (customer_id)
        REFERENCES CUSTOMER(customer_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_user_role
        FOREIGN KEY (role_id)
        REFERENCES `ROLE`(role_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);


/* ============================================================
   7. TRANSACTION TYPE
   ============================================================ */

CREATE TABLE TRANSACTION_TYPE (
    transaction_type_id INT AUTO_INCREMENT,
    type_name VARCHAR(50) NOT NULL,
    description VARCHAR(255),

    CONSTRAINT pk_transaction_type
        PRIMARY KEY (transaction_type_id),

    CONSTRAINT uq_transaction_type_name
        UNIQUE (type_name)
);


/* ============================================================
   8. TRANSACTION
   ============================================================ */

CREATE TABLE `TRANSACTION` (
    transaction_id BIGINT AUTO_INCREMENT,
    sender_account_id INT NOT NULL,
    receiver_account_id INT NOT NULL,
    transaction_type_id INT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    transaction_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    reference_number VARCHAR(50) NOT NULL,
    description VARCHAR(255),
    transaction_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_transaction
        PRIMARY KEY (transaction_id),

    CONSTRAINT uq_transaction_reference
        UNIQUE (reference_number),

    CONSTRAINT fk_transaction_sender
        FOREIGN KEY (sender_account_id)
        REFERENCES ACCOUNT(account_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_transaction_receiver
        FOREIGN KEY (receiver_account_id)
        REFERENCES ACCOUNT(account_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_transaction_type
        FOREIGN KEY (transaction_type_id)
        REFERENCES TRANSACTION_TYPE(transaction_type_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT chk_transaction_amount
        CHECK (amount > 0),

    CONSTRAINT chk_transaction_status
        CHECK (
            transaction_status IN (
                'PENDING',
                'COMPLETED',
                'FAILED',
                'CANCELLED',
                'REVERSED'
            )
        )
);


/* ============================================================
   9. TRANSFER
   ============================================================ */

CREATE TABLE TRANSFER (
    transfer_id BIGINT AUTO_INCREMENT,
    transaction_id BIGINT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    transfer_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',

    CONSTRAINT pk_transfer
        PRIMARY KEY (transfer_id),

    CONSTRAINT fk_transfer_transaction
        FOREIGN KEY (transaction_id)
        REFERENCES `TRANSACTION`(transaction_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT chk_transfer_amount
        CHECK (amount > 0),

    CONSTRAINT chk_transfer_status
        CHECK (
            status IN (
                'PENDING',
                'COMPLETED',
                'FAILED',
                'CANCELLED'
            )
        )
);


/* ============================================================
   10. TRANSACTION CHANNEL
   Multivalued attribute
   ============================================================ */

CREATE TABLE TRANSACTION_CHANNEL (
    transaction_id BIGINT NOT NULL,
    channel VARCHAR(50) NOT NULL,

    CONSTRAINT pk_transaction_channel
        PRIMARY KEY (transaction_id, channel),

    CONSTRAINT fk_channel_transaction
        FOREIGN KEY (transaction_id)
        REFERENCES `TRANSACTION`(transaction_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);


/* ============================================================
   11. DEPOSIT
   ============================================================ */

CREATE TABLE DEPOSIT (
    deposit_id BIGINT AUTO_INCREMENT,
    account_id INT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    deposit_method VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
    deposit_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_deposit
        PRIMARY KEY (deposit_id),

    CONSTRAINT fk_deposit_account
        FOREIGN KEY (account_id)
        REFERENCES ACCOUNT(account_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT chk_deposit_amount
        CHECK (amount > 0),

    CONSTRAINT chk_deposit_status
        CHECK (
            status IN (
                'PENDING',
                'COMPLETED',
                'FAILED',
                'CANCELLED'
            )
        )
);


/* ============================================================
   12. WITHDRAWAL
   ============================================================ */

CREATE TABLE WITHDRAWAL (
    withdrawal_id BIGINT AUTO_INCREMENT,
    account_id INT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    withdrawal_method VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
    withdrawal_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_withdrawal
        PRIMARY KEY (withdrawal_id),

    CONSTRAINT fk_withdrawal_account
        FOREIGN KEY (account_id)
        REFERENCES ACCOUNT(account_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT chk_withdrawal_amount
        CHECK (amount > 0),

    CONSTRAINT chk_withdrawal_status
        CHECK (
            status IN (
                'PENDING',
                'COMPLETED',
                'FAILED',
                'CANCELLED'
            )
        )
);


/* ============================================================
   13. FRAUD RULE
   ============================================================ */

CREATE TABLE FRAUD_RULE (
    rule_id INT AUTO_INCREMENT,
    rule_name VARCHAR(100) NOT NULL,
    rule_type VARCHAR(50) NOT NULL,
    rule_description TEXT,
    threshold_value DECIMAL(15,2),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_fraud_rule
        PRIMARY KEY (rule_id),

    CONSTRAINT uq_fraud_rule_name
        UNIQUE (rule_name),

    CONSTRAINT chk_threshold
        CHECK (
            threshold_value IS NULL
            OR threshold_value >= 0
        )
);


/* ============================================================
   14. FRAUD ALERT
   ============================================================ */

CREATE TABLE FRAUD_ALERT (
    alert_id BIGINT AUTO_INCREMENT,
    transaction_id BIGINT NOT NULL,
    customer_id INT NOT NULL,
    rule_id INT NOT NULL,
    alert_type VARCHAR(50),
    fraud_type VARCHAR(50),
    risk_score DECIMAL(5,2),
    severity VARCHAR(20),
    alert_status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    reason TEXT,
    detected_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,

    CONSTRAINT pk_fraud_alert
        PRIMARY KEY (alert_id),

    CONSTRAINT fk_alert_transaction
        FOREIGN KEY (transaction_id)
        REFERENCES `TRANSACTION`(transaction_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_alert_customer
        FOREIGN KEY (customer_id)
        REFERENCES CUSTOMER(customer_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_alert_rule
        FOREIGN KEY (rule_id)
        REFERENCES FRAUD_RULE(rule_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT chk_risk_score
        CHECK (
            risk_score IS NULL
            OR (
                risk_score >= 0
                AND risk_score <= 100
            )
        ),

    CONSTRAINT chk_alert_severity
        CHECK (
            severity IS NULL
            OR severity IN (
                'LOW',
                'MEDIUM',
                'HIGH',
                'CRITICAL'
            )
        ),

    CONSTRAINT chk_alert_status
        CHECK (
            alert_status IN (
                'OPEN',
                'INVESTIGATING',
                'CONFIRMED',
                'FALSE_POSITIVE',
                'RESOLVED'
            )
        )
);


/* ============================================================
   15. AUDIT LOG
   ============================================================ */

CREATE TABLE AUDIT_LOG (
    audit_id BIGINT AUTO_INCREMENT,
    user_id INT NOT NULL,
    action VARCHAR(50) NOT NULL,
    table_name VARCHAR(100),
    record_id BIGINT,
    old_value TEXT,
    new_value TEXT,
    ip_address VARCHAR(45),
    action_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_audit_log
        PRIMARY KEY (audit_id),

    CONSTRAINT fk_audit_user
        FOREIGN KEY (user_id)
        REFERENCES USER_ACCOUNT(user_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);


/* ============================================================
   16. SECURITY EVENT
   ============================================================ */

CREATE TABLE SECURITY_EVENT (
    event_id BIGINT AUTO_INCREMENT,
    customer_id INT NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    device_id VARCHAR(100),
    ip_address VARCHAR(45),
    location VARCHAR(100),
    event_details TEXT,
    severity VARCHAR(20),
    event_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_security_event
        PRIMARY KEY (event_id),

    CONSTRAINT fk_security_customer
        FOREIGN KEY (customer_id)
        REFERENCES CUSTOMER(customer_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT chk_security_severity
        CHECK (
            severity IS NULL
            OR severity IN (
                'LOW',
                'MEDIUM',
                'HIGH',
                'CRITICAL'
            )
        )
);


/* ============================================================
   17. SECURITY EVENT DETAIL
   Multivalued attribute
   ============================================================ */

CREATE TABLE SECURITY_EVENT_DETAIL (
    event_id BIGINT NOT NULL,
    event_detail VARCHAR(255) NOT NULL,

    CONSTRAINT pk_security_event_detail
        PRIMARY KEY (event_id, event_detail),

    CONSTRAINT fk_security_event_detail
        FOREIGN KEY (event_id)
        REFERENCES SECURITY_EVENT(event_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);


/* ============================================================
   18. INDEXES
   ============================================================ */

CREATE INDEX idx_customer_name
ON CUSTOMER(last_name, first_name);

CREATE INDEX idx_account_customer
ON ACCOUNT(customer_id);

CREATE INDEX idx_account_type
ON ACCOUNT(account_type_id);

CREATE INDEX idx_user_customer
ON USER_ACCOUNT(customer_id);

CREATE INDEX idx_transaction_sender
ON `TRANSACTION`(sender_account_id);

CREATE INDEX idx_transaction_receiver
ON `TRANSACTION`(receiver_account_id);

CREATE INDEX idx_transaction_date
ON `TRANSACTION`(transaction_date);

CREATE INDEX idx_transaction_status
ON `TRANSACTION`(transaction_status);

CREATE INDEX idx_deposit_account
ON DEPOSIT(account_id);

CREATE INDEX idx_deposit_date
ON DEPOSIT(deposit_date);

CREATE INDEX idx_withdrawal_account
ON WITHDRAWAL(account_id);

CREATE INDEX idx_withdrawal_date
ON WITHDRAWAL(withdrawal_date);

CREATE INDEX idx_alert_transaction
ON FRAUD_ALERT(transaction_id);

CREATE INDEX idx_alert_customer
ON FRAUD_ALERT(customer_id);

CREATE INDEX idx_alert_status
ON FRAUD_ALERT(alert_status);

CREATE INDEX idx_alert_detected
ON FRAUD_ALERT(detected_at);

CREATE INDEX idx_security_customer
ON SECURITY_EVENT(customer_id);

CREATE INDEX idx_security_event_time
ON SECURITY_EVENT(event_time);

CREATE INDEX idx_audit_user
ON AUDIT_LOG(user_id);

CREATE INDEX idx_audit_time
ON AUDIT_LOG(action_timestamp);


/* ============================================================
   19. TRIGGER
   Prevent sender and receiver from being same account
   ============================================================ */

DELIMITER $$

CREATE TRIGGER trg_validate_transaction_accounts
BEFORE INSERT ON `TRANSACTION`
FOR EACH ROW
BEGIN

    IF NEW.sender_account_id = NEW.receiver_account_id THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
        'Sender and receiver accounts must be different';

    END IF;

END$$

DELIMITER ;


/* ============================================================
   20. TRIGGER
   Prevent withdrawal when balance is insufficient
   ============================================================ */

DELIMITER $$

CREATE TRIGGER trg_before_withdrawal
BEFORE INSERT ON WITHDRAWAL
FOR EACH ROW
BEGIN

    DECLARE current_balance DECIMAL(15,2);

    SELECT balance
    INTO current_balance
    FROM ACCOUNT
    WHERE account_id = NEW.account_id
    FOR UPDATE;

    IF NEW.amount > current_balance THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
        'Insufficient account balance';

    END IF;

END$$

DELIMITER ;


/* ============================================================
   21. TRIGGER
   Update balance after successful deposit
   ============================================================ */

DELIMITER $$

CREATE TRIGGER trg_after_deposit
AFTER INSERT ON DEPOSIT
FOR EACH ROW
BEGIN

    IF NEW.status = 'COMPLETED' THEN

        UPDATE ACCOUNT
        SET balance = balance + NEW.amount
        WHERE account_id = NEW.account_id;

    END IF;

END$$

DELIMITER ;


/* ============================================================
   22. TRIGGER
   Update balance after successful withdrawal
   ============================================================ */

DELIMITER $$

CREATE TRIGGER trg_after_withdrawal
AFTER INSERT ON WITHDRAWAL
FOR EACH ROW
BEGIN

    IF NEW.status = 'COMPLETED' THEN

        UPDATE ACCOUNT
        SET balance = balance - NEW.amount
        WHERE account_id = NEW.account_id;

    END IF;

END$$

DELIMITER ;


/* ============================================================
   23. TRIGGER
   High-value transaction fraud detection
   ============================================================ */

DELIMITER $$

CREATE TRIGGER trg_high_value_transaction
AFTER INSERT ON `TRANSACTION`
FOR EACH ROW
BEGIN

    DECLARE high_value_rule INT DEFAULT NULL;
    DECLARE customer_of_sender INT DEFAULT NULL;
    DECLARE fraud_threshold DECIMAL(15,2) DEFAULT 100000;

    SELECT rule_id, threshold_value
    INTO high_value_rule, fraud_threshold
    FROM FRAUD_RULE
    WHERE rule_type = 'HIGH_VALUE'
      AND is_active = TRUE
    ORDER BY rule_id
    LIMIT 1;

    IF high_value_rule IS NOT NULL THEN

        SELECT customer_id
        INTO customer_of_sender
        FROM ACCOUNT
        WHERE account_id = NEW.sender_account_id;

        IF NEW.amount > COALESCE(fraud_threshold, 100000) THEN

            INSERT INTO FRAUD_ALERT
            (
                transaction_id,
                customer_id,
                rule_id,
                alert_type,
                fraud_type,
                risk_score,
                severity,
                alert_status,
                reason
            )
            VALUES
            (
                NEW.transaction_id,
                customer_of_sender,
                high_value_rule,
                'AUTOMATIC',
                'HIGH_VALUE_TRANSACTION',
                75.00,
                'HIGH',
                'OPEN',
                'Transaction exceeds configured fraud threshold'
            );

        END IF;

    END IF;

END$$

DELIMITER ;


/* ============================================================
   24. VIEWS
   ============================================================ */

CREATE OR REPLACE VIEW customer_account_view AS
SELECT
    c.customer_id,
    CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
    c.email,
    a.account_id,
    a.account_number,
    at.type_name AS account_type,
    a.balance,
    a.currency,
    a.status AS account_status
FROM CUSTOMER c
JOIN ACCOUNT a
    ON c.customer_id = a.customer_id
JOIN ACCOUNT_TYPE at
    ON a.account_type_id = at.account_type_id;


/* ============================================================
   25. TRANSACTION HISTORY VIEW
   ============================================================ */

CREATE OR REPLACE VIEW transaction_history_view AS
SELECT
    t.transaction_id,
    t.reference_number,

    t.sender_account_id,
    sender.account_number AS sender_account_number,

    t.receiver_account_id,
    receiver.account_number AS receiver_account_number,

    tt.type_name AS transaction_type,

    t.amount,
    t.transaction_status,
    t.transaction_date

FROM `TRANSACTION` t

JOIN ACCOUNT sender
    ON t.sender_account_id = sender.account_id

JOIN ACCOUNT receiver
    ON t.receiver_account_id = receiver.account_id

JOIN TRANSACTION_TYPE tt
    ON t.transaction_type_id = tt.transaction_type_id;


/* ============================================================
   26. FRAUD MONITORING VIEW
   ============================================================ */

CREATE OR REPLACE VIEW fraud_monitoring_view AS
SELECT
    fa.alert_id,
    fa.transaction_id,
    fa.customer_id,

    CONCAT(
        c.first_name,
        ' ',
        c.last_name
    ) AS customer_name,

    fa.fraud_type,
    fa.alert_type,
    fa.risk_score,
    fa.severity,
    fa.alert_status,
    fa.reason,

    fr.rule_name,

    fa.detected_at

FROM FRAUD_ALERT fa

JOIN CUSTOMER c
    ON fa.customer_id = c.customer_id

JOIN FRAUD_RULE fr
    ON fa.rule_id = fr.rule_id;


/* ============================================================
   27. VERIFY TABLES
   ============================================================ */

SHOW TABLES;


/* ============================================================
   END OF DDL
   ============================================================ */