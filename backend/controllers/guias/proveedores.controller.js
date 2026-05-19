const proveedoresService = require("../../services/guias/proveedoresGuiasService");

async function buscarProveedores(req, res) {
  try {
    const data = await proveedoresService.buscarProveedores(req.query.q);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error("Error buscar proveedores:", error);

    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Error al buscar proveedores"
    });
  }
}

async function crearProveedor(req, res) {
  try {
    const data = await proveedoresService.crearProveedor(req.body);

    res.json({
      success: true,
      message: "Proveedor registrado correctamente",
      data
    });
  } catch (error) {
    console.error("Error crear proveedor:", error);

    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Error al crear proveedor"
    });
  }
}

module.exports = {
  buscarProveedores,
  crearProveedor
};