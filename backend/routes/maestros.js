const express = require("express");
const router = express.Router();
const supabase = require("../services/supabaseClient");
const { puedeModificarDatos } = require("../middleware/permisos");

const TABLAS = {
  productos: {
    tabla: "productos",
    pk: "codigo",
    columnas: ["codigo", "nombre", "medida"]
  },
  transportistas: {
    tabla: "transportistas",
    pk: "codigo",
    columnas: ["codigo", "nombre", "ruc"]
  },
  ubicaciones: {
    tabla: "ubicaciones",
    pk: "codigo",
    columnas: ["codigo", "nombre"]
  },
  almacenes: {
    tabla: "almacenes",
    pk: "codigo",
    columnas: ["codigo", "nombre"]
  },
  propietarios: {
    tabla: "propietarios",
    pk: "codigo",
    columnas: ["codigo", "nombre"]
  },
  usuarios: {
    tabla: "usuarios",
    pk: "codigo",
    columnas: ["codigo", "dni", "nombre", "cargo"]
  },
  cilindros: {
    tabla: "cilindros",
    pk: "codigo",
    columnas: ["codigo", "propietario", "producto", "fecha_hidrostatica", "nuevo"]
  }
};

function obtenerConfig(nombre) {
  return TABLAS[nombre] || null;
}

function limpiarPayload(config, body) {
  const payload = {};

  for (const col of config.columnas) {
    if (body[col] !== undefined) {
      payload[col] = body[col];
    }
  }

  return payload;
}

// LISTAR
router.get("/:tabla", async (req, res) => {
  try {
    const config = obtenerConfig(req.params.tabla);

    if (!config) {
      return res.status(400).json({ error: "Tabla no permitida" });
    }

    const { data, error } = await supabase
      .from(config.tabla)
      .select("*")
      .order(config.pk, { ascending: true });

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error("Error listar maestro:", error);
    res.status(500).json({ error: "Error al listar datos" });
  }
});

// CREAR
router.post("/:tabla", puedeModificarDatos, async (req, res) => {
  try {
    const config = obtenerConfig(req.params.tabla);

    if (!config) {
      return res.status(400).json({ error: "Tabla no permitida" });
    }

    const payload = limpiarPayload(config, req.body);

    if (!payload[config.pk]) {
      return res.status(400).json({
        success: false,
        message: `Falta campo obligatorio: ${config.pk}`
      });
    }

    const { data, error } = await supabase
      .from(config.tabla)
      .insert(payload)
      .select();

    if (error) throw error;

    // ✅ Si se crea un cilindro desde maestros,
    // también se crea su estado inicial como STOCK / ALMACEN
    if (req.params.tabla === "cilindros") {
      const hoy = new Date().toISOString().slice(0, 10);

      const { data: estadoExiste, error: errorBuscarEstado } = await supabase
        .from("estado_cilindros")
        .select("*")
        .eq("cilindro", payload.codigo)
        .maybeSingle();

      if (errorBuscarEstado) throw errorBuscarEstado;

      if (!estadoExiste) {
        const { error: errorEstado } = await supabase
          .from("estado_cilindros")
          .insert({
            cilindro: payload.codigo,
            propietario: payload.propietario,
            material: payload.producto,
            estado: "STOCK",
            fecha_mov: hoy,
            ubicacion: "1000" // ALMACEN
          });

        if (errorEstado) throw errorEstado;
      }
    }

    res.json({
      success: true,
      data
    });

  } catch (error) {
    console.error("Error crear maestro:", error);
    res.status(500).json({
      success: false,
      message: "Error al crear registro",
      detail: error.message
    });
  }
});

// ACTUALIZAR
router.put("/:tabla/:id", puedeModificarDatos, async (req, res) => {
  try {
    const config = obtenerConfig(req.params.tabla);

    if (!config) {
      return res.status(400).json({ error: "Tabla no permitida" });
    }

    const payload = limpiarPayload(config, req.body);
    delete payload[config.pk];

    const { data, error } = await supabase
      .from(config.tabla)
      .update(payload)
      .eq(config.pk, req.params.id)
      .select();

    if (error) throw error;

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error("Error actualizar maestro:", error);
    res.status(500).json({
      success: false,
      message: "Error al actualizar registro",
      detail: error.message
    });
  }
});

// ELIMINAR
router.delete("/:tabla/:id", puedeModificarDatos, async (req, res) => {
  try {
    const config = obtenerConfig(req.params.tabla);

    if (!config) {
      return res.status(400).json({ error: "Tabla no permitida" });
    }

    const { data, error } = await supabase
      .from(config.tabla)
      .delete()
      .eq(config.pk, req.params.id)
      .select();

    if (error) throw error;

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error("Error eliminar maestro:", error);
    res.status(500).json({
      success: false,
      message: "Error al eliminar registro",
      detail: error.message
    });
  }
});

module.exports = router;