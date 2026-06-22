import { useEffect, useState } from "react";
import { apiGet } from "../../services/api";
import { verObservacion } from "../../utils/observaciones";
import { SccoInlineLoading, SccoSectionLoading } from "../../components/SccoLoading";
import SccoComboBox from "../../components/SccoComboBox";

export default function EstadoCilindros() {
  const [datos, setDatos] = useState([]);
  const [cilindros, setCilindros] = useState([]);
  const [productos, setProductos] = useState([]);
  const [propietarios, setPropietarios] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [tiposEstado, setTiposEstado] = useState([]);

  const [producto, setProducto] = useState("");
  const [propietario, setPropietario] = useState("");
  const [estado, setEstado] = useState("");
  const [cargandoPantalla, setCargandoPantalla] = useState(true);
  const [cargando, setCargando] = useState(false);

  // Carga inicial: todos los datos en paralelo, tabla visible solo cuando todo está listo
  useEffect(() => {
    const cargarTodo = async () => {
      setCargandoPantalla(true);
      try {
        const [prod, prop, cils, ubi, tipos, estadoData] = await Promise.all([
          apiGet("/api/cilindros/productos"),
          apiGet("/api/cilindros/propietarios"),
          apiGet("/api/cilindros"),
          apiGet("/api/cilindros/ubicaciones"),
          apiGet("/api/cilindros/tipos-estado"),
          apiGet("/api/cilindros/estado")
        ]);
        setProductos(prod);
        setPropietarios(prop);
        setCilindros(cils);
        setUbicaciones(ubi);
        setTiposEstado(tipos);
        setDatos(estadoData);
      } catch (error) {
        console.error(error);
        alert("No se pudieron cargar los datos");
      } finally {
        setCargandoPantalla(false);
      }
    };
    cargarTodo();
  }, []);

  // Búsqueda con filtros (botón Buscar)
  const cargarDatos = async () => {
    if (cargando) return;
    try {
      setCargando(true);
      let url = "/api/cilindros/estado?";
      const params = [];
      if (producto) params.push(`producto=${encodeURIComponent(producto)}`);
      if (propietario) params.push(`propietario=${encodeURIComponent(propietario)}`);
      if (estado) params.push(`estado=${encodeURIComponent(estado)}`);
      url += params.join("&");
      const res = await apiGet(url);
      setDatos(res);
    } catch (error) {
      console.error(error);
      alert("No se pudo cargar estado de cilindros");
    } finally {
      setCargando(false);
    }
  };

  const nombreProducto = (codigo) => {
    const item = productos.find(p => p.codigo === codigo);
    return item ? item.nombre : codigo;
  };

  const nombrePropietario = (codigo) => {
    const item = propietarios.find(p => p.codigo === codigo);
    return item ? item.nombre : codigo;
  };

  const nombreUbicacion = (codigo) => {
    if (!codigo) return "";

    //if (codigo === "ALMACEN") return "Almacen";
    //if (codigo === "PROVEEDOR") return "Proveedor";

    const item = ubicaciones.find(u => u.codigo === codigo);
    return item ? item.nombre : codigo;
  };

  const nombreEstado = (idEstado) => {
    const item = tiposEstado.find(
      t => String(t.id) === String(idEstado)
    );

    return item ? item.nombre : idEstado;
  };

  const obtenerFechaHidro = (codigoCilindro) => {
    const item = cilindros.find(c => c.codigo === codigoCilindro);
    return item ? item.fecha_hidrostatica : null;
  };

  const formatearFechaMMYYYY = (fecha) => {
    if (!fecha) return "";

    const partes = String(fecha).split("-");

    if (partes.length >= 2) {
      return `${partes[1]}/${partes[0]}`;
    }

    return String(fecha);
  };

const calcularAlertaHidro = (fechaHidro) => {
    // 🔹 CASO 1: sin fecha
    if (!fechaHidro) {
        return {
        texto: "⚪ Sin fecha",
        estilo: alertaSinFecha
        };
    }

    try {
        const fechaStr = String(fechaHidro);

        // 🔹 CASO 2: año 9999 = SIN FECHA
        if (fechaStr.startsWith("9999")) {
        return {
            texto: "⚪ Sin fecha",
            estilo: alertaSinFecha
        };
        }

        const fecha = new Date(`${fechaStr}T00:00:00`);

        if (isNaN(fecha.getTime())) {
        return {
            texto: "⚪ Fecha inválida",
            estilo: alertaSinFecha
        };
        }

        // 🔹 vencimiento = +5 años
        const vencimiento = new Date(fecha);
        vencimiento.setFullYear(vencimiento.getFullYear() + 5);

        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        const diffMs = vencimiento - hoy;
        const diasRestantes = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        if (diasRestantes < 0) {
        return {
            texto: "🔴 Vencido",
            estilo: alertaVencido
        };
        }

        if (diasRestantes <= 90) {
        return {
            texto: "🟡 Por vencer",
            estilo: alertaPorVencer
        };
        }

        return {
        texto: "🟢 Vigente",
        estilo: alertaVigente
        };

    } catch (error) {
        return {
        texto: "⚪ Fecha inválida",
        estilo: alertaSinFecha
        };
    }
    };

  const opcionesEstado = [
    { value: "ST", label: "STOCK" },
    { value: "VA", label: "VACÍO" },
    { value: "US", label: "EN CLIENTE" },
    { value: "RE", label: "EN PROVEEDOR" }
  ];

  return (
    <div>
      {cargandoPantalla ? (
        <SccoSectionLoading message="Cargando estado de cilindros..." />
      ) : (
        <>
      <h3>Estado de Cilindros</h3>

      <div style={filtros}>
        <SccoComboBox
          options={productos.map(p => ({ value: p.codigo, label: p.nombre }))}
          value={producto}
          onChange={setProducto}
          placeholder="Todos los productos"
          disabled={cargando}
          emptyLabel="Todos los productos"
          wrapperStyle={{ minWidth: "180px" }}
        />

        <SccoComboBox
          options={propietarios.map(p => ({ value: p.codigo, label: p.nombre }))}
          value={propietario}
          onChange={setPropietario}
          placeholder="Todos los propietarios"
          disabled={cargando}
          emptyLabel="Todos los propietarios"
          wrapperStyle={{ minWidth: "180px" }}
        />

        <SccoComboBox
          options={opcionesEstado}
          value={estado}
          onChange={setEstado}
          placeholder="Todos los estados"
          disabled={cargando}
          emptyLabel="Todos los estados"
          wrapperStyle={{ minWidth: "180px" }}
        />

        <button onClick={cargarDatos} style={btn} disabled={cargando}>
          {cargando ? <SccoInlineLoading message="Buscando..." /> : "Buscar"}
        </button>
      </div>

      <div style={tablaContenedor}>
        <table style={tabla}>
          <thead>
            <tr>
              <th style={th}>Cilindro</th>
              <th style={th}>Propietario</th>
              <th style={th}>Material</th>
              <th style={th}>F. Hidrostática</th>
              <th style={th}>Alerta Hidro</th>
              <th style={th}>Estado</th>
              <th style={th}>Fecha Mov.</th>
              <th style={th}>Ubicación</th>
              <th style={th}>Obs.</th>
            </tr>
          </thead>

          <tbody>
            {datos.map((d) => {
              const fechaHidro = obtenerFechaHidro(d.cilindro);
              const alerta = calcularAlertaHidro(fechaHidro);

              return (
                <tr key={d.cilindro}>
                  <td style={td}>{d.cilindro}</td>

                  <td style={td}>
                    {nombrePropietario(d.propietario)}
                  </td>

                  <td style={td}>
                    {nombreProducto(d.material)}
                  </td>

                  <td style={td}>
                    {formatearFechaMMYYYY(fechaHidro)}
                  </td>

                  <td style={td}>
                    <span style={alerta.estilo}>
                      {alerta.texto}
                    </span>
                  </td>

                  <td style={td}>
                    <span style={badge(d.estado)}>
                      {nombreEstado(d.estado)}
                    </span>
                  </td>

                  <td style={td}>
                    {d.fecha_mov || ""}
                  </td>

                  <td style={td}>
                    {nombreUbicacion(d.ubicacion)}
                  </td>

                  <td style={td}>
                    <button
                      disabled={!d.obs_id || !String(d.obs_id).trim()}
                      onClick={() => verObservacion(d.obs_id)}
                      style={
                        !d.obs_id || !String(d.obs_id).trim()
                          ? btnObsDisabled
                          : btnObs
                      }
                    >
                      {!d.obs_id || !String(d.obs_id).trim()
                        ? "Sin Obs."
                        : "Ver"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {datos.length === 0 && (
        <p>No hay datos para mostrar.</p>
      )}
        </>
      )}
    </div>
  );
}

function badge(estado) {
  let bg = "#718093";

  if (estado === "ST") bg = "#44bd32";
  if (estado === "VA") bg = "#fbc531";
  if (estado === "US") bg = "#0097e6";
  if (estado === "RE") bg = "#e84118";

  return {
    background: bg,
    color: "white",
    padding: "5px 8px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: "bold",
    whiteSpace: "nowrap"
  };
}

const alertaVencido = {
  background: "#ffb4b4",
  color: "#7a0000",
  padding: "5px 8px",
  borderRadius: "6px",
  fontSize: "12px",
  fontWeight: "bold",
  whiteSpace: "nowrap"
};

const alertaPorVencer = {
  background: "#ffeb96",
  color: "#7a5a00",
  padding: "5px 8px",
  borderRadius: "6px",
  fontSize: "12px",
  fontWeight: "bold",
  whiteSpace: "nowrap"
};

const alertaVigente = {
  background: "#beffbe",
  color: "#145214",
  padding: "5px 8px",
  borderRadius: "6px",
  fontSize: "12px",
  fontWeight: "bold",
  whiteSpace: "nowrap"
};

const alertaSinFecha = {
  background: "#e9ecef",
  color: "#495057",
  padding: "5px 8px",
  borderRadius: "6px",
  fontSize: "12px",
  fontWeight: "bold",
  whiteSpace: "nowrap"
};

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
  minWidth: "180px"
};

const btn = {
  padding: "10px 15px",
  border: "none",
  borderRadius: "6px",
  background: "#1f7a4d",
  color: "white",
  cursor: "pointer"
};

const tablaContenedor = {
  overflowX: "auto",
  background: "white",
  borderRadius: "10px",
  boxShadow: "0 0 10px rgba(0,0,0,0.1)"
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

const btnObs = {
  padding: "6px 10px",
  border: "none",
  borderRadius: "6px",
  background: "#2d8c5a",
  color: "white",
  cursor: "pointer"
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