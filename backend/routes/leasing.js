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

function valorIgualAnterior(actual, nuevo) {
  const actualNormalizado = actual === undefined ? null : actual;
  const nuevoNormalizado = nuevo === undefined ? null : nuevo;
  return actualNormalizado === nuevoNormalizado;
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

router.get("/movimientos", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const tipo = Number(req.query.tipo || 0);

    if (q.length < 2) {
      return res.json({
        success: true,
        data: []
      });
    }

    const tiposPermitidos = [101, 201];
    const tipoFiltro = tiposPermitidos.includes(tipo) ? tipo : null;
    const esBusquedaNumerica = /^\d+$/.test(q);

    let materialesQuery = supabaseLeasing
      .from("materiales")
      .select("id, codigo, descripcion, referencia, ubicacion, placa, estado")
      .eq("estado", 1)
      .limit(20);

    if (esBusquedaNumerica) {
      materialesQuery = materialesQuery.eq("codigo", Number(q));
    } else {
      materialesQuery = materialesQuery.ilike("descripcion", `%${q}%`);
    }

    const { data: materiales, error: errorMateriales } = await materialesQuery;

    if (errorMateriales) {
      throw errorMateriales;
    }

    const idsMateriales = (materiales || []).map((item) => item.id);

    if (idsMateriales.length === 0) {
      return res.json({
        success: true,
        data: []
      });
    }

    let movimientosQuery = supabaseLeasing
      .from("movimientos")
      .select("id, codigo_material, date_movi, date_crea, tipo_movimiento, guia, ubic_destino, placa, responsable, destinatario, obs, edit, id_modif, estado, date_elim")
      .in("codigo_material", idsMateriales)
      .in("tipo_movimiento", tiposPermitidos)
      .eq("estado", 1)
      .order("date_movi", { ascending: false })
      .limit(20);

    if (tipoFiltro) {
      movimientosQuery = movimientosQuery.eq("tipo_movimiento", tipoFiltro);
    }

    const { data: movimientos, error: errorMovimientos } = await movimientosQuery;

    if (errorMovimientos) {
      throw errorMovimientos;
    }

    const materialesPorId = new Map((materiales || []).map((item) => [item.id, item]));

    const data = (movimientos || []).map((movimiento) => ({
      ...movimiento,
      material: materialesPorId.get(movimiento.codigo_material) || null
    }));

    return res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error("Error buscar movimientos leasing:", error);
    return res.status(500).json({
      success: false,
      message: "No se pudieron buscar movimientos",
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

router.post("/modificaciones", async (req, res) => {
  try {
    const codigoUsuario = String(req.headers["x-user-codigo"] || "").trim();
    const nombreUsuario = String(req.headers["x-user-nombre"] || "").trim();

    if (!codigoUsuario && !nombreUsuario) {
      return res.status(403).json({
        success: false,
        message: "No se pudo identificar al usuario"
      });
    }

    const { id_movimiento, movimiento = {} } = req.body || {};

    if (!id_movimiento) {
      return res.status(400).json({
        success: false,
        message: "Debe seleccionar un movimiento"
      });
    }

    const { data: movimientoActual, error: errorMovimientoActual } = await supabaseLeasing
      .from("movimientos")
      .select("*")
      .eq("id", id_movimiento)
      .eq("estado", 1)
      .single();

    if (errorMovimientoActual || !movimientoActual) {
      return res.status(404).json({
        success: false,
        message: "No se encontró el movimiento seleccionado"
      });
    }

    if (![101, 201].includes(Number(movimientoActual.tipo_movimiento))) {
      return res.status(400).json({
        success: false,
        message: "Solo se pueden modificar movimientos 101 o 201"
      });
    }

    if (!movimiento.date_movi) {
      return res.status(400).json({
        success: false,
        message: "La fecha de movimiento es obligatoria"
      });
    }

    if (!esNumeroValido(movimiento.placa, 9)) {
      return res.status(400).json({
        success: false,
        message: "La placa debe tener 9 dígitos o quedar vacía"
      });
    }

    const nuevoResponsable = codigoUsuario || nombreUsuario;
    const payloadActualizado = {
      date_movi: movimiento.date_movi,
      guia: limpiarTexto(movimiento.guia),
      ubic_destino: limpiarTexto(movimiento.ubic_destino)?.toUpperCase() || null,
      placa: movimiento.placa ? Number(movimiento.placa) : null,
      responsable: nuevoResponsable,
      destinatario:
        Number(movimientoActual.tipo_movimiento) === 201
          ? limpiarTexto(movimiento.destinatario)
          : null,
      obs: limpiarTexto(movimiento.obs),
      edit: 1,
      estado: 1,
      date_elim: null
    };

    const snapshotModificacion = {
      id_movimiento: movimientoActual.id,
      codigo_material: movimientoActual.codigo_material,
      date_movi: valorIgualAnterior(movimientoActual.date_movi, payloadActualizado.date_movi)
        ? null
        : movimientoActual.date_movi,
      date_crea: valorIgualAnterior(movimientoActual.date_crea, movimientoActual.date_crea)
        ? null
        : movimientoActual.date_crea,
      tipo_movimiento: valorIgualAnterior(movimientoActual.tipo_movimiento, movimientoActual.tipo_movimiento)
        ? null
        : movimientoActual.tipo_movimiento,
      guia: valorIgualAnterior(movimientoActual.guia, payloadActualizado.guia)
        ? null
        : movimientoActual.guia,
      ubic_destino: valorIgualAnterior(movimientoActual.ubic_destino, payloadActualizado.ubic_destino)
        ? null
        : movimientoActual.ubic_destino,
      placa: valorIgualAnterior(movimientoActual.placa, payloadActualizado.placa)
        ? null
        : movimientoActual.placa,
      responsable: valorIgualAnterior(movimientoActual.responsable, payloadActualizado.responsable)
        ? null
        : movimientoActual.responsable,
      destinatario: valorIgualAnterior(movimientoActual.destinatario, payloadActualizado.destinatario)
        ? null
        : movimientoActual.destinatario,
      obs: valorIgualAnterior(movimientoActual.obs, payloadActualizado.obs)
        ? null
        : movimientoActual.obs
    };

    const huboCambios = [
      snapshotModificacion.date_movi,
      snapshotModificacion.guia,
      snapshotModificacion.ubic_destino,
      snapshotModificacion.placa,
      snapshotModificacion.responsable,
      snapshotModificacion.destinatario,
      snapshotModificacion.obs
    ].some((valor) => valor !== null);

    if (!huboCambios) {
      return res.status(400).json({
        success: false,
        message: "No se detectaron cambios para registrar"
      });
    }

    const { data: modificacionCreada, error: errorModificacion } = await supabaseLeasing
      .from("modif_movim")
      .insert(snapshotModificacion)
      .select("*")
      .single();

    if (errorModificacion) {
      throw errorModificacion;
    }

    const { data: movimientoActualizado, error: errorActualizar } = await supabaseLeasing
      .from("movimientos")
      .update({
        ...payloadActualizado,
        id_modif: modificacionCreada.id
      })
      .eq("id", movimientoActual.id)
      .select("*")
      .single();

    if (errorActualizar) {
      await supabaseLeasing.from("modif_movim").delete().eq("id", modificacionCreada.id);
      throw errorActualizar;
    }

    return res.json({
      success: true,
      data: {
        modificacion: modificacionCreada,
        movimiento: movimientoActualizado
      }
    });
  } catch (error) {
    console.error("Error registrar modificación leasing:", error);
    return res.status(500).json({
      success: false,
      message: "No se pudo registrar la modificación",
      detail: error.message
    });
  }
});

router.post("/eliminaciones", async (req, res) => {
  try {
    const codigoUsuario = String(req.headers["x-user-codigo"] || "").trim();
    const nombreUsuario = String(req.headers["x-user-nombre"] || "").trim();

    if (!codigoUsuario && !nombreUsuario) {
      return res.status(403).json({
        success: false,
        message: "No se pudo identificar al usuario"
      });
    }

    const { id_movimiento } = req.body || {};

    if (!id_movimiento) {
      return res.status(400).json({
        success: false,
        message: "Debe seleccionar un movimiento"
      });
    }

    const { data: movimientoActual, error: errorBuscar } = await supabaseLeasing
      .from("movimientos")
      .select("id, codigo_material, tipo_movimiento, estado")
      .eq("id", id_movimiento)
      .eq("estado", 1)
      .single();

    if (errorBuscar || !movimientoActual) {
      return res.status(404).json({
        success: false,
        message: "No se encontró el movimiento o ya está eliminado"
      });
    }

    if (![101, 201].includes(Number(movimientoActual.tipo_movimiento))) {
      return res.status(400).json({
        success: false,
        message: "Solo se pueden eliminar movimientos 101 o 201"
      });
    }

    const hoy = new Date().toISOString().slice(0, 10);

    const { data: movimientoEliminado, error: errorEliminar } = await supabaseLeasing
      .from("movimientos")
      .update({ estado: 0, date_elim: hoy })
      .eq("id", movimientoActual.id)
      .select("id, codigo_material, tipo_movimiento, estado, date_elim")
      .single();

    if (errorEliminar) {
      throw errorEliminar;
    }

    return res.json({
      success: true,
      data: { movimiento: movimientoEliminado }
    });
  } catch (error) {
    console.error("Error eliminar movimiento leasing:", error);
    return res.status(500).json({
      success: false,
      message: "No se pudo eliminar el movimiento",
      detail: error.message
    });
  }
});

// ──────────────────────────────────────────────
// HISTORIAL
// ──────────────────────────────────────────────

router.get("/historial/materiales", async (req, res) => {
  try {
    const esAdmin = String(req.headers["x-user-permisos"] || "0") === "1";
    const q = String(req.query.q || "").trim();
    const soloActivos = !esAdmin;

    let query = supabaseLeasing
      .from("materiales")
      .select("id, codigo, descripcion, referencia, ubicacion, placa, estado, date_elim, modif, id_modif")
      .order("codigo", { ascending: true })
      .limit(200);

    if (soloActivos) {
      query = query.eq("estado", 1);
    }

    if (q.length >= 2) {
      const esNumerica = /^\d+$/.test(q);
      query = esNumerica
        ? query.eq("codigo", Number(q))
        : query.ilike("descripcion", `%${q}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    return res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error("Error historial materiales:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/historial/movimientos", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const desde = String(req.query.desde || "").trim();
    const hasta = String(req.query.hasta || "").trim();
    const tipo = Number(req.query.tipo || 0);
    const esAdmin = String(req.headers["x-user-permisos"] || "0") === "1";

    let matIds = null;

    if (q.length >= 2) {
      const esNumerica = /^\d+$/.test(q);
      let mq = supabaseLeasing
        .from("materiales")
        .select("id")
        .limit(50);

      mq = esNumerica
        ? mq.eq("codigo", Number(q))
        : mq.ilike("descripcion", `%${q}%`);

      const { data: mats, error: errMats } = await mq;
      if (errMats) throw errMats;
      matIds = (mats || []).map((m) => m.id);

      if (matIds.length === 0) {
        return res.json({ success: true, data: [] });
      }
    }

    let query = supabaseLeasing
      .from("movimientos")
      .select(
        "id, codigo_material, date_movi, date_crea, tipo_movimiento, guia, ubic_destino, placa, responsable, destinatario, obs, edit, estado, date_elim, id_modif, materiales(id, codigo, descripcion)"
      )
      .order("date_movi", { ascending: false })
      .limit(300);

    if (!esAdmin) {
      query = query.eq("estado", 1);
    }

    if (matIds) {
      query = query.in("codigo_material", matIds);
    }

    if ([101, 201, 301, 401].includes(tipo)) {
      query = query.eq("tipo_movimiento", tipo);
    }

    if (desde) query = query.gte("date_movi", desde);
    if (hasta) query = query.lte("date_movi", hasta);

    const { data, error } = await query;
    if (error) throw error;

    return res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error("Error historial movimientos:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/historial/modificaciones", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const desde = String(req.query.desde || "").trim();
    const hasta = String(req.query.hasta || "").trim();

    let matIds = null;

    if (q.length >= 2) {
      const esNumerica = /^\d+$/.test(q);
      let mq = supabaseLeasing.from("materiales").select("id").limit(50);
      mq = esNumerica ? mq.eq("codigo", Number(q)) : mq.ilike("descripcion", `%${q}%`);
      const { data: mats, error: errMats } = await mq;
      if (errMats) throw errMats;
      matIds = (mats || []).map((m) => m.id);
      if (matIds.length === 0) return res.json({ success: true, data: [] });
    }

    let query = supabaseLeasing
      .from("modif_movim")
      .select(
        "id, id_movimiento, date_modif, codigo_material, date_movi, date_crea, tipo_movimiento, guia, ubic_destino, placa, responsable, destinatario, obs, materiales(id, codigo, descripcion), movimientos(id, tipo_movimiento, date_movi, responsable)"
      )
      .order("date_modif", { ascending: false })
      .limit(300);

    if (matIds) query = query.in("codigo_material", matIds);
    if (desde) query = query.gte("date_modif", desde);
    if (hasta) query = query.lte("date_modif", hasta);

    const { data, error } = await query;
    if (error) throw error;

    return res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error("Error historial modificaciones:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/materiales/:id", async (req, res) => {
  try {
    const { data, error } = await supabaseLeasing
      .from("materiales")
      .select("*")
      .eq("id", req.params.id)
      .single();

    if (error || !data) {
      return res.status(404).json({ success: false, message: "Material no encontrado" });
    }

    return res.json({ success: true, data });
  } catch (error) {
    console.error("Error obtener material leasing:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.put("/materiales/:id", async (req, res) => {
  try {
    const campos = ["codigo", "descripcion", "referencia", "ubicacion", "placa"];
    const payload = {};

    for (const campo of campos) {
      if (req.body[campo] !== undefined) {
        payload[campo] = req.body[campo];
      }
    }

    if (!req.body.descripcion) {
      return res.status(400).json({ success: false, message: "La descripción es obligatoria" });
    }

    const { data, error } = await supabaseLeasing
      .from("materiales")
      .update(payload)
      .eq("id", req.params.id)
      .select("*")
      .single();

    if (error) throw error;

    return res.json({ success: true, data });
  } catch (error) {
    console.error("Error actualizar material leasing:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.delete("/materiales/:id", async (req, res) => {
  try {
    const hoy = new Date().toISOString().slice(0, 10);

    const { data, error } = await supabaseLeasing
      .from("materiales")
      .update({ estado: 0, date_elim: hoy })
      .eq("id", req.params.id)
      .select("id, estado, date_elim")
      .single();

    if (error) throw error;

    return res.json({ success: true, data });
  } catch (error) {
    console.error("Error eliminar material leasing:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
