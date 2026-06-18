import { useEffect, useState } from "react";
import { apiGet, apiPut } from "../../services/api";
import DetalleSolicitud from "./components/DetalleSolicitud";
import { exportarCSV } from "./utils/exportarCSV";

export default function AdminEPPS() {
  const [vista, setVista] = useState("aprobar");

  return (
    <div>
      <div style={tabs}>
        <button
          onClick={() => setVista("aprobar")}
          style={vista === "aprobar" ? btnActivo : btn}
        >
          Aprobar
        </button>

        <button
          onClick={() => setVista("generar")}
          style={vista === "generar" ? btnActivo : btn}
        >
          Generar reserva
        </button>

        <button
          onClick={() => setVista("exportar")}
          style={vista === "exportar" ? btnActivo : btn}
        >
          Exportar
        </button>
      </div>

      {vista === "aprobar" && <AprobarSolicitudes />}
      {vista === "generar" && <GenerarReservas />}
      {vista === "exportar" && <ExportarSolicitudes />}
    </div>
  );
}

function AprobarSolicitudes() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [detalle, setDetalle] = useState(null);
  const [itemsAprobacion, setItemsAprobacion] = useState([]);
  const [obsAprobada, setObsAprobada] = useState("");

  const cargar = async () => {
    try {
      const res = await apiGet("/api/epps/admin/pendientes");

      if (res.success) {
        setSolicitudes(res.data || []);
      }
    } catch (error) {
      console.error(error);
      alert("No se pudo cargar pendientes");
    }
  };

  const verDetalle = async (id_soli) => {
    try {
      const res = await apiGet(`/api/epps/solicitud/${id_soli}`);

      if (res.success) {
        setDetalle(res.data);
        setItemsAprobacion(
          (res.data.items || []).map(item => ({
            id_item: item.id_item,
            aprobado: 1,
            cant_aprobada: item.cantidad,
            descripcion: item.epp?.descripcion,
            cantidad: item.cantidad,
            unidad: item.epp?.unidad
          }))
        );
        setObsAprobada("");
      }
    } catch (error) {
      console.error(error);
      alert("No se pudo cargar detalle");
    }
  };

  const cambiarItem = (id_item, campo, valor) => {
    setItemsAprobacion(prev =>
      prev.map(item =>
        item.id_item === id_item
          ? { ...item, [campo]: valor }
          : item
      )
    );
  };

  const aprobarTodo = () => {
    setItemsAprobacion(prev =>
      prev.map(item => ({
        ...item,
        aprobado: 1,
        cant_aprobada: item.cantidad
      }))
    );
  };

  const aprobarSolicitud = async () => {
    try {
      if (!detalle) return;

      const payload = {
        aprobar: true,
        obs_aprobada: obsAprobada,
        items: itemsAprobacion.map(item => ({
            id_item: item.id_item,
            aprobado: Number(item.aprobado),
            cant_aprobada: Number(item.cant_aprobada || 0)
        }))
    };

      const res = await apiPut(
        `/api/epps/admin/aprobar/${detalle.id_soli}`,
        payload
      );

      if (res.success) {
        alert(res.message);
        setDetalle(null);
        cargar();
      }
    } catch (error) {
      console.error(error);
      alert(error.message || "No se pudo aprobar");
    }
  };

  const desaprobarSolicitud = async () => {
    try {
      if (!detalle) return;

      const ok = window.confirm("¿Desaprobar esta solicitud?");
      if (!ok) return;

      const payload = {
        aprobar: false
    };

      const res = await apiPut(
        `/api/epps/admin/aprobar/${detalle.id_soli}`,
        payload
      );

      if (res.success) {
        alert(res.message);
        setDetalle(null);
        cargar();
      }
    } catch (error) {
      console.error(error);
      alert(error.message || "No se pudo desaprobar");
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  return (
    <div>
      <PanelTitulo
        titulo="Solicitudes pendientes de aprobación"
        subtitulo="Revise, apruebe total/parcialmente o desapruebe solicitudes."
        onActualizar={cargar}
      />

      <ListaSolicitudes solicitudes={solicitudes} onVer={verDetalle} />

      {detalle && (
        <div style={panelDetalle}>
          <DetalleSolicitud detalle={detalle} onCerrar={() => setDetalle(null)} />

          <div style={card}>
            <h3>Aprobación de items</h3>

            <button onClick={aprobarTodo} style={btnAzul}>
              Aprobar todo
            </button>

            <div style={tablaBox}>
              <table style={tabla}>
                <thead>
                  <tr>
                    <th style={th}>EPP</th>
                    <th style={th}>Solicitado</th>
                    <th style={th}>Aprobado</th>
                    <th style={th}>Cantidad aprobada</th>
                  </tr>
                </thead>

                <tbody>
                  {itemsAprobacion.map(item => (
                    <tr key={item.id_item}>
                      <td style={td}>{item.descripcion}</td>
                      <td style={td}>{item.cantidad} {item.unidad}</td>
                      <td style={td}>
                        <select
                          value={item.aprobado}
                          onChange={(e) =>
                            cambiarItem(item.id_item, "aprobado", Number(e.target.value))
                          }
                          style={input}
                        >
                          <option value={1}>Sí</option>
                          <option value={0}>No</option>
                        </select>
                      </td>
                      <td style={td}>
                        <input
                          type="number"
                          min="0"
                          value={item.cant_aprobada}
                          onChange={(e) =>
                            cambiarItem(item.id_item, "cant_aprobada", e.target.value)
                          }
                          style={input}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <label style={label}>Observación de aprobación</label>
            <textarea
              value={obsAprobada}
              onChange={(e) => setObsAprobada(e.target.value.toUpperCase())}
              style={textarea}
              placeholder="Ejemplo: SE APRUEBA TODO / SE APRUEBAN SOLO GUANTES Y LENTES..."
            />

            <div style={acciones}>
              <button onClick={aprobarSolicitud} style={btnVerde}>
                Aprobar solicitud
              </button>

              <button onClick={desaprobarSolicitud} style={btnRojo}>
                Desaprobar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GenerarReservas() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [detalle, setDetalle] = useState(null);
  const [reserva, setReserva] = useState("");
  const [itemsReserva, setItemsReserva] = useState([]);
  const [obsGeneral, setObsGeneral] = useState("");
  const [copiado, setCopiado] = useState(false);

  const cargar = async () => {
    try {
      const res = await apiGet("/api/epps/admin/generar");

      if (res.success) {
        setSolicitudes(res.data || []);
      }
    } catch (error) {
      console.error(error);
      alert("No se pudo cargar solicitudes por generar");
    }
  };

  const verDetalle = async (id_soli) => {
    try {
      const res = await apiGet(`/api/epps/solicitud/${id_soli}`);

      if (res.success) {
        setDetalle(res.data);
        setItemsReserva(
        (res.data.items || [])
            .filter(item => Number(item.aprobado) === 1)
            .map(item => ({
            id_item: item.id_item,
            descripcion: item.epp?.descripcion,
            sap: item.epp?.sap,
            unidad: item.epp?.unidad,
            cant_aprobada: Number(item.cant_aprobada || 0),
            cant_reservada: Number(item.cant_aprobada || 0)
            }))
        );

        setObsGeneral("");
        setReserva("");
      }
    } catch (error) {
      console.error(error);
      alert("No se pudo cargar detalle");
    }
  };

  const generar = async () => {
    try {
      if (!detalle) return;

      if (reserva.length !== 10) {
        alert("La reserva debe tener 10 dígitos");
        return;
      }

      const res = await apiPut(
        `/api/epps/admin/generar/${detalle.id_soli}`,
        {
            reserva,
            obs_general: obsGeneral,
            items: itemsReserva.map(item => ({
            id_item: item.id_item,
            cant_aprobada: item.cant_aprobada,
            cant_reservada: item.cant_reservada
            }))
        }
        );

      if (res.success) {
        alert("Reserva registrada correctamente");
        setDetalle(null);
        setReserva("");
        cargar();
      }
    } catch (error) {
      console.error(error);
      alert(error.message || "No se pudo generar reserva");
    }
  };

  const cambiarReservado = (id_item, valor) => {
    const cantidad = Number(valor);

    setItemsReserva(prev =>
        prev.map(item =>    
        item.id_item === id_item
            ? {
                ...item,
                cant_reservada:
                cantidad < 0
                    ? 0
                    : cantidad > item.cant_aprobada
                    ? item.cant_aprobada
                    : cantidad
            }
            : item
        )
    );
    };

  useEffect(() => {
    cargar();
  }, []);

  return (
    <div>
      <PanelTitulo
        titulo="Solicitudes aprobadas por generar"
        subtitulo="Ingrese manualmente el número de reserva de 10 dígitos."
        onActualizar={cargar}
      />

      <ListaSolicitudes solicitudes={solicitudes} onVer={verDetalle} />

      {detalle && (
        <div style={panelDetalle}>
          <DetalleSolicitud detalle={detalle} onCerrar={() => setDetalle(null)} />

          <div style={card}>
            <h3>Registrar reserva</h3>

            <div style={tablaBox}>
                <table style={tabla}>
                    <thead>
                    <tr>
                        <th style={th}>SAP completo</th>
                        <th style={th}>EPP</th>
                        <th style={th}>Unidad</th>
                        <th style={th}>Cant. aprobada</th>
                        <th style={th}>Cant. reservada</th>
                    </tr>
                    </thead>

                    <tbody>
                    {itemsReserva.map(item => (
                        <tr key={item.id_item}>
                        <td style={td}>{item.sap}</td>
                        <td style={td}>{item.descripcion}</td>
                        <td style={td}>{item.unidad}</td>
                        <td style={td}>{item.cant_aprobada}</td>
                        <td style={td}>
                            <input
                            type="number"
                            min="0"
                            max={item.cant_aprobada}
                            value={item.cant_reservada}
                            onChange={(e) =>
                                cambiarReservado(item.id_item, e.target.value)
                            }
                            style={input}
                            />
                        </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                </div>

            {detalle && (
                <div style={usuarioCreadorBox}>
                    <div>
                        <div style={usuarioCreadorLabel}>Usuario creador</div>
                        <div style={usuarioCreadorText}>
                            {formatearUsuarioCreador(detalle)}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={async () => {
                          await copiarUsuarioCreador(detalle);
                          setCopiado(true);
                          setTimeout(() => setCopiado(false), 2000);
                        }}
                        style={btnCopiar}
                    >
                        {copiado ? "✓" : "Copiar"}
                    </button>
                </div>
            )}

            <label style={label}>N° de reserva</label>

            <input
              value={reserva}
              maxLength={10}
              onChange={(e) =>
                setReserva(e.target.value.replace(/\D/g, "").slice(0, 10))
              }
              placeholder="Número de reserva de 10 dígitos"
              style={inputReserva}
            />

            <label style={label}>Observación general</label>
            <textarea
                value={obsGeneral}
                onChange={(e) => setObsGeneral(e.target.value.toUpperCase())}
                style={textarea}
                placeholder="Ejemplo: NO SE RESERVÓ TODO POR FALTA DE STOCK..."
            />

            <button onClick={generar} style={btnVerde}>
              Marcar como generado
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ExportarSolicitudes() {
  const exportar = async () => {
    try {
      const res = await apiGet("/api/epps/admin/exportar");

      if (!res.success) {
        alert("No se pudo exportar");
        return;
      }

      const data = (res.data || []).map(s => ({
        id_soli: s.id_soli,
        usuario: s.usuario_nombre || s.usuario,
        fecha_solicitada: s.fecha_solicitada,
        estado: s.estado_info?.descripcion || s.estado,
        aprobado: s.aprobado,
        adm_aprueba: s.adm_aprueba_nombre || s.adm_aprueba || "",
        fecha_aprobado: s.fecha_aprobado || "",
        generado: s.generado,
        reserva: s.reserva || "",
        adm_genera: s.adm_genera_nombre || s.adm_genera || "",
        fecha_generado: s.fecha_generado || "",
        obs_general: s.obs_general || "",
        obs_aprobada: s.obs_aprobada || ""
      }));

      exportarCSV(data, "solicitudes_epps.csv");
    } catch (error) {
      console.error(error);
      alert("No se pudo exportar solicitudes");
    }
  };

  return (
    <div style={card}>
      <h3>Exportar solicitudes EPPS</h3>
      <p style={{ color: "#666" }}>
        Descarga todas las solicitudes en archivo compatible con Excel.
      </p>

      <button onClick={exportar} style={btnVerde}>
        Exportar CSV
      </button>
    </div>
  );
}

function PanelTitulo({ titulo, subtitulo, onActualizar }) {
  return (
    <div style={header}>
      <div>
        <h3 style={{ margin: 0 }}>{titulo}</h3>
        <p style={{ margin: "6px 0 0", color: "#666" }}>
          {subtitulo}
        </p>
      </div>

      <button onClick={onActualizar} style={btnAzul}>
        Actualizar
      </button>
    </div>
  );
}

function ListaSolicitudes({ solicitudes, onVer }) {
  if (!solicitudes || solicitudes.length === 0) {
    return (
      <div style={vacio}>
        No hay solicitudes para mostrar.
      </div>
    );
  }

  return (
    <div style={grid}>
      {solicitudes.map(s => (
        <div key={s.id_soli} style={solicitudCard}>
          <h3 style={{ margin: "0 0 8px" }}>{s.id_soli}</h3>
          <p style={meta}>Usuario: {s.usuario_nombre || s.usuario}</p>
          <p style={meta}>Fecha: {formatearFecha(s.fecha_solicitada)}</p>
          <p style={meta}>Estado: {s.estado_info?.descripcion || s.estado}</p>

          <button onClick={() => onVer(s.id_soli)} style={btnAzul}>
            Procesar
          </button>
        </div>
      ))}
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

function formatearUsuarioCreador(detalle) {
  if (!detalle) return "-";

  const dni = detalle.usuario_dni || "-";
  const nombre = detalle.usuario_nombre || detalle.usuario || "Usuario desconocido";
  const primerosNombres = nombre
    .split(" ")
    .slice(0, 2)
    .join(" ");

  return `${dni} ${primerosNombres}`;
}

function copiarUsuarioCreador(detalle) {
  const texto = formatearUsuarioCreador(detalle);

  if (!navigator.clipboard) {
    return new Promise((resolve) => {
      const textarea = document.createElement("textarea");
      textarea.value = texto;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      resolve();
    });
  }

  return navigator.clipboard.writeText(texto).catch(() => {
    // silence errors; UX is indicated by button state
  });
}

const tabs = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  marginBottom: "20px"
};

const btn = {
  padding: "10px 14px",
  border: "none",
  borderRadius: "8px",
  background: "#718093",
  color: "white",
  cursor: "pointer"
};

const btnActivo = {
  ...btn,
  background: "#273c75"
};

const header = {
  background: "white",
  padding: "18px",
  borderRadius: "14px",
  boxShadow: "0 0 10px rgba(0,0,0,0.1)",
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  flexWrap: "wrap",
  alignItems: "center",
  marginBottom: "20px"
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: "14px"
};

const solicitudCard = {
  background: "white",
  padding: "16px",
  borderRadius: "14px",
  boxShadow: "0 0 10px rgba(0,0,0,0.1)"
};

const meta = {
  margin: "4px 0",
  color: "#666",
  fontSize: "14px"
};

const card = {
  background: "#d0d0d0",
  padding: "18px",
  borderRadius: "14px",
  boxShadow: "0 0 10px rgba(0,0,0,0.1)",
  marginTop: "20px"
};

const panelDetalle = {
  marginTop: "20px"
};

const btnAzul = {
  padding: "10px 14px",
  border: "none",
  borderRadius: "8px",
  background: "#273c75",
  color: "white",
  cursor: "pointer",
  fontWeight: "bold"
};

const btnVerde = {
  ...btnAzul,
  background: "#44bd32"
};

const btnRojo = {
  ...btnAzul,
  background: "#e84118"
};

const acciones = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  marginTop: "15px"
};

const tablaBox = {
  overflowX: "auto",
  border: "1px solid #ddd",
  borderRadius: "10px",
  marginTop: "15px"
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

const input = {
  padding: "8px",
  borderRadius: "6px",
  border: "1px solid #ccc"
};

const label = {
  display: "block",
  marginTop: "12px",
  marginBottom: "5px",
  fontWeight: "bold"
};

const textarea = {
  width: "100%",
  minHeight: "75px",
  padding: "10px",
  borderRadius: "8px",
  border: "1px solid #ccc",
  boxSizing: "border-box"
};

const inputReserva = {
  width: "100%",
  maxWidth: "300px",
  padding: "10px",
  borderRadius: "8px",
  border: "1px solid #ccc",
  marginRight: "10px",
  marginBottom: "10px"
};

const usuarioCreadorBox = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "16px",
  maxWidth: "300px",
  background: "#f8f9fb",
  border: "1px solid #cfd8dc",
  borderRadius: "10px",
  padding: "12px 16px",
  margin: "20px 0"
};

const usuarioCreadorLabel = {
  color: "#555",
  fontSize: "12px",
  marginBottom: "6px"
};

const usuarioCreadorText = {
  fontSize: "14px",
  color: "#222",
  fontWeight: "600"
};

const btnCopiar = {
  padding: "10px 14px",
  border: "none",
  borderRadius: "8px",
  background: "#4a69bd",
  color: "white",
  cursor: "pointer"
};

const vacio = {
  background: "white",
  padding: "18px",
  borderRadius: "14px",
  boxShadow: "0 0 10px rgba(0,0,0,0.1)",
  color: "#666"
};