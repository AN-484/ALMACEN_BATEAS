const supabase = require("../supabaseClient");

function normalizarTexto(valor) {
  return String(valor || "").trim().toUpperCase();
}

function limpiarRuc(valor) {
  return String(valor || "").replace(/\D/g, "").slice(0, 11);
}

async function buscarProveedores(q) {
  let query = supabase
    .from("proveedores_guias")
    .select("*")
    .eq("activo", true)
    .order("nombre", { ascending: true });

  if (q && String(q).trim()) {
    const texto = normalizarTexto(q);
    const ruc = limpiarRuc(q);

    if (ruc) {
      query = query.or(`ruc.ilike.%${ruc}%,nombre.ilike.%${texto}%`);
    } else {
      query = query.ilike("nombre", `%${texto}%`);
    }
  }

  const { data, error } = await query;

  if (error) throw error;

  return data || [];
}

async function crearProveedor({ ruc, nombre }) {
  const rucLimpio = limpiarRuc(ruc);

  if (rucLimpio.length !== 11) {
    const error = new Error("El RUC debe tener exactamente 11 dígitos");
    error.status = 400;
    throw error;
  }

  if (!nombre || !String(nombre).trim()) {
    const error = new Error("El nombre del proveedor es obligatorio");
    error.status = 400;
    throw error;
  }

  const { data, error } = await supabase
    .from("proveedores_guias")
    .upsert({
      ruc: rucLimpio,
      nombre: normalizarTexto(nombre),
      activo: true
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}

async function obtenerProveedorPorRuc(ruc) {
  const rucLimpio = limpiarRuc(ruc);

  const { data, error } = await supabase
    .from("proveedores_guias")
    .select("*")
    .eq("ruc", rucLimpio)
    .maybeSingle();

  if (error) throw error;

  return data;
}

module.exports = {
  buscarProveedores,
  crearProveedor,
  obtenerProveedorPorRuc,
  limpiarRuc
};