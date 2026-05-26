const path = require("path");

require("dotenv").config({ path: path.join(__dirname, ".env") });

const { Pool } = require("pg");

function readPositiveIntegerEnv(name, fallbackValue) {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallbackValue;
}

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
  max: readPositiveIntegerEnv("DB_POOL_MAX", 10),
  idleTimeoutMillis: readPositiveIntegerEnv("DB_IDLE_TIMEOUT_MS", 30_000),
  connectionTimeoutMillis: readPositiveIntegerEnv("DB_CONNECTION_TIMEOUT_MS", 5_000),
  application_name: process.env.DB_APPLICATION_NAME || "3dprintings-api",
});

pool.on("error", (error) => {
  console.error("Unexpected idle PostgreSQL client error:", error);
});

module.exports = pool;
