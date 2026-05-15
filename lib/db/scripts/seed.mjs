import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pg = require("pg");
const bcrypt = require("bcryptjs");

const { Client } = pg;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const accounts = [
  { username: "admin",   password: "admin123",   fullName: "Administrator",    role: "admin",     section: "Tata Usaha" },
  { username: "kalapas", password: "kalapas123", fullName: "Kalapas Kuningan", role: "kalapas",   section: "Kepala" },
  { username: "user",    password: "user123",    fullName: "Pegawai",          role: "requester", section: "Seksi Kamtib" },
];

const items = [
  { name: "Kertas HVS F4",      defaultUnit: "Rim",   category: "ATK",        currentStock: 50 },
  { name: "Kertas HVS A4",      defaultUnit: "Rim",   category: "ATK",        currentStock: 80 },
  { name: "Spidol Permanen",    defaultUnit: "buah",  category: "ATK",        currentStock: 40 },
  { name: "Lakban Bening",      defaultUnit: "Roll",  category: "ATK",        currentStock: 30 },
  { name: "Tinta Epson L310",   defaultUnit: "botol", category: "ATK",        currentStock: 20 },
  { name: "Kanebo",             defaultUnit: "buah",  category: "Kebersihan", currentStock: 15 },
  { name: "Sunlight",           defaultUnit: "pouch", category: "Kebersihan", currentStock: 25 },
  { name: "Wipol",              defaultUnit: "botol", category: "Kebersihan", currentStock: 18 },
  { name: "Pulpen",             defaultUnit: "buah",  category: "ATK",        currentStock: 100 },
  { name: "Stapler",            defaultUnit: "buah",  category: "ATK",        currentStock: 10 },
];

const client = new Client({ connectionString: process.env.DATABASE_URL });

try {
  await client.connect();

  for (const a of accounts) {
    const hash = await bcrypt.hash(a.password, 10);
    await client.query(
      `INSERT INTO users (username, password_hash, full_name, role, section)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (username) DO UPDATE
         SET password_hash = EXCLUDED.password_hash,
             full_name     = EXCLUDED.full_name,
             role          = EXCLUDED.role,
             section       = EXCLUDED.section`,
      [a.username, hash, a.fullName, a.role, a.section],
    );
  }
  console.log(`Seeded ${accounts.length} demo users.`);

  let inserted = 0;
  for (const it of items) {
    const r = await client.query("SELECT 1 FROM items WHERE name = $1", [it.name]);
    if (r.rowCount === 0) {
      await client.query(
        "INSERT INTO items (name, default_unit, category, current_stock) VALUES ($1,$2,$3,$4)",
        [it.name, it.defaultUnit, it.category, it.currentStock],
      );
      inserted++;
    }
  }
  console.log(`Seeded ${inserted} new items (of ${items.length}).`);
} finally {
  await client.end();
}
