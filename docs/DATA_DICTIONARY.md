# Data Dictionary

Database: `financial_fraud_db` (MySQL 8.0). 16 tables, 3 views, 6 triggers, 1 stored procedure, 20 secondary indexes.
Source of truth: `01_database.sql` (plus `02_seed_and_procedures.sql` and `web/scripts/03_fraud_rules.sql`).

Legend: **PK** primary key, **FK** foreign key, **UQ** unique, **NN** NOT NULL. FK actions are written as `ON UPDATE / ON DELETE`.

## 1. CUSTOMER
A bank customer (also used for the bank staff record, customer_id 1).

| Column | Type | Null | Default | Constraints / notes |
|---|---|---|---|---|
| customer_id | INT AUTO_INCREMENT | NN | | PK |
| first_name | VARCHAR(50) | NN | | |
| last_name | VARCHAR(50) | NN | | |
| email | VARCHAR(100) | NN | | UQ |
| phone | VARCHAR(20) | | | UQ |
| date_of_birth | DATE | | | |
| address | VARCHAR(255) | | | |
| status | VARCHAR(20) | NN | 'ACTIVE' | CHECK in (ACTIVE, INACTIVE, BLOCKED) |
| created_at | TIMESTAMP | NN | CURRENT_TIMESTAMP | |

## 2. ACCOUNT_TYPE
| Column | Type | Null | Default | Constraints / notes |
|---|---|---|---|---|
| account_type_id | INT AUTO_INCREMENT | NN | | PK |
| type_name | VARCHAR(50) | NN | | UQ (SAVINGS, CURRENT) |
| minimum_balance | DECIMAL(15,2) | NN | 0 | CHECK >= 0 |
| description | VARCHAR(255) | | | |

## 3. ACCOUNT
| Column | Type | Null | Default | Constraints / notes |
|---|---|---|---|---|
| account_id | INT AUTO_INCREMENT | NN | | PK |
| customer_id | INT | NN | | FK → CUSTOMER (CASCADE / RESTRICT) |
| account_type_id | INT | NN | | FK → ACCOUNT_TYPE (CASCADE / RESTRICT) |
| account_number | VARCHAR(30) | NN | | UQ |
| balance | DECIMAL(15,2) | NN | 0 | CHECK >= 0 (balance can never go negative) |
| currency | VARCHAR(10) | NN | 'INR' | |
| opened_date | DATE | NN | | |
| status | VARCHAR(20) | NN | 'ACTIVE' | CHECK in (ACTIVE, INACTIVE, BLOCKED, CLOSED) |

## 4. ROLE
| Column | Type | Null | Default | Constraints / notes |
|---|---|---|---|---|
| role_id | INT AUTO_INCREMENT | NN | | PK |
| role_name | VARCHAR(50) | NN | | UQ (ADMIN, CUSTOMER) |
| description | VARCHAR(255) | | | |

## 5. USER_ACCOUNT
Login credentials. Passwords are stored only as bcrypt hashes.

| Column | Type | Null | Default | Constraints / notes |
|---|---|---|---|---|
| user_id | INT AUTO_INCREMENT | NN | | PK |
| customer_id | INT | NN | | FK → CUSTOMER (CASCADE / RESTRICT) |
| role_id | INT | NN | | FK → ROLE (CASCADE / RESTRICT) |
| username | VARCHAR(50) | NN | | UQ |
| password_hash | VARCHAR(255) | NN | | bcrypt hash, never plaintext |
| is_active | BOOLEAN | NN | TRUE | |
| last_login | TIMESTAMP | | NULL | set by the login API |

## 6. TRANSACTION_TYPE
| Column | Type | Null | Default | Constraints / notes |
|---|---|---|---|---|
| transaction_type_id | INT AUTO_INCREMENT | NN | | PK |
| type_name | VARCHAR(50) | NN | | UQ (TRANSFER, DEPOSIT, WITHDRAWAL) |
| description | VARCHAR(255) | | | |

## 7. TRANSACTION
An account-to-account money movement (transfers).

| Column | Type | Null | Default | Constraints / notes |
|---|---|---|---|---|
| transaction_id | BIGINT AUTO_INCREMENT | NN | | PK |
| sender_account_id | INT | NN | | FK → ACCOUNT (CASCADE / RESTRICT) |
| receiver_account_id | INT | NN | | FK → ACCOUNT (CASCADE / RESTRICT) |
| transaction_type_id | INT | NN | | FK → TRANSACTION_TYPE (CASCADE / RESTRICT) |
| amount | DECIMAL(15,2) | NN | | CHECK > 0 |
| transaction_status | VARCHAR(20) | NN | 'PENDING' | CHECK in (PENDING, COMPLETED, FAILED, CANCELLED, REVERSED) |
| reference_number | VARCHAR(50) | NN | | UQ (`TXN-` + UUID) |
| description | VARCHAR(255) | | | |
| transaction_date | TIMESTAMP | NN | CURRENT_TIMESTAMP | |

## 8. TRANSFER
Extra detail row for a transaction that is a transfer.

| Column | Type | Null | Default | Constraints / notes |
|---|---|---|---|---|
| transfer_id | BIGINT AUTO_INCREMENT | NN | | PK |
| transaction_id | BIGINT | NN | | FK → TRANSACTION (CASCADE / CASCADE) |
| amount | DECIMAL(15,2) | NN | | CHECK > 0 |
| transfer_date | TIMESTAMP | NN | CURRENT_TIMESTAMP | |
| status | VARCHAR(20) | NN | 'PENDING' | CHECK in (PENDING, COMPLETED, FAILED, CANCELLED) |

## 9. TRANSACTION_CHANNEL (multivalued attribute table)
| Column | Type | Null | Default | Constraints / notes |
|---|---|---|---|---|
| transaction_id | BIGINT | NN | | PK (composite), FK → TRANSACTION (CASCADE / CASCADE) |
| channel | VARCHAR(50) | NN | | PK (composite), e.g. WEB |

## 10. DEPOSIT
| Column | Type | Null | Default | Constraints / notes |
|---|---|---|---|---|
| deposit_id | BIGINT AUTO_INCREMENT | NN | | PK |
| account_id | INT | NN | | FK → ACCOUNT (CASCADE / RESTRICT) |
| amount | DECIMAL(15,2) | NN | | CHECK > 0 |
| deposit_method | VARCHAR(50) | | | |
| status | VARCHAR(20) | NN | 'COMPLETED' | CHECK in (PENDING, COMPLETED, FAILED, CANCELLED) |
| deposit_date | TIMESTAMP | NN | CURRENT_TIMESTAMP | |

## 11. WITHDRAWAL
| Column | Type | Null | Default | Constraints / notes |
|---|---|---|---|---|
| withdrawal_id | BIGINT AUTO_INCREMENT | NN | | PK |
| account_id | INT | NN | | FK → ACCOUNT (CASCADE / RESTRICT) |
| amount | DECIMAL(15,2) | NN | | CHECK > 0 |
| withdrawal_method | VARCHAR(50) | | | |
| status | VARCHAR(20) | NN | 'COMPLETED' | CHECK in (PENDING, COMPLETED, FAILED, CANCELLED) |
| withdrawal_date | TIMESTAMP | NN | CURRENT_TIMESTAMP | |

## 12. FRAUD_RULE
| Column | Type | Null | Default | Constraints / notes |
|---|---|---|---|---|
| rule_id | INT AUTO_INCREMENT | NN | | PK |
| rule_name | VARCHAR(100) | NN | | UQ |
| rule_type | VARCHAR(50) | NN | | HIGH_VALUE, RAPID_TRANSFERS, FAILED_LOGINS |
| rule_description | TEXT | | | |
| threshold_value | DECIMAL(15,2) | | | CHECK NULL or >= 0 |
| is_active | BOOLEAN | NN | TRUE | |
| created_at | TIMESTAMP | NN | CURRENT_TIMESTAMP | |

## 13. FRAUD_ALERT
| Column | Type | Null | Default | Constraints / notes |
|---|---|---|---|---|
| alert_id | BIGINT AUTO_INCREMENT | NN | | PK |
| transaction_id | BIGINT | NN | | FK → TRANSACTION (CASCADE / CASCADE) |
| customer_id | INT | NN | | FK → CUSTOMER (CASCADE / RESTRICT) |
| rule_id | INT | NN | | FK → FRAUD_RULE (CASCADE / RESTRICT) |
| alert_type | VARCHAR(50) | | | AUTOMATIC |
| fraud_type | VARCHAR(50) | | | HIGH_VALUE_TRANSACTION, RAPID_TRANSFERS |
| risk_score | DECIMAL(5,2) | | | CHECK NULL or 0..100 |
| severity | VARCHAR(20) | | | CHECK NULL or in (LOW, MEDIUM, HIGH, CRITICAL) |
| alert_status | VARCHAR(20) | NN | 'OPEN' | CHECK in (OPEN, INVESTIGATING, CONFIRMED, FALSE_POSITIVE, RESOLVED) |
| reason | TEXT | | | |
| detected_at | TIMESTAMP | NN | CURRENT_TIMESTAMP | |
| resolved_at | TIMESTAMP | | NULL | set when an admin closes the alert |

## 14. AUDIT_LOG
| Column | Type | Null | Default | Constraints / notes |
|---|---|---|---|---|
| audit_id | BIGINT AUTO_INCREMENT | NN | | PK |
| user_id | INT | NN | | FK → USER_ACCOUNT (CASCADE / RESTRICT) |
| action | VARCHAR(50) | NN | | e.g. ALERT_STATUS_CHANGE |
| table_name | VARCHAR(100) | | | |
| record_id | BIGINT | | | |
| old_value | TEXT | | | |
| new_value | TEXT | | | |
| ip_address | VARCHAR(45) | | | |
| action_timestamp | TIMESTAMP | NN | CURRENT_TIMESTAMP | |

## 15. SECURITY_EVENT
| Column | Type | Null | Default | Constraints / notes |
|---|---|---|---|---|
| event_id | BIGINT AUTO_INCREMENT | NN | | PK |
| customer_id | INT | NN | | FK → CUSTOMER (CASCADE / RESTRICT) |
| event_type | VARCHAR(50) | NN | | LOGIN_SUCCESS, LOGIN_FAILED, BRUTE_FORCE_SUSPECTED |
| device_id | VARCHAR(100) | | | not populated by the app yet |
| ip_address | VARCHAR(45) | | | |
| location | VARCHAR(100) | | | not populated by the app yet |
| event_details | TEXT | | | |
| severity | VARCHAR(20) | | | CHECK NULL or in (LOW, MEDIUM, HIGH, CRITICAL) |
| event_time | TIMESTAMP | NN | CURRENT_TIMESTAMP | |

## 16. SECURITY_EVENT_DETAIL (multivalued attribute table)
| Column | Type | Null | Default | Constraints / notes |
|---|---|---|---|---|
| event_id | BIGINT | NN | | PK (composite), FK → SECURITY_EVENT (CASCADE / CASCADE) |
| event_detail | VARCHAR(255) | NN | | PK (composite) |

## Relationships (from the foreign keys)

| Parent (1) | Child (N) | Via |
|---|---|---|
| CUSTOMER | ACCOUNT | ACCOUNT.customer_id |
| ACCOUNT_TYPE | ACCOUNT | ACCOUNT.account_type_id |
| CUSTOMER | USER_ACCOUNT | USER_ACCOUNT.customer_id |
| ROLE | USER_ACCOUNT | USER_ACCOUNT.role_id |
| ACCOUNT | TRANSACTION (as sender) | sender_account_id |
| ACCOUNT | TRANSACTION (as receiver) | receiver_account_id |
| TRANSACTION_TYPE | TRANSACTION | transaction_type_id |
| TRANSACTION | TRANSFER | TRANSFER.transaction_id (1 : 0..1 intended) |
| TRANSACTION | TRANSACTION_CHANNEL | transaction_id |
| ACCOUNT | DEPOSIT | DEPOSIT.account_id |
| ACCOUNT | WITHDRAWAL | WITHDRAWAL.account_id |
| TRANSACTION | FRAUD_ALERT | FRAUD_ALERT.transaction_id |
| CUSTOMER | FRAUD_ALERT | FRAUD_ALERT.customer_id |
| FRAUD_RULE | FRAUD_ALERT | FRAUD_ALERT.rule_id |
| USER_ACCOUNT | AUDIT_LOG | AUDIT_LOG.user_id |
| CUSTOMER | SECURITY_EVENT | SECURITY_EVENT.customer_id |
| SECURITY_EVENT | SECURITY_EVENT_DETAIL | event_id |

## Views
| View | Purpose | Joins |
|---|---|---|
| customer_account_view | Each customer with their accounts, type and balance | CUSTOMER ⨝ ACCOUNT ⨝ ACCOUNT_TYPE |
| transaction_history_view | Transactions with readable sender/receiver account numbers and type | TRANSACTION ⨝ ACCOUNT (x2) ⨝ TRANSACTION_TYPE |
| fraud_monitoring_view | Alerts with customer name and rule name | FRAUD_ALERT ⨝ CUSTOMER ⨝ FRAUD_RULE |

## Triggers
| Trigger | Table / timing | Purpose |
|---|---|---|
| trg_validate_transaction_accounts | TRANSACTION, BEFORE INSERT | Rejects sender = receiver |
| trg_before_withdrawal | WITHDRAWAL, BEFORE INSERT | Locks the account row; rejects amount > balance |
| trg_after_deposit | DEPOSIT, AFTER INSERT | Adds the amount to the balance when status is COMPLETED |
| trg_after_withdrawal | WITHDRAWAL, AFTER INSERT | Subtracts the amount from the balance when status is COMPLETED |
| trg_high_value_transaction | TRANSACTION, AFTER INSERT | Creates a HIGH alert when amount > the HIGH_VALUE rule threshold (50,000) |
| trg_rapid_transactions | TRANSACTION, AFTER INSERT | Creates a MEDIUM alert on 3+ transfers from one account within 5 minutes |

## Stored procedure
`sp_transfer_funds(sender_id, receiver_id, amount, description, OUT transaction_id)`: validates input, locks both account rows in id order (`FOR UPDATE`), checks status and the minimum-balance rule, updates both balances, inserts TRANSACTION, TRANSFER and TRANSACTION_CHANNEL rows, then COMMITs. Any SQL error triggers ROLLBACK through an EXIT handler.

## Indexes (besides primary keys and unique constraints)
idx_customer_name, idx_account_customer, idx_account_type, idx_user_customer, idx_transaction_sender, idx_transaction_receiver, idx_transaction_date, idx_transaction_status, idx_deposit_account, idx_deposit_date, idx_withdrawal_account, idx_withdrawal_date, idx_alert_transaction, idx_alert_customer, idx_alert_status, idx_alert_detected, idx_security_customer, idx_security_event_time, idx_audit_user, idx_audit_time.

## MongoDB (database `fraud_activity`)

Collection `activity_logs`: one document per application event.

| Field | Type | Required | Notes |
|---|---|---|---|
| _id | ObjectId | auto | |
| eventType | string | yes | LOGIN, TRANSFER, DEPOSIT, WITHDRAWAL, ALERT_REVIEW |
| outcome | string | yes | SUCCESS, FAILURE |
| createdAt | date | yes | |
| username | string / null | no | |
| userId | number | no | MySQL USER_ACCOUNT.user_id |
| customerId | number / null | no | MySQL CUSTOMER.customer_id |
| ip | string | no | |
| userAgent | string | no | |
| details | object | no | **shape differs per event**: LOGIN has `reason` or `role`; TRANSFER has `fromAccountId`, `toAccountNumber`, `amount`, `transactionId` or `reason`; ALERT_REVIEW has `alertId`, `oldStatus`, `newStatus` |

Validation: `$jsonSchema` validator (strict, error). Indexes: `{createdAt:-1}`, `{eventType:1, outcome:1, createdAt:-1}`, `{ip:1, createdAt:-1}`, `{customerId:1, createdAt:-1}`.
