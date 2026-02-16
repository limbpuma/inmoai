import { config } from 'dotenv';
config({ path: '.env.local' });
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL not found');
  process.exit(1);
}

const sql = postgres(connectionString);

async function alterSchema() {
  try {
    // Add improvements column if not exists
    await sql`ALTER TABLE listings ADD COLUMN IF NOT EXISTS improvements jsonb`;
    console.log('✅ Added improvements column');

    // Add website column if not exists
    await sql`ALTER TABLE sources ADD COLUMN IF NOT EXISTS website varchar(500)`;
    console.log('✅ Added website column');

    // Add cadastral columns for Catastro integration
    await sql`ALTER TABLE listings ADD COLUMN IF NOT EXISTS cadastral_ref varchar(20)`;
    await sql`ALTER TABLE listings ADD COLUMN IF NOT EXISTS cadastral_verified boolean DEFAULT false`;
    await sql`ALTER TABLE listings ADD COLUMN IF NOT EXISTS cadastral_verified_at timestamp with time zone`;
    await sql`ALTER TABLE listings ADD COLUMN IF NOT EXISTS cadastral_surface integer`;
    await sql`ALTER TABLE listings ADD COLUMN IF NOT EXISTS cadastral_use varchar(50)`;
    await sql`ALTER TABLE listings ADD COLUMN IF NOT EXISTS cadastral_construction_year integer`;
    await sql`ALTER TABLE listings ADD COLUMN IF NOT EXISTS cadastral_mismatch jsonb`;
    console.log('✅ Added cadastral columns');

    console.log('✅ Schema updated successfully!');
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await sql.end();
  }
}

alterSchema();
