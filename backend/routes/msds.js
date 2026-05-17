const express = require("express");
const router = express.Router();
const multer = require("multer");
const supabase = require("../services/supabaseClient");
const { puedeModificarDatos } = require("../middleware/permisos");

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

function limpiarNombreArchivo(nombre) {
  return String(nombre || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .toLowerCase();
}

function validarSAP(sap) {
  return /^\d{10}$/.test(String(sap || "").trim());
}

function normalizarSAP(valor) {
  return String(valor || "")
    .replace(/\D/g, "")
    .slice(0, 10);
}

function normalizarTexto(valor) {
  return String(valor || "").trim().toUpperCase();
}

async function obtenerProductoPorSAP(sap) {
  const { data, error } = await supabase
    .from("msds_productos")
    .select(`
      sap,
      nombre,
      descripcion,
      archivo_id,
      activo,
      archivo:msds_archivos (
        id,
        nombre_archivo,
        storage_path,
        url_archivo,
        activo
      )
    `)
    .eq("sap", sap)
    .maybeSingle();

  if (error) throw error;

  return data;
}

async function contarReferenciasArchivo(archivoId) {
  const { count, error } = await supabase
    .from("msds_productos")
    .select("*", { count: "exact", head: true })
    .eq("archivo_id", archivoId);

  if (error) throw error;

  return count || 0;
}

async function eliminarArchivoSiQuedaLibre(archivoId, storagePath) {
  if (!archivoId) return;

  const referencias = await contarReferenciasArchivo(archivoId);

  if (referencias === 0) {
    if (storagePath) {
      await supabase
        .storage
        .from("msds")
        .remove([storagePath]);
    }

    await supabase
      .from("msds_archivos")
      .delete()
      .eq("id", archivoId);
  }
}

async function subirNuevoArchivo(reqFile, sap) {
  const nombreArchivo = limpiarNombreArchivo(reqFile.originalname);
  const storagePath = `pdfs/${sap}_${Date.now()}_${nombreArchivo}`;

  const { error: uploadError } = await supabase
    .storage
    .from("msds")
    .upload(storagePath, reqFile.buffer, {
      contentType: "application/pdf",
      upsert: false
    });

  if (uploadError) throw uploadError;

  const { data: publicData } = supabase
    .storage
    .from("msds")
    .getPublicUrl(storagePath);

  const urlArchivo = publicData.publicUrl;

  const { data: archivoInsertado, error: errorArchivo } = await supabase
    .from("msds_archivos")
    .insert({
      nombre_archivo: nombreArchivo,
      storage_path: storagePath,
      url_archivo: urlArchivo,
      bucket: "msds",
      activo: true
    })
    .select()
    .single();

  if (errorArchivo) throw errorArchivo;

  return archivoInsertado;
}

async function obtenerArchivoDesdeSAPReferencia(sapReferencia, sapActual = null) {
  const sapRef = normalizarSAP(sapReferencia);

  if (!validarSAP(sapRef)) {
    throw new Error("El SAP de referencia debe tener exactamente 10 dígitos");
  }

  if (sapActual && sapRef === sapActual) {
    throw new Error("No puede referenciarse a sí mismo");
  }

  const productoRef = await obtenerProductoPorSAP(sapRef);

  if (!productoRef || !productoRef.activo) {
    throw new Error("El SAP de referencia no existe o está inactivo");
  }

  if (!productoRef.archivo_id) {
    throw new Error("El SAP de referencia no tiene archivo asociado");
  }

  return {
    archivo_id: productoRef.archivo_id,
    archivo: productoRef.archivo
  };
}

// BUSCAR POR SAP O NOMBRE
router.get("/buscar", async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || !String(q).trim()) {
      return res.status(400).json({
        success: false,
        message: "Ingrese SAP o nombre para buscar"
      });
    }

    const texto = String(q).trim().toUpperCase();

    const { data, error } = await supabase
      .from("msds_productos")
      .select(`
        sap,
        nombre,
        descripcion,
        archivo_id,
        activo,
        archivo:msds_archivos (
          id,
          nombre_archivo,
          storage_path,
          url_archivo
        )
      `)
      .eq("activo", true)
      .or(`sap.ilike.%${texto}%,nombre.ilike.%${texto}%`)
      .order("nombre", { ascending: true });

    if (error) throw error;

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error("Error buscando MSDS:", error);

    res.status(500).json({
      success: false,
      message: "Error al buscar MSDS",
      detail: error.message
    });
  }
});

// OBTENER POR SAP
router.get("/:sap", async (req, res) => {
  try {
    const sap = normalizarSAP(req.params.sap);

    if (!validarSAP(sap)) {
      return res.status(400).json({
        success: false,
        message: "El SAP debe tener exactamente 10 dígitos"
      });
    }

    const data = await obtenerProductoPorSAP(sap);

    if (!data || !data.activo) {
      return res.status(404).json({
        success: false,
        message: "MSDS no encontrado"
      });
    }

    const referencias = data.archivo_id
      ? await contarReferenciasArchivo(data.archivo_id)
      : 0;

    res.json({
      success: true,
      producto: {
        sap: data.sap,
        nombre: data.nombre,
        descripcion: data.descripcion,
        archivo_id: data.archivo_id,
        nombre_archivo: data.archivo?.nombre_archivo,
        storage_path: data.archivo?.storage_path,
        pdf_url: data.archivo?.url_archivo,
        referencias_archivo: referencias
      }
    });
  } catch (error) {
    console.error("Error obteniendo MSDS:", error);

    res.status(500).json({
      success: false,
      message: "Error al obtener MSDS",
      detail: error.message
    });
  }
});

// AGREGAR MSDS
router.post("/", puedeModificarDatos, upload.single("archivo"), async (req, res) => {
  try {
    const sap = normalizarSAP(req.body.sap);
    const nombre = normalizarTexto(req.body.nombre);
    const descripcion = normalizarTexto(req.body.descripcion);
    const modoArchivo = normalizarTexto(req.body.modo_archivo || "NUEVO");
    const sapReferencia = normalizarSAP(req.body.sap_referencia);

    if (!validarSAP(sap)) {
      return res.status(400).json({
        success: false,
        message: "El código SAP debe tener exactamente 10 dígitos"
      });
    }

    if (!nombre) {
      return res.status(400).json({
        success: false,
        message: "El nombre visible es obligatorio"
      });
    }

    const existente = await obtenerProductoPorSAP(sap);

    if (existente) {
      return res.status(400).json({
        success: false,
        message: "Ya existe un MSDS registrado con ese SAP. Use actualizar."
      });
    }

    let archivoId = null;

    if (modoArchivo === "REFERENCIA") {
      const ref = await obtenerArchivoDesdeSAPReferencia(sapReferencia, sap);
      archivoId = ref.archivo_id;
    } else {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Debe seleccionar un archivo PDF o usar referencia"
        });
      }

      const archivoNuevo = await subirNuevoArchivo(req.file, sap);
      archivoId = archivoNuevo.id;
    }

    const { error: errorProducto } = await supabase
      .from("msds_productos")
      .insert({
        sap,
        archivo_id: archivoId,
        nombre,
        descripcion: descripcion || null,
        activo: true
      });

    if (errorProducto) throw errorProducto;

    res.json({
      success: true,
      message: "MSDS registrado correctamente",
      data: {
        sap,
        nombre,
        archivo_id: archivoId,
        modo_archivo: modoArchivo
      }
    });
  } catch (error) {
    console.error("Error registrando MSDS:", error);

    res.status(500).json({
      success: false,
      message: "Error al registrar MSDS",
      detail: error.message
    });
  }
});

// ACTUALIZAR MSDS
router.put("/:sap", puedeModificarDatos, upload.single("archivo"), async (req, res) => {
  try {
    const sap = normalizarSAP(req.params.sap);
    const nombre = normalizarTexto(req.body.nombre);
    const descripcion = normalizarTexto(req.body.descripcion);
    const modoArchivo = normalizarTexto(req.body.modo_archivo || "MANTENER");
    const sapReferencia = normalizarSAP(req.body.sap_referencia);

    if (!validarSAP(sap)) {
      return res.status(400).json({
        success: false,
        message: "El código SAP debe tener exactamente 10 dígitos"
      });
    }

    if (!nombre) {
      return res.status(400).json({
        success: false,
        message: "El nombre visible es obligatorio"
      });
    }

    const actual = await obtenerProductoPorSAP(sap);

    if (!actual) {
      return res.status(404).json({
        success: false,
        message: "No existe un MSDS con ese SAP"
      });
    }

    const archivoAnteriorId = actual.archivo_id;
    const storageAnterior = actual.archivo?.storage_path || null;

    let nuevoArchivoId = archivoAnteriorId;

    if (modoArchivo === "NUEVO") {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Debe seleccionar un nuevo PDF"
        });
      }

      const archivoNuevo = await subirNuevoArchivo(req.file, sap);
      nuevoArchivoId = archivoNuevo.id;
    }

    if (modoArchivo === "REFERENCIA") {
      const ref = await obtenerArchivoDesdeSAPReferencia(sapReferencia, sap);
      nuevoArchivoId = ref.archivo_id;
    }

    const { error: errorUpdate } = await supabase
      .from("msds_productos")
      .update({
        nombre,
        descripcion: descripcion || null,
        archivo_id: nuevoArchivoId,
        activo: true
      })
      .eq("sap", sap);

    if (errorUpdate) throw errorUpdate;

    // Si cambió de archivo, revisar si el archivo anterior quedó sin uso.
    if (archivoAnteriorId && archivoAnteriorId !== nuevoArchivoId) {
      await eliminarArchivoSiQuedaLibre(archivoAnteriorId, storageAnterior);
    }

    res.json({
      success: true,
      message: "MSDS actualizado correctamente",
      data: {
        sap,
        nombre,
        archivo_id: nuevoArchivoId,
        modo_archivo: modoArchivo
      }
    });
  } catch (error) {
    console.error("Error actualizando MSDS:", error);

    res.status(500).json({
      success: false,
      message: "Error al actualizar MSDS",
      detail: error.message
    });
  }
});

// ELIMINAR MSDS
router.delete("/:sap", puedeModificarDatos, async (req, res) => {
  try {
    const sap = normalizarSAP(req.params.sap);

    if (!validarSAP(sap)) {
      return res.status(400).json({
        success: false,
        message: "El código SAP debe tener exactamente 10 dígitos"
      });
    }

    const actual = await obtenerProductoPorSAP(sap);

    if (!actual) {
      return res.status(404).json({
        success: false,
        message: "No existe un MSDS con ese SAP"
      });
    }

    const archivoId = actual.archivo_id;
    const storagePath = actual.archivo?.storage_path || null;

    const referenciasAntes = archivoId
      ? await contarReferenciasArchivo(archivoId)
      : 0;

    const { error: errorProducto } = await supabase
      .from("msds_productos")
      .delete()
      .eq("sap", sap);

    if (errorProducto) throw errorProducto;

    let archivoEliminado = false;

    if (archivoId && referenciasAntes <= 1) {
      await eliminarArchivoSiQuedaLibre(archivoId, storagePath);
      archivoEliminado = true;
    }

    res.json({
      success: true,
      message: archivoEliminado
        ? "MSDS eliminado correctamente. El PDF también fue eliminado porque no tenía más referencias."
        : "MSDS eliminado correctamente. El PDF se conserva porque está usado por otros SAP.",
      archivo_eliminado: archivoEliminado,
      referencias_antes: referenciasAntes
    });
  } catch (error) {
    console.error("Error eliminando MSDS:", error);

    res.status(500).json({
      success: false,
      message: "Error al eliminar MSDS",
      detail: error.message
    });
  }
});

module.exports = router;