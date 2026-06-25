import { useState, useMemo } from 'react';
import useDebounce from '../hooks/useDebounce';

export default function TableList({ tables, selectedTable, onSelect, loading }) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 200);

  const filteredTables = useMemo(() => {
    if (!debouncedSearch) return tables;
    const q = debouncedSearch.toLowerCase();
    return tables.filter(
      (t) =>
        t.table_name.toLowerCase().includes(q) ||
        (t.table_comment && t.table_comment.toLowerCase().includes(q))
    );
  }, [tables, debouncedSearch]);

  return (
    <div className="table-list">
      <div className="table-list-header">
        <h2>Справочники</h2>
        <span className="table-count">{filteredTables.length} из {tables.length}</span>
      </div>

      <div className="search-box">
        <svg className="search-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          placeholder="Поиск справочника..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
        {search && (
          <button className="clear-btn" onClick={() => setSearch('')}>
            ✕
          </button>
        )}
      </div>

      <div className="table-list-items">
        {loading ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
            <span>Загрузка...</span>
          </div>
        ) : filteredTables.length === 0 ? (
          <div className="empty-state">
            {tables.length === 0
              ? 'Нет таблиц-справочников'
              : 'Ничего не найдено'}
          </div>
        ) : (
          filteredTables.map((table) => (
            <div
              key={table.table_name}
              className={`table-item ${selectedTable === table.table_name ? 'active' : ''}`}
              onClick={() => onSelect(table.table_name)}
            >
              <div className="table-item-name">{table.table_comment}</div>
              {table.table_name && (
                <div className="table-item-comment">{table.table_name}</div>
              )}
              <div className="table-item-meta">
                {table.column_count} колонок
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}