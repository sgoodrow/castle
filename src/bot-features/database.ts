// The bot's features run on real Postgres, not a stand-in. Each feature file gets its own database,
// copied from a template that has every migration in prisma/migrations, so files run side by side
// and a scenario sees exactly the tables production has. Point TEST_DATABASE_URL at any database on
// a server you can create databases on; it defaults to the local Postgres on port 5433.
import { createHash, randomBytes } from "crypto";
import { readdirSync, readFileSync } from "fs";
import path from "path";
import { Client } from "pg";

const SERVER =
  process.env.TEST_DATABASE_URL ??
  "postgresql://postgres@localhost:5433/postgres";
const MIGRATIONS = path.resolve(__dirname, "../../prisma/migrations");

const urlOf = (name: string) => {
  const url = new URL(SERVER);
  url.pathname = `/${name}`;
  return url.toString();
};

async function connect(url: string) {
  const client = new Client({ connectionString: url });
  try {
    await client.connect();
  } catch (err) {
    throw new Error(
      `The bot's features need Postgres at ${new URL(url).host} (set TEST_DATABASE_URL): ${err}`
    );
  }
  return client;
}

// Prisma applies migrations in the order of their folder names.
const migrations = () =>
  readdirSync(MIGRATIONS, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort()
    .map((name) =>
      readFileSync(path.join(MIGRATIONS, name, "migration.sql"), "utf-8")
    );

// Named for its migrations, so a new migration builds a new template rather than reusing a stale one.
// The caller holds the lock.
async function template(server: Client) {
  const sql = migrations();
  const name = `castle_test_${createHash("sha1").update(sql.join("\n")).digest("hex").slice(0, 12)}`;
  const { rows } = await server.query<{ datistemplate: boolean }>(
    "select datistemplate from pg_database where datname = $1",
    [name]
  );
  if (rows[0]?.datistemplate) return name;
  // Templates of older migrations are never used again.
  const { rows: stale } = await server.query<{ datname: string }>(
    "select datname from pg_database where datname like 'castle\\_test\\_%' and datname <> $1",
    [name]
  );
  for (const { datname } of stale) {
    await server.query(`alter database "${datname}" is_template false`);
    await server.query(`drop database "${datname}" with (force)`);
  }
  // Left half built by a run that stopped part way.
  if (rows[0]) await server.query(`drop database "${name}" with (force)`);
  await server.query(`create database "${name}"`);
  const db = await connect(urlOf(name));
  try {
    for (const migration of sql) await db.query(migration);
  } finally {
    await db.end();
  }
  await server.query(`alter database "${name}" is_template true`);
  return name;
}

// A new database with every migration applied, and a way to drop it once the feature is done.
export async function createDatabase() {
  const server = await connect(SERVER);
  const name = `castle_feature_${randomBytes(6).toString("hex")}`;
  try {
    // One feature file at a time, so one builds the template and the rest wait for it, and none
    // copies it while it's in use.
    await server.query("select pg_advisory_lock(7710)");
    await server.query(
      `create database "${name}" template "${await template(server)}"`
    );
  } finally {
    await server.end(); // which releases the lock
  }
  return {
    url: urlOf(name),
    drop: async () => {
      const server = await connect(SERVER);
      try {
        await server.query(`drop database "${name}" with (force)`);
      } finally {
        await server.end();
      }
    },
  };
}

// Empties every table, for a fresh start each scenario.
export async function emptyTables(url: string) {
  const db = await connect(url);
  try {
    const { rows } = await db.query<{ tablename: string }>(
      "select tablename from pg_tables where schemaname = 'public'"
    );
    if (rows.length)
      await db.query(
        `truncate ${rows.map((r) => `"${r.tablename}"`).join(", ")} restart identity cascade`
      );
  } finally {
    await db.end();
  }
}
