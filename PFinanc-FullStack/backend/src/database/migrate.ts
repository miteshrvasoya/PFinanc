import fs from 'fs';
import path from 'path';
import { Client, Pool } from 'pg';
import { config } from '../config/env.js';

async function ensureDatabaseExists() {
  const rootClient = new Client({
    host: config.database.host,
    port: config.database.port,
    user: config.database.user,
    password: config.database.password,
    database: 'postgres',
  });

  try {
    await rootClient.connect();
    const checkDb = await rootClient.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [config.database.name]
    );

    if (checkDb.rowCount === 0) {
      console.log(`Creating database "${config.database.name}"...`);
      await rootClient.query(`CREATE DATABASE "${config.database.name}"`);
      console.log(`Database "${config.database.name}" created successfully.`);
    } else {
      console.log(`Database "${config.database.name}" already exists.`);
    }
  } catch (err: any) {
    console.warn(`Warning checking/creating database: ${err.message}`);
  } finally {
    await rootClient.end();
  }
}

export async function runMigrations() {
  await ensureDatabaseExists();

  const migrationPool = new Pool({
    connectionString: config.database.url,
  });

  try {
    const client = await migrationPool.connect();
    console.log('Running schema migrations...');

    let migrationsDir = path.resolve(__dirname, 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      migrationsDir = path.resolve(__dirname, '../../src/database/migrations');
    }

    if (!fs.existsSync(migrationsDir)) {
      throw new Error(`Migrations directory not found at ${migrationsDir}`);
    }

    const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

    for (const file of files) {
      console.log(`Applying migration: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await client.query(sql);
    }

    console.log('All migrations applied successfully!');
    client.release();
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await migrationPool.end();
  }
}

if (require.main === module) {
  runMigrations().then(() => process.exit(0));
}
