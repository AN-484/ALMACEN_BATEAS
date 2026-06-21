const express = require("express");
const router = express.Router();
const supabaseLeasing = require("../services/supabaseLeasingClient");
const supabase = require("../services/supabaseClient");

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

function parseCantidadPositiva(valor) {
  const n = Number(valor);
  if (!Number.isInteger(n) || n <= 0) {
    return null;
  }
  return n;
}

function parseSap01(valor) {
  if (valor === true || valor === 1 || valor === "1" || String(valor || "").toLowerCase() === "true") {
    return 1;
  }
  return 0;
}

function esErrorNoEncontrado(error) {
  return Boolean(
    error && (
      error.code === "PGRST116" ||
      /no rows/i.test(String(error.message || "")) ||
      /not found/i.test(String(error.message || ""))
    )
  );
}

async function obtenerEstadoOCrear(materialId) {
  const { data: estado, error: errorEstado } = await supabaseLeasing
    .from("estado")
    .select("id, mov, stock, sap")
    .eq("id", materialId)
    .maybeSingle();

  if (estado) {
    return { data: estado, error: null };
  }

  if (errorEstado && !esErrorNoEncontrado(errorEstado)) {
    return { data: null, error: errorEstado };
  }

  const { data: material, error: errorMaterial } = await supabaseLeasing
    .from("materiales")
    .select("id, cant, sap")
    .eq("id", materialId)
    .single();

  if (errorMaterial || !material) {
    return { data: null, error: errorMaterial || new Error("No se encontró el material para crear el estado") };
  }

  const { data: ultimoMovimiento } = await supabaseLeasing
    .from("movimientos")
    .select("tipo_movimiento, cant, sap")
    .eq("codigo_material", materialId)
    .order("date_movi", { ascending: false })
    .limit(1)
    .maybeSingle();

  const movInicial = Number(ultimoMovimiento?.tipo_movimiento || 101);
  const stockInicial = Number(material.cant ?? ultimoMovimiento?.cant ?? 0);
  const sapInicial = parseSap01(material.sap ?? ultimoMovimiento?.sap ?? 0);

  const payload = {
    id: materialId,
    mov: movInicial,
    stock: stockInicial,
    sap: sapInicial
  };

  const { data: estadoCreado, error: errorCrear } = await supabaseLeasing
    .from("estado")
    .insert(payload)
    .select("*")
    .single();

  if (errorCrear) {
    const { data: estadoCant, error: errorCant } = await supabaseLeasing
      .from("estado")
      .insert({ id: materialId, mov: movInicial, stock: stockInicial, sap: sapInicial })
      .select("*")
      .single();

    if (estadoCant) {
      return { data: estadoCant, error: null };
    }

    return {
      data: {
        id: materialId,
        mov: movInicial,
        stock: stockInicial,
        sap: sapInicial
      },
      error: errorCant || null
    };
  }

  return { data: estadoCreado, error: null };
}

async function sincronizarDesdeUltimoMovimientoActivo(materialId) {
  const { data: movimientosActivos, error: errorMovimientos } = await supabaseLeasing
    .from("movimientos")
    .select("id, tipo_movimiento, ubic_destino, cant, sap")
    .eq("codigo_material", materialId)
    .eq("estado", 1)
    .in("tipo_movimiento", [101, 201])
    .order("date_movi", { ascending: true })
    .order("id", { ascending: true });

  if (errorMovimientos) {
    return { error: errorMovimientos };
  }

  let stockCalculado = 0;
  let ingresosActivos = 0;
  let salidasActivas = 0;

  for (const movimiento of movimientosActivos || []) {
    const cantidadMovimiento = Number(movimiento.cant ?? 0);

    if (Number(movimiento.tipo_movimiento) === 101) {
      ingresosActivos += 1;
      stockCalculado += cantidadMovimiento;
    } else if (Number(movimiento.tipo_movimiento) === 201) {
      salidasActivas += 1;
      stockCalculado -= cantidadMovimiento;
    }
  }

  if (stockCalculado < 0) {
    stockCalculado = 0;
  }

  const ultimoMovimiento = (movimientosActivos || []).length
    ? movimientosActivos[movimientosActivos.length - 1]
    : null;

  const materialActivo = ingresosActivos > 0;
  const nuevaCantidad = materialActivo ? stockCalculado : 0;
  const nuevaUbicacion = materialActivo
    ? limpiarTexto(ultimoMovimiento?.ubic_destino)?.toUpperCase() || null
    : null;
  const nuevoMov = Number(ultimoMovimiento?.tipo_movimiento ?? 101);
  const nuevoSap = materialActivo ? parseSap01(ultimoMovimiento?.sap ?? 0) : 0;

  const { error: errorMaterial } = await supabaseLeasing
    .from("materiales")
    .update({
      cant: nuevaCantidad,
      ubicacion: nuevaUbicacion,
      sap: nuevoSap,
      estado: materialActivo ? 1 : 0
    })
    .eq("id", materialId);

  if (errorMaterial) {
    return { error: errorMaterial };
  }

  const { data: estado, error: errorEstado } = await actualizarEstadoConStock(
    materialId,
    nuevoMov,
    nuevaCantidad,
    nuevoSap
  );

  if (errorEstado) {
    return { error: errorEstado };
  }

  return {
    error: null,
    data: {
      ultimoMovimiento: ultimoMovimiento || null,
      estado,
      ingresosActivos,
      salidasActivas,
      cantidad: nuevaCantidad,
      ubicacion: nuevaUbicacion
    }
  };
}

async function insertarEstadoConStock(idMaterial, mov, stock, sap) {
  const payloadBase = { id: idMaterial, mov, sap };

  const conStock = await supabaseLeasing
    .from("estado")
    .insert({ ...payloadBase, stock });

  if (!conStock.error) {
    return { error: null };
  }

  if (!String(conStock.error.message || "").toLowerCase().includes("stock")) {
    return { error: conStock.error };
  }

  const conCant = await supabaseLeasing
    .from("estado")
    .insert({ ...payloadBase, stock });

  return { error: conCant.error || null };
}

async function actualizarEstadoConStock(idMaterial, mov, stock, sap) {
  const payloadBase = { mov, sap };

  const conStock = await supabaseLeasing
    .from("estado")
    .update({ ...payloadBase, stock })
    .eq("id", idMaterial)
    .select("*")
    .single();

  if (!conStock.error) {
    return conStock;
  }

  if (!String(conStock.error.message || "").toLowerCase().includes("stock")) {
    const porCant = await supabaseLeasing
      .from("estado")
      .upsert({ id: idMaterial, ...payloadBase, stock }, { onConflict: "id" })
      .select("*")
      .single();

    return porCant;
  }

  const conCant = await supabaseLeasing
    .from("estado")
    .upsert({ id: idMaterial, ...payloadBase, stock }, { onConflict: "id" })
    .select("*")
    .single();

  return conCant;
}

function extraerCodigoResponsable(responsable) {
  const valor = String(responsable || "").trim();
  if (!valor) return null;

  // Acepta formatos: "P014" o "P014 - NOMBRE".
  const match = valor.match(/^([A-Za-z0-9]+)\s*-?.*$/);
  return match ? match[1].toUpperCase() : null;
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
      .select("id, codigo, descripcion, referencia, ubicacion, placa, cant, sap, estado")
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

    const idsMateriales = (data || []).map((item) => item.id);
    let estadosPorId = new Map();

    if (idsMateriales.length > 0) {
      const { data: estados } = await supabaseLeasing
        .from("estado")
        .select("id, mov, stock, sap")
        .in("id", idsMateriales);

      estadosPorId = new Map((estados || []).map((item) => [item.id, item]));
    }

    const dataConEstado = (data || []).map((item) => ({
      ...item,
      stock: Number(estadosPorId.get(item.id)?.stock ?? item.cant ?? 0),
      sap: Number(estadosPorId.get(item.id)?.sap ?? item.sap ?? 0)
    }));

    return res.json({
      success: true,
      data: dataConEstado
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
      .select("id, codigo, descripcion, referencia, ubicacion, placa, cant, sap, estado")
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
      .select("id, codigo_material, date_movi, date_crea, tipo_movimiento, guia, ubic_destino, placa, cant, sap, responsable, destinatario, obs, edit, id_modif, estado, date_elim")
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

    const codigosResponsables = Array.from(
      new Set(
        (movimientos || [])
          .map((movimiento) => extraerCodigoResponsable(movimiento.responsable))
          .filter(Boolean)
      )
    );

    const nombresPorCodigo = new Map();
    if (codigosResponsables.length > 0) {
      const { data: usuarios, error: errorUsuarios } = await supabase
        .from("usuarios")
        .select("codigo, nombre")
        .in("codigo", codigosResponsables);

      if (errorUsuarios) {
        console.error("Error obteniendo nombres de responsables LEASING:", errorUsuarios);
      } else {
        (usuarios || []).forEach((usuario) => {
          nombresPorCodigo.set(String(usuario.codigo || "").toUpperCase(), usuario.nombre || null);
        });
      }
    }

    const data = (movimientos || []).map((movimiento) => {
      const codigoResponsable = extraerCodigoResponsable(movimiento.responsable);
      const responsableNombre = codigoResponsable
        ? nombresPorCodigo.get(codigoResponsable) || null
        : null;

      return {
        ...movimiento,
        responsable_nombre: responsableNombre,
        material: materialesPorId.get(movimiento.codigo_material) || null
      };
    });

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
    const cantidad = parseCantidadPositiva(material.cant ?? movimiento.cant);
    const sapValor = parseSap01(material.sap ?? movimiento.sap);

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

    if (!limpiarTexto(material.referencia)) {
      return res.status(400).json({ success: false, message: "La referencia es obligatoria" });
    }

    if (!limpiarTexto(material.ubicacion)) {
      return res.status(400).json({ success: false, message: "La ubicación es obligatoria" });
    }

    if (!esNumeroValido(material.placa, 9)) {
      return res.status(400).json({ success: false, message: "La placa del material debe tener 9 dígitos" });
    }

    if (!limpiarTexto(movimiento.guia)) {
      return res.status(400).json({ success: false, message: "La guía es obligatoria" });
    }

    if (!cantidad) {
      return res.status(400).json({
        success: false,
        message: "La cantidad debe ser un número entero mayor a 0"
      });
    }

    if (!limpiarTexto(material.referencia)) {
      return res.status(400).json({
        success: false,
        message: "La referencia es obligatoria"
      });
    }

    if (!limpiarTexto(material.ubicacion)) {
      return res.status(400).json({
        success: false,
        message: "La ubicación es obligatoria"
      });
    }

    if (!esNumeroValido(material.placa, 9)) {
      return res.status(400).json({
        success: false,
        message: "La placa del material es obligatoria y debe tener 9 dígitos"
      });
    }

    if (!limpiarTexto(movimiento.guia)) {
      return res.status(400).json({
        success: false,
        message: "La guía es obligatoria"
      });
    }

    if (!esNumeroValido(material.codigo, 10)) {
      return res.status(400).json({
        success: false,
        message: "El código de material debe tener 10 dígitos o quedar vacío"
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
      cant: cantidad,
      sap: sapValor,
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
      mov: 101,
      stock: cantidad,
      sap: sapValor
    };

    const { error: errorEstado } = await insertarEstadoConStock(materialCreado.id, 101, cantidad, sapValor);

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
      cant: cantidad,
      sap: sapValor,
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
    const cantidad = parseCantidadPositiva(movimiento.cant);
    const sapValor = parseSap01(movimiento.sap);

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

    if (!limpiarTexto(movimiento.ubic_destino)) {
      return res.status(400).json({
        success: false,
        message: "Ubic / Destino es obligatorio"
      });
    }

    if (!limpiarTexto(movimiento.destinatario)) {
      return res.status(400).json({
        success: false,
        message: "Usuario Destinatario es obligatorio"
      });
    }

    if (!cantidad) {
      return res.status(400).json({
        success: false,
        message: "La cantidad debe ser un número entero mayor a 0"
      });
    }

    const { data: material, error: errorMaterial } = await supabaseLeasing
      .from("materiales")
      .select("id, codigo, descripcion, referencia, ubicacion, placa, cant, sap, estado")
      .eq("id", movimiento.codigo_material)
      .eq("estado", 1)
      .single();

    const { data: estadoActual, error: errorEstadoActual } = await obtenerEstadoOCrear(movimiento.codigo_material);

    if (errorEstadoActual) {
      console.warn("Estado no disponible para salida, se intentará reconstruir:", errorEstadoActual.message);
    }

    const stockActual = Number(estadoActual?.stock ?? 0);
    const nuevoStock = stockActual - cantidad;
    if (nuevoStock < 0) {
      return res.status(400).json({
        success: false,
        message: `Stock insuficiente. Stock actual: ${stockActual}`
      });
    }

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
      cant: cantidad,
      sap: sapValor,
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

    const { data: estadoActualizado, error: errorEstado } = await actualizarEstadoConStock(
      material.id,
      201,
      nuevoStock,
      sapValor
    );

    if (errorEstado) {
      await supabaseLeasing.from("movimientos").delete().eq("id", movimientoCreado.id);
      throw errorEstado;
    }

    const { error: errorMaterialStock } = await supabaseLeasing
      .from("materiales")
      .update({ cant: nuevoStock, ubicacion: limpiarTexto(movimiento.ubic_destino)?.toUpperCase() || null })
      .eq("id", material.id);

    if (errorMaterialStock) {
      await supabaseLeasing.from("movimientos").delete().eq("id", movimientoCreado.id);
      await actualizarEstadoConStock(material.id, 201, stockActual, Number(estadoActual?.sap ?? sapValor));
      throw errorMaterialStock;
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
    const cantidadNueva = parseCantidadPositiva(movimiento.cant);
    const sapValor = parseSap01(movimiento.sap);

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

    if (Number(movimientoActual.tipo_movimiento) === 101) {
      const { count: salidasActivas, error: errorConteoSalidas } = await supabaseLeasing
        .from("movimientos")
        .select("id", { count: "exact", head: true })
        .eq("codigo_material", movimientoActual.codigo_material)
        .eq("estado", 1)
        .eq("tipo_movimiento", 201);

      if (errorConteoSalidas) {
        throw errorConteoSalidas;
      }

      if (Number(salidasActivas || 0) > 0) {
        return res.status(400).json({
          success: false,
          message: "Este material ya tiene salidas registradas. No se puede modificar ningún ingreso."
        });
      }
    }

    if (Number(movimientoActual.tipo_movimiento) === 201) {
      const { data: ultimaSalida, error: errorUltimaSalida } = await supabaseLeasing
        .from("movimientos")
        .select("id")
        .eq("codigo_material", movimientoActual.codigo_material)
        .eq("estado", 1)
        .eq("tipo_movimiento", 201)
        .order("date_movi", { ascending: false })
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (errorUltimaSalida) {
        throw errorUltimaSalida;
      }

      if (!ultimaSalida || Number(ultimaSalida.id) !== Number(movimientoActual.id)) {
        return res.status(400).json({
          success: false,
          message: "Solo se puede modificar la última salida del material."
        });
      }
    }

    if (!movimiento.date_movi) {
      return res.status(400).json({
        success: false,
        message: "La fecha de movimiento es obligatoria"
      });
    }

    if (!cantidadNueva) {
      return res.status(400).json({
        success: false,
        message: "La cantidad debe ser un número entero mayor a 0"
      });
    }

    if (!esNumeroValido(movimiento.placa, 9)) {
      return res.status(400).json({
        success: false,
        message: "La placa debe tener 9 dígitos o quedar vacía"
      });
    }

    const nuevoResponsable = codigoUsuario || nombreUsuario;
    const cantidadAnterior = Number(movimientoActual.cant || 0);

    const { data: estadoActual, error: errorEstadoActual } = await obtenerEstadoOCrear(movimientoActual.codigo_material);

    if (errorEstadoActual) {
      console.warn("Estado no disponible para modificación, se intentará reconstruir:", errorEstadoActual.message);
    }

    const stockActual = Number(estadoActual?.stock ?? 0);
    const esIngreso = Number(movimientoActual.tipo_movimiento) === 101;
    const deltaStock = esIngreso ? (cantidadNueva - cantidadAnterior) : (cantidadAnterior - cantidadNueva);
    const nuevoStock = stockActual + deltaStock;

    if (nuevoStock < 0) {
      return res.status(400).json({
        success: false,
        message: `La modificación deja stock negativo (${nuevoStock}). Revise la cantidad.`
      });
    }

    const payloadActualizado = {
      date_movi: movimiento.date_movi,
      guia: limpiarTexto(movimiento.guia),
      ubic_destino: limpiarTexto(movimiento.ubic_destino)?.toUpperCase() || null,
      placa: movimiento.placa ? Number(movimiento.placa) : null,
      cant: cantidadNueva,
      sap: sapValor,
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
      cant: valorIgualAnterior(movimientoActual.cant, payloadActualizado.cant)
        ? null
        : movimientoActual.cant,
      sap: valorIgualAnterior(movimientoActual.sap, payloadActualizado.sap)
        ? null
        : movimientoActual.sap,
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
      snapshotModificacion.cant,
      snapshotModificacion.sap,
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

    const { data: estadoActualizado, error: errorEstado } = await actualizarEstadoConStock(
      movimientoActual.codigo_material,
      Number(movimientoActual.tipo_movimiento),
      nuevoStock,
      sapValor
    );

    if (errorEstado) {
      await supabaseLeasing
        .from("movimientos")
        .update({
          date_movi: movimientoActual.date_movi,
          guia: movimientoActual.guia,
          ubic_destino: movimientoActual.ubic_destino,
          placa: movimientoActual.placa,
          cant: movimientoActual.cant,
          sap: movimientoActual.sap,
          responsable: movimientoActual.responsable,
          destinatario: movimientoActual.destinatario,
          obs: movimientoActual.obs,
          edit: movimientoActual.edit,
          estado: movimientoActual.estado,
          date_elim: movimientoActual.date_elim,
          id_modif: movimientoActual.id_modif
        })
        .eq("id", movimientoActual.id);
      await supabaseLeasing.from("modif_movim").delete().eq("id", modificacionCreada.id);
      throw errorEstado;
    }

    const esModIngreso = Number(movimientoActual.tipo_movimiento) === 101;
    const materialPatch = esModIngreso
      ? {
          cant: nuevoStock,
          ubicacion: limpiarTexto(payloadActualizado.ubic_destino)?.toUpperCase() || null,
          placa: payloadActualizado.placa,
          sap: sapValor
        }
      : {
          cant: nuevoStock,
          ubicacion: limpiarTexto(payloadActualizado.ubic_destino)?.toUpperCase() || null
        };

    const { error: errorMaterialStock } = await supabaseLeasing
      .from("materiales")
      .update(materialPatch)
      .eq("id", movimientoActual.codigo_material);

    if (errorMaterialStock) {
      await supabaseLeasing
        .from("movimientos")
        .update({
          date_movi: movimientoActual.date_movi,
          guia: movimientoActual.guia,
          ubic_destino: movimientoActual.ubic_destino,
          placa: movimientoActual.placa,
          cant: movimientoActual.cant,
          sap: movimientoActual.sap,
          responsable: movimientoActual.responsable,
          destinatario: movimientoActual.destinatario,
          obs: movimientoActual.obs,
          edit: movimientoActual.edit,
          estado: movimientoActual.estado,
          date_elim: movimientoActual.date_elim,
          id_modif: movimientoActual.id_modif
        })
        .eq("id", movimientoActual.id);
      await supabaseLeasing.from("modif_movim").delete().eq("id", modificacionCreada.id);
      await actualizarEstadoConStock(movimientoActual.codigo_material, Number(movimientoActual.tipo_movimiento), stockActual, Number(estadoActual?.sap ?? sapValor));
      throw errorMaterialStock;
    }

    return res.json({
      success: true,
      data: {
        modificacion: modificacionCreada,
        movimiento: movimientoActualizado,
        estado: estadoActualizado
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

    if (Number(movimientoActual.tipo_movimiento) === 101) {
      const { count: salidasActivas, error: errorConteoSalidas } = await supabaseLeasing
        .from("movimientos")
        .select("id", { count: "exact", head: true })
        .eq("codigo_material", movimientoActual.codigo_material)
        .eq("estado", 1)
        .eq("tipo_movimiento", 201);

      if (errorConteoSalidas) {
        throw errorConteoSalidas;
      }

      if (Number(salidasActivas || 0) > 0) {
        return res.status(400).json({
          success: false,
          message: "No se puede eliminar el ingreso porque el material ya tiene salidas registradas."
        });
      }
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

    const { data: syncData, error: errorSync } = await sincronizarDesdeUltimoMovimientoActivo(movimientoActual.codigo_material);
    if (errorSync) {
      throw errorSync;
    }

    return res.json({
      success: true,
      data: {
        movimiento: movimientoEliminado,
        sincronizacion: syncData
      }
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

router.get("/estado/resumen", async (req, res) => {
  try {
    const { data, error } = await supabaseLeasing
      .from("estado")
      .select("mov");

    if (error) {
      throw error;
    }

    const resumen = {
      total: 0,
      ingresos: 0,
      salidas: 0,
      otros: 0
    };

    for (const row of data || []) {
      resumen.total += 1;

      if (Number(row.mov) === 101) {
        resumen.ingresos += 1;
      } else if (Number(row.mov) === 201) {
        resumen.salidas += 1;
      } else {
        resumen.otros += 1;
      }
    }

    return res.json({
      success: true,
      data: resumen
    });
  } catch (error) {
    console.error("Error resumen estado leasing:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

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
        "id, codigo_material, date_movi, date_crea, tipo_movimiento, guia, ubic_destino, placa, cant, sap, responsable, destinatario, obs, edit, estado, date_elim, id_modif, materiales(id, codigo, descripcion)"
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
        "id, id_movimiento, date_modif, codigo_material, date_movi, date_crea, tipo_movimiento, guia, ubic_destino, placa, cant, sap, responsable, destinatario, obs, materiales(id, codigo, descripcion), movimientos(id, tipo_movimiento, date_movi, responsable, cant, sap)"
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
    const campos = ["codigo", "descripcion", "referencia", "ubicacion", "placa", "cant", "sap"];
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
