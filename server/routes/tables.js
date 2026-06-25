import { Router } from 'express';
import ExcelJS from 'exceljs';
// import pool from 'db.js';
import pool from '../db.js';
import { config } from '../config.js';

const router = Router();

// ─── Получить список таблиц-справочников ─────────────────────────
router.get('/tables', async (req, res) => {
  try {
    const schema = config.db.schema;
    const prefix = config.tablePrefix;

    // const query = `
    //   SELECT 
    //     t.table_name,
    //     obj_description(
    //       (quote_ident(t.table_schema) || '.' || quote_ident(t.table_name))::regclass,
    //       'pg_class'
    //     ) AS table_comment,
    //     (SELECT COUNT(*) FROM information_schema.columns c 
    //      WHERE c.table_schema = t.table_schema AND c.table_name = t.table_name) AS column_count
    //   FROM information_schema.tables t
    //   WHERE t.table_schema = $1 
    //     AND t.table_type = 'BASE TABLE'
    //     AND t.table_name LIKE $2
    //   ORDER BY t.table_name
    // `;
    
    const query = `
      SELECT 
        t.table_name,
        obj_description(
          (quote_ident('public') || '.' || quote_ident(t.table_name))::regclass,
          'pg_class'
        ) AS table_comment
      FROM information_schema.tables t
      WHERE t.table_type = 'BASE TABLE'
        AND t.table_schema = 'public' 
      ORDER BY t.table_name
    `;

    // AND t.table_name LIKE $1
    // const { rows } = await pool.query(query, [schema, `${prefix}%`]);
    console.log(query)

    const { rows } = await pool.query(query);
    
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Ошибка получения списка таблиц:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Получить структуру таблицы (колонки) ─────────────────────────
router.get('/tables/:tableName/columns', async (req, res) => {
  try {
    const { tableName } = req.params;
    const schema = config.db.schema;

    const query = `
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = $2
      ORDER BY ordinal_position
    `;

    const { rows } = await pool.query(query, [schema, tableName]);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Ошибка получения колонок:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Получить данные таблицы с пейджингом и фильтрацией ───────────
router.get('/tables/:tableName/data', async (req, res) => {
  try {
    const { tableName } = req.params;
    const schema = config.db.schema;

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(1000, Math.max(1, parseInt(req.query.pageSize, 10) || 25));
    const search = (req.query.search || '').trim();
    const sortColumn = req.query.sortColumn || null;
    const sortDirection = (req.query.sortDirection || 'asc').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    // Фильтры по колонкам: передаются как JSON строка { "column_name": "value" }
    let columnFilters = {};
    if (req.query.filters) {
      try {
        columnFilters = JSON.parse(req.query.filters);
      } catch (e) {
        // игнорируем невалидный JSON
      }
    }

    // Валидация имени таблицы (защита от SQL-инъекций)
    const validName = /^[a-zA-Zа-яА-Я_\u0400-\u04FF][a-zA-Zа-яА-Я0-9_\u0400-\u04FF]*$/;
    if (!validName.test(tableName)) {
      return res.status(400).json({ success: false, error: 'Некорректное имя таблицы' });
    }

    // Получаем колонки таблицы
    const colQuery = `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = $2
      ORDER BY ordinal_position
    `;
    const colResult = await pool.query(colQuery, [schema, tableName]);
    const columns = colResult.rows;
    const textColumns = columns
      .filter(c => ['character varying', 'text', 'character', 'varchar', 'char'].includes(c.data_type))
      .map(c => c.column_name);

    // Строим WHERE условия
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    // Глобальный поиск по текстовым колонкам
    if (search && textColumns.length > 0) {
      const searchConditions = textColumns.map(col => {
        return `"${col}"::text ILIKE $${paramIndex}`;
      });
      conditions.push(`(${searchConditions.join(' OR ')})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Фильтры по конкретным колонкам
    for (const [col, val] of Object.entries(columnFilters)) {
      if (!val) continue;
      if (!columns.some(c => c.column_name === col)) continue;

      conditions.push(`"${col}"::text ILIKE $${paramIndex}`);
      params.push(`%${val}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Сортировка
    let orderClause = '';
    if (sortColumn && columns.some(c => c.column_name === sortColumn)) {
      orderClause = `ORDER BY "${sortColumn}" ${sortDirection}`;
    }

    // Запрос количества записей
    const countQuery = `SELECT COUNT(*) as total FROM "${schema}"."${tableName}" ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total, 10);
    const totalPages = Math.ceil(total / pageSize);

    // Запрос данных
    const offset = (page - 1) * pageSize;
    const dataQuery = `SELECT * FROM "${schema}"."${tableName}" ${whereClause} ${orderClause} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    const dataParams = [...params, pageSize, offset];
    const dataResult = await pool.query(dataQuery, dataParams);

    res.json({
      success: true,
      data: {
        rows: dataResult.rows,
        columns: columns,
        pagination: {
          page,
          pageSize,
          total,
          totalPages,
        },
      },
    });
  } catch (err) {
    console.error('Ошибка получения данных таблицы:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Экспорт таблицы в Excel ──────────────────────────────────────
router.get('/tables/:tableName/export', async (req, res) => {
  try {
    const { tableName } = req.params;
    const schema = config.db.schema;

    const search = (req.query.search || '').trim();

    let columnFilters = {};
    if (req.query.filters) {
      try {
        columnFilters = JSON.parse(req.query.filters);
      } catch (e) { /* ignore */ }
    }

    const validName = /^[a-zA-Zа-яА-Я_\u0400-\u04FF][a-zA-Zа-яА-Я0-9_\u0400-\u04FF]*$/;
    if (!validName.test(tableName)) {
      return res.status(400).json({ success: false, error: 'Некорректное имя таблицы' });
    }

    // Получаем колонки
    const colQuery = `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = $2
      ORDER BY ordinal_position
    `;
    const colResult = await pool.query(colQuery, [schema, tableName]);
    const columns = colResult.rows;
    const textColumns = columns
      .filter(c => ['character varying', 'text', 'character', 'varchar', 'char'].includes(c.data_type))
      .map(c => c.column_name);

    // Строим WHERE
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (search && textColumns.length > 0) {
      const searchConditions = textColumns.map(col => `"${col}"::text ILIKE $${paramIndex}`);
      conditions.push(`(${searchConditions.join(' OR ')})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    for (const [col, val] of Object.entries(columnFilters)) {
      if (!val || !columns.some(c => c.column_name === col)) continue;
      conditions.push(`"${col}"::text ILIKE $${paramIndex}`);
      params.push(`%${val}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Получаем все данные (без пейджинга)
    const dataQuery = `SELECT * FROM "${schema}"."${tableName}" ${whereClause}`;
    const dataResult = await pool.query(dataQuery, params);

    // Создаем Excel
    const workbook = new ExcelJS.Workbook();
    const sheetName = tableName.length > 31 ? tableName.substring(0, 31) : tableName;
    const worksheet = workbook.addWorksheet(sheetName);

    // Заголовки колонок
    worksheet.columns = columns.map(col => ({
      header: col.column_name,
      key: col.column_name,
      width: Math.max(col.column_name.length * 1.5 + 2, 15),
    }));

    // Стиль заголовков
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    worksheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 25;

    // Данные
    dataResult.rows.forEach(row => {
      const rowData = {};
      columns.forEach(col => {
        rowData[col.column_name] = row[col.column_name];
      });
      worksheet.addRow(rowData);
    });

    // Автофильтр
    if (columns.length > 0) {
      worksheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: dataResult.rows.length + 1, column: columns.length },
      };
    }

    // Отправляем файл
    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `${tableName}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);
    res.send(buffer);
  } catch (err) {
    console.error('Ошибка экспорта в Excel:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;