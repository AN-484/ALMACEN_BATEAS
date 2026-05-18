const {
  buscarEpps,
  buscarEppPorSAP
} = require("../../services/epps/eppsService");

async function listarCatalogo(req, res) {
  try {
    const data = await buscarEpps(req.query.q);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error("Error catálogo EPPS:", error);

    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Error al listar EPPS"
    });
  }
}

async function buscarPorSAP(req, res) {
  try {
    const data = await buscarEppPorSAP(req.params.sap);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error("Error buscar EPP por SAP:", error);

    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Error al buscar EPP"
    });
  }
}

module.exports = {
  listarCatalogo,
  buscarPorSAP
};