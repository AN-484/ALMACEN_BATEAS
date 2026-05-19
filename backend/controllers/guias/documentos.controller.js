const documentosService = require("../../services/guias/documentosGuiasService");

function usuarioActual(req) {
  return {
    codigo: req.headers["x-user-codigo"],
    nombre: req.headers["x-user-nombre"]
  };
}

async function subirDocumento(req, res) {
  try {
    const { codigo } = usuarioActual(req);

    const data = await documentosService.registrarDocumento({
      body: req.body,
      file: req.file,
      usuario: codigo
    });

    res.json({
      success: true,
      message: "Documento registrado correctamente",
      data
    });
  } catch (error) {
    console.error("Error subir documento guía/factura:", error);

    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Error al subir documento"
    });
  }
}

async function listarDocumentos(req, res) {
  try {
    const data = await documentosService.listarDocumentos(req.query);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error("Error listar documentos:", error);

    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Error al listar documentos"
    });
  }
}

async function obtenerDocumento(req, res) {
  try {
    const data = await documentosService.obtenerDocumento(req.params.id_documento);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Documento no encontrado"
      });
    }

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error("Error obtener documento:", error);

    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Error al obtener documento"
    });
  }
}

async function generarLinkDocumento(req, res) {
  try {
    const data = await documentosService.generarLinkDocumento(
      req.params.id_documento,
      600
    );

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error("Error generar link documento:", error);

    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Error al generar link temporal"
    });
  }
}

async function actualizarDocumento(req, res) {
  try {
    const { codigo } = usuarioActual(req);

    const data = await documentosService.actualizarDocumento({
      id_documento: req.params.id_documento,
      body: req.body,
      usuario: codigo
    });

    res.json({
      success: true,
      message: "Documento actualizado correctamente",
      data
    });
  } catch (error) {
    console.error("Error actualizar documento:", error);

    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Error al actualizar documento"
    });
  }
}

async function eliminarDocumento(req, res) {
  try {
    const { codigo } = usuarioActual(req);

    await documentosService.eliminarDocumento({
      id_documento: req.params.id_documento,
      usuario: codigo
    });

    res.json({
      success: true,
      message: "Documento eliminado correctamente"
    });
  } catch (error) {
    console.error("Error eliminar documento:", error);

    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Error al eliminar documento"
    });
  }
}

module.exports = {
  subirDocumento,
  listarDocumentos,
  obtenerDocumento,
  generarLinkDocumento,
  actualizarDocumento,
  eliminarDocumento
};