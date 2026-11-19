
import "dotenv/config";
import pg from "pg";

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  connectionTimeoutMillis: 15000,
});

try {
  await client.connect();
  console.log("Render PostgreSQL connected!");

  const result = await client.query("SELECT current_database()");
  console.log("Database:", result.rows[0].current_database);
} catch (error) {
  console.error("Connection failed:", error.message);
  console.error("Error code:", error.code);
} finally {
  await client.end().catch(() => {});
}
