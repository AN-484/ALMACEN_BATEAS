const supabase = require("../supabaseClient");

function normalizarTexto(valor) {
  return String(valor || "").trim().toUpperCase();
}

async function listarDirectorios() {
  const { data, error } = await supabase
    .from("directorios_guias")
    .select("*")
    .eq("activo", true)
    .order("id_directorio", { ascending: true });

  if (error) throw error;

  return data || [];
}

async function crearDirectorio({ nombre, descripcion }) {
  if (!nombre || !String(nombre).trim()) {
    const error = new Error("El nombre del directorio es obligatorio");
    error.status = 400;
    throw error;
  }

  const { data, error } = await supabase
    .from("directorios_guias")
    .insert({
      nombre: normalizarTexto(nombre),
      descripcion: descripcion ? normalizarTexto(descripcion) : null,
      activo: true
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}

module.exports = {
  listarDirectorios,
  crearDirectorio
};