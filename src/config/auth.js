import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config(); // Ensure environment variables are loaded

const pool = new pg.Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false, // Adjust `rejectUnauthorized` based on your RDS SSL certificate setup
});

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
  // Consider graceful shutdown or restart logic here
  process.exit(-1);
});

/**
 * Provides a client from the PostgreSQL connection pool.
 * Remember to call client.release() when done.
 * @returns {Promise<pg.PoolClient>} A PostgreSQL client.
 */
export const getPgConnection = async () => {
  return pool.connect();
};

// Optional: A simple query function for convenience
export const query = (text, params) => pool.query(text, params);