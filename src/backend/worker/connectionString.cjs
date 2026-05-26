const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

function buildConnectionString() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const user = encodeURIComponent(process.env.DB_USER || "");
  const password = encodeURIComponent(process.env.DB_PASSWORD || "");
  const host = process.env.DB_HOST || "localhost";
  const port = process.env.DB_PORT || "5432";
  const database = process.env.DB_NAME || "";

  return `postgresql://${user}:${password}@${host}:${port}/${database}`;
}

module.exports = {
  buildConnectionString,
};
