import pg from "pg";
const { Client } = pg;
const client = new Client({
  connectionString: "postgresql://postgres.pywufvlnfpymwypblrfr:PayWithTheEvil!@aws-1-us-east-2.pooler.supabase.com:5432/postgres",
  ssl: { rejectUnauthorized: false },
});
await client.connect();
const { rows } = await client.query(`SELECT email, role, "passwordHash" IS NOT NULL as tiene_pass, LEFT("passwordHash",10) as hash FROM "Admin"`);
console.table(rows);
await client.end();
