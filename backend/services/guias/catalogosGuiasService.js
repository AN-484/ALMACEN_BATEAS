const supabase = require("../supabaseClient");

async function listarTipos() {
  const { data, error } = await supabase
    .from("tipos_guias")
    .select("*")
    .eq("activo", true)
    .order("id_tipo", { ascending: true });

  if (error) throw error;

  return data || [];
}

module.exports = {
  listarTipos
};