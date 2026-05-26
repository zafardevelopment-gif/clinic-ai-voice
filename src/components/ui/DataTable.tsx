interface Column<T> {
  key: string
  header: string
  render?: (row: T) => React.ReactNode
  width?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  emptyMessage?: string
  emptyIcon?: string
}

export default function DataTable<T extends Record<string, unknown>>({ columns, data, emptyMessage = 'No data found', emptyIcon = '📋' }: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <div className="text-4xl mb-3 opacity-40">{emptyIcon}</div>
        <p className="text-sm font-medium" style={{ color: 'var(--txt)' }}>{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key}
                className="text-left text-[11px] uppercase tracking-[1.2px] font-semibold px-4 py-2.5"
                style={{ color: 'var(--txt3)', borderBottom: '1px solid var(--b1)', background: 'var(--s1)', width: col.width }}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="group transition-colors">
              {columns.map(col => (
                <td key={col.key}
                  className="px-4 py-3 text-sm align-middle group-hover:bg-[rgba(16,185,129,0.05)]"
                  style={{ borderBottom: i < data.length - 1 ? '1px solid rgba(228,235,231,1)' : 'none', color: 'var(--txt)' }}>
                  {col.render ? col.render(row) : String(row[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
