function normalizarSAP(valor) {
  return String(valor || "")
    .replace(/\D/g, "")
    .slice(0, 10);
}

function validarSAP(valor) {
  return /^\d{10}$/.test(String(valor || ""));
}

function formatearSAPVisual(valor) {
  const sap = normalizarSAP(valor);

  if (!sap) return "";

  const primero = sap.slice(0, 1);
  const resto = sap.slice(1).replace(/^0+/, "") || "0";

  return `${primero}#${resto}`;
}

function normalizarTexto(valor) {
  return String(valor || "")
    .trim()
    .toUpperCase();
}

module.exports = {
  normalizarSAP,
  validarSAP,
  formatearSAPVisual,
  normalizarTexto
};