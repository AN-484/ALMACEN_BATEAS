import { useEffect, useRef, useState } from "react";
import { apiGet, apiPost } from "../../services/api";
import { SccoInlineLoading, SccoPageLoading } from "../../components/SccoLoading";
import SccoComboBox from "../../components/SccoComboBox";

export default function DespachoDevolucion() {
  const [tipo, setTipo] = useState("M003"); // M002 = DESPACHO, M003 = DEVOLUCION 
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));

  const [material, setMaterial] = useState("");
  const [cilindro, setCilindro] = useState("");
  const [area, setArea] = useState("");
  const [encargado, setEncargado] = useState("");
  const [responsable, setResponsable] = useState("");
  const [obs, setObs] = useState("");

  const [cambio, setCambio] = useState("");
  const [cilindrosVacios, setCilindrosVacios] = useState([]);

  const [productos, setProductos] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [disponibles, setDisponibles] = useState([]);
  const [tiposEstado, setTiposEstado] = useState([]);

  const [sinCambio, setSinCambio] = useState(false);

  const [info, setInfo] = useState("");
  const [cargandoPantalla, setCargandoPantalla] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const solicitudDisponiblesRef = useRef(0);

  const codigoUsuario = localStorage.getItem("codigo");
  const nombreUsuario = localStorage.getItem("nombre");

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

  const cargarCilindrosVacios = async (materialSeleccionado) => {
    try {
      if (procesando) return;
      setCambio("");
      setCilindrosVacios([]);

      if (!materialSeleccionado) return;

      const data = await apiGet(
        `/api/cilindros/vacios?material=${materialSeleccionado}`
      );

      setCilindrosVacios(data);

    } catch (error) {
      console.error(error);
      alert("No se pudieron cargar cilindros vacíos");
    }
  };

  const cargarDisponibles = async () => {
    const requestId = ++solicitudDisponiblesRef.current;

    try {
      setCilindro("");
      setDisponibles([]);
      setInfo("");

      if (!material) return;

      const data = await apiGet(
        `/api/cilindros/disponibles?material=${encodeURIComponent(material)}&tipo=${encodeURIComponent(tipo)}`
      );

      if (requestId !== solicitudDisponiblesRef.current) {
        return;
      }

      setDisponibles(data);

      if (data.length > 0) {
        setInfo(`🟢 Disponible: ${data.length} cilindro(s)`);
      } else {
        setInfo("🔴 No hay cilindros disponibles para este movimiento");
      }
    } catch (error) {
      console.error(error);
      alert("No se pudo verificar disponibilidad");
    }
  };

  useEffect(() => {
    cargarCombos();
  }, []);

  useEffect(() => {
    cargarDisponibles();
  }, [material, tipo]);

  // Al entrar a modo despacho, refrescar cilindros vacíos para que incluya devoluciones recientes.
  useEffect(() => {
    if (tipo === "M002" && material) {
      cargarCilindrosVacios(material);
    }
  }, [tipo, material]);

  const cambiarTipo = (nuevoTipo) => {
    if (procesando) return;

    solicitudDisponiblesRef.current += 1;
    setTipo(nuevoTipo);
    setCilindro("");
    setArea("");
    setResponsable("");
    setInfo("");
    setCambio("");
    setCilindrosVacios([]);
    setSinCambio(false);
  };
  
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

  const seleccionarCilindro = (codigo) => {
    setCilindro(codigo);

    const seleccionado = disponibles.find(d => d.cilindro === codigo);

    if (seleccionado) {
      if (tipo === "M003") { // DEVOLUCION
        const areaCodigo = seleccionado.ubicacion;

        const areaEncontrada = ubicaciones.find(
          u => String(u.codigo) === String(areaCodigo)
        );

        if (areaEncontrada) {
          setArea(areaEncontrada.codigo);
        }
      }

      setInfo(
        `Estado actual: ${nombreEstado(seleccionado.estado)} | Ubicación: ${obtenerNombreArea(seleccionado.ubicacion)}`
      );
    }
  };

  const guardar = async () => {
    if (procesando) return;

    try {
      if (!material) {
        alert("Seleccione material");
        return;
      }

      if (!cilindro) {
        alert("Seleccione cilindro");
        return;
      }

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

      if (tipo === "M002" && !sinCambio && !cambio) {
        alert("Seleccione cilindro de cambio");
        return;
      }

      if (tipo === "M002" && sinCambio && (!obs || !obs.trim())) {
        alert("Debe escribir una observación cuando el despacho es sin cilindro de cambio");
        return;
      }

      setProcesando(true);

      const payload = {
        fecha,
        cilindro,
        material,
        area,
        tipo,
        encargado_almacen: encargado,
        responsable_area: responsable.trim(),
        sin_cambio: sinCambio,
        cambio: tipo === "M002" && !sinCambio ? cambio : null,
        registrado_por: codigoUsuario,
        obs: obs.trim()
      };

      const res = await apiPost("/api/cilindros/despacho-devolucion", payload);

      if (res.success) {
        alert("Movimiento registrado correctamente");
        limpiar();
        await cargarDisponibles();
      } else {
        alert(res.message || "No se pudo registrar");
      }

    } catch (error) {
      console.error(error);
      alert("Error al registrar movimiento");
    } finally {
      setProcesando(false);
    }
  };

  const limpiar = () => {
    solicitudDisponiblesRef.current += 1;
    setFecha(new Date().toISOString().slice(0, 10));
    setCilindro("");
    setArea("");
    setEncargado("");
    setResponsable("");
    setInfo("");
    setObs("");
    setCambio("");
    setCilindrosVacios([]);
    setSinCambio(false);
  };

  return (
    <div style={card}>
      {cargandoPantalla || procesando ? (
        <SccoPageLoading message={procesando ? "Procesando movimiento..." : "Cargando datos SCCO..."} />
      ) : null}
      <h3>Despacho / Devolución</h3>

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

        <Campo label="Material">
          <SccoComboBox
            options={productos.map(p => ({ value: p.codigo, label: p.nombre }))}
            value={material}
            onChange={(val) => {
              setMaterial(val);
              cargarCilindrosVacios(val);
            }}
            disabled={procesando}
            placeholder="Seleccione material"
            emptyLabel="Seleccione material"
          />
        </Campo>

        <Campo label="Cilindro disponible">
          <SccoComboBox
            options={disponibles.map(d => ({
              value: d.cilindro,
              label: `${d.cilindro} — ${nombreEstado(d.estado)} — ${d.ubicacion ? obtenerNombreArea(d.ubicacion) : "Sin ubicación"}`
            }))}
            value={cilindro}
            onChange={seleccionarCilindro}
            disabled={disponibles.length === 0 || procesando}
            placeholder="Seleccione cilindro"
            emptyLabel="Seleccione cilindro"
          />
        </Campo>

        <Campo label="Área">
          <SccoComboBox
            options={ubicaciones.map(u => ({ value: u.codigo, label: u.nombre }))}
            value={area}
            onChange={setArea}
            disabled={tipo === "M003" || procesando}
            placeholder="Seleccione área"
            emptyLabel="Seleccione área"
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
            type="text"
            value={responsable}
            onChange={(e) => setResponsable(e.target.value.toUpperCase().toUpperCase())}
            placeholder="Nombre del responsable"
            disabled={procesando}
            style={input}
          />
        </Campo>

        <Campo label="Registrado por">
          <input
            type="text"
            value={nombreUsuario || ""}
            readOnly
            style={inputReadOnly}
          />
        </Campo>

        {tipo === "M002" && !sinCambio && (
          <Campo label="Cilindro de cambio">
            <SccoComboBox
              options={cilindrosVacios.map(c => ({
                value: c.cilindro,
                label: `${c.cilindro} — VACÍO`
              }))}
              value={cambio}
              onChange={setCambio}
              disabled={!material || cilindrosVacios.length === 0 || procesando}
              placeholder="Seleccione cilindro vacío"
              emptyLabel="Seleccione cilindro vacío"
            />
          </Campo>
        )}

        {tipo === "M002" && (
          <Campo label="Opciones de despacho">
            <label style={checkLabel}>
              <input
                type="checkbox"
                checked={sinCambio}
                onChange={(e) => {
                  setSinCambio(e.target.checked);
                  if (e.target.checked) {
                    setCambio("");
                  }
                }}
                disabled={procesando}
              />
              Despacho sin cilindro de cambio
            </label>
          </Campo>
        )}

        <Campo label="Observación">
          <textarea
            value={obs}
            onChange={(e) => setObs(e.target.value.toUpperCase().toUpperCase())}
            placeholder="Escriba alguna ocurrencia..."
            disabled={procesando}
            style={textarea}
          />
        </Campo>

      </div>

      {info && (
        <div style={infoBox}>
          {info}
        </div>
      )}

      <div style={acciones}>
        <button onClick={guardar} style={btnGuardar} disabled={procesando}>
          {procesando ? <SccoInlineLoading message="Guardando..." /> : "Guardar"}
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
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "15px"
};

const labelStyle = {
  display: "block",
  marginBottom: "5px",
  fontWeight: "bold",
  color: "#333"
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
  marginTop: "15px",
  padding: "12px",
  background: "#dcdde1",
  borderRadius: "8px",
  fontWeight: "bold"
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