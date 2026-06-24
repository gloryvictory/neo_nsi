import pkg from 'pg';
const { Pool } = pkg;
import { config } from './config.js';

const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  schema: config.db.schema,
  // Таймауты
  connectionTimeoutMillis: 10000,
  queryTimeoutMillis: 30000,
  idleTimeoutMillis: 30000,
  // Лимит соединений
  max: 10,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle database client:', err);
  process.exit(-1);
});

export default pool;
export async function testConnection() {
  try {
    const res = await pool.query('SELECT NOW()');
    console.log(`✓ Подключение к PostgreSQL успешно (${config.db.host}:${config.db.port}/${config.db.database})`);
    return true;
  } catch (err) {
    console.error('✗ Ошибка подключения к PostgreSQL:', err.message);
    return false;
  }
}