import pg from "pg";

let pool: pg.Pool | null = null;

export const getPool = (): pg.Pool | null => {
  if (pool) return pool;

  const url = process.env.DATABASE_URL;
  if (!url) return null;

  pool = new pg.Pool({
    connectionString: url,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000
  });

  return pool;
};

export const closePool = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    pool = null;
  }
};
