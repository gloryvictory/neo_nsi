import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { testConnection } from './db.js';
import tablesRouter from './routes/tables.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const app = express();
const PORT = config.serverPort;

// Middleware
app.use(cors());
app.use(express.json());

// API маршруты
app.use('/api', tablesRouter);

// Health check
app.get('/api/health', async (req, res) => {
  const connected = await testConnection();
  res.json({
    status: connected ? 'ok' : 'error',
    db: {
      host: config.db.host,
      port: config.db.port,
      database: config.db.database,
      schema: config.db.schema,
    },
    tablePrefix: config.tablePrefix,
  });
});

// В production режиме раздаём статику из dist/
const distPath = path.join(rootDir, 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(distPath, 'index.html'));
  }
});

// Запуск сервера
app.listen(PORT, async () => {
  console.log(``);
  console.log(`  ╔══════════════════════════════════════════╗`);
  console.log(`  ║   НСИ Viewer — Сервер запущен           ║`);
  console.log(`  ║   API:  http://localhost:${PORT}/api        ║`);
  console.log(`  ╚══════════════════════════════════════════╝`);
  console.log(``);
  await testConnection();
});