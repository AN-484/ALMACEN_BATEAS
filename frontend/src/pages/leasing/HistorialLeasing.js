import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../../components/Layout";
import { LeasingInlineLoading, LeasingPageLoading } from "../../components/LeasingLoading";
import { apiGet } from "../../services/api";

// ─────────────────────────────────────────────────────────────────
// Exportar CSV
// ─────────────────────────────────────────────────────────────────
function exportarCSV(data, filename) {
  if (!data || data.length === 0) {
    alert("No hay datos para exportar");
    return;
  }

  const headers = Object.keys(data[0]);
  const rows = data.map((obj) =>
    headers
      .map((h) => `"${String(obj[h] ?? "").replace(/"/g, '""')}"`)
      .join(",")
  );

  const csv = "\uFEFF" + [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

// ─────────────────────────────────────────────────────────────────
// Componentes pequeños
// ─────────────────────────────────────────────────────────────────
function Badge({ texto, color }) {
  return (
    <span
      style={{
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        background: color + "22",
        color
      }}
    >
      {texto}
    </span>
  );
}

const TIPO_LABEL = { 101: "INGRESO", 201: "SALIDA", 301: "MODIF.", 401: "ELIM." };
const TIPO_COLOR = { 101: "#2980b9", 201: "#27ae60", 301: "#f39c12", 401: "#c0392b" };

// ─────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────
export default function HistorialLeasing() {
  const navigate = useNavigate();
  const esAdmin = String(localStorage.getItem("puede_datos")) === "SI";
  const [cargandoPantalla, setCargandoPantalla] = useState(true);

  const TABS = [
    { id: "materiales", label: "Materiales" },
    { id: "movimientos", label: "Movimientos" },
    ...(esAdmin ? [{ id: "modificaciones", label: "Modificaciones (Admin)" }] : [])
  ];

  const [tab, setTab] = useState("materiales");

  useEffect(() => {
    const timer = setTimeout(() => setCargandoPantalla(false), 220);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Layout>
      <div style={page}>
        {cargandoPantalla ? <LeasingPageLoading message="Cargando historial de LeaseDesk..." /> : null}

        {!cargandoPantalla ? (
          <>
        <div style={headerCard}>
          <h2 style={{ margin: 0 }}>Historial LeaseDesk</h2>
          <p style={{ margin: "6px 0 0", color: "rgba(255,255,255,0.8)" }}>
            Consulta de materiales, movimientos{esAdmin ? " y modificaciones" : ""}.
          </p>

          <div style={headerActions}>
            <button onClick={() => navigate("/leasing")} style={btnSecondary}>
              ↩ Estados generales
            </button>

            <button onClick={() => navigate("/leasing/movimientos")} style={btnSecondary}>
              🔁 Movimientos
            </button>
          </div>
        </div>

        <div style={tabsBar}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={tab === t.id ? tabActive : tabBtn}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "materiales" && <TabMateriales esAdmin={esAdmin} />}
        {tab === "movimientos" && <TabMovimientos esAdmin={esAdmin} />}
        {tab === "modificaciones" && esAdmin && <TabModificaciones />}
          </>
        ) : null}
      </div>
    </Layout>
  );
}

// ─────────────────────────────────────────────────────────────────
// TAB 1 — Materiales
// ─────────────────────────────────────────────────────────────────
function TabMateriales({ esAdmin }) {
  const [q, setQ] = useState("");
  const [datos, setDatos] = useState([]);
  const [cargando, setCargando] = useState(false);

  const cargar = useCallback(async (busqueda) => {
    try {
      setCargando(true);
      const params = new URLSearchParams();
      if (busqueda.trim().length >= 2) params.set("q", busqueda.trim());

      const res = await apiGet(`/api/leasing/historial/materiales?${params}`);
      if (res.success) setDatos(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => cargar(q), 350);
    return () => clearTimeout(t);
  }, [q, cargar]);

  useEffect(() => { cargar(""); }, [cargar]);

  const exportar = () => {
    const filas = datos.map((m) => ({
      ID: m.id,
      Codigo: m.codigo,
      Descripcion: m.descripcion,
      Referencia: m.referencia ?? "",
      Ubicacion: m.ubicacion ?? "",
      Placa: m.placa ?? "",
      Estado: m.estado === 1 ? "Activo" : "Eliminado",
      Fecha_eliminacion: m.date_elim ?? "",
      Modificado: m.modif === 1 ? "Sí" : "No"
    }));
    exportarCSV(filas, `leasing_materiales_${hoyISO()}.csv`);
  };

  return (
    <section style={sectionCard}>
      <div style={barraFiltros}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value.toUpperCase())}
          placeholder="Buscar por código o descripción"
          style={inputFiltro}
        />
        <button onClick={exportar} style={btnExport}>
          ⬇️ Exportar Excel
        </button>
      </div>

      {cargando ? (
        <p style={helperText}><LeasingInlineLoading message="Cargando..." /></p>
      ) : (
        <>
          <p style={helperText}>{datos.length} registro(s)</p>
          <div style={tableWrap}>
            <table style={tabla}>
              <thead>
                <tr>
                  {["ID", "Código", "Descripción", "Referencia", "Ubicación", "Placa", "Estado"].map(
                    (h) => <th key={h} style={th}>{h}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {datos.map((m) => {
                  const eliminado = m.estado === 0;
                  return (
                    <tr key={m.id} style={eliminado ? trEliminado : {}}>
                      <td style={td}>{m.id}</td>
                      <td style={td}>{m.codigo}</td>
                      <td style={td}>{m.descripcion}</td>
                      <td style={td}>{m.referencia ?? "-"}</td>
                      <td style={td}>{m.ubicacion ?? "-"}</td>
                      <td style={td}>{m.placa ?? "-"}</td>
                      <td style={td}>
                        {eliminado ? (
                          <Badge texto={`Eliminado ${m.date_elim ?? ""}`} color="#c0392b" />
                        ) : (
                          <Badge texto="Activo" color="#27ae60" />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────
// TAB 2 — Movimientos
// ─────────────────────────────────────────────────────────────────
function TabMovimientos({ esAdmin }) {
  const primerDiaMes = hoyISO().slice(0, 8) + "01";

  const [q, setQ] = useState("");
  const [desde, setDesde] = useState(primerDiaMes);
  const [hasta, setHasta] = useState(hoyISO());
  const [tipo, setTipo] = useState("0");
  const [datos, setDatos] = useState([]);
  const [cargando, setCargando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setCargando(true);
      const params = new URLSearchParams();
      if (q.trim().length >= 2) params.set("q", q.trim());
      if (desde) params.set("desde", desde);
      if (hasta) params.set("hasta", hasta);
      if (tipo !== "0") params.set("tipo", tipo);

      const res = await apiGet(`/api/leasing/historial/movimientos?${params}`);
      if (res.success) setDatos(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  }, [q, desde, hasta, tipo]);

  useEffect(() => { cargar(); }, [cargar]);

  const exportar = () => {
    const filas = datos.map((m) => ({
      ID: m.id,
      Codigo_material: m.codigo_material,
      Descripcion: m.materiales?.descripcion ?? "",
      Codigo_num: m.materiales?.codigo ?? "",
      Fecha_movimiento: m.date_movi,
      Fecha_creacion: m.date_crea,
      Tipo: m.tipo_movimiento,
      Guia: m.guia ?? "",
      Ubic_destino: m.ubic_destino ?? "",
      Placa: m.placa ?? "",
      Responsable: m.responsable,
      Destinatario: m.destinatario ?? "",
      Obs: m.obs ?? "",
      Editado: m.edit === 1 ? "Sí" : "No",
      Estado: m.estado === 1 ? "Activo" : "Eliminado",
      Fecha_eliminacion: m.date_elim ?? ""
    }));
    exportarCSV(filas, `leasing_movimientos_${hoyISO()}.csv`);
  };

  return (
    <section style={sectionCard}>
      <div style={barraFiltros}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value.toUpperCase())}
          placeholder="Código o descripción material"
          style={inputFiltro}
        />

        <label style={labelFiltro}>
          Desde
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} style={inputDate} />
        </label>

        <label style={labelFiltro}>
          Hasta
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} style={inputDate} />
        </label>

        <label style={labelFiltro}>
          Tipo
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} style={inputDate}>
            <option value="0">Todos</option>
            <option value="101">101 – INGRESO</option>
            <option value="201">201 – SALIDA</option>
          </select>
        </label>

        <button onClick={exportar} style={btnExport}>⬇️ Exportar Excel</button>
      </div>

      {cargando ? (
        <p style={helperText}><LeasingInlineLoading message="Cargando..." /></p>
      ) : (
        <>
          <p style={helperText}>{datos.length} registro(s)</p>
          <div style={tableWrap}>
            <table style={tabla}>
              <thead>
                <tr>
                  {["ID Mov.", "Material", "Descripción", "Fecha Mov.", "Tipo", "Guía",
                    "Ubic/Destino", "Placa", "Responsable", "Destinatario", "Obs", "Estado"
                  ].map((h) => <th key={h} style={th}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {datos.map((m) => {
                  const eliminado = m.estado === 0;
                  return (
                    <tr key={m.id} style={eliminado && esAdmin ? trEliminado : {}}>
                      <td style={td}>{m.id}</td>
                      <td style={td}>{m.materiales?.codigo ?? m.codigo_material}</td>
                      <td style={td}>{m.materiales?.descripcion ?? "-"}</td>
                      <td style={td}>{m.date_movi}</td>
                      <td style={td}>
                        <Badge
                          texto={`${m.tipo_movimiento} ${TIPO_LABEL[m.tipo_movimiento] ?? ""}`}
                          color={TIPO_COLOR[m.tipo_movimiento] ?? "#666"}
                        />
                      </td>
                      <td style={td}>{m.guia ?? "-"}</td>
                      <td style={td}>{m.ubic_destino ?? "-"}</td>
                      <td style={td}>{m.placa ?? "-"}</td>
                      <td style={td}>{m.responsable}</td>
                      <td style={td}>{m.destinatario ?? "-"}</td>
                      <td style={td}>{m.obs ?? "-"}</td>
                      <td style={td}>
                        {eliminado ? (
                          <Badge texto={`Elim. ${m.date_elim ?? ""}`} color="#c0392b" />
                        ) : m.edit === 1 ? (
                          <Badge texto="Modificado" color="#f39c12" />
                        ) : (
                          <Badge texto="Activo" color="#27ae60" />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────
// TAB 3 — Modificaciones (Admin)
// ─────────────────────────────────────────────────────────────────
function TabModificaciones() {
  const primerDiaMes = hoyISO().slice(0, 8) + "01";

  const [q, setQ] = useState("");
  const [desde, setDesde] = useState(primerDiaMes);
  const [hasta, setHasta] = useState(hoyISO());
  const [datos, setDatos] = useState([]);
  const [cargando, setCargando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setCargando(true);
      const params = new URLSearchParams();
      if (q.trim().length >= 2) params.set("q", q.trim());
      if (desde) params.set("desde", desde);
      if (hasta) params.set("hasta", hasta);

      const res = await apiGet(`/api/leasing/historial/modificaciones?${params}`);
      if (res.success) setDatos(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  }, [q, desde, hasta]);

  useEffect(() => { cargar(); }, [cargar]);

  const exportar = () => {
    const filas = datos.map((m) => ({
      ID_modif: m.id,
      ID_movimiento: m.id_movimiento,
      Fecha_modif: m.date_modif,
      Material_ID: m.codigo_material,
      Descripcion: m.materiales?.descripcion ?? "",
      Codigo_num: m.materiales?.codigo ?? "",
      Mov_tipo_original: m.movimientos?.tipo_movimiento ?? "",
      Mov_fecha_original: m.movimientos?.date_movi ?? "",
      Campo_date_movi_antes: m.date_movi ?? "",
      Campo_date_crea_antes: m.date_crea ?? "",
      Campo_tipo_mov_antes: m.tipo_movimiento ?? "",
      Campo_guia_antes: m.guia ?? "",
      Campo_ubic_antes: m.ubic_destino ?? "",
      Campo_placa_antes: m.placa ?? "",
      Campo_responsable_antes: m.responsable ?? "",
      Campo_destinatario_antes: m.destinatario ?? "",
      Campo_obs_antes: m.obs ?? ""
    }));
    exportarCSV(filas, `leasing_modificaciones_${hoyISO()}.csv`);
  };

  return (
    <section style={sectionCard}>
      <div style={barraFiltros}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value.toUpperCase())}
          placeholder="Código o descripción material"
          style={inputFiltro}
        />

        <label style={labelFiltro}>
          Desde
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} style={inputDate} />
        </label>

        <label style={labelFiltro}>
          Hasta
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} style={inputDate} />
        </label>

        <button onClick={exportar} style={btnExport}>⬇️ Exportar Excel</button>
      </div>

      {cargando ? (
        <p style={helperText}><LeasingInlineLoading message="Cargando..." /></p>
      ) : (
        <>
          <p style={helperText}>{datos.length} modificación(es)</p>
          <div style={tableWrap}>
            <table style={tabla}>
              <thead>
                <tr>
                  {["ID Modif.", "ID Mov.", "Fecha Modif.", "Material", "Descripción",
                    "Tipo Mov. Original", "Fecha Mov. Orig.",
                    "↩ date_movi", "↩ guia", "↩ ubic_destino", "↩ placa",
                    "↩ responsable", "↩ destinatario", "↩ obs"
                  ].map((h) => <th key={h} style={th}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {datos.map((m) => (
                  <tr key={m.id}>
                    <td style={td}>{m.id}</td>
                    <td style={td}>{m.id_movimiento}</td>
                    <td style={td}>{m.date_modif}</td>
                    <td style={td}>{m.materiales?.codigo ?? m.codigo_material}</td>
                    <td style={td}>{m.materiales?.descripcion ?? "-"}</td>
                    <td style={td}>
                      <Badge
                        texto={`${m.movimientos?.tipo_movimiento ?? "-"} ${TIPO_LABEL[m.movimientos?.tipo_movimiento] ?? ""}`}
                        color={TIPO_COLOR[m.movimientos?.tipo_movimiento] ?? "#666"}
                      />
                    </td>
                    <td style={td}>{m.movimientos?.date_movi ?? "-"}</td>
                    <td style={tdCambio}>{m.date_movi ?? "—"}</td>
                    <td style={tdCambio}>{m.guia ?? "—"}</td>
                    <td style={tdCambio}>{m.ubic_destino ?? "—"}</td>
                    <td style={tdCambio}>{m.placa ?? "—"}</td>
                    <td style={tdCambio}>{m.responsable ?? "—"}</td>
                    <td style={tdCambio}>{m.destinatario ?? "—"}</td>
                    <td style={tdCambio}>{m.obs ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────
// ESTILOS
// ─────────────────────────────────────────────────────────────────
const page = { display: "grid", gap: 16 };

const headerCard = {
  background: "linear-gradient(135deg, #3b136f 0%, #6d28d9 100%)",
  color: "white",
  padding: "18px 20px",
  borderRadius: 16,
  boxShadow: "0 10px 30px rgba(59,19,111,0.22)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap"
};

const headerActions = { display: "flex", gap: 10, flexWrap: "wrap" };

const btnSecondary = {
  padding: "10px 14px",
  border: "1px solid rgba(255,255,255,0.35)",
  borderRadius: 10,
  background: "rgba(255,255,255,0.12)",
  color: "white",
  cursor: "pointer",
  fontWeight: 700
};

const tabsBar = { display: "flex", gap: 8, flexWrap: "wrap" };

const tabBtn = {
  padding: "10px 18px",
  border: "1px solid #cdd4e0",
  borderRadius: 999,
  background: "white",
  cursor: "pointer",
  fontWeight: 600
};

const tabActive = {
  ...tabBtn,
  background: "#6d28d9",
  color: "white",
  borderColor: "#6d28d9"
};

const sectionCard = {
  background: "white",
  borderRadius: 16,
  padding: 18,
  boxShadow: "0 10px 24px rgba(76,29,149,0.08)"
};

const barraFiltros = {
  display: "flex",
  flexWrap: "wrap",
  gap: 10,
  marginBottom: 14,
  alignItems: "flex-end"
};

const inputFiltro = {
  flex: "1 1 200px",
  border: "1px solid #cdd4e0",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 14
};

const labelFiltro = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  fontSize: 12,
  color: "#4a5568",
  fontWeight: 700
};

const inputDate = {
  border: "1px solid #cdd4e0",
  borderRadius: 8,
  padding: "8px 10px",
  fontSize: 13
};

const btnExport = {
  padding: "10px 14px",
  border: "none",
  borderRadius: 10,
  background: "#2ecc71",
  color: "white",
  cursor: "pointer",
  fontWeight: 700,
  whiteSpace: "nowrap"
};

const helperText = { margin: "0 0 10px", color: "#5b6270", fontSize: 13 };

const tableWrap = { overflowX: "auto" };

const tabla = { width: "100%", borderCollapse: "collapse", fontSize: 12 };

const th = {
  textAlign: "left",
  padding: "8px 10px",
  background: "#f0f4fa",
  borderBottom: "1px solid #d7dfea",
  fontWeight: 700,
  whiteSpace: "nowrap"
};

const td = {
  padding: "7px 10px",
  borderBottom: "1px solid #edf0f5",
  whiteSpace: "nowrap"
};

const tdCambio = {
  ...td,
  background: "#fffbf0",
  color: "#856404"
};

const trEliminado = { background: "#fdf2f2", color: "#c0392b" };
