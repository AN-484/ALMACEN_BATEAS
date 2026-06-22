import { useEffect, useState } from "react";
import { apiGet } from "../../services/api";
import { verObservacion,
  obtenerContenidoObservacion } from "../../utils/observaciones";
import { SccoInlineLoading, SccoPageLoading } from "../../components/SccoLoading";
import SccoComboBox from "../../components/SccoComboBox";

export default function ReportesCilindros() {
  const [vista, setVista] = useState("ingresos");
  const [cambiandoVista, setCambiandoVista] = useState(false);
  const [esMovil, setEsMovil] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const onResize = () => setEsMovil(window.innerWidth <= 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const onCambiarVista = (nuevaVista) => {
    if (nuevaVista === vista || cambiandoVista) return;

    setCambiandoVista(true);
    setVista(nuevaVista);

    setTimeout(() => {
      setCambiandoVista(false);
    }, 350);
  };

  return (
    <div style={card}>
      {cambiandoVista ? <SccoPageLoading message="Cargando reporte SCCO..." /> : null}
      <h3>Reportes de Cilindros</h3>

      <div style={tabs(esMovil)}>
        <button
          style={vista === "ingresos" ? btnActivo(esMovil) : btn(esMovil)}
          onClick={() => onCambiarVista("ingresos")}
          disabled={cambiandoVista}
        >
          Ingresos / Recargas
        </button>

        <button
          style={vista === "movimientos" ? btnActivo(esMovil) : btn(esMovil)}
          onClick={() => onCambiarVista("movimientos")}
          disabled={cambiandoVista}
        >
          Despachos / Devoluciones
        </button>

        <button
          style={vista === "kardex" ? btnActivo(esMovil) : btn(esMovil)}
          onClick={() => onCambiarVista("kardex")}
          disabled={cambiandoVista}
        >
          Kardex
        </button>
      </div>

      {vista === "ingresos" && <ReporteIngresos />}
      {vista === "movimientos" && <ReporteMovimientos />}
      {vista === "kardex" && <ReporteKardex />}
    </div>
  );
}

function ReporteIngresos() {
  const [datos, setDatos] = useState([]);
  const [cargando, setCargando] = useState(false);

  const [productos, setProductos] = useState([]);
  const [transportistas, setTransportistas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [tiposMovimiento, setTiposMovimiento] = useState([]);

  const [guia, setGuia] = useState("");
  const [documento, setDocumento] = useState("");
  const [cilindro, setCilindro] = useState("");
  const [tipo, setTipo] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  const cargarCombos = async () => {
    const prod = await apiGet("/api/cilindros/productos");
    const trans = await apiGet("/api/cilindros/transportistas");
    const usu = await apiGet("/api/cilindros/usuarios");
    const movs = await apiGet("/api/cilindros/tipos-movimiento");
    setProductos(prod);
    setTransportistas(trans);
    setUsuarios(usu);
    setTiposMovimiento(movs);
  };

  const cargar = async () => {
    if (cargando) return;

    setCargando(true);

    let url = "/api/cilindros/reportes/entradas-salidas?";
    const params = [];

    if (guia) params.push(`guia=${encodeURIComponent(guia)}`);
    if (documento) params.push(`documento=${encodeURIComponent(documento)}`);
    if (cilindro) params.push(`cilindro=${encodeURIComponent(cilindro)}`);
    if (tipo) params.push(`tipo=${encodeURIComponent(tipo)}`);
    if (fechaInicio) {
    params.push(`fecha_inicio=${encodeURIComponent(fechaInicio)}`);
    }

    if (fechaFin) {
    params.push(`fecha_fin=${encodeURIComponent(fechaFin)}`);
    }

    url += params.join("&");

    try {
      const res = await apiGet(url);
      setDatos(res);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarCombos();
    cargar();
  }, []);

  const nombreProducto = (codigo) => {
    const item = productos.find(p => p.codigo === codigo);
    return item ? item.nombre : codigo;
  };

  const nombreTransportista = (codigo) => {
    const item = transportistas.find(t => t.codigo === codigo);
    return item ? item.nombre : codigo;
  };

  const nombreUsuario = (codigo) => {
    const item = usuarios.find(u => u.codigo === codigo);
    return item ? item.sub_nombre: codigo;
  };

  const nombreMovimiento = (id) => {
    const item = tiposMovimiento.find(
      t => String(t.id) === String(id)
    );

    return item ? item.nombre : id;
  };

  const rowsExport = datos.map(d => ({
    fecha: d.fecha,
    guia: d.nro_guia,
    documento: d.nro_documento,
    cilindro: d.cilindro,
    producto: nombreProducto(d.producto),
    transportista: nombreTransportista(d.transportista),
    tipo: nombreMovimiento(d.tipo),
    registrado_por: nombreUsuario(d.registrado_por),
    cambio: d.cambio || "",
    obs: d.obs_id || ""
  }));

  return (
    <div>
      {cargando ? <SccoPageLoading message="Cargando reporte de ingresos..." /> : null}
      <h4>Reporte de Ingresos / Recargas</h4>

      <div style={filtros}>
        <input
          type="date"
          value={fechaInicio}
          onChange={(e) => setFechaInicio(e.target.value.toUpperCase())}
          style={input}
        />

        <input
          type="date"
          value={fechaFin}
          onChange={(e) => setFechaFin(e.target.value.toUpperCase())}
          style={input}
        />

        <input
          placeholder="Guía"
          value={guia}
          onChange={(e) => setGuia(e.target.value.toUpperCase())}
          style={input}
        />

        <input
          placeholder="N° Documento"
          value={documento}
          onChange={(e) => setDocumento(e.target.value.toUpperCase())}
          style={input}
        />

        <input
          placeholder="Cilindro"
          value={cilindro}
          onChange={(e) => setCilindro(e.target.value.toUpperCase())}
          style={input}
        />

        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value.toUpperCase())}
          style={input}
        >
          <option value="">Todos</option>
          <option value="M001">INGRESO</option>
          <option value="M004">RECARGA</option>
        </select>

        <button onClick={cargar} style={btnBuscar} disabled={cargando}>
          {cargando ? <SccoInlineLoading message="Buscando..." /> : "Buscar"}
        </button>

        <button
          onClick={() => exportarCSV(rowsExport, "ingresos_recargas.csv")}
          style={btnExcel}
          disabled={cargando}
        >
          Exportar CSV
        </button>
      </div>

      <Tabla
        headers={[
          "Fecha",
          "Guía",
          "Documento",
          "Cilindro",
          "Producto",
          "Transportista",
          "Tipo",
          "Registrado por",
          "Cambio",
          "Obs."
        ]}
        rows={rowsExport.map(d => [
          d.fecha,
          d.guia,
          d.documento,
          d.cilindro,
          d.producto,
          d.transportista,
          d.tipo,
          d.registrado_por,
          d.cambio || "",
          <button
            disabled={!d.obs || !String(d.obs).trim()}
            onClick={() => verObservacion(d.obs)}
            style={
              !d.obs || !String(d.obs).trim()
                ? btnObsDisabled
                : btnObs
            }
          >
            {!d.obs || !String(d.obs).trim()
              ? "Sin Obs."
              : "Ver"}
          </button>
        ])}
      />
    </div>
  );
}

function ReporteMovimientos() {
  const [datos, setDatos] = useState([]);
  const [cargando, setCargando] = useState(false);

  const [productos, setProductos] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [tiposMovimiento, setTiposMovimiento] = useState([]);

  const [cilindro, setCilindro] = useState("");
  const [material, setMaterial] = useState("");
  const [area, setArea] = useState("");
  const [tipo, setTipo] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  const cargarCombos = async () => {
    const prod = await apiGet("/api/cilindros/productos");
    const ubi = await apiGet("/api/cilindros/ubicaciones");
    const usu = await apiGet("/api/cilindros/usuarios");
    const movs = await apiGet("/api/cilindros/tipos-movimiento");
    setProductos(prod);
    setUbicaciones(ubi);
    setUsuarios(usu);
    setTiposMovimiento(movs);
  };

  const cargar = async () => {
    if (cargando) return;

    setCargando(true);

    let url = "/api/cilindros/reportes/movimientos?";
    const params = [];

    if (cilindro) params.push(`cilindro=${encodeURIComponent(cilindro)}`);
    if (material) params.push(`material=${encodeURIComponent(material)}`);
    if (area) params.push(`area=${encodeURIComponent(area)}`);
    if (tipo) params.push(`tipo=${encodeURIComponent(tipo)}`);
    if (fechaInicio) params.push(`fecha_inicio=${fechaInicio}`);
    if (fechaFin) params.push(`fecha_fin=${fechaFin}`);

    url += params.join("&");

    try {
      const res = await apiGet(url);
      setDatos(res);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarCombos();
    cargar();
  }, []);

  const nombreProducto = (codigo) => {
    const item = productos.find(p => p.codigo === codigo);
    return item ? item.nombre : codigo;
  };

  const nombreArea = (codigo) => {
    const item = ubicaciones.find(u => u.codigo === codigo || u.nombre === codigo);
    return item ? item.nombre : codigo;
  };

  const nombreUsuario = (codigo) => {
    const item = usuarios.find(u => u.codigo === codigo);
    return item ? item.sub_nombre : codigo;
  };

  const nombreMovimiento = (id) => {
    const item = tiposMovimiento.find(
      t => String(t.id) === String(id)
    );

    return item ? item.nombre : id;
  };

  const rowsExport = datos.map(d => ({
    fecha: d.fecha,
    cilindro: d.cilindro,
    material: nombreProducto(d.material),
    area: nombreArea(d.area),
    tipo: nombreMovimiento(d.tipo),
    autorizado_por: nombreUsuario(d.encargado_almacen),
    responsable: d.responsable_area,
    registrado_por: nombreUsuario(d.registrado_por),
    cambio: d.cambio || "",
    obs: d.obs_id || ""
  }));

  return (
    <div>
      {cargando ? <SccoPageLoading message="Cargando reporte de movimientos..." /> : null}
      <h4>Reporte de Despachos / Devoluciones</h4>

      <div style={filtros}>
        <input
          type="date"
          value={fechaInicio}
          onChange={(e) => setFechaInicio(e.target.value.toUpperCase())}
          style={input}
        />

        <input
          type="date"
          value={fechaFin}
          onChange={(e) => setFechaFin(e.target.value.toUpperCase())}
          style={input}
        />

        <input
          placeholder="Cilindro"
          value={cilindro}
          onChange={(e) => setCilindro(e.target.value.toUpperCase())}
          style={input}
        />

        <select
          value={material}
          onChange={(e) => setMaterial(e.target.value.toUpperCase())}
          style={input}
        >
          <option value="">Todos los materiales</option>
          {productos.map(p => (
            <option key={p.codigo} value={p.codigo}>
              {p.nombre}
            </option>
          ))}
        </select>

        <select
          value={area}
          onChange={(e) => setArea(e.target.value.toUpperCase())}
          style={input}
        >
          <option value="">Todas las áreas</option>
          {ubicaciones.map(u => (
            <option key={u.codigo} value={u.codigo}>
              {u.nombre}
            </option>
          ))}
        </select>

        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value.toUpperCase())}
          style={input}
        >
          <option value="">Todos</option>
          <option value="M002">DESPACHO</option>
          <option value="M003">DEVOLUCIÓN</option>
        </select>

        <button onClick={cargar} style={btnBuscar} disabled={cargando}>
          {cargando ? <SccoInlineLoading message="Buscando..." /> : "Buscar"}
        </button>

        <button
          onClick={() => exportarCSV(rowsExport, "despachos_devoluciones.csv")}
          style={btnExcel}
          disabled={cargando}
        >
          Exportar CSV
        </button>
      </div>

      <Tabla
        headers={[
          "Fecha",
          "Cilindro",
          "Material",
          "Área",
          "Tipo",
          "Autorizado por",
          "Responsable",
          "Registrado por",
          "Cambio",
          "Obs."
        ]}
        rows={rowsExport.map(d => [
          d.fecha,
          d.cilindro,
          d.material,
          d.area,
          d.tipo,
          d.autorizado_por,
          d.responsable,
          d.registrado_por,
          d.cambio,
          <button
            disabled={!d.obs || !String(d.obs).trim()}
            onClick={() => verObservacion(d.obs)}
            style={
              !d.obs || !String(d.obs).trim()
                ? btnObsDisabled
                : btnObs
            }
          >
            {!d.obs || !String(d.obs).trim()
              ? "Sin Obs."
              : "Ver"}
          </button>
        ])}
      />
    </div>
  );
}

function ReporteKardex() {
  const [cilindro, setCilindro] = useState("");
  const [datos, setDatos] = useState([]);
  const [cargando, setCargando] = useState(false);

  const [productos, setProductos] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [tiposMovimiento, setTiposMovimiento] = useState([]);

  const cargarCombos = async () => {
    const prod = await apiGet("/api/cilindros/productos");
    const ubi = await apiGet("/api/cilindros/ubicaciones");
    const usu = await apiGet("/api/cilindros/usuarios");
    const movs = await apiGet("/api/cilindros/tipos-movimiento");

    setProductos(prod);
    setUbicaciones(ubi);
    setUsuarios(usu);
    setTiposMovimiento(movs);
  };

  useEffect(() => {
    cargarCombos();
  }, []);

  const buscar = async () => {
    if (cargando) return;

    if (!cilindro.trim()) {
      alert("Ingrese código de cilindro");
      return;
    }

    setCargando(true);

    try {
      const res = await apiGet(
        `/api/cilindros/reportes/kardex/${encodeURIComponent(cilindro.trim())}`
      );

      if (!Array.isArray(res)) {
        console.error("Respuesta inesperada del servidor:", res);
        alert("Error al cargar el kardex: respuesta inv\u00e1lida del servidor.");
        return;
      }

      setDatos(res);
    } catch (error) {
      console.error("Error kardex:", error);
      alert(`Error al buscar kardex: ${error.message}`);
    } finally {
      setCargando(false);
    }
  };

  const nombreProducto = (codigo) => {
    const item = productos.find(p => p.codigo === codigo);
    return item ? item.nombre : codigo;
  };

  const nombreArea = (codigo) => {
    const item = ubicaciones.find(u => u.codigo === codigo || u.nombre === codigo);
    return item ? item.nombre : codigo;
  };

  const nombreUsuario = (codigo) => {
    const item = usuarios.find(u => u.codigo === codigo);
    return item ? item.sub_nombre : codigo;
  };

  const nombreMovimiento = (id) => {
    const item = tiposMovimiento.find(
      t => String(t.id) === String(id)
    );

    return item ? item.nombre : id;
  };

  const rowsExport = datos.map(d => ({
    fecha: d.fecha,
    cilindro: d.cilindro,
    tipo: nombreMovimiento(d.tipo),
    origen: d.origen,
    detalle: d.detalle,
    material: nombreProducto(d.material),
    area: nombreArea(d.area),
    registrado_por: nombreUsuario(d.registrado_por),
    cambio: d.cambio || "",
    obs: d.obs_id || ""
  }));

  return (
    <div>
      {cargando ? <SccoPageLoading message="Cargando kardex..." /> : null}
      <h4>Kardex por Cilindro</h4>

      <div style={filtros}>
        <input
          placeholder="Código de cilindro"
          value={cilindro}
          onChange={(e) => setCilindro(e.target.value.toUpperCase())}
          style={input}
        />

        <button onClick={buscar} style={btnBuscar} disabled={cargando}>
          {cargando ? <SccoInlineLoading message="Buscando..." /> : "Buscar"}
        </button>

        <button
          onClick={() => exportarCSV(rowsExport, `kardex_${cilindro}.csv`)}
          style={btnExcel}
          disabled={cargando}
        >
          Exportar CSV
        </button>
      </div>

      <Tabla
        headers={[
          "Fecha",
          "Cilindro",
          "Tipo",
          "Origen",
          "Detalle",
          "Material",
          "Área",
          "Registrado por",
          "Cambio",
          "Obs."
        ]}
        rows={rowsExport.map(d => [
          d.fecha,
          d.cilindro,
          d.tipo,
          d.origen,
          d.detalle,
          d.material,
          d.area,
          d.registrado_por,
          d.cambio,
          <button
            disabled={!d.obs || !String(d.obs).trim()}
            onClick={() => verObservacion(d.obs)}
            style={
              !d.obs || !String(d.obs).trim()
                ? btnObsDisabled
                : btnObs
            }
          >
            {!d.obs || !String(d.obs).trim()
              ? "Sin Obs."
              : "Ver"}
          </button>
        ])}
      />
    </div>
  );
}

function Tabla({ headers, rows }) {
  return (
    <div style={tablaContenedor}>
      <table style={tabla}>
        <thead>
          <tr>
            {headers.map(h => (
              <th key={h} style={th}>
                {h}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((col, j) => (
                <td key={j} style={td}>
                  {col || ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {rows.length === 0 && (
        <p style={{ padding: "15px" }}>
          No hay datos para mostrar.
        </p>
      )}
    </div>
  );
}

async function exportarCSV(data, filename) {
  if (!data || data.length === 0) {
    alert("No hay datos para exportar");
    return;
  }

  // COMPLETAR OBSERVACIONES
  const dataFinal = await Promise.all(
    data.map(async (row) => {
      let contenidoObs = "";

      if (row.obs) {
        contenidoObs =
          await obtenerContenidoObservacion(row.obs);
      }

      return {
        ...row,
        obs: contenidoObs
      };
    })
  );

  const headers = Object.keys(dataFinal[0]);

  const rows = dataFinal.map(obj =>
    headers
      .map(h =>
        `"${String(obj[h] ?? "").replace(/"/g, '""')}"`
      )
      .join(",")
  );

  const csv = [headers.join(","), ...rows].join("\n");

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

const card = {
  background: "white",
  padding: "20px",
  borderRadius: "12px",
  boxShadow: "0 0 10px rgba(0,0,0,0.1)"
};

const tabs = (esMovil) => ({
  display: "flex",
  gap: "10px",
  marginBottom: "20px",
  flexDirection: esMovil ? "column" : "row",
  alignItems: esMovil ? "stretch" : "flex-start"
});

const btn = (esMovil) => ({
  padding: "10px 14px",
  border: "none",
  borderRadius: "6px",
  background: "#7a9588",
  color: "white",
  cursor: "pointer",
  width: esMovil ? "100%" : "auto",
  textAlign: esMovil ? "left" : "center"
});

const btnActivo = (esMovil) => ({
  ...btn(esMovil),
  background: "#1f7a4d"
});

const filtros = {
  display: "flex",
  gap: "10px",
  marginBottom: "20px",
  flexWrap: "wrap"
};

const input = {
  padding: "10px",
  borderRadius: "6px",
  border: "1px solid #ccc",
  minWidth: "170px"
};

const btnBuscar = {
  padding: "10px 15px",
  border: "none",
  borderRadius: "6px",
  background: "#1f7a4d",
  color: "white",
  cursor: "pointer"
};

const btnExcel = {
  ...btnBuscar,
  background: "#2f9e63"
};

const btnObs = {
  padding: "5px 10px",
  border: "none",
  borderRadius: "6px",
  background: "#2d8c5a",
  color: "white",
  cursor: "pointer",
  fontSize: "12px"
};

const btnObsDisabled = {
  padding: "5px 10px",
  border: "none",
  borderRadius: "6px",
  background: "#dcdde1",
  color: "#7f8c8d",
  cursor: "not-allowed",
  fontSize: "12px"
};

const tablaContenedor = {
  overflowX: "auto",
  background: "white",
  borderRadius: "10px",
  border: "1px solid #ddd"
};

const tabla = {
  width: "100%",
  borderCollapse: "collapse"
};

const th = {
  background: "#1f7a4d",
  color: "white",
  padding: "10px",
  textAlign: "left",
  whiteSpace: "nowrap"
};

const td = {
  padding: "10px",
  borderBottom: "1px solid #ddd",
  whiteSpace: "nowrap"
};