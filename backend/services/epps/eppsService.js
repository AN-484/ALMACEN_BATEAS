const supabase = require("../supabaseClient");
const {
  normalizarSAP,
  validarSAP,
  normalizarTexto,
  formatearSAPVisual
} = require("../../utils/sap");

async function buscarEpps(q) {
  let query = supabase
    .from("epps")
    .select("*")
    .eq("activo", true)
    .order("descripcion", { ascending: true });

  if (q && String(q).trim()) {
    const texto = normalizarTexto(q);
    const sap = normalizarSAP(q);

    if (sap.length > 0) {
      query = query.or(`sap.ilike.%${sap}%,descripcion.ilike.%${texto}%`);
    } else {
      query = query.ilike("descripcion", `%${texto}%`);
    }
  }

  const { data, error } = await query;

  if (error) throw error;

  return (data || []).map(item => ({
    ...item,
    sap_visual: formatearSAPVisual(item.sap)
  }));
}

async function buscarEppPorSAP(sapValor) {
  const sap = normalizarSAP(sapValor);

  if (!validarSAP(sap)) {
    const error = new Error("SAP inválido. Debe tener 10 dígitos.");
    error.status = 400;
    throw error;
  }

  const { data, error } = await supabase
    .from("epps")
    .select("*")
    .eq("sap", sap)
    .eq("activo", true)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    const errorNotFound = new Error("EPP no encontrado");
    errorNotFound.status = 404;
    throw errorNotFound;
  }

  return {
    ...data,
    sap_visual: formatearSAPVisual(data.sap)
  };
}

module.exports = {
  buscarEpps,
  buscarEppPorSAP
};