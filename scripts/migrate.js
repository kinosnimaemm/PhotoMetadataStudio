const fs = require("node:fs");
const path = require("node:path");
const { pool } = require("../src/database");

async function migrate() {
  if (!pool) {
    console.log("DATABASE_URL is not configured; skipping migrations.");
    return;
  }

  const directory = path.join(__dirname, "..", "supabase", "migrations");
  let files = [];
  try {
    files = fs.readdirSync(directory).filter((file) => file.endsWith(".sql")).sort();
  } catch (err) {
    console.log("Migration directory not found, skipping.");
    return;
  }
  await pool.query(`
    create table if not exists schema_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    )
  `);

  for (const file of files) {
    const applied = await pool.query("select 1 from schema_migrations where name = $1", [file]);
    if (applied.rowCount) continue;
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query(fs.readFileSync(path.join(directory, file), "utf8"));
      await client.query("insert into schema_migrations(name) values ($1)", [file]);
      await client.query("commit");
      console.log(`Applied ${file}`);
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }
}

migrate()
  .then(() => pool?.end())
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
    return pool?.end();
  });
