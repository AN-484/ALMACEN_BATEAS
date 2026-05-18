import { formatearSAPVisual } from "../utils/sap";

export default function DetalleSolicitud({ detalle, onCerrar }) {
  if (!detalle) return null;

  return (
    <div style={card}>
      <div style={header}>
        <div>
          <h3 style={{ margin: 0 }}>{detalle.id_soli}</h3>
          <p style={meta}>
            Estado: {detalle.estado_info?.descripcion || detalle.estado}
          </p>
        </div>

        <button onClick={onCerrar} style={btnCerrar}>
          Cerrar
        </button>
      </div>

      <div style={gridInfo}>
        <Info label="Fecha solicitud" value={formatearFecha(detalle.fecha_solicitada)} />
        <Info label="Aprobado" value={Number(detalle.aprobado) === 1 ? "Sí" : "No"} />
        <Info label="Generado" value={Number(detalle.generado) === 1 ? "Sí" : "No"} />
        <Info label="Reserva" value={detalle.reserva || "-"} />
        <Info label="Usuario" value={detalle.usuario_nombre || detalle.usuario} />
        <Info label="Admin aprueba" value={detalle.adm_aprueba_nombre || detalle.adm_aprueba || "-"} />
        <Info label="Admin genera" value={detalle.adm_genera_nombre || detalle.adm_genera || "-"} />
      </div>

      {detalle.obs_general && (
        <div style={obs}>
          <b>Observación general:</b> {detalle.obs_general}
        </div>
      )}

      {detalle.obs_aprobada && (
        <div style={obs}>
          <b>Observación aprobación:</b> {detalle.obs_aprobada}
        </div>
      )}

      <div style={tablaBox}>
        <table style={tabla}>
          <thead>
            <tr>
              <th style={th}>SAP</th>
              <th style={th}>Descripción</th>
              <th style={th}>Unidad</th>
              <th style={th}>Solicitado</th>
              <th style={th}>Aprobado</th>
              <th style={th}>Reservado</th>
              <th style={th}>Estado item</th>
            </tr>
          </thead>

          <tbody>
            {(detalle.items || []).map(item => (
              <tr key={item.id_item}>
                <td style={td}>{formatearSAPVisual(item.epp?.sap)}</td>
                <td style={td}>{item.epp?.descripcion}</td>
                <td style={td}>{item.epp?.unidad}</td>
                <td style={td}>{item.cantidad}</td>
                <td style={td}>{item.cant_aprobada ?? "-"}</td>
                <td style={td}>{item.cant_reservada ?? "-"}</td>
                <td style={td}>
                  {Number(item.aprobado) === 1 ? "APROBADO" : "NO APROBADO"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div style={infoBox}>
      <span style={infoLabel}>{label}</span>
      <b>{value}</b>
    </div>
  );
}

function formatearFecha(fecha) {
  if (!fecha) return "-";

  return new Date(fecha).toLocaleString("es-PE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

const card = {
  background: "#d0d0d0",
  padding: "18px",
  borderRadius: "14px",
  boxShadow: "0 0 10px rgba(0,0,0,0.1)",
  marginTop: "20px"
};

const header = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  flexWrap: "wrap",
  marginBottom: "15px"
};

const meta = {
  margin: "5px 0 0",
  color: "#666"
};

const btnCerrar = {
  padding: "9px 12px",
  border: "none",
  borderRadius: "7px",
  background: "#718093",
  color: "white",
  cursor: "pointer"
};

const gridInfo = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "10px",
  marginBottom: "15px"
};

const infoBox = {
  padding: "10px",
  background: "#f5f6fa",
  borderRadius: "10px"
};

const infoLabel = {
  display: "block",
  fontSize: "12px",
  color: "#666",
  marginBottom: "4px"
};

const obs = {
  padding: "10px",
  background: "#fff8d6",
  border: "1px solid #fbc531",
  borderRadius: "8px",
  marginBottom: "12px"
};

const tablaBox = {
  overflowX: "auto",
  border: "1px solid #ddd",
  borderRadius: "10px"
};

const tabla = {
  width: "100%",
  borderCollapse: "collapse"
};

const th = {
  background: "#273c75",
  color: "white",
  padding: "10px",
  textAlign: "left",
  whiteSpace: "nowrap"
};

const td = {
  padding: "10px",
  borderBottom: "1px solid #eee",
  whiteSpace: "nowrap"
};