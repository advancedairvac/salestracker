
"use client";

export default function DataTable({
  columns = [],
  data = [],
  loading = false,
  emptyMessage = "No records found.",
  rowKey = "id",
  onRowClick,
  className = "",
}) {
  return (
    <div
      className={`w-full overflow-hidden border border-[#d9d9d9] bg-white ${className}`}
    >
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[600px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[#d9d9d9] bg-[#f7f7f7]">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-4 py-4 text-xs font-bold uppercase tracking-wide text-[#333] ${
                    column.headerClassName || ""
                  }`}
                  style={{
                    width: column.width,
                    textAlign: column.align || "left",
                  }}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={Math.max(columns.length, 1)}
                  className="px-4 py-10 text-center text-sm text-[#777]"
                >
                  Loading data...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={Math.max(columns.length, 1)}
                  className="px-4 py-10 text-center text-sm text-[#777]"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr
                  key={row[rowKey] ?? index}
                  onClick={() => onRowClick?.(row)}
                  className={`border-b border-[#e5e5e5] last:border-b-0 ${
                    onRowClick
                      ? "cursor-pointer hover:bg-[#f8f8f8]"
                      : ""
                  }`}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-4 py-4 text-sm text-[#333] ${
                        column.cellClassName || ""
                      }`}
                      style={{
                        textAlign: column.align || "left",
                      }}
                    >
                      {column.render
                        ? column.render(row, index)
                        : row[column.key] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
