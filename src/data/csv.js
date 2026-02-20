export function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      const raw = values[j] ?? "";
      row[headers[j]] = /^-?\d+(\.\d+)?$/.test(raw) ? Number(raw) : raw;
    }
    rows.push(row);
  }

  return rows;
}
