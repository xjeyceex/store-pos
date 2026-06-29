export type CsvColumn<T> = {
  key: keyof T | string;
  header: string;
  /** Optional custom formatter for the cell value. */
  format?: (row: T) => string | number;
};

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCSV<T extends Record<string, unknown>>(
  rows: T[],
  columns: CsvColumn<T>[]
): string {
  const header = columns.map((c) => escapeCell(c.header)).join(",");
  const body = rows.map((row) =>
    columns
      .map((c) =>
        escapeCell(c.format ? c.format(row) : row[c.key as keyof T])
      )
      .join(",")
  );
  return [header, ...body].join("\r\n");
}

/** Triggers a client-side CSV file download. */
export function downloadCSV(filename: string, csv: string): void {
  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
