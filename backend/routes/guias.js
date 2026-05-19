const express = require("express");
const multer = require("multer");
const router = express.Router();

const { puedeModificarDatos } = require("../middleware/permisos");

const catalogosController = require("../controllers/guias/catalogos.controller");
const directoriosController = require("../controllers/guias/directorios.controller");
const proveedoresController = require("../controllers/guias/proveedores.controller");
const documentosController = require("../controllers/guias/documentos.controller");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Solo se permiten archivos PDF"));
    }

    cb(null, true);
  }
});

// Catálogos
router.get("/tipos", catalogosController.listarTipos);

// Directorios
router.get("/directorios", directoriosController.listarDirectorios);
router.post(
  "/directorios",
  puedeModificarDatos,
  directoriosController.crearDirectorio
);

// Proveedores
router.get("/proveedores", proveedoresController.buscarProveedores);
router.post("/proveedores", proveedoresController.crearProveedor);

// Documentos
router.get("/documentos", documentosController.listarDocumentos);
router.get("/documentos/:id_documento", documentosController.obtenerDocumento);
router.get("/documentos/:id_documento/link", documentosController.generarLinkDocumento);

router.put("/documentos/:id_documento", documentosController.actualizarDocumento);
router.delete("/documentos/:id_documento", documentosController.eliminarDocumento);

router.post(
  "/documentos",
  upload.single("archivo"),
  documentosController.subirDocumento
);

module.exports = router;