/* ============================================================
   03_fraud_rules.sql
   Run ONCE, as root, after 02_seed_and_procedures.sql.
   Adds a second fraud rule (rapid repeated transfers) as a trigger.
   ============================================================ */

USE financial_fraud_db;

INSERT IGNORE INTO FRAUD_RULE (rule_id, rule_name, rule_type, rule_description, threshold_value, is_active) VALUES
(2, 'Rapid Repeated Transfers', 'RAPID_TRANSFERS',
    'Flags 3 or more transfers from one account within 5 minutes', 3, TRUE),
(3, 'Repeated Failed Logins', 'FAILED_LOGINS',
    'Flags 3 or more failed logins within 10 minutes (handled by the web app)', 3, TRUE);

DROP TRIGGER IF EXISTS trg_rapid_transactions;

DELIMITER $$

CREATE TRIGGER trg_rapid_transactions
AFTER INSERT ON `TRANSACTION`
FOR EACH ROW
FOLLOWS trg_high_value_transaction
BEGIN
    DECLARE v_rule      INT DEFAULT NULL;
    DECLARE v_threshold DECIMAL(15,2) DEFAULT 3;
    DECLARE v_count     INT DEFAULT 0;
    DECLARE v_customer  INT DEFAULT NULL;

    SELECT rule_id, threshold_value
      INTO v_rule, v_threshold
      FROM FRAUD_RULE
     WHERE rule_type = 'RAPID_TRANSFERS' AND is_active = TRUE
     ORDER BY rule_id
     LIMIT 1;

    IF v_rule IS NOT NULL THEN

        SELECT COUNT(*) INTO v_count
          FROM `TRANSACTION`
         WHERE sender_account_id = NEW.sender_account_id
           AND transaction_date >= NOW() - INTERVAL 5 MINUTE;

        IF v_count >= COALESCE(v_threshold, 3) THEN

            SELECT customer_id INTO v_customer
              FROM ACCOUNT WHERE account_id = NEW.sender_account_id;

            INSERT INTO FRAUD_ALERT
                (transaction_id, customer_id, rule_id, alert_type, fraud_type,
                 risk_score, severity, alert_status, reason)
            VALUES
                (NEW.transaction_id, v_customer, v_rule, 'AUTOMATIC', 'RAPID_TRANSFERS',
                 60.00, 'MEDIUM', 'OPEN',
                 CONCAT(v_count, ' transfers from the same account within 5 minutes'));

        END IF;
    END IF;
END$$

DELIMITER ;

SHOW TRIGGERS LIKE 'TRANSACTION';
