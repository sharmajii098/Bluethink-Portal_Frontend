/** Parse CSV including quoted commas, escaped quotes and embedded newlines. */
export function parseReportCsv(source: string): string[][] {
  const rows: string[][] = []; let row: string[] = [], value = "", quoted = false;
  const input = source.replace(/^\uFEFF/, "");
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (c === '"') { if (quoted && input[i + 1] === '"') { value += '"'; i++; } else quoted = !quoted; }
    else if (c === "," && !quoted) { row.push(value); value = ""; }
    else if ((c === "\n" || c === "\r") && !quoted) { if (c === "\r" && input[i + 1] === "\n") i++; row.push(value); rows.push(row); row = []; value = ""; }
    else value += c;
  }
  if (value || row.length) { row.push(value); rows.push(row); }
  return rows;
}

/** Keep identifiers and untrusted strings literal; type actual report measures. */
export function reportCellValue(heading: string, value: string): { value: string | number | Date; format?: string } {
  if (/date/i.test(heading) && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(value + "T00:00:00Z");
    if (!Number.isNaN(date.getTime()) && date.toISOString().startsWith(value)) return { value: date, format: "yyyy-mm-dd" };
  }
  const words = heading.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]/g, " ");
  if (/\b(id|code|account|phone|pan|number)\b/i.test(words)) return { value };
  if (/^-?\d+(?:\.\d+)?%$/.test(value)) return { value: Number(value.slice(0, -1)) / 100, format: "0.0%" };
  if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value) && value.replace(/[^0-9]/g, "").length < 15) {
    return { value: Number(value), format: /salary|cost|gross|net|amount|deduct|bonus|hra|allowance|basic|tds|pf|esi/i.test(heading) ? '#,##0.00;[Red]-#,##0.00' : undefined };
  }
  return { value }; // ExcelJS strings are not formula objects.
}
