
import "dotenv/config"; 
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database connection pool
export const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  // Double-check your .env: usually this variable is DB_PASSWORD, not DB_PASS
  password: process.env.DB_PASS || "", 
  database: process.env.DB_NAME || "evangadi_forum",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});


const ensureParams = (params) => {
  if (params === undefined || params === null) {
    throw new Error("SQL parameters are required");
  }
  const isArray = Array.isArray(params);
  const isObject = !isArray && typeof params === "object";
  if (!isArray && !isObject) {
    throw new Error("SQL parameters must be an array or object");
  }
};

export const safeExecute = async (sql, params) => {
  if (typeof sql !== "string" || sql.trim().length === 0) {
    throw new Error("SQL query must be a non-empty string");
  }
  ensureParams(params);
  const [result] = await db.execute(sql, params);
  return result;
};

// import dotenv from "dotenv";
// dotenv.config();
// import mysql from "mysql2/promise";

// // Database connection pool
// export const db = mysql.createPool({
//   host: process.env.DB_HOST || "localhost",
//   port: process.env.DB_PORT || 8889,
//   user: process.env.DB_USER || "root",
//   password: process.env.DB_PASS || "",
//   database: process.env.DB_NAME || "forumPage",
// });

// const ensureParams = (params) => {
//   if (params === undefined || params === null) {
//     throw new Error("SQL parameters are required");
//   }
//   const isArray = Array.isArray(params);
//   const isObject = !isArray && typeof params === "object";
//   if (!isArray && !isObject) {
//     throw new Error("SQL parameters must be an array or object");
//   }
// };

// export const safeExecute = async (sql, params) => {
//   if (typeof sql !== "string" || sql.trim().length === 0) {
//     throw new Error("SQL query must be a non-empty string");
//   }
//   ensureParams(params);
//   const [result] = await db.execute(sql, params);
//   return result;
// };
