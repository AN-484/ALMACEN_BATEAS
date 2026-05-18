export function exportarCSV(data, filename = "solicitudes_epps.csv") {
  if (!data || data.length === 0) {
    alert("No hay datos para exportar");
    return;
  }

  const headers = Object.keys(data[0]);

  const rows = data.map(obj =>
    headers
      .map(h => `"${String(obj[h] ?? "").replace(/"/g, '""')}"`)
      .join(",")
  );

  const csv = [headers.join(","), ...rows].join("\n");

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}