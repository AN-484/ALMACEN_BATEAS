const directoriosService = require("../../services/guias/directoriosGuiasService");

async function listarDirectorios(req, res) {
  try {
    const data = await directoriosService.listarDirectorios();

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error("Error listar directorios:", error);

    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Error al listar directorios"
    });
  }
}

async function crearDirectorio(req, res) {
  try {
    const data = await directoriosService.crearDirectorio(req.body);

    res.json({
      success: true,
      message: "Directorio creado correctamente",
      data
    });
  } catch (error) {
    console.error("Error crear directorio:", error);

    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Error al crear directorio"
    });
  }
}

module.exports = {
  listarDirectorios,
  crearDirectorio
};