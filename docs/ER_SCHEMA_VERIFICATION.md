# ER Diagram and Relational Schema vs the SQL

I compared the new ER diagram and relational schema against the `database.sql` provided. **The SQL has not been changed.** This report distinguishes items that match the SQL from details that should not be claimed as matching unless they are visible and correct in the final diagram.

## A. Main schema checks

| # | Where | What the SQL defines | Correct representation in the new diagram/schema | Status |
|---|---|---|---|---|
| 1 | `CUSTOMER` | `customer_id` PK; `email` and `phone` are UNIQUE; `status` and `created_at` are NOT NULL | Show `CUSTOMER` with its attributes; underline only `customer_id` as the primary key. Unique constraints may be noted separately. | Check visual rendering |
| 2 | `ACCOUNT_TYPE` | `account_type_id` PK; `type_name` UNIQUE; `minimum_balance` NOT NULL | Show `ACCOUNT_TYPE` as a strong entity with the correct attributes and key. | Check visual rendering |
| 3 | `ACCOUNT` | `account_id` PK; `customer_id` FK; `account_type_id` FK; `account_number` UNIQUE | Show `account_type_id INT` referencing `ACCOUNT_TYPE`; show separate relationships from `CUSTOMER` to `ACCOUNT` and from `ACCOUNT_TYPE` to `ACCOUNT`. | SQL definition confirmed |
| 4 | `ROLE` | `role_id` PK; `role_name` UNIQUE | Draw `ROLE` as a strong entity, not a weak entity. | SQL definition confirmed |
| 5 | `USER_ACCOUNT` | `user_id` PK; `customer_id` FK; `role_id` FK; `username` UNIQUE | Show relationships `CUSTOMER`–`USER_ACCOUNT` and `ROLE`–`USER_ACCOUNT`. | SQL definition confirmed |
| 6 | `TRANSACTION` | `transaction_id` PK; sender and receiver account FKs; `transaction_type_id` FK; `reference_number` UNIQUE | Show separate `SENDS` and `RECEIVES` relationships between `ACCOUNT` and `TRANSACTION`, plus the transaction-type relationship. | SQL definition confirmed |
| 7 | `TRANSACTION_CHANNEL` | Composite PK (`transaction_id`, `channel`); `transaction_id` FK | Show only `transaction_id` and `channel` as attributes, both forming the composite key; do not add `channel_id` or `description`. | SQL definition confirmed |
| 8 | `TRANSFER` | `transfer_id` PK; `transaction_id` FK but not UNIQUE | Show the foreign-key relationship to `TRANSACTION`. Do not claim SQL enforces one-to-one unless a UNIQUE constraint is added. | SQL definition confirmed |
| 9 | `DEPOSIT` and `WITHDRAWAL` | Each has its own PK and an FK to `ACCOUNT` | Show each as a separate entity linked to `ACCOUNT`. They are not rows in `TRANSACTION`. | SQL definition confirmed |
| 10 | `FRAUD_RULE` and `FRAUD_ALERT` | `FRAUD_ALERT` references `TRANSACTION`, `CUSTOMER`, and `FRAUD_RULE` | Show all three relationships from `FRAUD_ALERT` to the referenced entities. | SQL definition confirmed |
| 11 | `SECURITY_EVENT` | Includes `device_id` and `event_details`; references `CUSTOMER` | Use the SQL attribute names; do not use `description` as a `SECURITY_EVENT` column. | SQL definition confirmed |
| 12 | `SECURITY_EVENT_DETAIL` | Composite PK (`event_id`, `event_detail`); `event_id` FK | Show `event_id` and `event_detail` as the composite key; do not add `event_detail_id`. | SQL definition confirmed |
| 13 | `AUDIT_LOG` | `audit_id` PK; `user_id` FK to `USER_ACCOUNT` | Show the relationship between `USER_ACCOUNT` and `AUDIT_LOG`. | SQL definition confirmed |
| 14 | Overall schema | 16 tables are defined; three views are also defined | Include the 16 tables in the ER model. Views (`customer_account_view`, `transaction_history_view`, `fraud_monitoring_view`) are derived query objects, not additional base-table entities. | SQL definition confirmed |

## B. Relationship and attribute rules

- `CUSTOMER` has one-to-many relationships with `ACCOUNT` and `USER_ACCOUNT`, because each of those rows contains a non-null `customer_id` foreign key.
- `ACCOUNT_TYPE` has a one-to-many relationship with `ACCOUNT`, because `ACCOUNT.account_type_id` is a non-null foreign key.
- `ROLE` has a one-to-many relationship with `USER_ACCOUNT`, because `USER_ACCOUNT.role_id` is a non-null foreign key.
- `ACCOUNT` participates in two distinct `TRANSACTION` roles: sender and receiver. These should be shown as separate relationships.
- `TRANSACTION_CHANNEL` and `SECURITY_EVENT_DETAIL` each use composite primary keys that include their parent foreign key.
- Underline primary-key attributes only. Foreign keys are not automatically primary keys and should not be underlined unless they are also part of a declared primary key.
- `balance` and `risk_score` are stored SQL columns. Do not mark them as derived attributes merely because they can be calculated or maintained by application logic/triggers.
- SQL foreign keys support the referenced-side cardinality and mandatory reference from each child row; they do not alone establish total participation of every parent row.

## C. Other SQL details to document

- `TRANSFER.transaction_id` is not `UNIQUE`; the SQL therefore permits multiple `TRANSFER` rows to reference one `TRANSACTION`. Adding `UNIQUE` is optional and would change the SQL.
- `TRANSFER.amount` repeats the amount stored in `TRANSACTION`; this is a design redundancy, not a mismatch between the diagram and the current SQL.
- `SECURITY_EVENT` has an `event_details` text column, and `SECURITY_EVENT_DETAIL` is a separate table. Both exist in the SQL.
- Deposits and withdrawals are not stored in `TRANSACTION`, so transaction-based fraud logic does not automatically cover them.
- The SQL includes CHECK constraints, referential actions, indexes, triggers, and a stored procedure. These implementation details need not all be drawn as Chen ER elements, but can be described in the project report.
- The supplied SQL contains triggers for same-account validation, withdrawal balance checks, deposit/withdrawal balance maintenance, and high-value transaction alerts. Do not claim a rapid-transfer trigger is present in this SQL file unless it is defined in another included script.

## D. Final checklist

- [ ] Confirm the exported diagram visibly includes all 16 base tables and the correct attributes.
- [ ] Confirm every foreign-key relationship and sender/receiver role is shown correctly.
- [ ] Confirm composite primary keys for `TRANSACTION_CHANNEL` and `SECURITY_EVENT_DETAIL`.
- [ ] Confirm `ROLE` is a strong entity and only primary-key attributes are underlined.
- [ ] Confirm cardinalities and participation marks are supported by the SQL or clearly identified as conceptual assumptions.
- [ ] Leave the optional `UNIQUE` constraint on `TRANSFER.transaction_id` undecided unless the team explicitly approves changing the SQL.
- [ ] Keep `database.sql` unchanged for this diagram comparison.
