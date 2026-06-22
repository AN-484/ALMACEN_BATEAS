import { useEffect, useRef, useState } from "react";
import { apiGet, apiPost } from "../../services/api";
import { SccoInlineLoading, SccoPageLoading } from "../../components/SccoLoading";
import SccoComboBox from "../../components/SccoComboBox";

export default function DespachoDevolucionMasivo() {
  const hoy = new Date().toISOString().slice(0, 10);

  const [tipo, setTipo] = useState("M003"); // M002 = DESPACHO, M003 = DEVOLUCION 
  const [fecha, setFecha] = useState(hoy);

  const [materialBuscar, setMaterialBuscar] = useState("");
  const [area, setArea] = useState("");
  const [encargado, setEncargado] = useState("");
  const [responsable, setResponsable] = useState("");
  const [obs, setObs] = useState("");

  const [productos, setProductos] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [disponibles, setDisponibles] = useState([]);
  const [filas, setFilas] = useState([]);
  const [tiposEstado, setTiposEstado] = useState([]);
  const [cilindrosVacios, setCilindrosVacios] = useState([]);

  const [sinCambio, setSinCambio] = useState(false);

  const [areaBloqueada, setAreaBloqueada] = useState(false);
  const [areaDevolucionNombre, setAreaDevolucionNombre] = useState("");
  const [cargandoPantalla, setCargandoPantalla] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const solicitudDisponiblesRef = useRef(0);

  const codigoUsuario = localStorage.getItem("codigo");
  const nombreUsuario = localStorage.getItem("nombre");

  useEffect(() => {
    cargarCombos();
  }, []);

  useEffect(() => {
    cargarDisponibles();
  }, [materialBuscar, tipo]);

  // Al pasar a despacho, limpiar y refrescar opciones de cambio para evitar datos obsoletos.
  useEffect(() => {
    if (tipo !== "M002") return;
    setFilas((prev) => prev.map((f) => ({ ...f, cambio: "", vaciosCambio: [] })));
  }, [tipo]);

  const cargarCombos = async () => {
    try {
      setCargandoPantalla(true);
      const prod = await apiGet("/api/cilindros/productos");
      const ubi = await apiGet("/api/cilindros/ubicaciones");
      const usu = await apiGet("/api/cilindros/usuarios");
      const estado = await apiGet("/api/cilindros/tipos-estado");

      setProductos(prod);
      setUbicaciones(ubi);
      setTiposEstado(estado);
      //setUsuarios(usu);
      const usuariosAutorizados = usu.filter(u => {
        const nombre = String(u.nombre || "").toUpperCase().trim();

        return (
            nombre.includes("CESAR RAMIREZ") ||
            nombre.includes("MIGUEL BENITES")
        );
        });

        setUsuarios(usuariosAutorizados);
    } catch (error) {
      console.error(error);
      alert("No se pudieron cargar datos");
    } finally {
      setCargandoPantalla(false);
    }
  };

  const cargarDisponibles = async () => {
    const requestId = ++solicitudDisponiblesRef.current;
    setDisponibles([]);

    if (!materialBuscar) return;

    try {
      const data = await apiGet(
        `/api/cilindros/disponibles?material=${encodeURIComponent(materialBuscar)}&tipo=${encodeURIComponent(tipo)}`
      );

      if (requestId !== solicitudDisponiblesRef.current) {
        return;
      }

      setDisponibles(data);
    } catch (error) {
      console.error(error);
      alert("No se pudo cargar cilindros disponibles");
    }
  };

  const cargarVaciosPorMaterial = async (materialSeleccionado) => {
    try {
      if (!materialSeleccionado) return [];

      const data = await apiGet(
        `/api/cilindros/vacios?material=${materialSeleccionado}`
      );

      return data;
    } catch (error) {
      console.error(error);
      alert("No se pudieron cargar cilindros vacíos");
      return [];
    }
  };

  const cambiarTipo = (nuevoTipo) => {
    if (procesando) return;
    solicitudDisponiblesRef.current += 1;
    setTipo(nuevoTipo);
    setMaterialBuscar("");
    setArea("");
    setResponsable("");
    setFilas([]);
    liberarAreaDevolucion();
    setSinCambio(false);
  };

  const liberarAreaDevolucion = () => {
    setAreaBloqueada(false);
    setAreaDevolucionNombre("");
  };

  const obtenerNombreProducto = (codigo) => {
    const item = productos.find(p => p.codigo === codigo);
    return item ? item.nombre : codigo;
  };

  const obtenerNombreArea = (codigoArea) => {
    const item = ubicaciones.find(u => u.codigo === codigoArea);
    return item ? item.nombre : codigoArea;
  };

  const nombreEstado = (id) => {
    const item = tiposEstado.find(
      t => String(t.id) === String(id)
    );

    return item ? item.nombre : id;
  };

  /*const obtenerCodigoAreaPorNombre = (nombreArea) => {
    const item = ubicaciones.find(u => u.nombre === nombreArea);
    return item ? item.codigo : "";
  };*/

  const agregarCilindro = async (codigo) => {
    if (procesando) return;
    if (!codigo) return;

    const yaExiste = filas.some(f => f.cilindro === codigo);

    if (yaExiste) {
      alert(`El cilindro ${codigo} ya fue agregado`);
      return;
    }

    const seleccionado = disponibles.find(d => d.cilindro === codigo);

    if (!seleccionado) {
      alert("Cilindro no disponible");
      return;
    }

    if (tipo === "M002") {
      if (!area) {
        alert("Seleccione el área antes de agregar cilindros al despacho");
        return;
      }
    }

    if (tipo === "M003") { // DEVOLUCIÓN
      const ubicacionActualCodigo = seleccionado.ubicacion;

      if (!ubicacionActualCodigo) {
        alert(`El cilindro ${codigo} no tiene área registrada`);
        return;
      }
      const ubicacionActualNombre = obtenerNombreArea(ubicacionActualCodigo);

      if (!areaDevolucionNombre) {
        setArea(ubicacionActualCodigo);
        setAreaBloqueada(true);
        setAreaDevolucionNombre(ubicacionActualNombre);
      } else {
        if (ubicacionActualCodigo !== area) {
          alert(
            `No permitido.\n\nEl cilindro ${codigo} pertenece al área:\n${ubicacionActualNombre}\n\nPero esta devolución corresponde al área:\n${areaDevolucionNombre}`
          );
          return;
        }
      }
    }

    let vaciosCambio = [];

    if (tipo === "M002") {
      vaciosCambio = await cargarVaciosPorMaterial(seleccionado.material);
    }

    setFilas(prev => [
      ...prev,
      {
        cilindro: seleccionado.cilindro,
        material: seleccionado.material,
        material_nombre: obtenerNombreProducto(seleccionado.material),
        estado: seleccionado.estado,
        ubicacion: obtenerNombreArea(seleccionado.ubicacion) || "",
        cambio: "",
        vaciosCambio
      }
    ]);
  };

  const actualizarCambioFila = (cilindro, cambio) => {
    setFilas(prev =>
      prev.map(f =>
        f.cilindro === cilindro
          ? { ...f, cambio }
          : f
      )
    );
  };

  const eliminarFila = (codigo) => {
    const nuevas = filas.filter(f => f.cilindro !== codigo);
    setFilas(nuevas);

    if (tipo === "M003" && nuevas.length === 0) {
      setArea("");
      liberarAreaDevolucion();
    }
  };

  const guardarTodo = async () => {
    if (procesando) return;

    if (!area) {
      alert("Seleccione área");
      return;
    }

    if (!encargado) {
      alert("Seleccione autorizado por");
      return;
    }

    if (!responsable.trim()) {
      alert("Ingrese usuario que recoge/devuelve");
      return;
    }

    if (filas.length === 0) {
      alert("Agregue al menos un cilindro");
      return;
    }

    if (tipo === "M002" && !sinCambio) {
      const filaSinCambio = filas.find(f => !f.cambio);

      if (filaSinCambio) {
        alert(`Seleccione cilindro de cambio para ${filaSinCambio.cilindro}`);
        return;
      }
    }

    if (tipo === "M002" && sinCambio && (!obs || !obs.trim())) {
      alert("Debe escribir una observación cuando el despacho es sin cilindro de cambio");
      return;
    }

    const areaNombre = tipo === "M002"
      ? obtenerNombreArea(area)
      : areaDevolucionNombre;

    try {
      setProcesando(true);
      const payload = {
        fecha,
        tipo,
        area,
        area_nombre: areaNombre,
        encargado_almacen: encargado,
        responsable_area: responsable.trim(),
        registrado_por: codigoUsuario,
        cilindros: filas.map(f => ({
          cilindro: f.cilindro,
          material: f.material,
          cambio: tipo === "M002" && !sinCambio ? f.cambio : null
        })),
        sin_cambio: sinCambio,
        obs: obs.trim()
      };

      const res = await apiPost(
        "/api/cilindros/despacho-devolucion-masivo",
        payload
      );

      let mensaje = `✅ ${res.registrados} cilindro(s) registrado(s)`;

      if (res.errores && res.errores.length > 0) {
        mensaje += "\n\n⚠️ Errores:\n" + res.errores.join("\n");
      }

      alert(mensaje);

      if (res.registrados > 0) {
        limpiar();
        await cargarDisponibles();
      }

    } catch (error) {
      console.error(error);
      alert("Error al registrar despacho/devolución masiva");
    } finally {
      setProcesando(false);
    }
  };

  const limpiar = () => {
    solicitudDisponiblesRef.current += 1;
    setFecha(hoy);
    setMaterialBuscar("");
    setArea("");
    setEncargado("");
    setResponsable("");
    setDisponibles([]);
    setFilas([]);
    liberarAreaDevolucion();
    setObs("");
    setSinCambio(false);
  };

  return (
    <div style={card}>
      {cargandoPantalla || procesando ? (
        <SccoPageLoading message={procesando ? "Procesando movimiento masivo..." : "Cargando datos SCCO..."} />
      ) : null}
      <h3>Despacho / Devolución Masiva</h3>

      <div style={tipoBox}>
        <button
          onClick={() => cambiarTipo("M003")}
          style={tipo === "M003" ? btnDevolucionActivo : btnTipo}
          disabled={procesando}
        >
          📥 DEVOLUCIÓN
        </button>
        
        <button
          onClick={() => cambiarTipo("M002")}
          style={tipo === "M002" ? btnDespachoActivo : btnTipo}
          disabled={procesando}
        >
          🚚 DESPACHO
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

        <Campo label="Material a buscar">
          <SccoComboBox
            options={productos.map(p => ({ value: p.codigo, label: p.nombre }))}
            value={materialBuscar}
            onChange={setMaterialBuscar}
            disabled={procesando}
            placeholder="Seleccione material"
            emptyLabel="Seleccione material"
          />
        </Campo>

        <Campo label="Disponibilidad">
          <input
            value={
              materialBuscar
                ? disponibles.length > 0
                  ? `🟢 Disponible (${disponibles.length})`
                  : "🔴 No disponible"
                : "Seleccione material"
            }
            readOnly
            style={inputReadOnly}
          />
        </Campo>

        <Campo label="Área">
          <SccoComboBox
            options={ubicaciones.map(u => ({ value: u.codigo, label: u.nombre }))}
            value={area}
            onChange={setArea}
            disabled={areaBloqueada || procesando}
            placeholder="Seleccione área"
            emptyLabel="Seleccione área"
          />
        </Campo>

        <Campo label="Agregar cilindro">
          <SccoComboBox
            options={disponibles
              .filter(d => !filas.some(f => f.cilindro === d.cilindro))
              .map(d => ({
                value: d.cilindro,
                label: `${d.cilindro} — ${nombreEstado(d.estado)} — ${d.ubicacion ? obtenerNombreArea(d.ubicacion) : "Sin ubicación"}`
              }))}
            value=""
            onChange={agregarCilindro}
            disabled={!materialBuscar || disponibles.length === 0 || procesando}
            placeholder="+ Seleccionar cilindro"
            emptyLabel="Seleccionar cilindro"
          />
        </Campo>

        <Campo label="Autorizado por">
          <SccoComboBox
            options={usuarios.map(u => ({ value: u.codigo, label: u.nombre }))}
            value={encargado}
            onChange={setEncargado}
            disabled={procesando}
            placeholder="Seleccione autorizado por"
            emptyLabel="Seleccione"
          />
        </Campo>

        <Campo label="Usuario que recoge/devuelve">
          <input
            value={responsable}
            onChange={(e) => setResponsable(e.target.value.toUpperCase().toUpperCase())}
            placeholder="Nombre del responsable"
            disabled={procesando}
            style={input}
          />
        </Campo>

        {tipo === "M002" && (
          <Campo label="Opciones de despacho">
            <label style={checkLabel}>
              <input
                type="checkbox"
                checked={sinCambio}
                onChange={(e) => {
                  setSinCambio(e.target.checked);

                  if (e.target.checked) {
                    setFilas(prev =>
                      prev.map(f => ({
                        ...f,
                        cambio: ""
                      }))
                    );
                  }
                }}
                disabled={procesando}
              />
              Despacho sin cilindro de cambio
            </label>
          </Campo>
        )}

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
            onChange={(e) => setObs(e.target.value.toUpperCase().toUpperCase())}
            placeholder="Escriba observaciones para este lote..."
            disabled={procesando}
            style={textarea}
          />
        </Campo>
      </div>

      {tipo === "M003" && areaDevolucionNombre && (
        <div style={infoBox}>
          Área bloqueada para devolución: <b>{areaDevolucionNombre}</b>
        </div>
      )}

      <div style={nota}>
        Puedes cambiar el material y seguir agregando cilindros a la misma lista.
        En devolución, todos deben pertenecer al área del primer cilindro agregado.
      </div>

      <div style={tablaContenedor}>
        <table style={tabla}>
          <thead>
            <tr>
              <th style={th}>Cilindro</th>
              <th style={th}>Material</th>
              <th style={th}>Estado actual</th>
              <th style={th}>Ubicación actual</th>
              {tipo === "M002" && !sinCambio && <th style={th}>Cambio</th>}
              <th style={th}>Eliminar</th>
            </tr>
          </thead>

          <tbody>
            {filas.map(f => (
              <tr key={f.cilindro}>
                <td style={td}>{f.cilindro}</td>
                <td style={td}>{f.material_nombre}</td>
                <td style={td}>{nombreEstado(f.estado)}</td>
                <td style={td}>{f.ubicacion}</td>
                {tipo === "M002" && !sinCambio && (
                  <td style={td}>
                    <SccoComboBox
                      options={f.vaciosCambio
                        .filter(v => v.cilindro !== f.cilindro)
                        .map(v => ({ value: v.cilindro, label: v.cilindro }))}
                      value={f.cambio || ""}
                      onChange={(val) => actualizarCambioFila(f.cilindro, val)}
                      disabled={procesando}
                      placeholder="Seleccione"
                      emptyLabel="Seleccione"
                      dropdownDirection="up"
                      wrapperStyle={{ minWidth: "160px" }}
                    />
                  </td>
                )}
                <td style={td}>
                  <button
                    onClick={() => eliminarFila(f.cilindro)}
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

        {filas.length === 0 && (
          <p style={{ padding: "15px" }}>
            No hay cilindros seleccionados.
          </p>
        )}
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

const btnDespachoActivo = {
  ...btnTipo,
  background: "#0984e3"
};

const btnDevolucionActivo = {
  ...btnTipo,
  background: "#00b4d8"
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "15px",
  marginBottom: "20px"
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

const infoBox = {
  padding: "12px",
  background: "#dcdde1",
  borderRadius: "8px",
  marginBottom: "15px"
};

const nota = {
  padding: "10px",
  background: "#f5f6fa",
  border: "1px solid #ddd",
  borderRadius: "8px",
  marginBottom: "15px",
  fontSize: "13px"
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
  padding: "10px",
  borderBottom: "1px solid #ddd",
  whiteSpace: "nowrap"
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

const inputTabla = {
  width: "100%",
  minWidth: "160px",
  padding: "8px",
  borderRadius: "5px",
  border: "1px solid #ccc",
  boxSizing: "border-box"
};

const checkLabel = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "10px",
  border: "1px solid #ccc",
  borderRadius: "6px",
  background: "#f5f6fa",
  cursor: "pointer"
};