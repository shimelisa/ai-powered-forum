// import dotenv from "dotenv";
// import path from "path";
// import { fileURLToPath } from "url";

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// dotenv.config({
//   path: path.resolve(__dirname, "../.env"),
// });
// import mysql from "mysql2/promise";


// // Database connection pool
// export const db = mysql.createPool({
//   host: process.env.DB_HOST || "Localhost",
//   user: process.env.DB_USER || "gpt-admin",
//   password: process.env.DB_PASS || "Abcd1234@@",
//   database: process.env.DB_NAME || "gpt_clone",
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

// db/config.js
import mysql from "mysql2/promise";

// Database connection pool
export const db = mysql.createPool({
  host: process.env.DB_HOST || "Localhost",
  user: process.env.DB_USER || "gpt-admin",
  password: process.env.DB_PASS || "Abcd1234@@",
  database: process.env.DB_NAME || "gpt_clone",
});

// export const db = mysql.createPool({
//   host: process.env.DB_HOST || "31.97.208.132",
//   user: process.env.DB_USER || "u417447537_evangadi_forum",
//   password: process.env.DB_PASS || "evangadiForum@1",
//   database: process.env.DB_NAME || "u417447537_evangadi_forum",
// });

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
