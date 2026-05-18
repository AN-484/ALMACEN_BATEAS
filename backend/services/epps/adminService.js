const supabase = require("../supabaseClient");
const {
  obtenerSolicitud,
  mapearNombresUsuarios
} = require("./solicitudesService");

async function listarPendientes() {
  const { data, error } = await supabase
    .from("solicitudes_epps")
    .select(`
      *,
      estado_info:stado_soli_epp (
        descripcion
      )
    `)
    .eq("estado", "S1")
    .order("fecha_solicitada", { ascending: true });

  if (error) throw error;

  return await mapearNombresUsuarios(data || []);
}

async function listarPorGenerar() {
  const { data, error } = await supabase
    .from("solicitudes_epps")
    .select(`
      *,
      estado_info:stado_soli_epp (
        descripcion
      )
    `)
    .eq("estado", "S2")
    .eq("aprobado", 1)
    .eq("generado", 0)
    .order("fecha_aprobado", { ascending: true });

  if (error) throw error;

  return await mapearNombresUsuarios(data || []);
}

async function aprobarSolicitud({
  id_soli,
  codigoAdmin,
  items,
  aprobar,
  obs_aprobada
}) {
  const solicitud = await obtenerSolicitud(id_soli);

  if (!solicitud) {
    const error = new Error("Solicitud no encontrada");
    error.status = 404;
    throw error;
  }

  if (solicitud.estado !== "S1") {
    const error = new Error("La solicitud ya no está pendiente");
    error.status = 400;
    throw error;
  }

  if (aprobar === false) {
    const { error } = await supabase
      .from("solicitudes_epps")
      .update({
        aprobado: 0,
        obs_general: "SOLICITUD DESAPROBADA",
        adm_aprueba: codigoAdmin,
        fecha_aprobado: new Date().toISOString(),
        estado: "S3"
      })
      .eq("id_soli", id_soli);

    if (error) throw error;

    return {
      mensaje: "Solicitud desaprobada"
    };
  }

  if (!Array.isArray(items) || items.length === 0) {
    const error = new Error("Debe enviar los items a aprobar");
    error.status = 400;
    throw error;
  }

  for (const item of items) {
    const { error } = await supabase
      .from("items_epps_solic")
      .update({
        cant_aprobada: Number(item.cant_aprobada || 0),
        aprobado: Number(item.aprobado) === 1 ? 1 : 0
      })
      .eq("id_item", item.id_item)
      .eq("id_soli", id_soli);

    if (error) throw error;
  }

  const algoAprobado = items.some(
    item => Number(item.aprobado) === 1 && Number(item.cant_aprobada) > 0
  );

  const { error } = await supabase
    .from("solicitudes_epps")
    .update({
      aprobado: algoAprobado ? 1 : 0,
      obs_aprobada: obs_aprobada || null,
      obs_general: null,
      adm_aprueba: codigoAdmin,
      fecha_aprobado: new Date().toISOString(),
      estado: algoAprobado ? "S2" : "S3"
    })
    .eq("id_soli", id_soli);

  if (error) throw error;

  return {
    mensaje: algoAprobado
      ? "Solicitud aprobada y enviada a generación de reserva"
      : "Solicitud terminada sin items aprobados"
  };
}

async function generarReserva({ id_soli, codigoAdmin, reserva, items, obs_general }) {
  const reservaLimpia = String(reserva || "").replace(/\D/g, "").slice(0, 10);

  if (reservaLimpia.length !== 10) {
    const error = new Error("La reserva debe tener exactamente 10 dígitos");
    error.status = 400;
    throw error;
  }

  const solicitud = await obtenerSolicitud(id_soli);

  if (!solicitud || solicitud.estado !== "S2" || Number(solicitud.aprobado) !== 1) {
    const error = new Error("La solicitud no está lista para generar reserva");
    error.status = 400;
    throw error;
  }

  if (!Array.isArray(items) || items.length === 0) {
    const error = new Error("Debe confirmar las cantidades reservadas por item");
    error.status = 400;
    throw error;
  }

  for (const item of items) {
    const cantReservada = Number(item.cant_reservada || 0);
    const cantAprobada = Number(item.cant_aprobada || 0);

    if (cantReservada < 0) {
      const error = new Error("La cantidad reservada no puede ser negativa");
      error.status = 400;
      throw error;
    }

    if (cantReservada > cantAprobada) {
      const error = new Error("La cantidad reservada no puede ser mayor a la aprobada");
      error.status = 400;
      throw error;
    }

    const { error } = await supabase
      .from("items_epps_solic")
      .update({
        cant_reservada: cantReservada
      })
      .eq("id_item", item.id_item)
      .eq("id_soli", id_soli);

    if (error) throw error;
  }

  const { error } = await supabase
    .from("solicitudes_epps")
    .update({
      generado: 1,
      reserva: reservaLimpia,
      adm_genera: codigoAdmin,
      fecha_generado: new Date().toISOString(),
      obs_general: obs_general || null,
      estado: "S3"
    })
    .eq("id_soli", id_soli);

  if (error) throw error;
}

async function exportarSolicitudes() {
  const { data, error } = await supabase
    .from("solicitudes_epps")
    .select(`
      *,
      estado_info:stado_soli_epp (
        descripcion
      )
    `)
    .order("fecha_solicitada", { ascending: false });

  if (error) throw error;

  return await mapearNombresUsuarios(data || []);
}

module.exports = {
  listarPendientes,
  listarPorGenerar,
  aprobarSolicitud,
  generarReserva,
  exportarSolicitudes
};