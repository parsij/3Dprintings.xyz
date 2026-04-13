const { Pool } = require("pg");

const pool = new Pool({
  user: "myappuser",
  host: "localhost",
  database: "postgres",
  password: "mypassword",
  port: 5432,
});

module.exports = pool;