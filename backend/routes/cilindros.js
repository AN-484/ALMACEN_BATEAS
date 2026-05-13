const express = require("express");
const router = express.Router();
const supabase = require("../services/supabaseClient");

// DASHBOARD CILINDROS
router.get("/dashboard", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("estado_cilindros")
      .select("*");

    if (error) throw error;

    const total = data.length;
    const stock = data.filter(x => x.estado === "ST").length;  // STOCK
    const vacio = data.filter(x => x.estado === "VA").length; // VACIO
    const cliente = data.filter(x => x.estado === "US").length; // EN CLIENTE
    const proveedor = data.filter(x => x.estado === "RE").length; // EN PROVEEDOR

    const bateas = data.filter(
      x => x.propietario === "PP01" && x.estado !== "RE"  // EN PROVEEDOR
    ).length;

    const linde = data.filter(
      x => x.propietario === "PP02" && x.estado !== "RE" // EN PROVEEDOR
    ).length;

    res.json({
      total,
      stock,
      vacio,
      cliente,
      proveedor,
      bateas,
      linde
    });

  } catch (error) {
    console.error("Error dashboard cilindros:", error);
    res.status(500).json({ error: "Error al cargar dashboard" });
  }
});

// LISTAR ESTADO DE CILINDROS
router.get("/estado", async (req, res) => {
  try {
    const { producto, propietario, estado } = req.query;

    let query = supabase
      .from("estado_cilindros")
      .select("*")
      .order("cilindro", { ascending: true });

    if (producto) {
      query = query.eq("material", producto);
    }

    if (propietario) {
      query = query.eq("propietario", propietario);
    }

    if (estado) {
      query = query.eq("estado", estado);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json(data);

  } catch (error) {
    console.error("Error estado cilindros:", error);
    res.status(500).json({ error: "Error al listar estado de cilindros" });
  }
});

// LISTAR PRODUCTOS
router.get("/productos", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("productos")
      .select("*")
      .order("nombre", { ascending: true });

    if (error) throw error;

    res.json(data);

  } catch (error) {
    res.status(500).json({ error: "Error al listar productos" });
  }
});

// LISTAR PROPIETARIOS
router.get("/propietarios", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("propietarios")
      .select("*")
      .order("nombre", { ascending: true });

    if (error) throw error;

    res.json(data);

  } catch (error) {
    res.status(500).json({ error: "Error al listar propietarios" });
  }
});

// LISTAR CILINDROS
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("cilindros")
      .select("*")
      .order("codigo", { ascending: true });

    if (error) throw error;

    res.json(data);

  } catch (error) {
    res.status(500).json({ error: "Error al listar cilindros" });
  }
});

// LISTAR TRANSPORTISTAS
router.get("/transportistas", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("transportistas")
      .select("*")
      .order("nombre", { ascending: true });

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error("Error transportistas:", error);
    res.status(500).json({ error: "Error al listar transportistas" });
  }
});

// OBTENER CILINDRO POR CÓDIGO
router.get("/buscar/:codigo", async (req, res) => {
  try {
    const { codigo } = req.params;

    const { data, error } = await supabase
      .from("cilindros")
      .select("*")
      .eq("codigo", codigo)
      .maybeSingle();

    if (error) throw error;

    res.json(data || null);
  } catch (error) {
    console.error("Error buscar cilindro:", error);
    res.status(500).json({ error: "Error al buscar cilindro" });
  }
});

// OBTENER ESTADO DE CILINDRO
router.get("/estado/:codigo", async (req, res) => {
  try {
    const { codigo } = req.params;

    const { data, error } = await supabase
      .from("estado_cilindros")
      .select("*")
      .eq("cilindro", codigo)
      .maybeSingle();

    if (error) throw error;

    res.json(data || null);
  } catch (error) {
    console.error("Error estado cilindro:", error);
    res.status(500).json({ error: "Error al obtener estado" });
  }
});

// INGRESO / RECARGA
router.post("/ingreso-recarga", async (req, res) => {
  try {
    const {
      fecha,
      cilindro,
      propietario,
      producto,
      fecha_hidrostatica,
      nro_guia,
      nro_documento,
      transportista,
      tipo,
      registrado_por
    } = req.body;

    if (
      !fecha ||
      !cilindro ||
      !propietario ||
      !producto ||
      !nro_guia ||
      !nro_documento ||
      !transportista ||
      !tipo ||
      !registrado_por
    ) {
      return res.status(400).json({
        success: false,
        message: "Faltan datos obligatorios"
      });
    }

    if (!["M001", "M004"].includes(tipo)) {
      return res.status(400).json({
        success: false,
        message: "Tipo de movimiento inválido"
      });
    }

    // Buscar cilindro
    const { data: cilindroExistente, error: errorCilindro } = await supabase
      .from("cilindros")
      .select("*")
      .eq("codigo", cilindro)
      .maybeSingle();

    if (errorCilindro) throw errorCilindro;

    // Buscar estado actual
    const { data: estadoActual, error: errorEstado } = await supabase
      .from("estado_cilindros")
      .select("*")
      .eq("cilindro", cilindro)
      .maybeSingle();

    if (errorEstado) throw errorEstado;

    // VALIDACIONES SEGÚN TU APP DE ESCRITORIO
    if (tipo === "M001") {
      if (estadoActual && estadoActual.estado !== "RE")  // EN PROVEEDOR 
      {
        return res.status(400).json({
          success: false,
          message: `No se puede ingresar. Estado actual: ${estadoActual.estado}. Solo se permite si está EN PROVEEDOR.`
        });
      }
    }

    if (tipo === "M004") {
      if (!estadoActual || estadoActual.estado !== "VA") // VACIO
      {
        return res.status(400).json({
          success: false,
          message: `No se puede enviar a recarga. Estado actual: ${
            estadoActual ? estadoActual.estado : "NO REGISTRADO"
          }. Solo se permite si está VACIO.`
        });
      }
    }

    // Crear cilindro si no existe
    if (!cilindroExistente) {
      const { error: errorCrearCilindro } = await supabase
        .from("cilindros")
        .insert({
          codigo: cilindro,
          propietario,
          producto,
          fecha_hidrostatica,
          nuevo: "SI"
        });

      if (errorCrearCilindro) throw errorCrearCilindro;
    }

    // Registrar movimiento
    const idMovimiento = `${Date.now()}_${cilindro}`;

    const { error: errorMovimiento } = await supabase
      .from("entradas_salidas")
      .insert({
        id: idMovimiento,
        fecha,
        nro_documento,
        nro_guia,
        cilindro,
        producto,
        transportista,
        tipo,
        registrado_por
      });

    if (errorMovimiento) throw errorMovimiento;

    // Nuevo estado
    const nuevoEstado = tipo === "M001" ? "ST" : "RE"; // STOCK o EN PROVEEDOR
    const nuevaUbicacion = tipo === "M001" ? "1000" : "1999"; // ALMACEN o PROVEEDOR

    if (estadoActual) {
      const { error: errorActualizarEstado } = await supabase
        .from("estado_cilindros")
        .update({
          propietario,
          material: producto,
          estado: nuevoEstado,
          fecha_mov: fecha,
          ubicacion: nuevaUbicacion
        })
        .eq("cilindro", cilindro);

      if (errorActualizarEstado) throw errorActualizarEstado;
    } else {
      const { error: errorCrearEstado } = await supabase
        .from("estado_cilindros")
        .insert({
          cilindro,
          propietario,
          material: producto,
          //capacidad: "1",
          estado: nuevoEstado,
          fecha_mov: fecha,
          ubicacion: nuevaUbicacion
        });

      if (errorCrearEstado) throw errorCrearEstado;
    }

    res.json({
      success: true,
      message: "Movimiento registrado correctamente"
    });

  } catch (error) {
    console.error("Error ingreso/recarga:", error);
    res.status(500).json({
      success: false,
      message: "Error al registrar movimiento",
      detail: error.message
    });
  }
});

// LISTAR UBICACIONES / ÁREAS
router.get("/ubicaciones", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("ubicaciones")
      .select("*")
      .order("nombre", { ascending: true });

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error("Error ubicaciones:", error);
    res.status(500).json({ error: "Error al listar ubicaciones" });
  }
});

// LISTAR USUARIOS / PERSONAL
router.get("/usuarios", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("usuarios")
      .select("*")
      .order("nombre", { ascending: true });

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error("Error usuarios:", error);
    res.status(500).json({ error: "Error al listar usuarios" });
  }
});

// CILINDROS DISPONIBLES PARA DESPACHO O DEVOLUCIÓN
router.get("/disponibles", async (req, res) => {
  try {
    const { material, tipo } = req.query;

    if (!material || !tipo) {
      return res.status(400).json({
        success: false,
        message: "Faltan parámetros material y tipo"
      });
    }

    const estadoBuscar = tipo === "M002" ? "ST" : "US"; // STOCK o EN CLIENTE

    const { data, error } = await supabase
      .from("estado_cilindros")
      .select("*")
      .eq("material", material)
      .eq("estado", estadoBuscar)
      .order("cilindro", { ascending: true });

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error("Error disponibles:", error);
    res.status(500).json({ error: "Error al listar cilindros disponibles" });
  }
});

// DESPACHO / DEVOLUCIÓN
router.post("/despacho-devolucion", async (req, res) => {
  try {
    const {
      fecha,
      cilindro,
      material,
      area,
      tipo,
      encargado_almacen,
      responsable_area,
      registrado_por
    } = req.body;

    if (
      !fecha ||
      !cilindro ||
      !material ||
      !area ||
      !tipo ||
      !encargado_almacen ||
      !responsable_area ||
      !registrado_por
    ) {
      return res.status(400).json({
        success: false,
        message: "Faltan datos obligatorios"
      });
    }

    if (!["M002", "M003"].includes(tipo)) {
      return res.status(400).json({
        success: false,
        message: "Tipo inválido"
      });
    }

    const { data: estadoActual, error: errorEstado } = await supabase
      .from("estado_cilindros")
      .select("*")
      .eq("cilindro", cilindro)
      .maybeSingle();

    if (errorEstado) throw errorEstado;

    if (tipo === "M002") {
      if (!estadoActual || estadoActual.estado !== "ST")  // STOCK
      {  
        return res.status(400).json({
          success: false,
          message: `No se puede despachar. Estado actual: ${
            estadoActual ? estadoActual.estado : "NO REGISTRADO"
          }. Solo se permite si está en STOCK.`
        });
      }
    }

    if (tipo === "M003") {
      if (!estadoActual || estadoActual.estado !== "US") {
        return res.status(400).json({
          success: false,
          message: `No se puede devolver. Estado actual: ${
            estadoActual ? estadoActual.estado : "NO REGISTRADO"
          }. Solo se permite si está EN CLIENTE.`
        });
      }
    }

    const { data: cilindroObj, error: errorCilindro } = await supabase
      .from("cilindros")
      .select("*")
      .eq("codigo", cilindro)
      .maybeSingle();

    if (errorCilindro) throw errorCilindro;

    const propietario = cilindroObj ? cilindroObj.propietario : estadoActual.propietario;

    const idMovimiento = `${Date.now()}_${cilindro}`;

    const { error: errorMovimiento } = await supabase
      .from("movimientos_detalle")
      .insert({
        id: idMovimiento,
        fecha,
        cilindro,
        material,
        area,
        tipo,
        encargado_almacen,
        responsable_area,
        registrado_por
      });

    if (errorMovimiento) throw errorMovimiento;

    const nuevoEstado = tipo === "M002" ? "US" : "VA"; // EN CLIENTE o VACIO
    //1//const nuevaUbicacion = tipo === "M002" ? area : "ALMACEN";

    ///// 🔹 obtener nombre del área
    let nombreArea = "";

    if (tipo === "M002") {
    const { data: areaObj, error: errorArea } = await supabase
        .from("ubicaciones")
        .select("nombre")
        .eq("codigo", area)
        .maybeSingle();

    if (errorArea) throw errorArea;

    nombreArea = areaObj ? areaObj.nombre : area;
    }

    // 🔹 ubicación final
    const nuevaUbicacion =
    tipo === "M002" ? area : "1000"; // ALMACEN

    //1/////////////////////////////////

    const { error: errorActualizarEstado } = await supabase
      .from("estado_cilindros")
      .update({
        propietario,
        material,
        estado: nuevoEstado,
        fecha_mov: fecha,
        ubicacion: nuevaUbicacion
      })
      .eq("cilindro", cilindro);

    if (errorActualizarEstado) throw errorActualizarEstado;

    if (tipo === "M002") {
      await supabase
        .from("cilindros")
        .update({ nuevo: "NO" })
        .eq("codigo", cilindro);
    }

    res.json({
      success: true,
      message: "Movimiento registrado correctamente"
    });

  } catch (error) {
    console.error("Error despacho/devolución:", error);
    res.status(500).json({
      success: false,
      message: "Error al registrar movimiento",
      detail: error.message
    });
  }
});

// REPORTE INGRESOS / RECARGAS
router.get("/reportes/entradas-salidas", async (req, res) => {
  try {
    const {
      guia,
      documento,
      cilindro,
      tipo,
      fecha_inicio,
      fecha_fin
    } = req.query;

    let query = supabase
      .from("entradas_salidas")
      .select("*")
      .order("fecha", { ascending: false });

    if (guia) query = query.ilike("nro_guia", `%${guia}%`);
    if (documento) query = query.ilike("nro_documento", `%${documento}%`);
    if (cilindro) query = query.ilike("cilindro", `%${cilindro}%`);
    if (tipo) query = query.eq("tipo", tipo);

    if (fecha_inicio) query = query.gte("fecha", fecha_inicio);
    if (fecha_fin) query = query.lte("fecha", fecha_fin);

    const { data, error } = await query;

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error("Error reporte entradas/salidas:", error);
    res.status(500).json({
      error: "Error al cargar reporte de ingresos/recargas"
    });
  }
});

// REPORTE DESPACHOS / DEVOLUCIONES
router.get("/reportes/movimientos", async (req, res) => {
  try {
    const {
      cilindro,
      material,
      area,
      tipo,
      fecha_inicio,
      fecha_fin
    } = req.query;

    let query = supabase
      .from("movimientos_detalle")
      .select("*")
      .order("fecha", { ascending: false });

    if (cilindro) {
      query = query.ilike("cilindro", `%${cilindro}%`);
    }

    if (material) {
      query = query.eq("material", material);
    }

    if (area) {
      query = query.eq("area", area);
    }

    if (tipo) {
      query = query.eq("tipo", tipo);
    }

    // ✅ FILTRO DE FECHAS
    if (fecha_inicio && fecha_fin) {
      query = query.gte("fecha", fecha_inicio).lte("fecha", fecha_fin);
    } else if (fecha_inicio) {
      query = query.gte("fecha", fecha_inicio);
    } else if (fecha_fin) {
      query = query.lte("fecha", fecha_fin);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json(data);

  } catch (error) {
    console.error("Error reporte movimientos:", error);
    res.status(500).json({
      error: "Error al cargar reporte de movimientos",
      detail: error.message
    });
  }
});

// KARDEX POR CILINDRO
router.get("/reportes/kardex/:cilindro", async (req, res) => {
  try {
    const { cilindro } = req.params;

    const { data: entradas, error: errorEntradas } = await supabase
      .from("entradas_salidas")
      .select("*")
      .eq("cilindro", cilindro);

    if (errorEntradas) throw errorEntradas;

    const { data: movimientos, error: errorMovimientos } = await supabase
      .from("movimientos_detalle")
      .select("*")
      .eq("cilindro", cilindro);

    if (errorMovimientos) throw errorMovimientos;

    const kardex = [
      ...entradas.map(e => ({
        fecha: e.fecha,
        cilindro: e.cilindro,
        tipo: e.tipo,
        origen: "INGRESO / RECARGA",
        detalle: e.nro_guia || "",
        material: e.producto,
        area: "",
        registrado_por: e.registrado_por
      })),
      ...movimientos.map(m => ({
        fecha: m.fecha,
        cilindro: m.cilindro,
        tipo: m.tipo,
        origen: "DESPACHO / DEVOLUCIÓN",
        detalle: m.responsable_area || "",
        material: m.material,
        area: m.area,
        registrado_por: m.registrado_por
      }))
    ];

    kardex.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    res.json(kardex);
  } catch (error) {
    console.error("Error kardex:", error);
    res.status(500).json({
      error: "Error al cargar kardex"
    });
  }
});

// INGRESO / RECARGA MASIVA
router.post("/ingreso-recarga-masivo", async (req, res) => {
  try {
    const {
      fecha,
      tipo,
      nro_guia,
      nro_documento,
      transportista,
      registrado_por,
      cilindros
    } = req.body;

    if (
      !fecha ||
      !tipo ||
      !nro_guia ||
      !nro_documento ||
      !transportista ||
      !registrado_por ||
      !Array.isArray(cilindros) ||
      cilindros.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Faltan datos obligatorios"
      });
    }

    if (!["M001", "M004"].includes(tipo)) {
      return res.status(400).json({
        success: false,
        message: "Tipo inválido"
      });
    }

    let registrados = 0;
    const errores = [];

    for (const item of cilindros) {
      try {
        const codigo = String(item.codigo || "").trim();
        const propietario = item.propietario;
        const producto = item.producto;
        const fecha_hidrostatica = item.fecha_hidrostatica;

        if (!codigo || !propietario || !producto || !fecha_hidrostatica) {
          errores.push(`${codigo || "SIN CÓDIGO"}: faltan datos`);
          continue;
        }

        // Buscar cilindro
        const { data: cilindroExistente, error: errorCilindro } = await supabase
          .from("cilindros")
          .select("*")
          .eq("codigo", codigo)
          .maybeSingle();

        if (errorCilindro) throw errorCilindro;

        // Buscar estado
        const { data: estadoActual, error: errorEstado } = await supabase
          .from("estado_cilindros")
          .select("*")
          .eq("cilindro", codigo)
          .maybeSingle();

        if (errorEstado) throw errorEstado;

        // Validaciones iguales a escritorio
        if (tipo === "M001") {
          if (estadoActual && estadoActual.estado !== "RE")  // EN PROVEEDOR
          {
            errores.push(
              `${codigo}: No se puede ingresar. Estado actual: ${estadoActual.estado}. Solo EN PROVEEDOR.`
            );
            continue;
          }
        }

        if (tipo === "M004") {
          if (!estadoActual || estadoActual.estado !== "VA")  // VACIO
          {
            errores.push(
              `${codigo}: No se puede recargar. Estado actual: ${
                estadoActual ? estadoActual.estado : "NO REGISTRADO"
              }. Solo VACIO.`
            );
            continue;
          }
        }

        // Crear cilindro si no existe
        if (!cilindroExistente) {
          const { error: errorCrearCilindro } = await supabase
            .from("cilindros")
            .insert({
              codigo,
              propietario,
              producto,
              fecha_hidrostatica,
              nuevo: "SI"
            });

          if (errorCrearCilindro) throw errorCrearCilindro;
        }

        // Registrar movimiento
        const idMovimiento = `${Date.now()}_${codigo}_${Math.random()
          .toString(36)
          .slice(2, 8)}`;

        const { error: errorMovimiento } = await supabase
          .from("entradas_salidas")
          .insert({
            id: idMovimiento,
            fecha,
            nro_documento,
            nro_guia,
            cilindro: codigo,
            producto,
            transportista,
            tipo,
            registrado_por
          });

        if (errorMovimiento) throw errorMovimiento;

        // Actualizar estado
        const nuevoEstado = tipo === "M001" ? "ST" : "RE"; // STOCK o EN PROVEEDOR
        const nuevaUbicacion = tipo === "M001" ? "1000" : "1999"; // ALMACEN o PROVEEDOR

        if (estadoActual) {
          const { error: errorUpdateEstado } = await supabase
            .from("estado_cilindros")
            .update({
              propietario,
              material: producto,
              estado: nuevoEstado,
              fecha_mov: fecha,
              ubicacion: nuevaUbicacion
            })
            .eq("cilindro", codigo);

          if (errorUpdateEstado) throw errorUpdateEstado;
        } else {
          const { error: errorInsertEstado } = await supabase
            .from("estado_cilindros")
            .insert({
              cilindro: codigo,
              propietario,
              material: producto,
              //capacidad: "1",
              estado: nuevoEstado,
              fecha_mov: fecha,
              ubicacion: nuevaUbicacion
            });

          if (errorInsertEstado) throw errorInsertEstado;
        }

        registrados++;

      } catch (error) {
        errores.push(`${item.codigo || "SIN CÓDIGO"}: ${error.message}`);
      }
    }

    res.json({
      success: true,
      registrados,
      errores,
      message: `${registrados} cilindro(s) registrado(s)`
    });

  } catch (error) {
    console.error("Error ingreso/recarga masivo:", error);
    res.status(500).json({
      success: false,
      message: "Error en ingreso/recarga masiva",
      detail: error.message
    });
  }
});


// CILINDROS DISPONIBLES MASIVO SIN FILTRAR POR MATERIAL
router.get("/disponibles-masivo", async (req, res) => {
  try {
    const { tipo } = req.query;

    if (!tipo) {
      return res.status(400).json({
        success: false,
        message: "Falta parámetro tipo"
      });
    }

    const estadoBuscar = tipo === "M002" ? "ST" : "US"; // STOCK o EN CLIENTE

    const { data, error } = await supabase
      .from("estado_cilindros")
      .select("*")
      .eq("estado", estadoBuscar)
      .order("cilindro", { ascending: true });

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error("Error disponibles masivo:", error);
    res.status(500).json({
      error: "Error al listar cilindros disponibles"
    });
  }
});


// DESPACHO / DEVOLUCIÓN MASIVA
router.post("/despacho-devolucion-masivo", async (req, res) => {
  try {
    const {
      fecha,
      tipo,
      area,
      area_nombre,
      encargado_almacen,
      responsable_area,
      registrado_por,
      cilindros
    } = req.body;

    if (
      !fecha ||
      !tipo ||
      !area ||
      !encargado_almacen ||
      !responsable_area ||
      !registrado_por ||
      !Array.isArray(cilindros) ||
      cilindros.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Faltan datos obligatorios"
      });
    }

    if (!["M002", "M003"].includes(tipo)) {
      return res.status(400).json({
        success: false,
        message: "Tipo inválido"
      });
    }

    let registrados = 0;
    const errores = [];

    for (const item of cilindros) {
      try {
        const codigo = String(item.cilindro || "").trim();
        const materialFila = item.material;

        if (!codigo || !materialFila) {
          errores.push(`${codigo || "SIN CÓDIGO"}: falta cilindro o material`);
          continue;
        }

        const { data: estadoActual, error: errorEstado } = await supabase
          .from("estado_cilindros")
          .select("*")
          .eq("cilindro", codigo)
          .maybeSingle();

        if (errorEstado) throw errorEstado;

        if (!estadoActual) {
          errores.push(`${codigo}: no tiene estado registrado`);
          continue;
        }

        if (estadoActual.material !== materialFila) {
          errores.push(
            `${codigo}: material no coincide. Actual: ${estadoActual.material}, seleccionado: ${materialFila}`
          );
          continue;
        }

        if (tipo === "M002") {
          if (estadoActual.estado !== "ST")  // STOCK
          {
            errores.push(
              `${codigo}: no se puede despachar. Estado actual: ${estadoActual.estado}. Solo STOCK.`
            );
            continue;
          }
        }

        if (tipo === "M003") {
          if (estadoActual.estado !== "US") // EN CLIENTE
          {
            errores.push(
              `${codigo}: no se puede devolver. Estado actual: ${estadoActual.estado}. Solo EN CLIENTE.`
            );
            continue;
          }

          if (estadoActual.ubicacion !== area) {
            errores.push(
              `${codigo}: pertenece al área ${estadoActual.ubicacion}, pero esta devolución corresponde al área ${area}.`
            );
            continue;
          }
        }

        const { data: cilindroObj, error: errorCilindro } = await supabase
          .from("cilindros")
          .select("*")
          .eq("codigo", codigo)
          .maybeSingle();

        if (errorCilindro) throw errorCilindro;

        const propietario = cilindroObj
          ? cilindroObj.propietario
          : estadoActual.propietario;

        const idMovimiento = `${Date.now()}_${codigo}_${Math.random()
          .toString(36)
          .slice(2, 8)}`;

        const { error: errorMovimiento } = await supabase
          .from("movimientos_detalle")
          .insert({
            id: idMovimiento,
            fecha,
            cilindro: codigo,
            material: materialFila,
            area,
            tipo,
            encargado_almacen,
            responsable_area,
            registrado_por
          });

        if (errorMovimiento) throw errorMovimiento;

        const nuevoEstado = tipo === "M002" ? "US" : "VA"; // EN CLIENTE o VACIO
        const nuevaUbicacion = tipo === "M002" ? area : "1000"; // ALMACEN

        const { error: errorUpdateEstado } = await supabase
          .from("estado_cilindros")
          .update({
            propietario,
            material: materialFila,
            estado: nuevoEstado,
            fecha_mov: fecha,
            ubicacion: nuevaUbicacion
          })
          .eq("cilindro", codigo);

        if (errorUpdateEstado) throw errorUpdateEstado;

        if (tipo === "M002") {
          await supabase
            .from("cilindros")
            .update({ nuevo: "NO" })
            .eq("codigo", codigo);
        }

        registrados++;

      } catch (error) {
        errores.push(`${item.cilindro || "SIN CÓDIGO"}: ${error.message}`);
      }
    }

    res.json({
      success: true,
      registrados,
      errores,
      message: `${registrados} cilindro(s) registrado(s)`
    });

  } catch (error) {
    console.error("Error despacho/devolución masiva:", error);
    res.status(500).json({
      success: false,
      message: "Error en despacho/devolución masiva",
      detail: error.message
    });
  }
});


// TIPOS DE ESTADO
router.get("/tipos-estado", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("tipo_estado")
      .select("*")
      .order("id");

    if (error) throw error;

    res.json(data);

  } catch (error) {
    console.error("Error tipos estado:", error);

    res.status(500).json({
      error: "Error al obtener tipos de estado"
    });
  }
});

// TIPOS DE MOVIMIENTO
router.get("/tipos-movimiento", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("tipo_movimiento")
      .select("*")
      .order("id", { ascending: true });

    if (error) throw error;

    res.json(data);

  } catch (error) {
    console.error("Error tipos movimiento:", error);
    res.status(500).json({
      error: "Error al obtener tipos de movimiento"
    });
  }
});

module.exports = router;