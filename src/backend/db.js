import { Pool } from "pg";
function print(print){ console.log(print)}

const pool = new Pool({
  user: "myappuser",
  host: "localhost",
  database: "postgres",
  password: "mypassword",
  port: 5432,
});

async function main() {
const result = await pool.query("SELECT * FROM products");
print(result.rows)
await pool.end()
}

main();