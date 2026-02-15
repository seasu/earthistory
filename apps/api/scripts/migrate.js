
import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to log with timestamp
const log = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`);

async function migrate() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error("DATABASE_URL is required");
        process.exit(1);
    }

    // Determine migrations directory
    // Assuming this script is in apps/api/scripts/migrate.js
    // and migrations are in infra/db/migrations/
    // Path relative to script: ../../../infra/db/migrations
    const migrationsDir = path.resolve(__dirname, '../../../infra/db/migrations');

    log(`Migrations directory: ${migrationsDir}`);

    if (!fs.existsSync(migrationsDir)) {
        console.error(`Migrations directory not found at ${migrationsDir}`);
        process.exit(1);
    }

    const client = new pg.Client({
        connectionString,
        ssl: { rejectUnauthorized: false } // Required for most cloud DBs
    });

    try {
        await client.connect();
        log("Connected to database");

        // Read and sort files
        const files = fs.readdirSync(migrationsDir)
            .filter(f => f.endsWith('.sql'))
            .sort(); // Lexicographical sort (ensure 0001 < 0002)

        log(`Found ${files.length} migration files.`);

        // Execute each file
        for (const file of files) {
            log(`Running migration: ${file}`);
            const filePath = path.join(migrationsDir, file);
            const sql = fs.readFileSync(filePath, 'utf8');

            try {
                await client.query("BEGIN");
                await client.query(sql);
                await client.query("COMMIT");
                log(`✓ Completed: ${file}`);
            } catch (err) {
                await client.query("ROLLBACK");
                console.error(`✗ Failed: ${file}`);
                console.error(err);
                throw err; // Stop on first failure
            }
        }

        log("All migrations completed successfully.");
        process.exit(0);

    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

migrate();
