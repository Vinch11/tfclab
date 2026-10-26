/** RFC 4180 quoting; JSON diagnostics remain a single CSV cell. */
export function matrixCsv(rows: ReadonlyArray<ReadonlyArray<unknown>>): string {
  return rows.map(row => row.map(value => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",")).join("\n") + "\n";
}
