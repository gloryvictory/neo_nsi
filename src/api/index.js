const API_BASE = '/api';

async function request(url, options = {}) {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Сетевая ошибка' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  // Для blob-ответов (Excel) возвращаем напрямую
  if (response.headers.get('content-type')?.includes('spreadsheet')) {
    return response.blob();
  }

  return response.json();
}

export async function fetchTables() {
  const result = await request('/tables');
  return result.data;
}

export async function fetchTableData(tableName, { page = 1, pageSize = 25, search = '', sortColumn = null, sortDirection = 'asc', filters = {} } = {}) {
  const params = new URLSearchParams();
  params.set('page', page);
  params.set('pageSize', pageSize);
  if (search) params.set('search', search);
  if (sortColumn) params.set('sortColumn', sortColumn);
  if (sortDirection) params.set('sortDirection', sortDirection);
  if (Object.keys(filters).length > 0) {
    params.set('filters', JSON.stringify(filters));
  }
  const result = await request(`/tables/${encodeURIComponent(tableName)}/data?${params.toString()}`);
  return result.data;
}

export async function exportToExcel(tableName, { search = '', filters = {} } = {}) {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (Object.keys(filters).length > 0) {
    params.set('filters', JSON.stringify(filters));
  }
  const blob = await request(`/tables/${encodeURIComponent(tableName)}/export?${params.toString()}`);
  
  // Создаём ссылку для скачивания
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${tableName}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

export async function checkHealth() {
  return request('/health');
}