export default function TarjetaSolicitud({ solicitud, onVer, onEditar, onEliminar }) {
const estado = solicitud.estado_info?.descripcion || solicitud.estado;

  return (
    <div style={card}>
      <div style={top}>
        <span style={badge(solicitud.estado)}>
          {estado}
        </span>

        <span style={fecha}>
          {formatearFecha(solicitud.fecha_solicitada)}
        </span>
      </div>

      <h3 style={titulo}>{solicitud.id_soli}</h3>

      <div style={info}>
        <p><b>Usuario:</b> {solicitud.usuario_nombre || solicitud.usuario}</p>
        <p>Aprobado: {Number(solicitud.aprobado) === 1 ? "Sí" : "No"}</p>
        <p>Generado: {Number(solicitud.generado) === 1 ? "Sí" : "No"}</p>

        {solicitud.reserva && (
          <p><b>Reserva:</b> {solicitud.reserva}</p>
        )}
      </div>

      <div style={acciones}>
        <button onClick={() => onVer(solicitud.id_soli)} style={btnVer}>
            Ver detalle
        </button>

        {solicitud.estado === "S1" && onEditar && (
            <button onClick={() => onEditar(solicitud.id_soli)} style={btnEditar}>
            Editar
            </button>
        )}

        {solicitud.estado === "S1" && onEliminar && (
            <button onClick={() => onEliminar(solicitud.id_soli)} style={btnEliminar}>
            Eliminar
            </button>
        )}
        </div>
    </div>
  );
}

function formatearFecha(fecha) {
  if (!fecha) return "";

  return new Date(fecha).toLocaleString("es-PE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function badge(estado) {
  let bg = "#718093";
  let col = "white";

  if (estado === "S1") bg = "#fbc531";
  if (estado === "S2") bg = "#0097e6";
  if (estado === "S3") bg = "#44bd32";
  if (estado === "S1") col = "black";

  return {
    background: bg,
    color: col,
    padding: "6px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "bold"
  };
}

const card = {
  background: "white",
  padding: "18px",
  borderRadius: "14px",
  boxShadow: "0 0 10px rgba(0,0,0,0.1)"
};

const top = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  alignItems: "center"
};

const fecha = {
  fontSize: "12px",
  color: "#666"
};

const titulo = {
  margin: "14px 0 8px",
  color: "#273c75"
};

const info = {
  color: "#555",
  fontSize: "14px"
};

const acciones = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  marginTop: "12px"
};

const btnVer = {
  padding: "9px 12px",
  border: "none",
  borderRadius: "7px",
  background: "#273c75",
  color: "white",
  cursor: "pointer"
};

const btnEliminar = {
  ...btnVer,
  background: "#e84118"
};

const btnEditar = {
  ...btnVer,
  background: "#e1b12c",
  color: "#000",
  fontWeight: "bold"
};