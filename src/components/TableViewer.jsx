import { useState, useEffect, useCallback } from 'react';
import { fetchTableData, exportToExcel } from '../api';
import useDebounce from '../hooks/useDebounce';
import Pagination from './Pagination';
import ColumnFilter from './ColumnFilter';

export default function TableViewer({ tableName, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [filters, setFilters] = useState({});
  const [exporting, setExporting] = useState(false);

  const debouncedSearch = useDebounce(search, 300);

  const loadData = useCallback(async () => {
    if (!tableName) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchTableData(tableName, {
        page,
        pageSize,
        search: debouncedSearch,
        sortColumn,
        sortDirection,
        filters,
      });
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tableName, page, pageSize, debouncedSearch, sortColumn, sortDirection, filters]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters, sortColumn]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSort = (colName) => {
    if (sortColumn === colName) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(colName);
      setSortDirection('asc');
    }
  };

  const handlePageSizeChange = (size) => {
    setPageSize(size);
    setPage(1);
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportToExcel(tableName, { search: debouncedSearch, filters });
    } catch (err) {
      setError('Ошибка экспорта: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  const formatDate = (val) => {
    if (val instanceof Date) {
      return val.toLocaleString('ru-RU');
    }
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
      try {
        const d = new Date(val);
        if (!isNaN(d)) return d.toLocaleString('ru-RU');
      } catch (e) { /* keep original */ }
    }
    return String(val ?? '');
  };

  if (error && !data) {
    return (
      <div className="table-viewer">
        <div className="error-banner">
          <h3>Ошибка загрузки данных</h3>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={onBack}>
            ← Назад к списку
          </button>
        </div>
      </div>
    );
  }

  if (!data && loading) {
    return (
      <div className="table-viewer">
        <div className="loading-spinner centered">
          <div className="spinner"></div>
          <span>Загрузка данных таблицы...</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { rows, columns, pagination } = data;

  return (
    <div className="table-viewer">
      {/* Шапка таблицы */}
      <div className="viewer-header">
        <div className="viewer-title-row">
          <button className="back-btn" onClick={onBack} title="Назад к списку">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="viewer-title-info">
            <h2>{tableName}</h2>
            <span className="record-count">
              {pagination.total} записей, {columns.length} колонок
            </span>
          </div>
        </div>

        <div className="viewer-toolbar">
          <div className="global-search">
            <svg className="search-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Глобальный поиск по всем колонкам..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <button
            className="btn btn-success"
            onClick={handleExport}
            disabled={exporting}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            {exporting ? 'Экспорт...' : 'Экспорт в Excel'}
          </button>
        </div>
      </div>

      {/* Фильтры по колонкам */}
      <ColumnFilter
        columns={columns}
        filters={filters}
        onFilterChange={handleFilterChange}
      />

      {/* Ошибка при загрузке страницы */}
      {error && (
        <div className="error-inline">
          {error}
          <button onClick={loadData}>Повторить</button>
        </div>
      )}

      {/* Таблица данных */}
      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th className="row-num-col">#</th>
              {columns.map((col) => (
                <th
                  key={col.column_name}
                  className={sortColumn === col.column_name ? `sorted ${sortDirection}` : ''}
                  onClick={() => handleSort(col.column_name)}
                  title={`Сортировать по ${col.column_name}`}
                >
                  <div className="th-content">
                    <span className="th-name">{col.column_name}</span>
                    <span className="th-type">{col.data_type}</span>
                    {sortColumn === col.column_name && (
                      <span className="sort-arrow">
                        {sortDirection === 'asc' ? ' ▲' : ' ▼'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length + 1} className="loading-cell">
                  <div className="spinner small"></div>
                  Загрузка...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="empty-cell">
                  Нет данных
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr key={idx}>
                  <td className="row-num-col">{(page - 1) * pageSize + idx + 1}</td>
                  {columns.map((col) => (
                    <td key={col.column_name} title={String(row[col.column_name] ?? '')}>
                      {formatDate(row[col.column_name])}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Пейджинг */}
      {pagination && (
        <Pagination
          pagination={pagination}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
        />
      )}
    </div>
  );
}