const {
  crearSolicitud,
  listarMisSolicitudes,
  obtenerDetalleSolicitud,
  actualizarSolicitud,
  eliminarSolicitud
} = require("../../services/epps/solicitudesService");

function usuarioActual(req) {
  return {
    codigo: req.headers["x-user-codigo"],
    nombre: req.headers["x-user-nombre"]
  };
}

async function crear(req, res) {
  try {
    const { codigo } = usuarioActual(req);

    const id_soli = await crearSolicitud({
      codigoUsuario: codigo,
      items: req.body.items
    });

    res.json({
      success: true,
      message: "Solicitud registrada correctamente",
      id_soli
    });
  } catch (error) {
    console.error("Error crear solicitud EPPS:", error);

    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Error al crear solicitud"
    });
  }
}

async function misSolicitudes(req, res) {
  try {
    const { codigo } = usuarioActual(req);

    const data = await listarMisSolicitudes(codigo);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error("Error mis solicitudes EPPS:", error);

    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Error al listar solicitudes"
    });
  }
}

async function detalle(req, res) {
  try {
    const data = await obtenerDetalleSolicitud(req.params.id_soli);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Solicitud no encontrada"
      });
    }

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error("Error detalle solicitud EPPS:", error);

    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Error al cargar detalle"
    });
  }
}

async function actualizar(req, res) {
  try {
    const { codigo } = usuarioActual(req);

    await actualizarSolicitud({
      id_soli: req.params.id_soli,
      codigoUsuario: codigo,
      items: req.body.items
    });

    res.json({
      success: true,
      message: "Solicitud actualizada correctamente"
    });
  } catch (error) {
    console.error("Error actualizar solicitud EPPS:", error);

    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Error al actualizar solicitud"
    });
  }
}

async function eliminar(req, res) {
  try {
    const { codigo } = usuarioActual(req);

    await eliminarSolicitud({
      id_soli: req.params.id_soli,
      codigoUsuario: codigo
    });

    res.json({
      success: true,
      message: "Solicitud eliminada correctamente"
    });
  } catch (error) {
    console.error("Error eliminar solicitud EPPS:", error);

    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Error al eliminar solicitud"
    });
  }
}

module.exports = {
  crear,
  misSolicitudes,
  detalle,
  actualizar,
  eliminar
};