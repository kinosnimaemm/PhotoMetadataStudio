const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL || "";
const configured = Boolean(connectionString);
const pool = configured
  ? new Pool({
    connectionString,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
    max: Number(process.env.DATABASE_POOL_SIZE || 5)
  })
  : null;

async function health() {
  if (!pool) return { configured: false, connected: false };
  const result = await pool.query("select current_database() as name, now() as checked_at");
  return {
    configured: true,
    connected: true,
    name: result.rows[0].name,
    checkedAt: result.rows[0].checked_at
  };
}

module.exports = { configured, health, pool };
