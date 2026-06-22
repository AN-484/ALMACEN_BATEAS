import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../../services/api";
import { SccoInlineLoading, SccoPageLoading } from "../../components/SccoLoading";
import SccoComboBox from "../../components/SccoComboBox";

export default function IngresoRecargaMasivo() {
  const hoy = new Date().toISOString().slice(0, 10);

  const [tipo, setTipo] = useState("M001");
  const [fecha, setFecha] = useState(hoy);
  const [guia, setGuia] = useState("");
  const [nroDocumento, setNroDocumento] = useState("");
  const [transportista, setTransportista] = useState("");
  const [obs, setObs] = useState("");
  const [ubicaciones, setUbicaciones] = useState([]);

  const [productos, setProductos] = useState([]);
  const [propietarios, setPropietarios] = useState([]);
  const [transportistas, setTransportistas] = useState([]);
  const [tiposEstado, setTiposEstado] = useState([]);

  const [filas, setFilas] = useState([]);
  const [cargandoPantalla, setCargandoPantalla] = useState(true);
  const [procesando, setProcesando] = useState(false);

  const codigoUsuario = localStorage.getItem("codigo");
  const nombreUsuario = localStorage.getItem("nombre");

  useEffect(() => {
    cargarCombos();
    agregarFila();
  }, []);

  const obtenerNombreArea = (codigoArea) => {
    if (!codigoArea) return "";

    const item = ubicaciones.find(
      u => String(u.codigo) === String(codigoArea)
      );

      return item ? item.nombre : codigoArea;
  };

  const nombreEstado = (id) => {
    const item = tiposEstado.find(
      t => String(t.id) === String(id)
    );

    return item ? item.nombre : id;
  };

  const cargarCombos = async () => {
    try {
      setCargandoPantalla(true);
      const prod = await apiGet("/api/cilindros/productos");
      const prop = await apiGet("/api/cilindros/propietarios");
      const ubi = await apiGet("/api/cilindros/ubicaciones");
      const trans = await apiGet("/api/cilindros/transportistas");
      const estado = await apiGet("/api/cilindros/tipos-estado");
      setProductos(prod);
      setPropietarios(prop);
      setUbicaciones(ubi);
      setTransportistas(trans);
      setTiposEstado(estado);
    } catch (error) {
      console.error(error);
      alert("No se pudieron cargar datos");
    } finally {
      setCargandoPantalla(false);
    }
  };

  const nuevaFila = () => ({
    id: crypto.randomUUID(),
    codigo: "",
    propietario: "",
    producto: "",
    fecha_hidrostatica: hoy,
    estadoInfo: "",
    bloqueado: false
  });

  const agregarFila = () => {
    if (procesando) return;
    setFilas(prev => [...prev, nuevaFila()]);
  };

  const eliminarFila = (id) => {
    setFilas(prev => prev.filter(f => f.id !== id));
  };

  const actualizarFila = (id, campo, valor) => {
    setFilas(prev =>
      prev.map(f =>
        f.id === id ? { ...f, [campo]: valor } : f
      )
    );
  };

  const verificarCilindro = async (id) => {
    if (procesando) return;

    const fila = filas.find(f => f.id === id);
    if (!fila || !fila.codigo.trim()) return;

    const codigo = fila.codigo.trim();

    const duplicado = filas.some(
      f => f.id !== id && f.codigo.trim().toUpperCase() === codigo.toUpperCase()
    );

    if (duplicado) {
      alert(`El cilindro ${codigo} ya fue agregado`);
      actualizarFila(id, "codigo", "");
      return;
    }

    try {
      setProcesando(true);
      const cil = await apiGet(`/api/cilindros/buscar/${codigo}`);
      const est = await apiGet(`/api/cilindros/estado/${codigo}`);

      setFilas(prev =>
        prev.map(f => {
          if (f.id !== id) return f;

          if (cil) {
            return {
              ...f,
              codigo,
              propietario: cil.propietario || "",
              producto: cil.producto || "",
              fecha_hidrostatica: cil.fecha_hidrostatica || hoy,
              estadoInfo: est
                ? `Estado: ${nombreEstado(est.estado)} | Ubicación: ${obtenerNombreArea(est.ubicacion) || ""}`
                : "Sin estado registrado",
              bloqueado: true
            };
          }

          return {
            ...f,
            codigo,
            propietario: "",
            producto: "",
            fecha_hidrostatica: hoy,
            estadoInfo: "Cilindro nuevo: complete propietario, producto y fecha",
            bloqueado: false
          };
        })
      );

    } catch (error) {
      console.error(error);
      alert("No se pudo verificar cilindro");
    } finally {
      setProcesando(false);
    }
  };

  const guardarTodo = async () => {
    if (procesando) return;

    if (!guia.trim()) {
      alert("Ingrese número de guía");
      return;
    }

    if (!nroDocumento.trim()) {
      alert("Ingrese número de documento");
      return;
    }

    if (!transportista) {
      alert("Seleccione transportista");
      return;
    }

    const cilindros = filas
      .filter(f => f.codigo.trim())
      .map(f => ({
        codigo: f.codigo.trim(),
        propietario: f.propietario,
        producto: f.producto,
        fecha_hidrostatica: f.fecha_hidrostatica
      }));

    if (cilindros.length === 0) {
      alert("Agregue al menos un cilindro");
      return;
    }

    for (const c of cilindros) {
      if (!c.propietario || !c.producto || !c.fecha_hidrostatica) {
        alert(`Complete datos del cilindro ${c.codigo}`);
        return;
      }
    }

    try {
      setProcesando(true);
      const payload = {
        fecha,
        tipo,
        nro_guia: guia.trim(),
        nro_documento: nroDocumento.trim(),
        transportista,
        registrado_por: codigoUsuario,
        cilindros,
        obs: obs.trim()
      };

      const res = await apiPost("/api/cilindros/ingreso-recarga-masivo", payload);

      let mensaje = `✅ ${res.registrados} cilindro(s) registrado(s)`;

      if (res.errores && res.errores.length > 0) {
        mensaje += "\n\n⚠️ Errores:\n" + res.errores.join("\n");
      }

      alert(mensaje);

      if (res.registrados > 0) {
        limpiar();
      }

    } catch (error) {
      console.error(error);
      alert("Error al registrar ingreso/recarga masiva");
    } finally {
      setProcesando(false);
    }
  };

  const limpiar = () => {
    setTipo("M001");
    setFecha(hoy);
    setGuia("");
    setNroDocumento("");
    setTransportista("");
    setFilas([nuevaFila()]);
    setObs("");
  };

  return (
    <div style={card}>
      {cargandoPantalla || procesando ? (
        <SccoPageLoading message={procesando ? "Procesando carga masiva..." : "Cargando datos SCCO..."} />
      ) : null}
      <h3>Ingreso / Recarga Masiva</h3>

      <div style={tipoBox}>
        <button
          onClick={() => setTipo("M001")}
          style={tipo === "M001" ? btnIngresoActivo : btnTipo}
          disabled={procesando}
        >
          📥 INGRESO
        </button>

        <button
          onClick={() => setTipo("M004")}
          style={tipo === "M004" ? btnRecargaActivo : btnTipo}
          disabled={procesando}
        >
          🔄 RECARGA
        </button>
      </div>

      <div style={grid}>
        <Campo label="Fecha">
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value.toUpperCase())}
            disabled={procesando}
            style={input}
          />
        </Campo>

        <Campo label="Guía">
          <input
            value={guia}
            onChange={(e) => setGuia(e.target.value.toUpperCase())}
            placeholder="Número de guía"
            disabled={procesando}
            style={input}
          />
        </Campo>

        <Campo label="N° Documento">
          <input
            value={nroDocumento}
            maxLength={10}
            onChange={(e) => setNroDocumento(e.target.value.toUpperCase())}
            placeholder="Número documento"
            disabled={procesando}
            style={input}
          />
        </Campo>

        <Campo label="Transportista">
          <select
            value={transportista}
            onChange={(e) => setTransportista(e.target.value.toUpperCase())}
            disabled={procesando}
            style={input}
          >
            <option value="">Seleccione</option>
            {transportistas.map(t => (
              <option key={t.codigo} value={t.codigo}>
                {t.nombre}
              </option>
            ))}
          </select>
        </Campo>

        <Campo label="Registrado por">
          <input
            value={nombreUsuario || ""}
            readOnly
            style={inputReadOnly}
          />
        </Campo>

        <Campo label="Observación / Ocurrencia grupal">
          <textarea
            value={obs}
            onChange={(e) => setObs(e.target.value.toUpperCase())}
            placeholder="Escriba observaciones para este lote..."
            disabled={procesando}
            style={textarea}
          />
        </Campo>

      </div>

      <div style={accionesTop}>
        <button onClick={agregarFila} style={btnAgregar} disabled={procesando}>
          {procesando ? <SccoInlineLoading message="Procesando..." /> : "+ Agregar cilindro"}
        </button>
      </div>

      <div style={tablaContenedor}>
        <table style={tabla}>
          <thead>
            <tr>
              <th style={th}>Código Cilindro</th>
              <th style={th}>Propietario</th>
              <th style={th}>Producto</th>
              <th style={th}>Fecha Hidrostática</th>
              <th style={th}>Estado / Info</th>
              <th style={th}>Eliminar</th>
            </tr>
          </thead>

          <tbody>
            {filas.map(fila => (
              <tr key={fila.id}>
                <td style={td}>
                  <input
                    value={fila.codigo}
                    onChange={(e) =>
                      actualizarFila(fila.id, "codigo", e.target.value.toUpperCase())
                    }
                    onBlur={() => verificarCilindro(fila.id)}
                    placeholder="C001"
                    disabled={procesando}
                    style={inputTabla}
                  />
                </td>

                <td style={td}>
                  <select
                    value={fila.propietario}
                    disabled={fila.bloqueado}
                    onChange={(e) =>
                      actualizarFila(fila.id, "propietario", e.target.value.toUpperCase())
                    }
                    
                    style={inputTabla}
                  >
                    <option value="">Seleccione</option>
                    {propietarios.map(p => (
                      <option key={p.codigo} value={p.codigo}>
                        {p.nombre}
                      </option>
                    ))}
                  </select>
                </td>

                <td style={td}>
                  <select
                    value={fila.producto}
                    disabled={fila.bloqueado}
                    onChange={(e) =>
                      actualizarFila(fila.id, "producto", e.target.value.toUpperCase())
                    }
                    
                    style={inputTabla}
                  >
                    <option value="">Seleccione</option>
                    {productos.map(p => (
                      <option key={p.codigo} value={p.codigo}>
                        {p.nombre}
                      </option>
                    ))}
                  </select>
                </td>

                <td style={td}>
                  <input
                    type="date"
                    value={fila.fecha_hidrostatica}
                    disabled={fila.bloqueado}
                    onChange={(e) =>
                      actualizarFila(fila.id, "fecha_hidrostatica", e.target.value.toUpperCase())
                    }
                    style={inputTabla}
                  />
                </td>

                <td style={td}>
                  <span style={infoTexto}>
                    {fila.estadoInfo}
                  </span>
                </td>

                <td style={td}>
                  <button
                    onClick={() => eliminarFila(fila.id)}
                    disabled={procesando}
                    style={btnEliminar}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={acciones}>
        <button onClick={guardarTodo} style={btnGuardar} disabled={procesando}>
          {procesando ? <SccoInlineLoading message="Guardando..." /> : "Guardar Todo"}
        </button>

        <button onClick={limpiar} style={btnLimpiar} disabled={procesando}>
          Limpiar
        </button>
      </div>
    </div>
  );
}

function Campo({ label, children }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

const card = {
  background: "white",
  padding: "20px",
  borderRadius: "12px",
  boxShadow: "0 0 10px rgba(0,0,0,0.1)"
};

const tipoBox = {
  display: "flex",
  gap: "10px",
  marginBottom: "20px"
};

const btnTipo = {
  padding: "10px 15px",
  border: "none",
  borderRadius: "6px",
  background: "#7a9588",
  color: "white",
  cursor: "pointer"
};

const btnIngresoActivo = {
  ...btnTipo,
  background: "#0984e3"
};

const btnRecargaActivo = {
  ...btnTipo,
  background: "#00b4d8"
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "15px"
};

const labelStyle = {
  display: "block",
  marginBottom: "5px",
  fontWeight: "bold"
};

const input = {
  width: "100%",
  padding: "10px",
  borderRadius: "6px",
  border: "1px solid #ccc",
  boxSizing: "border-box"
};

const inputReadOnly = {
  ...input,
  background: "#e9ecef",
  fontWeight: "bold"
};

const accionesTop = {
  marginTop: "20px",
  marginBottom: "10px"
};

const btnAgregar = {
  padding: "10px 15px",
  border: "none",
  borderRadius: "6px",
  background: "#2d8c5a",
  color: "white",
  cursor: "pointer"
};

const tablaContenedor = {
  overflowX: "auto",
  border: "1px solid #ddd",
  borderRadius: "10px"
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
  padding: "8px",
  borderBottom: "1px solid #ddd",
  whiteSpace: "nowrap"
};

const inputTabla = {
  width: "100%",
  minWidth: "170px",
  padding: "8px",
  borderRadius: "5px",
  border: "1px solid #ccc",
  boxSizing: "border-box"
};

const infoTexto = {
  fontSize: "13px",
  fontWeight: "bold"
};

const btnEliminar = {
  padding: "7px 10px",
  border: "none",
  borderRadius: "5px",
  background: "#e84118",
  color: "white",
  cursor: "pointer"
};

const acciones = {
  marginTop: "20px",
  display: "flex",
  gap: "10px"
};

const btnGuardar = {
  padding: "10px 20px",
  border: "none",
  borderRadius: "6px",
  background: "#1f7a4d",
  color: "white",
  cursor: "pointer",
  fontWeight: "bold"
};

const btnLimpiar = {
  ...btnGuardar,
  background: "#718093"
};

const textarea = {
  width: "100%",
  minHeight: "80px",
  padding: "10px",
  borderRadius: "6px",
  border: "1px solid #ccc",
  boxSizing: "border-box",
  resize: "vertical"
};