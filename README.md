# Distributed Financial Transaction & Fraud Management System

PES University, Department of CSE: Database Management Systems, Experiential Learning Level 3 mini project.
An academic demonstration using **simulated funds**. It is not a real banking or payment service.

**Team:** Advitha D Shetty (PES1UG24AM337) and Khushi Gupta (PES1UG24AM912)

## 1. What it does

A banking-style web application that lets customers deposit, withdraw and transfer demo money, and lets administrators review fraud alerts, security events and audit logs.

- **MySQL** is the source of truth for customers, accounts, balances, transactions, fraud rules, fraud alerts, security events and audit logs.
- **MongoDB (Atlas)** stores semi-structured activity logs (`fraud_activity.activity_logs`).
- **Next.js** provides the web pages and the API layer. Only the server talks to the databases.
- MySQL and MongoDB are **not** one shared ACID transaction. MongoDB logging is best-effort: if MongoDB is down, money operations still succeed.

## 2. Advanced database concepts demonstrated

| Concept | Where |
|---|---|
| Transactions (commit / rollback, ACID) | stored procedure `sp_transfer_funds`, `scripts/04_advanced_demos.sql` |
| Stored procedure | `sp_transfer_funds` |
| Triggers (6) | balance maintenance, withdrawal check, same-account check, high-value and rapid-transfer fraud alerts |
| Views (3) | `customer_account_view`, `transaction_history_view`, `fraud_monitoring_view` |
| Indexes (20) | `scripts/04b_index_demo.sql` (EXPLAIN before and after) |
| Concurrency control | row locks (`SELECT ... FOR UPDATE`), `scripts/concurrency-test.mjs` |
| NoSQL aggregation | Activity tab (MongoDB aggregation pipelines) |

## 3. Prerequisites

- Windows, Node.js LTS and npm, Git
- MySQL Server 8.0 and MySQL Workbench or the `mysql` command-line client
- A MongoDB Atlas cluster (free tier is fine) and its connection string
- Internet access during the demo (Atlas)

## 4. Setup

### 4.1 Get the code
```
cd FinancialFraudProject
```

### 4.2 Create the MySQL database
> **Warning:** `01_database.sql` begins with `DROP DATABASE IF EXISTS financial_fraud_db`. Never run it on a database that has data you want to keep.

Run these in order from the project root (adjust the path to your `mysql.exe`):
```
mysql -u root -p < 01_database.sql
mysql -u root -p < 02_seed_and_procedures.sql
mysql -u root -p < web\scripts\03_fraud_rules.sql
```

### 4.3 Create the limited application database user
The app connects as a limited MySQL user (`fraud_app`), not as root.

### 4.4 Configure environment variables
```
cd web
copy .env.local.example .env.local
```
Edit `web\.env.local` and fill in your own values. **Never commit `.env.local`.**

Variables used by the project (confirm against `.env.local.example`):
```
MYSQL_HOST=
MYSQL_PORT=3306
MYSQL_USER=
MYSQL_PASSWORD=
MYSQL_DATABASE=financial_fraud_db
MONGODB_URI=
```

### 4.5 Install, create demo users, prepare MongoDB
```
npm install
node --env-file=.env.local scripts/create-users.mjs
node --env-file=.env.local scripts/setup-mongo.mjs
```
`create-users.mjs` creates the demo logins with bcrypt-hashed passwords. `setup-mongo.mjs` creates the collection with schema validation, indexes and sample documents.
In MongoDB Atlas, add your current IP under **Network Access**.

### 4.6 Run the app
```
npm run dev
```
Open `http://localhost:3000`.

Health checks: `http://localhost:3000/api/health` (MySQL) and `http://localhost:3000/api/health/mongo` (MongoDB).

## 5. Demo logins

Password for all: `Demo@1234` (demo data only).

| Username | Role |
|---|---|
| `admin` | ADMIN |
| `aarav`, `priya`, `rohan` | CUSTOMER |

Demo accounts: 1 SAVINGS Aarav 100000; 2 SAVINGS Priya 75000; 3 CURRENT Rohan 20000; 4 CURRENT Aarav 10000.

## 6. Fraud rules

1. A transfer **greater than 50,000** raises a HIGH_VALUE_TRANSACTION alert (trigger).
2. **3 or more transfers** from one account within 5 minutes raise a RAPID_TRANSFERS alert (trigger).
3. **3 failed logins** within 10 minutes record a BRUTE_FORCE_SUSPECTED security event (application logic).

## 7. Demonstrations and tests

Run from `web\`:
```
mysql -u root -p -t --force
```
then at the `mysql>` prompt: `source scripts/04_advanced_demos.sql` (transactions, constraints, triggers, views, joins, subqueries) or `source scripts/04b_index_demo.sql` (index demo) or `source scripts/06_ddl_dml_demos.sql` (ALTER, DROP, INSERT, UPDATE, DELETE).

Concurrency test:
```
node --env-file=.env.local scripts/concurrency-test.mjs --naive    (no locks: shows the race condition)
node --env-file=.env.local scripts/concurrency-test.mjs            (row locks: PASS)
```

**Reset the demo data before each run:**
```
mysql -u root -p -t < scripts\05_reset_demo_data.sql
```
This clears transactions, alerts, security events and audit rows and restores the four balances. It does not touch MongoDB.
Test cases and results are in `docs\TEST_CASES.md`.

## 8. Project structure
```
FinancialFraudProject/
  01_database.sql, 02_seed_and_procedures.sql
  docs/        report, data dictionary, architecture, test cases
  web/
    app/       pages and API route handlers
    lib/       database and helper code
    scripts/   SQL demos, reset script, user and MongoDB setup, concurrency test
```

## 9. Known limitations

- Deposits and withdrawals are not rows in `TRANSACTION`, so the transfer-based fraud rules do not check them.
- MongoDB logging is best-effort and is not part of the SQL transaction.
- Simulated funds only; no real payment integration.

## 10. Contributions

| Member | Responsibilities |
|---|---|
| Advitha D Shetty (PES1UG24AM337) | |
| Khushi Gupta (PES1UG24AM912) | |
