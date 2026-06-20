const express = require("express");
const router = express.Router();
const supabaseLeasing = require("../services/supabaseLeasingClient");

function esNumeroValido(valor, longitud) {
  if (valor === null || valor === undefined || valor === "") {
    return true;
  }

  const texto = String(valor);
  return /^\d+$/.test(texto) && texto.length === longitud;
}

function limpiarTexto(valor) {
  const texto = String(valor ?? "").trim();
  return texto.length > 0 ? texto : null;
}

router.get("/materiales", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();

    if (q.length < 2) {
      return res.json({
        success: true,
        data: []
      });
    }

    const esBusquedaNumerica = /^\d+$/.test(q);

    let query = supabaseLeasing
      .from("materiales")
      .select("id, codigo, descripcion, referencia, ubicacion, placa, estado")
      .eq("estado", 1)
      .limit(10);

    if (esBusquedaNumerica) {
      query = query.eq("codigo", Number(q));
    } else {
      query = query.ilike("descripcion", `%${q}%`);
    }

    const { data, error } = await query.order("descripcion", { ascending: true });

    if (error) {
      throw error;
    }

    return res.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error("Error buscar materiales leasing:", error);
    return res.status(500).json({
      success: false,
      message: "No se pudieron buscar materiales",
      detail: error.message
    });
  }
});

router.post("/ingresos", async (req, res) => {
  try {
    const codigoUsuario = String(req.headers["x-user-codigo"] || "").trim();
    const nombreUsuario = String(req.headers["x-user-nombre"] || "").trim();

    if (!codigoUsuario && !nombreUsuario) {
      return res.status(403).json({
        success: false,
        message: "No se pudo identificar al usuario"
      });
    }

    const { material = {}, movimiento = {} } = req.body || {};

    if (!material.descripcion) {
      return res.status(400).json({
        success: false,
        message: "La descripción del material es obligatoria"
      });
    }

    if (!movimiento.date_movi) {
      return res.status(400).json({
        success: false,
        message: "La fecha de movimiento es obligatoria"
      });
    }

    if (!esNumeroValido(material.codigo, 10)) {
      return res.status(400).json({
        success: false,
        message: "El código de material debe tener 10 dígitos o quedar vacío"
      });
    }

    if (!esNumeroValido(material.placa, 9)) {
      return res.status(400).json({
        success: false,
        message: "La placa del material debe tener 9 dígitos o quedar vacía"
      });
    }

    if (!esNumeroValido(movimiento.placa, 9)) {
      return res.status(400).json({
        success: false,
        message: "La placa del movimiento debe tener 9 dígitos o quedar vacía"
      });
    }

    const materialPayload = {
      codigo: material.codigo ? Number(material.codigo) : null,
      descripcion: String(material.descripcion).trim().toUpperCase(),
      referencia: limpiarTexto(material.referencia),
      ubicacion: limpiarTexto(material.ubicacion)?.toUpperCase() || null,
      placa: material.placa ? Number(material.placa) : null,
      estado: 1,
      modif: 0,
      id_modif: null
    };

    const { data: materialCreado, error: errorMaterial } = await supabaseLeasing
      .from("materiales")
      .insert(materialPayload)
      .select("*")
      .single();

    if (errorMaterial) {
      throw errorMaterial;
    }

    const estadoPayload = {
      id: materialCreado.id,
      mov: 101
    };

    const { error: errorEstado } = await supabaseLeasing
      .from("estado")
      .insert(estadoPayload);

    if (errorEstado) {
      await supabaseLeasing.from("materiales").delete().eq("id", materialCreado.id);
      throw errorEstado;
    }

    const movimientoPayload = {
      codigo_material: materialCreado.id,
      date_movi: movimiento.date_movi,
      tipo_movimiento: 101,
      guia: limpiarTexto(movimiento.guia),
      ubic_destino: limpiarTexto(movimiento.ubic_destino)?.toUpperCase() || null,
      placa: movimiento.placa ? Number(movimiento.placa) : null,
      responsable: codigoUsuario || nombreUsuario,
      destinatario: null,
      obs: limpiarTexto(movimiento.obs),
      edit: 0,
      id_modif: null,
      estado: 1,
      date_elim: null
    };

    const { data: movimientoCreado, error: errorMovimiento } = await supabaseLeasing
      .from("movimientos")
      .insert(movimientoPayload)
      .select("*")
      .single();

    if (errorMovimiento) {
      await supabaseLeasing.from("estado").delete().eq("id", materialCreado.id);
      await supabaseLeasing.from("materiales").delete().eq("id", materialCreado.id);
      throw errorMovimiento;
    }

    return res.json({
      success: true,
      data: {
        material: materialCreado,
        estado: estadoPayload,
        movimiento: movimientoCreado
      }
    });
  } catch (error) {
    console.error("Error registrar ingreso leasing:", error);
    return res.status(500).json({
      success: false,
      message: "No se pudo registrar el ingreso",
      detail: error.message
    });
  }
});

router.post("/salidas", async (req, res) => {
  try {
    const codigoUsuario = String(req.headers["x-user-codigo"] || "").trim();
    const nombreUsuario = String(req.headers["x-user-nombre"] || "").trim();

    if (!codigoUsuario && !nombreUsuario) {
      return res.status(403).json({
        success: false,
        message: "No se pudo identificar al usuario"
      });
    }

    const { movimiento = {} } = req.body || {};

    if (!movimiento.codigo_material) {
      return res.status(400).json({
        success: false,
        message: "Debe seleccionar un material"
      });
    }

    if (!movimiento.date_movi) {
      return res.status(400).json({
        success: false,
        message: "La fecha de movimiento es obligatoria"
      });
    }

    const { data: material, error: errorMaterial } = await supabaseLeasing
      .from("materiales")
      .select("id, codigo, descripcion, referencia, ubicacion, placa, estado")
      .eq("id", movimiento.codigo_material)
      .eq("estado", 1)
      .single();

    if (errorMaterial || !material) {
      return res.status(404).json({
        success: false,
        message: "No se encontró el material seleccionado"
      });
    }

    if (!esNumeroValido(material.placa, 9)) {
      return res.status(400).json({
        success: false,
        message: "La placa asociada al material no es válida"
      });
    }

    const movimientoPayload = {
      codigo_material: material.id,
      date_movi: movimiento.date_movi,
      tipo_movimiento: 201,
      guia: "NC",
      ubic_destino: limpiarTexto(movimiento.ubic_destino)?.toUpperCase() || null,
      placa: material.placa ? Number(material.placa) : null,
      responsable: codigoUsuario || nombreUsuario,
      destinatario: limpiarTexto(movimiento.destinatario),
      obs: limpiarTexto(movimiento.obs),
      edit: 0,
      id_modif: null,
      estado: 1,
      date_elim: null
    };

    const { data: movimientoCreado, error: errorMovimiento } = await supabaseLeasing
      .from("movimientos")
      .insert(movimientoPayload)
      .select("*")
      .single();

    if (errorMovimiento) {
      throw errorMovimiento;
    }

    const { data: estadoActualizado, error: errorEstado } = await supabaseLeasing
      .from("estado")
      .update({ mov: 201 })
      .eq("id", material.id)
      .select("*")
      .single();

    if (errorEstado) {
      await supabaseLeasing.from("movimientos").delete().eq("id", movimientoCreado.id);
      throw errorEstado;
    }

    return res.json({
      success: true,
      data: {
        material,
        estado: estadoActualizado,
        movimiento: movimientoCreado
      }
    });
  } catch (error) {
    console.error("Error registrar salida leasing:", error);
    return res.status(500).json({
      success: false,
      message: "No se pudo registrar la salida",
      detail: error.message
    });
  }
});

module.exports = router;
