# Architecture

## System diagram

```mermaid
flowchart LR
    B["Browser<br/>(login, customer dashboard, admin dashboard)"]

    subgraph N["Next.js application (server side)"]
        direction TB
        A["API routes<br/>/api/auth, /api/accounts, /api/deposit,<br/>/api/withdraw, /api/transfer, /api/history,<br/>/api/admin/*"]
        S["Session + role checks<br/>(signed HTTP-only cookie)"]
        V["Input validation<br/>(lib/validate.js)"]
        A --- S
        A --- V
    end

    M[("MySQL 8.0 (local)<br/>financial_fraud_db<br/>accounts, balances, transactions,<br/>fraud alerts, audit log<br/>procedures, triggers, views")]
    G[("MongoDB Atlas<br/>fraud_activity.activity_logs<br/>semi-structured activity events")]

    B -->|"HTTPS fetch (JSON)"| A
    A -->|"mysql2 pool<br/>parameterised queries<br/>ACID transactions"| M
    A -.->|"mongodb driver<br/>fire-and-forget log writes"| G
```

The browser never talks to a database. Only the server-side API routes hold database credentials (in `.env.local`).

## Who stores what

| Data | Database | Why |
|---|---|---|
| Customers, accounts, balances, transactions, deposits, withdrawals | MySQL | Money needs ACID transactions, foreign keys and CHECK constraints |
| Fraud rules and alerts, audit log, curated security events | MySQL | Formal records linked to transactions and customers; reviewed with joins |
| Activity log (every login, transfer, deposit, withdrawal, admin review) | MongoDB | High-volume, append-only, and each event type carries different fields; analysed with aggregation pipelines |

The account balance exists **only** in MySQL.

## Transfer flow

```mermaid
sequenceDiagram
    participant U as Customer (browser)
    participant API as POST /api/transfer
    participant SQL as MySQL
    participant MG as MongoDB

    U->>API: fromAccountId, toAccountNumber, amount
    API->>API: check session, validate input
    API->>SQL: confirm sender account belongs to this customer
    API->>SQL: CALL sp_transfer_funds(...)
    Note over SQL: START TRANSACTION<br/>lock both rows (FOR UPDATE, id order)<br/>check status + minimum balance<br/>update both balances<br/>insert TRANSACTION / TRANSFER / CHANNEL<br/>trigger may insert FRAUD_ALERT<br/>COMMIT (or ROLLBACK on any error)
    SQL-->>API: transaction id, or an error message
    API-->>MG: insert activity log (not awaited)
    API-->>U: success or error message
```

## Failure handling between the two databases
MySQL and MongoDB cannot share one transaction. So the money operation is committed in MySQL first, and the MongoDB log write happens afterwards without blocking or failing the request. If MongoDB is unavailable, the transfer still succeeds, the error is printed in the server console, and only that activity-log row is lost. Critical records that must not be lost (fraud alerts, audit log, security events) are written to MySQL.

## Security measures
* bcrypt password hashing; plaintext passwords are never stored.
* Signed (HMAC-SHA256), HTTP-only session cookie that expires after 2 hours; the role is read from the signed cookie, so the browser cannot change it.
* Role checks on the server for every API route (`CUSTOMER` routes and `ADMIN` routes).
* Ownership checks: a customer can only use their own accounts.
* Parameterised queries everywhere (prevents SQL injection); inputs validated before use.
* The web app connects with a limited MySQL user (`fraud_app`: SELECT, INSERT, UPDATE, DELETE, EXECUTE only), never root.
* Credentials and the session secret live in `.env.local`, which is git-ignored.
* Same error message for wrong username and wrong password; failed logins are logged.

## Technology
Next.js (App Router) + React + Tailwind CSS, Node.js, `mysql2`, `bcryptjs`, `mongodb` driver, MySQL 8.0.33, MongoDB Atlas.
