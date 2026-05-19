const catalogosService = require("../../services/guias/catalogosGuiasService");

async function listarTipos(req, res) {
  try {
    const data = await catalogosService.listarTipos();

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error("Error listar tipos guías:", error);

    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Error al listar tipos"
    });
  }
}

module.exports = {
  listarTipos
};