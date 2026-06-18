import React, { useState } from 'react';
import { apiPut } from '../../../services/api';

export default function TarjetaSolicitud({ solicitud, onVer, onEditar, onEliminar, onRecogido }) {
  const estado = solicitud.estado_info?.descripcion || solicitud.estado;
  const items = solicitud.items || [];
  const ejecutadas = items.reduce((s, it) => s + (Number(it.cant_ejecut || 0)), 0);

  const fechaBase = solicitud.fecha_generado || solicitud.fecha_aprobado || solicitud.fecha_solicitada;
  let diasDesde = null;
  if (fechaBase) {
    const diff = Date.now() - new Date(fechaBase).getTime();
    diasDesde = diff / (1000 * 60 * 60 * 24);
  }

  const puedeMarcarRecogido = solicitud.estado === 'S3' && ejecutadas === 0 && (diasDesde === null || diasDesde <= 3);
  const expirado = solicitud.estado === 'S3' && ejecutadas === 0 && diasDesde !== null && diasDesde > 3;

  const [marcado, setMarcado] = useState(ejecutadas > 0);
  const [marcando, setMarcando] = useState(false);

  async function handleMarcarRecogido() {
    if (!window.confirm('Marcar solicitud como recogida?')) return;

    // Optimistic UI
    setMarcando(true);
    setMarcado(true);

    try {
      const res = await apiPut(`/api/epps/recogido/${solicitud.id_soli}`, {});

      if (res && res.success) {
        if (typeof onRecogido === 'function') onRecogido();
      } else {
        setMarcado(false);
        alert((res && res.message) || 'No se pudo marcar como recogido');
      }
    } catch (error) {
      console.error(error);
      setMarcado(false);
      alert(error.message || 'No se pudo marcar como recogido');
    } finally {
      setMarcando(false);
    }
  }

  return (
    <div style={card}>
      <div style={top}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={badge(solicitud.estado)}>{estado}</span>
        </div>

        <span style={fecha}>{formatearFecha(solicitud.fecha_solicitada)}</span>
      </div>

      <h3 style={titulo}>{solicitud.id_soli}</h3>

      <div style={info}>
        <p><b>Usuario:</b> {solicitud.usuario_nombre || solicitud.usuario}</p>
        <p>Aprobado: {Number(solicitud.aprobado) === 1 ? 'Sí' : 'No'}</p>
        <p>Generado: {Number(solicitud.generado) === 1 ? 'Sí' : 'No'}</p>

        {solicitud.reserva && (
          <p><b>Reserva:</b> {solicitud.reserva}</p>
        )}
      </div>

      <div style={acciones}>
        {puedeMarcarRecogido && !marcado && !marcando && (
          <button onClick={handleMarcarRecogido} style={btnRecogido}>Recogido</button>
        )}

        {marcando && (
          <button disabled style={{ ...btnRecogido, opacity: 0.8 }}>Marcando...</button>
        )}

        <button onClick={() => onVer(solicitud.id_soli)} style={btnVer}>Ver detalle</button>

        {solicitud.estado === 'S1' && onEditar && (
          <button onClick={() => onEditar(solicitud.id_soli)} style={btnEditar}>Editar</button>
        )}

        {solicitud.estado === 'S1' && onEliminar && (
          <button onClick={() => onEliminar(solicitud.id_soli)} style={btnEliminar}>Eliminar</button>
        )}
      </div>

      {/* Badge fijo en esquina inferior derecha */}
      <div style={absoluteBadge}>
          {(marcado || ejecutadas > 0) && (
            <span style={recogidoWrapper}>
              <span style={personIconStyle}><PersonIcon /></span>
              <span style={innerBadgeRecogido}>✓</span>
            </span>
          )}

        {(expirado && !marcado && ejecutadas === 0) && (
          <span style={recogidoWrapper}>
            <span style={personIconStyle}><PersonIcon /></span>
            <span style={innerBadgeExpirado}>✕</span>
          </span>
        )}
      </div>
    </div>
  );
}

function formatearFecha(fecha) {
  if (!fecha) return '';

  return new Date(fecha).toLocaleString('es-PE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function badge(estado) {
  let bg = '#718093';
  let col = 'white';

  if (estado === 'S1') bg = '#fbc531';
  if (estado === 'S2') bg = '#0097e6';
  if (estado === 'S3') bg = '#44bd32';
  if (estado === 'S1') col = 'black';

  return {
    background: bg,
    color: col,
    padding: '6px 10px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 'bold'
  };
}

const card = {
  background: 'white',
  padding: '18px',
  borderRadius: '14px',
  boxShadow: '0 0 10px rgba(0,0,0,0.1)',
  position: 'relative'
};

const top = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '10px',
  alignItems: 'center'
};

const fecha = {
  fontSize: '12px',
  color: '#666'
};

const titulo = {
  margin: '14px 0 8px',
  color: '#273c75'
};

const info = {
  color: '#555',
  fontSize: '14px'
};

const acciones = {
  display: 'flex',
  gap: '8px',
  flexWrap: 'wrap',
  marginTop: '12px'
};

const btnVer = {
  padding: '9px 12px',
  border: 'none',
  borderRadius: '7px',
  background: '#273c75',
  color: 'white',
  cursor: 'pointer'
};

const btnEliminar = {
  ...btnVer,
  background: '#e84118'
};

const btnEditar = {
  ...btnVer,
  background: '#e1b12c',
  color: '#000',
  fontWeight: 'bold'
};

const btnRecogido = {
  padding: '9px 12px',
  border: 'none',
  borderRadius: '7px',
  background: '#27ae60',
  color: 'white',
  cursor: 'pointer',
  fontWeight: 'bold'
};

const recogidoBadge = {
  background: '#2ecc71',
  color: 'white',
  padding: '6px 10px',
  borderRadius: '8px',
  fontSize: '12px',
  fontWeight: 'bold'
};

const recogidoWrapper = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px'
};

const absoluteBadge = {
  position: 'absolute',
  right: 12,
  bottom: 12
};

const personIconStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

const innerBadgeRecogido = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 22,
  height: 22,
  marginLeft: 8,
  borderRadius: 6,
  background: '#2ecc71',
  color: 'white',
  fontSize: 13,
  fontWeight: 'bold'
};

const innerBadgeExpirado = {
  ...innerBadgeRecogido,
  background: '#e74c3c'
};

function PersonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5z" fill="#34495e"/>
      <path d="M4 20c0-3.313 2.687-6 6-6h4c3.313 0 6 2.687 6 6v1H4v-1z" fill="#34495e"/>
    </svg>
  );
}

const expiradoBadge = {
  background: '#e74c3c',
  color: 'white',
  padding: '6px 10px',
  borderRadius: '8px',
  fontSize: '12px',
  fontWeight: 'bold'
};
