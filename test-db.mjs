
import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

try {
  const result = await pool.query(
    "SELECT current_database() AS database, NOW() AS server_time"
  );

  console.log("✅ Database connection successful!");
  console.log("Database:", result.rows[0].database);
  console.log("Server time:", result.rows[0].server_time);
} catch (error) {
  console.error("❌ Database connection failed:", error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
