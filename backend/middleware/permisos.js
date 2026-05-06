const USUARIOS_CON_DATOS = [
  "MANUEL NIFLA LL",
  "CESAR RAMIREZ MALDONADO",
  "MIGUEL BENITES "
];

function puedeModificarDatos(req, res, next) {
  const usuario = req.headers["x-user-nombre"];

  if (!usuario || !USUARIOS_CON_DATOS.includes(usuario)) {
    return res.status(403).json({
      success: false,
      message: "No tienes permiso para modificar datos maestros"
    });
  }

  next();
}

module.exports = {
  USUARIOS_CON_DATOS,
  puedeModificarDatos
};