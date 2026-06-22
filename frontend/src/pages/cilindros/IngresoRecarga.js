import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../../services/api";
import { SccoInlineLoading, SccoPageLoading } from "../../components/SccoLoading";
import SccoComboBox from "../../components/SccoComboBox";

export default function IngresoRecarga() {
  const [tipo, setTipo] = useState("M001");
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));

  const [cilindro, setCilindro] = useState("");
  const [propietario, setPropietario] = useState("");
  const [producto, setProducto] = useState("");
  const [fechaHidro, setFechaHidro] = useState(new Date().toISOString().slice(0, 10));

  const [guia, setGuia] = useState("");
  const [nroDocumento, setNroDocumento] = useState("");
  const [transportista, setTransportista] = useState("");
  const [ubicaciones, setUbicaciones] = useState([]);

  const [productos, setProductos] = useState([]);
  const [propietarios, setPropietarios] = useState([]);
  const [transportistas, setTransportistas] = useState([]);
  const [tiposEstado, setTiposEstado] = useState([]);

  const [estadoInfo, setEstadoInfo] = useState("");
  const [obs, setObs] = useState("");
  const [bloquearDatosCilindro, setBloquearDatosCilindro] = useState(false);
  const [cargandoPantalla, setCargandoPantalla] = useState(true);
  const [procesando, setProcesando] = useState(false);

  const codigoUsuario = localStorage.getItem("codigo");
  const nombreUsuario = localStorage.getItem("nombre");

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

  useEffect(() => {
    cargarCombos();
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

  const verificarCilindro = async () => {
    if (!cilindro.trim() || procesando) return;

    try {
      setProcesando(true);
      const cil = await apiGet(`/api/cilindros/buscar/${cilindro.trim()}`);
      const est = await apiGet(`/api/cilindros/estado/${cilindro.trim()}`);

      if (cil) {
        setPropietario(cil.propietario || "");
        setProducto(cil.producto || "");

        if (cil.fecha_hidrostatica) {
          setFechaHidro(cil.fecha_hidrostatica);
        }

        setBloquearDatosCilindro(true);
      } else {
        setBloquearDatosCilindro(false);
      }

      if (est) {
        setEstadoInfo(`Estado actual: ${nombreEstado(est.estado)} | Ubicación: ${obtenerNombreArea(est.ubicacion)}`);
      } else {
        setEstadoInfo("Cilindro sin estado registrado");
      }

    } catch (error) {
      console.error(error);
      alert("No se pudo verificar el cilindro");
    } finally {
      setProcesando(false);
    }
  };

  const guardar = async () => {
    if (procesando) return;

    try {
      if (!cilindro.trim()) {
        alert("Ingrese código de cilindro");
        return;
      }

      if (!propietario) {
        alert("Seleccione propietario");
        return;
      }

      if (!producto) {
        alert("Seleccione producto");
        return;
      }

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

      setProcesando(true);

      const payload = {
        fecha,
        cilindro: cilindro.trim(),
        propietario,
        producto,
        fecha_hidrostatica: fechaHidro,
        nro_guia: guia.trim(),
        nro_documento: nroDocumento.trim(),
        transportista,
        tipo,
        registrado_por: codigoUsuario,
        obs: obs.trim()
      };

      const res = await apiPost("/api/cilindros/ingreso-recarga", payload);

      if (res.success) {
        alert("Movimiento registrado correctamente");
        limpiar();
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
    setTipo("M001");
    setFecha(new Date().toISOString().slice(0, 10));
    setCilindro("");
    setPropietario("");
    setProducto("");
    setFechaHidro(new Date().toISOString().slice(0, 10));
    setGuia("");
    setNroDocumento("");
    setTransportista("");
    setEstadoInfo("");
    setBloquearDatosCilindro(false);
    setObs("");
  };

  return (
    <div style={card}>
      {cargandoPantalla || procesando ? (
        <SccoPageLoading message={procesando ? "Procesando movimiento..." : "Cargando datos SCCO..."} />
      ) : null}
      <h3>Ingreso / Recarga</h3>

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
            style={input}
          />
        </Campo>

        <Campo label="Código Cilindro">
          <input
            type="text"
            value={cilindro}
            onChange={(e) => setCilindro(e.target.value.toUpperCase())}
            onBlur={verificarCilindro}
            placeholder="Ejemplo: C001"
            disabled={procesando}
            style={input}
          />
        </Campo>

        <Campo label="Propietario">
          <SccoComboBox
            options={propietarios.map(p => ({ value: p.codigo, label: p.nombre }))}
            value={propietario}
            onChange={setPropietario}
            disabled={bloquearDatosCilindro}
            placeholder="Seleccione propietario"
            emptyLabel="Seleccione propietario"
          />
        </Campo>

        <Campo label="Producto">
          <SccoComboBox
            options={productos.map(p => ({ value: p.codigo, label: p.nombre }))}
            value={producto}
            onChange={setProducto}
            disabled={bloquearDatosCilindro}
            placeholder="Seleccione producto"
            emptyLabel="Seleccione producto"
          />
        </Campo>

        <Campo label="Fecha Hidrostática">
          <input
            type="date"
            value={fechaHidro}
            onChange={(e) => setFechaHidro(e.target.value.toUpperCase())}
            disabled={bloquearDatosCilindro}
            style={input}
          />
        </Campo>

        <Campo label="Guía">
          <input
            type="text"
            value={guia}
            onChange={(e) => setGuia(e.target.value.toUpperCase())}
            placeholder="Número de guía"
            disabled={procesando}
            style={input}
          />
        </Campo>

        <Campo label="N° Documento">
          <input
            type="text"
            value={nroDocumento}
            maxLength={10}
            onChange={(e) => setNroDocumento(e.target.value.toUpperCase())}
            placeholder="Número documento"
            disabled={procesando}
            style={input}
          />
        </Campo>

        <Campo label="Transportista">
          <SccoComboBox
            options={transportistas.map(t => ({ value: t.codigo, label: t.nombre }))}
            value={transportista}
            onChange={setTransportista}
            disabled={procesando}
            placeholder="Seleccione transportista"
            emptyLabel="Seleccione transportista"
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

        <Campo label="Observación">
          <textarea
            value={obs}
            onChange={(e) => setObs(e.target.value.toUpperCase())}
            placeholder="Escriba alguna ocurrencia..."
            disabled={procesando}
            style={textarea}
          />
        </Campo>
      </div>

      {estadoInfo && (
        <div style={info}>
          {estadoInfo}
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

const info = {
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