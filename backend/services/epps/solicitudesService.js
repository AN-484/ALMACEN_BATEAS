const supabase = require("../supabaseClient");

async function mapearNombresUsuarios(solicitudes) {
  const lista = Array.isArray(solicitudes) ? solicitudes : [solicitudes];

  const codigos = [
    ...new Set(
      lista
        .flatMap(s => [s.usuario, s.adm_aprueba, s.adm_genera])
        .filter(Boolean)
    )
  ];

  if (codigos.length === 0) return solicitudes;

  const { data, error } = await supabase
    .from("usuarios")
    .select("codigo, nombre, dni")
    .in("codigo", codigos);

  if (error) throw error;

  const mapa = {};
  (data || []).forEach(u => {
    mapa[u.codigo] = {
      nombre: u.nombre,
      dni: u.dni
    };
  });

  const resultado = lista.map(s => {
    const usuario = mapa[s.usuario] || { nombre: s.usuario, dni: null };
    const admAprueba = mapa[s.adm_aprueba] || { nombre: s.adm_aprueba || null, dni: null };
    const admGenera = mapa[s.adm_genera] || { nombre: s.adm_genera || null, dni: null };

    return {
      ...s,
      usuario_nombre: usuario.nombre,
      usuario_dni: usuario.dni || null,
      adm_aprueba_nombre: admAprueba.nombre,
      adm_aprueba_dni: admAprueba.dni || null,
      adm_genera_nombre: admGenera.nombre,
      adm_genera_dni: admGenera.dni || null
    };
  });

  return Array.isArray(solicitudes) ? resultado : resultado[0];
}

async function generarIdSolicitud(codigoUsuario) {
  const { count, error } = await supabase
    .from("solicitudes_epps")
    .select("*", { count: "exact", head: true });

  if (error) throw error;

  const correlativo = String((count || 0) + 1).padStart(6, "0");

  return `SOL${correlativo}-${codigoUsuario}`;
}

async function obtenerSolicitud(id_soli) {
  const { data, error } = await supabase
    .from("solicitudes_epps")
    .select("*")
    .eq("id_soli", id_soli)
    .maybeSingle();

  if (error) throw error;

  return data;
}

async function obtenerDetalleSolicitud(id_soli) {
  const { data: solicitud, error: errorSolicitud } = await supabase
    .from("solicitudes_epps")
    .select(`
      *,
      estado_info:stado_soli_epp (
        id_stado,
        descripcion
      )
    `)
    .eq("id_soli", id_soli)
    .maybeSingle();

  if (errorSolicitud) throw errorSolicitud;

  if (!solicitud) return null;

  const { data: items, error: errorItems } = await supabase
    .from("items_epps_solic")
    .select(`
      *,
      epp:epps (
        id_epp,
        sap,
        descripcion,
        unidad
      )
    `)
    .eq("id_soli", id_soli)
    .order("id_item", { ascending: true });

  if (errorItems) throw errorItems;

  const solicitudConNombre = await mapearNombresUsuarios(solicitud);

    return {
    ...solicitudConNombre,
    items: items || []
    };
}

async function crearSolicitud({ codigoUsuario, items }) {
  if (!codigoUsuario) {
    const error = new Error("Usuario no identificado");
    error.status = 401;
    throw error;
  }

  if (!Array.isArray(items) || items.length === 0) {
    const error = new Error("Debe agregar al menos un EPP");
    error.status = 400;
    throw error;
  }

  const id_soli = await generarIdSolicitud(codigoUsuario);

  const { error: errorSolicitud } = await supabase
    .from("solicitudes_epps")
    .insert({
      id_soli,
      usuario: codigoUsuario,
      aprobado: 0,
      generado: 0,
      estado: "S1"
    });

  if (errorSolicitud) throw errorSolicitud;

  const itemsInsert = items.map(item => ({
    id_soli,
    id_epp: item.id_epp,
    cantidad: Number(item.cantidad),
    cant_aprobada: null,
    aprobado: 0
  }));

  const { error: errorItems } = await supabase
    .from("items_epps_solic")
    .insert(itemsInsert);

  if (errorItems) throw errorItems;

  return id_soli;
}

async function listarMisSolicitudes(codigoUsuario) {
  const { data, error } = await supabase
    .from("solicitudes_epps")
    .select(`
      *,
      estado_info:stado_soli_epp (
        descripcion
      ),
      items:items_epps_solic (
        id_item,
        cant_ejecut
      )
    `)
    .eq("usuario", codigoUsuario)
    .order("fecha_solicitada", { ascending: false });

  if (error) throw error;

  return await mapearNombresUsuarios(data || []);
}

async function marcarRecogido({ id_soli, codigoUsuario }) {
  const solicitud = await obtenerSolicitud(id_soli);

  if (!solicitud) {
    const error = new Error("Solicitud no encontrada");
    error.status = 404;
    throw error;
  }

  if (solicitud.usuario !== codigoUsuario) {
    const error = new Error("Solo el creador puede marcar la solicitud como recogida");
    error.status = 403;
    throw error;
  }

  if (solicitud.estado !== "S3") {
    const error = new Error("La solicitud no está en estado terminado");
    error.status = 400;
    throw error;
  }

  const fechaBase = solicitud.fecha_generado || solicitud.fecha_aprobado || solicitud.fecha_solicitada;

  if (fechaBase) {
    const diff = Date.now() - new Date(fechaBase).getTime();
    const dias = diff / (1000 * 60 * 60 * 24);

    if (dias > 3) {
      const error = new Error("Periodo para marcar como recogido expirado");
      error.status = 400;
      throw error;
    }
  }

  const { error } = await supabase
    .from("items_epps_solic")
    .update({ cant_ejecut: 1 })
    .eq("id_soli", id_soli);

  if (error) throw error;

  return {
    mensaje: "Solicitud marcada como recogida"
  };
}

async function actualizarSolicitud({ id_soli, codigoUsuario, items }) {
  const solicitud = await obtenerSolicitud(id_soli);

  if (!solicitud) {
    const error = new Error("Solicitud no encontrada");
    error.status = 404;
    throw error;
  }

  if (solicitud.usuario !== codigoUsuario) {
    const error = new Error("Solo puedes modificar tus propias solicitudes");
    error.status = 403;
    throw error;
  }

  if (solicitud.estado !== "S1") {
    const error = new Error("La solicitud ya fue procesada y no puede modificarse");
    error.status = 400;
    throw error;
  }

  if (!Array.isArray(items) || items.length === 0) {
    const error = new Error("Debe agregar al menos un EPP");
    error.status = 400;
    throw error;
  }

  await supabase
    .from("items_epps_solic")
    .delete()
    .eq("id_soli", id_soli);

  const itemsInsert = items.map(item => ({
    id_soli,
    id_epp: item.id_epp,
    cantidad: Number(item.cantidad),
    cant_aprobada: null,
    aprobado: 0
  }));

  const { error } = await supabase
    .from("items_epps_solic")
    .insert(itemsInsert);

  if (error) throw error;
}

async function eliminarSolicitud({ id_soli, codigoUsuario }) {
  const solicitud = await obtenerSolicitud(id_soli);

  if (!solicitud) {
    const error = new Error("Solicitud no encontrada");
    error.status = 404;
    throw error;
  }

  if (solicitud.usuario !== codigoUsuario) {
    const error = new Error("Solo puedes eliminar tus propias solicitudes");
    error.status = 403;
    throw error;
  }

  if (solicitud.estado !== "S1") {
    const error = new Error("La solicitud ya fue procesada y no puede eliminarse");
    error.status = 400;
    throw error;
  }

  const { error } = await supabase
    .from("solicitudes_epps")
    .delete()
    .eq("id_soli", id_soli);

  if (error) throw error;
}

module.exports = {
  generarIdSolicitud,
  obtenerSolicitud,
  obtenerDetalleSolicitud,
  crearSolicitud,
  listarMisSolicitudes,
  marcarRecogido,
  actualizarSolicitud,
  eliminarSolicitud,
  mapearNombresUsuarios
};