import pg from "pg";

const { Client } = pg;

const url = new URL(process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/bonbarang");
const targetDb = url.pathname.replace(/^\//, "") || "bonbarang";

const admin = new Client({
  host: url.hostname,
  port: Number(url.port || 5432),
  user: decodeURIComponent(url.username || "postgres"),
  password: decodeURIComponent(url.password || ""),
  database: "postgres",
});

try {
  await admin.connect();
  const r = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [targetDb]);
  if (r.rowCount === 0) {
    await admin.query(`CREATE DATABASE "${targetDb}"`);
    console.log(`Database '${targetDb}' created.`);
  } else {
    console.log(`Database '${targetDb}' already exists.`);
  }
} finally {
  await admin.end();
}
