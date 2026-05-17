const supabase = require("../services/supabaseClient");

async function puedeModificarDatos(req, res, next) {
  try {
    const codigoUsuario = req.headers["x-user-codigo"];
    const nombreUsuario = req.headers["x-user-nombre"];

    if (!codigoUsuario && !nombreUsuario) {
      return res.status(403).json({
        success: false,
        message: "No se pudo validar permisos del usuario"
      });
    }

    let query = supabase
      .from("usuarios")
      .select("codigo, nombre, permisos")
      .limit(1);

    if (codigoUsuario) {
      query = query.eq("codigo", codigoUsuario);
    } else {
      query = query.eq("nombre", nombreUsuario);
    }

    const { data, error } = await query.single();

    if (error || !data || Number(data.permisos) !== 1) {
      return res.status(403).json({
        success: false,
        message: "No tienes permiso para modificar datos"
      });
    }

    next();

  } catch (error) {
    console.error("Error validando permisos:", error);

    return res.status(500).json({
      success: false,
      message: "Error al validar permisos"
    });
  }
}

module.exports = {
  puedeModificarDatos
};