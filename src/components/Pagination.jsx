export default function Pagination({ pagination, onPageChange, onPageSizeChange }) {
  const { page, totalPages, total, pageSize } = pagination;

  if (totalPages <= 1) return null;

  const pageSizes = [10, 25, 50, 100];

  // Генерируем номера страниц для отображения
  const getPageNumbers = () => {
    const pages = [];
    const delta = 2;

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > delta + 2) pages.push('...');

      const start = Math.max(2, page - delta);
      const end = Math.min(totalPages - 1, page + delta);
      for (let i = start; i <= end; i++) pages.push(i);

      if (page < totalPages - delta - 1) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="pagination">
      <div className="pagination-info">
        <span>
          Записей: <strong>{total}</strong>
        </span>
        <div className="page-size-selector">
          <label>Строк на странице:</label>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
          >
            {pageSizes.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="pagination-controls">
        <button
          className="page-btn"
          disabled={page <= 1}
          onClick={() => onPageChange(1)}
          title="Первая"
        >
          ««
        </button>
        <button
          className="page-btn"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          title="Предыдущая"
        >
          «
        </button>

        {getPageNumbers().map((p, idx) =>
          p === '...' ? (
            <span key={`ellipsis-${idx}`} className="page-ellipsis">
              ...
            </span>
          ) : (
            <button
              key={p}
              className={`page-btn ${p === page ? 'active' : ''}`}
              onClick={() => onPageChange(p)}
            >
              {p}
            </button>
          )
        )}

        <button
          className="page-btn"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          title="Следующая"
        >
          »
        </button>
        <button
          className="page-btn"
          disabled={page >= totalPages}
          onClick={() => onPageChange(totalPages)}
          title="Последняя"
        >
          »»
        </button>
      </div>
    </div>
  );
}