// web/lib/db.js
// One shared MySQL connection pool. Only server code (API routes) imports this.
import mysql from "mysql2/promise";

const globalForDb = globalThis;

export const pool =
  globalForDb._mysqlPool ??
  mysql.createPool({
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    decimalNumbers: true, // return DECIMAL columns as numbers
  });

// Reuse the pool during development hot-reloads
if (process.env.NODE_ENV !== "production") globalForDb._mysqlPool = pool;
