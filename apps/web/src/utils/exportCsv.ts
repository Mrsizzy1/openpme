/**
 * Utilitaire d'exportation de données au format CSV / Excel
 * Compatible avec Microsoft Excel, LibreOffice et Google Sheets
 */

export function exportToCsv(filename: string, rows: Record<string, any>[]) {
  if (!rows || !rows.length) {
    alert('Aucune donnée à exporter.');
    return;
  }

  const separator = ';';
  const keys = Object.keys(rows[0]);

  const headerContent = keys.map((key) => `"${key}"`).join(separator);
  
  const rowsContent = rows.map((row) =>
    keys
      .map((k) => {
        let cell = row[k] === null || row[k] === undefined ? '' : row[k];
        cell = String(cell).replace(/"/g, '""'); // Échappement des guillemets
        return `"${cell}"`;
      })
      .join(separator)
  );

  const csvContent = '\uFEFF' + [headerContent, ...rowsContent].join('\r\n'); // BOM UTF-8 pour Excel

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
