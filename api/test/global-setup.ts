import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

// Creates (once) and migrates the test database. Requires `docker compose up -d`.
export default async function setup() {
  const admin = new pg.Client({
    connectionString: "postgres://mandisa:mandisa@localhost:5433/postgres",
  });
  await admin.connect();
  const { rowCount } = await admin.query(
    "select 1 from pg_database where datname = 'mandisa_test'",
  );
  if (!rowCount) await admin.query("create database mandisa_test");
  await admin.end();

  const pool = new pg.Pool({
    connectionString: "postgres://mandisa:mandisa@localhost:5433/mandisa_test",
  });
  await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  await pool.end();
}
