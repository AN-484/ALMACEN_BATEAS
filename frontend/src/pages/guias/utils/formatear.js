export function mayus(valor) {
  return String(valor || "").toUpperCase();
}

export function limpiarRuc(valor) {
  return String(valor || "").replace(/\D/g, "").slice(0, 11);
}

export function formatearFecha(fecha) {
  if (!fecha) return "-";

  return new Date(fecha).toLocaleString("es-PE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}