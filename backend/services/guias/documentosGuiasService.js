const supabase = require("../supabaseClient");
const {
  subirArchivoGuia,
  generarUrlTemporal,
  eliminarArchivoGuia
} = require("./r2GuiasService");

function normalizarTexto(valor) {
  return String(valor || "").trim().toUpperCase();
}

function limpiarRuc(valor) {
  return String(valor || "").replace(/\D/g, "").slice(0, 11);
}

async function obtenerDirectorio(id_directorio) {
  const { data, error } = await supabase
    .from("directorios_guias")
    .select("*")
    .eq("id_directorio", id_directorio)
    .eq("activo", true)
    .maybeSingle();

  if (error) throw error;

  return data;
}

async function obtenerProveedor(ruc) {
  const rucLimpio = limpiarRuc(ruc);

  const { data, error } = await supabase
    .from("proveedores_guias")
    .select("*")
    .eq("ruc", rucLimpio)
    .eq("activo", true)
    .maybeSingle();

  if (error) throw error;

  return data;
}

async function asegurarProveedor({ ruc, nombre }) {
  const rucLimpio = limpiarRuc(ruc);
  const nombreLimpio = normalizarTexto(nombre);

  if (rucLimpio.length !== 11) {
    const error = new Error("El RUC del proveedor debe tener 11 dígitos");
    error.status = 400;
    throw error;
  }

  if (!nombreLimpio) {
    const error = new Error("Debe ingresar el nombre del proveedor");
    error.status = 400;
    throw error;
  }

  const { data, error } = await supabase
    .from("proveedores_guias")
    .upsert({
      ruc: rucLimpio,
      nombre: nombreLimpio,
      activo: true
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}

async function registrarDocumento({ body, file, usuario }) {
  if (!file) {
    const error = new Error("Debe adjuntar un archivo PDF");
    error.status = 400;
    throw error;
  }

  const id_tipo = normalizarTexto(body.id_tipo);
  const id_directorio = normalizarTexto(body.id_directorio);
  const ruc_proveedor = limpiarRuc(body.ruc_proveedor);

  const numero_guia_factura = normalizarTexto(body.numero_guia_factura);
  const numero_documento = String(body.numero_documento || "")
    .replace(/\D/g, "")
    .slice(0, 10);

  const orden_compra_servicio = String(body.orden_compra_servicio || "")
    .replace(/\D/g, "")
    .slice(0, 10);

  if (!id_tipo || !id_directorio || !ruc_proveedor || !numero_guia_factura) {
    const error = new Error("Faltan datos obligatorios");
    error.status = 400;
    throw error;
  }
  if (numero_documento && numero_documento.length !== 10) {
    const error = new Error("El N° de documento debe tener exactamente 10 dígitos");
    error.status = 400;
    throw error;
    }

    if (orden_compra_servicio && orden_compra_servicio.length !== 10) {
    const error = new Error("La OC/OS debe tener exactamente 10 dígitos");
    error.status = 400;
    throw error;
    }

  if (ruc_proveedor.length !== 11) {
    const error = new Error("El RUC del proveedor debe tener 11 dígitos");
    error.status = 400;
    throw error;
  }

  const directorio = await obtenerDirectorio(id_directorio);

  if (!directorio) {
    const error = new Error("Directorio no válido");
    error.status = 400;
    throw error;
  }

  const proveedor = await asegurarProveedor({
    ruc: ruc_proveedor,
    nombre: body.nombre_proveedor
  });

  if (!proveedor) {
    const error = new Error("El proveedor no existe. Regístrelo primero.");
    error.status = 400;
    throw error;
  }

  const tipoTexto = id_tipo === "G1" ? "GUIA" : "FACTURA";

  const archivo = await subirArchivoGuia({
    file,
    directorio: directorio.nombre,
    tipo: tipoTexto,
    numero: numero_guia_factura,
    ocOs: orden_compra_servicio || numero_documento || "SIN_OC_OS"
  });

  const { data, error } = await supabase
    .from("documentos_guias")
    .insert({
      id_tipo,
      id_directorio,
      ruc_proveedor,
      numero_guia_factura,
      numero_documento: numero_documento || null,
      orden_compra_servicio: orden_compra_servicio || null,
      nombre_archivo: archivo.nombre_archivo,
      r2_key: archivo.r2_key,
      mime_type: archivo.mime_type,
      usuario_registra: usuario || null,
      activo: true
    })
    .select(`
      *,
      tipo:tipos_guias (
        id_tipo,
        descripcion
      ),
      directorio:directorios_guias (
        id_directorio,
        nombre
      ),
      proveedor:proveedores_guias (
        ruc,
        nombre
      )
    `)
    .single();

  if (error) {
    // Si falló Supabase luego de subir a R2, limpiamos el archivo.
    try {
      await eliminarArchivoGuia(archivo.r2_key);
    } catch {}

    throw error;
  }

  return data;
}

async function listarDocumentos(filtros = {}) {
  let query = supabase
    .from("documentos_guias")
    .select(`
      *,
      tipo:tipos_guias (
        id_tipo,
        descripcion
      ),
      directorio:directorios_guias (
        id_directorio,
        nombre
      ),
      proveedor:proveedores_guias (
        ruc,
        nombre
      )
    `)
    .eq("activo", true)
    .order("fecha_registro", { ascending: false });

  if (filtros.id_directorio) {
    query = query.eq("id_directorio", filtros.id_directorio);
  }

  if (filtros.id_tipo) {
    query = query.eq("id_tipo", filtros.id_tipo);
  }

  if (filtros.ruc_proveedor) {
    query = query.eq("ruc_proveedor", limpiarRuc(filtros.ruc_proveedor));
  }

  if (filtros.q && String(filtros.q).trim()) {
    const texto = normalizarTexto(filtros.q);
    const ruc = limpiarRuc(filtros.q);

    const condiciones = [
      `numero_guia_factura.ilike.%${texto}%`,
      `numero_documento.ilike.%${texto}%`,
      `orden_compra_servicio.ilike.%${texto}%`
    ];

    if (ruc) {
      condiciones.push(`ruc_proveedor.ilike.%${ruc}%`);
    }

    query = query.or(condiciones.join(","));
  }

  const hayBusqueda =
  Boolean(filtros.q && String(filtros.q).trim()) ||
  Boolean(filtros.id_directorio) ||
  Boolean(filtros.id_tipo) ||
  Boolean(filtros.ruc_proveedor);

    if (!hayBusqueda) {
    query = query.limit(10);
    }

  const { data, error } = await query;

  if (error) throw error;

  return data || [];
}

async function obtenerDocumento(id_documento) {
  const { data, error } = await supabase
    .from("documentos_guias")
    .select(`
      *,
      tipo:tipos_guias (
        id_tipo,
        descripcion
      ),
      directorio:directorios_guias (
        id_directorio,
        nombre
      ),
      proveedor:proveedores_guias (
        ruc,
        nombre
      )
    `)
    .eq("id_documento", id_documento)
    .eq("activo", true)
    .maybeSingle();

  if (error) throw error;

  return data;
}

async function generarLinkDocumento(id_documento, segundos = 600) {
  const doc = await obtenerDocumento(id_documento);

  if (!doc) {
    const error = new Error("Documento no encontrado");
    error.status = 404;
    throw error;
  }

  const urlTemporal = await generarUrlTemporal(doc.r2_key, segundos);

  return {
    id_documento: doc.id_documento,
    urlTemporal,
    expira_en_segundos: segundos
  };
}

async function actualizarDocumento({ id_documento, body, usuario }) {
  const doc = await obtenerDocumento(id_documento);

  if (!doc) {
    const error = new Error("Documento no encontrado");
    error.status = 404;
    throw error;
  }

  if (doc.usuario_registra !== usuario) {
    const error = new Error("Solo el usuario que registró el documento puede editarlo");
    error.status = 403;
    throw error;
  }

  const id_tipo = normalizarTexto(body.id_tipo);
  const id_directorio = normalizarTexto(body.id_directorio);
  const ruc_proveedor = limpiarRuc(body.ruc_proveedor);

  const numero_guia_factura = normalizarTexto(body.numero_guia_factura);

  const numero_documento = String(body.numero_documento || "")
    .replace(/\D/g, "")
    .slice(0, 10);

  const orden_compra_servicio = String(body.orden_compra_servicio || "")
    .replace(/\D/g, "")
    .slice(0, 10);

  const nombre_proveedor = normalizarTexto(body.nombre_proveedor);

  if (!id_tipo || !id_directorio || !ruc_proveedor || !numero_guia_factura) {
    const error = new Error("Faltan datos obligatorios");
    error.status = 400;
    throw error;
  }

  if (ruc_proveedor.length !== 11) {
    const error = new Error("El RUC debe tener 11 dígitos");
    error.status = 400;
    throw error;
  }

  if (!nombre_proveedor) {
    const error = new Error("Debe ingresar el nombre del proveedor");
    error.status = 400;
    throw error;
  }

  if (numero_documento && numero_documento.length !== 10) {
    const error = new Error("El N° de documento debe tener exactamente 10 dígitos");
    error.status = 400;
    throw error;
  }

  if (orden_compra_servicio && orden_compra_servicio.length !== 10) {
    const error = new Error("La OC/OS debe tener exactamente 10 dígitos");
    error.status = 400;
    throw error;
  }

  // Crea o actualiza proveedor automáticamente.
  const { error: errorProveedor } = await supabase
    .from("proveedores_guias")
    .upsert({
      ruc: ruc_proveedor,
      nombre: nombre_proveedor,
      activo: true
    });

  if (errorProveedor) throw errorProveedor;

  const { data, error } = await supabase
    .from("documentos_guias")
    .update({
      id_tipo,
      id_directorio,
      ruc_proveedor,
      numero_guia_factura,
      numero_documento: numero_documento || null,
      orden_compra_servicio: orden_compra_servicio || null
    })
    .eq("id_documento", id_documento)
    .select(`
      *,
      tipo:tipos_guias (
        id_tipo,
        descripcion
      ),
      directorio:directorios_guias (
        id_directorio,
        nombre
      ),
      proveedor:proveedores_guias (
        ruc,
        nombre
      )
    `)
    .single();

  if (error) throw error;

  return data;
}

async function eliminarDocumento({ id_documento, usuario }) {
  const doc = await obtenerDocumento(id_documento);

  if (!doc) {
    const error = new Error("Documento no encontrado");
    error.status = 404;
    throw error;
  }

  if (doc.usuario_registra !== usuario) {
    const error = new Error("Solo el usuario que registró el documento puede eliminarlo");
    error.status = 403;
    throw error;
  }

  // Eliminación lógica: no borra de R2 por seguridad.
  const { error } = await supabase
    .from("documentos_guias")
    .update({
      activo: false
    })
    .eq("id_documento", id_documento);

  if (error) throw error;
}

module.exports = {
  registrarDocumento,
  listarDocumentos,
  obtenerDocumento,
  generarLinkDocumento,
  actualizarDocumento,
  eliminarDocumento
};