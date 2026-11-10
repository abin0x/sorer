export default async function countMigrationCsvRows(file) {
  const reader = file.stream().getReader();
  let quoted = false, nonempty = false, records = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      for (const byte of value) {
        if (byte === 34) quoted = !quoted;
        if (byte === 10 && !quoted) { if (nonempty) records++; nonempty = false; }
        else if (![9, 10, 13, 32, 34, 44].includes(byte)) nonempty = true;
      }
    }
    if (nonempty) records++;
    return Math.max(0, records - 1);
  } finally { await reader.cancel(); }
}