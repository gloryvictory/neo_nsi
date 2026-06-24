import { useState, useEffect } from 'react';
import { fetchTables, checkHealth } from './api';
import TableList from './components/TableList';
import TableViewer from './components/TableViewer';

export default function App() {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const loadTables = async () => {
    setLoading(true);
    setConnectionError(null);
    try {
      const data = await fetchTables();
      setTables(data || []);
    } catch (err) {
      setConnectionError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTables();
  }, []);

  const handleSelectTable = (tableName) => {
    setSelectedTable(tableName);
  };

  const handleBack = () => {
    setSelectedTable(null);
  };

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          {!sidebarCollapsed && (
            <div className="sidebar-brand">
              <div className="brand-icon">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18" />
                </svg>
              </div>
              <div>
                <h1>НСИ</h1>
                <p>Справочники</p>
              </div>
            </div>
          )}
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? 'Развернуть' : 'Свернуть'}
          >
            {sidebarCollapsed ? '›' : '‹'}
          </button>
        </div>

        {!sidebarCollapsed && (
          <>
            <TableList
              tables={tables}
              selectedTable={selectedTable}
              onSelect={handleSelectTable}
              loading={loading}
            />
            <div className="sidebar-footer">
              <button className="btn btn-secondary btn-sm" onClick={loadTables} disabled={loading}>
                ↻ Обновить
              </button>
            </div>
          </>
        )}

        {sidebarCollapsed && (
          <div className="collapsed-tables">
            {tables.map((t) => (
              <div
                key={t.table_name}
                className={`collapsed-item ${selectedTable === t.table_name ? 'active' : ''}`}
                onClick={() => { setSelectedTable(t.table_name); setSidebarCollapsed(false); }}
                title={t.table_name}
              >
                {t.table_name.charAt(0)}
              </div>
            ))}
          </div>
        )}
      </aside>

      {/* Main content */}
      <main className="main-content">
        {connectionError && !selectedTable && (
          <div className="connection-error">
            <div className="error-icon">⚠</div>
            <h2>Ошибка подключения к базе данных</h2>
            <p>{connectionError}</p>
            <p className="error-hint">
              Проверьте файл <code>.env</code> и убедитесь, что PostgreSQL запущен.
            </p>
            <button className="btn btn-primary" onClick={loadTables}>
              Повторить подключение
            </button>
          </div>
        )}

        {!connectionError && !selectedTable && !loading && tables.length === 0 && (
          <div className="welcome-screen">
            <div className="welcome-icon">
              <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18" />
              </svg>
            </div>
            <h2>НСИ — Справочники</h2>
            <p>Выберите справочник из списка слева для просмотра данных</p>
          </div>
        )}

        {selectedTable && (
          <TableViewer
            key={selectedTable}
            tableName={selectedTable}
            onBack={handleBack}
          />
        )}
      </main>
    </div>
  );
}