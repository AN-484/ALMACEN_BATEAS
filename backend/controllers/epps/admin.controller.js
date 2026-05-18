const {
  listarPendientes,
  listarPorGenerar,
  aprobarSolicitud,
  generarReserva,
  exportarSolicitudes
} = require("../../services/epps/adminService");

function usuarioActual(req) {
  return {
    codigo: req.headers["x-user-codigo"],
    nombre: req.headers["x-user-nombre"]
  };
}

async function pendientes(req, res) {
  try {
    const data = await listarPendientes();

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error("Error pendientes EPPS:", error);

    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Error al listar pendientes"
    });
  }
}

async function porGenerar(req, res) {
  try {
    const data = await listarPorGenerar();

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error("Error por generar EPPS:", error);

    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Error al listar solicitudes por generar"
    });
  }
}

async function aprobar(req, res) {
  try {
    const { codigo } = usuarioActual(req);

    const result = await aprobarSolicitud({
      id_soli: req.params.id_soli,
      codigoAdmin: codigo,
      items: req.body.items,
      aprobar: req.body.aprobar,
      obs_aprobada: req.body.obs_aprobada
    });

    res.json({
      success: true,
      message: result.mensaje
    });
  } catch (error) {
    console.error("Error aprobar EPPS:", error);

    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Error al aprobar solicitud"
    });
  }
}

async function generar(req, res) {
  try {
    const { codigo } = usuarioActual(req);

    await generarReserva({
        id_soli: req.params.id_soli,
        codigoAdmin: codigo,
        reserva: req.body.reserva,
        items: req.body.items,
        obs_general: req.body.obs_general
    });

    res.json({
      success: true,
      message: "Reserva registrada correctamente"
    });
  } catch (error) {
    console.error("Error generar reserva EPPS:", error);

    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Error al generar reserva"
    });
  }
}

async function exportar(req, res) {
  try {
    const data = await exportarSolicitudes();

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error("Error exportar EPPS:", error);

    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Error al exportar solicitudes"
    });
  }
}

module.exports = {
  pendientes,
  porGenerar,
  aprobar,
  generar,
  exportar
};