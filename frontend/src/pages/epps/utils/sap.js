export function limpiarSAP(valor) {
  return String(valor || "")
    .replace(/\D/g, "")
    .slice(0, 10);
}

export function formatearSAPVisual(valor) {
  const sap = limpiarSAP(valor);

  if (!sap) return "";

  const primero = sap.slice(0, 1);
  const resto = sap.slice(1).replace(/^0+/, "") || "0";

  return `${primero}#${resto}`;
}

export function mayus(valor) {
  return String(valor || "").toUpperCase();
}