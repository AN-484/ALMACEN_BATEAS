const express = require("express");
const router = express.Router();

const { puedeModificarDatos } = require("../middleware/permisos");

const catalogoController = require("../controllers/epps/catalogo.controller");
const solicitudesController = require("../controllers/epps/solicitudes.controller");
const adminController = require("../controllers/epps/admin.controller");

// CATÁLOGO EPPS
router.get("/catalogo", catalogoController.listarCatalogo);
router.get("/catalogo/sap/:sap", catalogoController.buscarPorSAP);

// USUARIO
router.get("/mis-solicitudes", solicitudesController.misSolicitudes);
router.get("/solicitud/:id_soli", solicitudesController.detalle);
router.post("/solicitud", solicitudesController.crear);
router.put("/solicitud/:id_soli", solicitudesController.actualizar);
router.delete("/solicitud/:id_soli", solicitudesController.eliminar);
// MARCAR RECOGIDO (usuario que creó la solicitud)
router.put("/recogido/:id_soli", solicitudesController.marcarRecogido);

// ADMIN
router.get("/admin/pendientes", puedeModificarDatos, adminController.pendientes);
router.get("/admin/generar", puedeModificarDatos, adminController.porGenerar);
router.put("/admin/aprobar/:id_soli", puedeModificarDatos, adminController.aprobar);
router.put("/admin/generar/:id_soli", puedeModificarDatos, adminController.generar);
router.get("/admin/exportar", puedeModificarDatos, adminController.exportar);

module.exports = router;