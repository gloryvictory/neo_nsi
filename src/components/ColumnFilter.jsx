import { useState } from 'react';

export default function ColumnFilter({ columns, filters, onFilterChange }) {
  const [expanded, setExpanded] = useState(false);
  const [localFilters, setLocalFilters] = useState(filters);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const handleChange = (colName, value) => {
    const updated = { ...localFilters, [colName]: value };
    setLocalFilters(updated);
  };

  const applyFilters = () => {
    onFilterChange(localFilters);
  };

  const clearFilters = () => {
    const cleared = {};
    columns.forEach((c) => (cleared[c.column_name] = ''));
    setLocalFilters(cleared);
    onFilterChange({});
  };

  return (
    <div className="column-filter">
      <button
        className={`filter-toggle-btn ${expanded ? 'active' : ''}`}
        onClick={() => setExpanded(!expanded)}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 4h18M7 9h10M10 14h4" />
        </svg>
        Фильтры по колонкам
        {activeFilterCount > 0 && (
          <span className="filter-badge">{activeFilterCount}</span>
        )}
      </button>

      {expanded && (
        <div className="filter-panel">
          <div className="filter-grid">
            {columns.map((col) => (
              <div key={col.column_name} className="filter-field">
                <label>{col.column_name}</label>
                <input
                  type="text"
                  placeholder={`Фильтр по ${col.column_name}`}
                  value={localFilters[col.column_name] || ''}
                  onChange={(e) => handleChange(col.column_name, e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                />
              </div>
            ))}
          </div>
          <div className="filter-actions">
            <button className="btn btn-primary" onClick={applyFilters}>
              Применить
            </button>
            <button className="btn btn-secondary" onClick={clearFilters}>
              Сбросить
            </button>
          </div>
        </div>
      )}
    </div>
  );
}