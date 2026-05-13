import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../../services/api";

export default function DespachoDevolucion() {
  const [tipo, setTipo] = useState("DESPACHO");
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));

  const [material, setMaterial] = useState("");
  const [cilindro, setCilindro] = useState("");
  const [area, setArea] = useState("");
  const [encargado, setEncargado] = useState("");
  const [responsable, setResponsable] = useState("");

  const [productos, setProductos] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [disponibles, setDisponibles] = useState([]);

  const [info, setInfo] = useState("");

  const codigoUsuario = localStorage.getItem("codigo");
  const nombreUsuario = localStorage.getItem("nombre");

  const cargarCombos = async () => {
    try {
      const prod = await apiGet("/api/cilindros/productos");
      const ubi = await apiGet("/api/cilindros/ubicaciones");
      const usu = await apiGet("/api/cilindros/usuarios");

      setProductos(prod);
      setUbicaciones(ubi);
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
    }
  };

  const cargarDisponibles = async () => {
    try {
      setCilindro("");
      setDisponibles([]);
      setInfo("");

      if (!material) return;

      const data = await apiGet(
        `/api/cilindros/disponibles?material=${material}&tipo=${tipo}`
      );

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

  const cambiarTipo = (nuevoTipo) => {
    setTipo(nuevoTipo);
    setCilindro("");
    setArea("");
    setResponsable("");
    setInfo("");
  };
  
  const obtenerNombreArea = (codigoArea) => {
    if (!codigoArea) return "";

    const item = ubicaciones.find(
      u => String(u.codigo) === String(codigoArea)
      );

      return item ? item.nombre : codigoArea;
  };

  const seleccionarCilindro = (codigo) => {
    setCilindro(codigo);

    const seleccionado = disponibles.find(d => d.cilindro === codigo);

    if (seleccionado) {
      if (tipo === "DEVOLUCION") {
        const areaCodigo = seleccionado.ubicacion;

        const areaEncontrada = ubicaciones.find(
          u => String(u.codigo) === String(areaCodigo)
        );

        if (areaEncontrada) {
          setArea(areaEncontrada.codigo);
        }
      }

      setInfo(
        `Estado actual: ${seleccionado.estado} | Ubicación: ${obtenerNombreArea(seleccionado.ubicacion)}`
      );
    }
  };

  const guardar = async () => {
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

      const payload = {
        fecha,
        cilindro,
        material,
        area,
        tipo,
        encargado_almacen: encargado,
        responsable_area: responsable.trim(),
        registrado_por: codigoUsuario
      };

      const res = await apiPost("/api/cilindros/despacho-devolucion", payload);

      if (res.success) {
        alert("Movimiento registrado correctamente");
        limpiar();
        cargarDisponibles();
      } else {
        alert(res.message || "No se pudo registrar");
      }

    } catch (error) {
      console.error(error);
      alert("Error al registrar movimiento");
    }
  };

  const limpiar = () => {
    setFecha(new Date().toISOString().slice(0, 10));
    setCilindro("");
    setArea("");
    setEncargado("");
    setResponsable("");
    setInfo("");
  };

  return (
    <div style={card}>
      <h3>Despacho / Devolución</h3>

      <div style={tipoBox}>
        <button
          onClick={() => cambiarTipo("DESPACHO")}
          style={tipo === "DESPACHO" ? btnDespachoActivo : btnTipo}
        >
          🚚 DESPACHO
        </button>

        <button
          onClick={() => cambiarTipo("DEVOLUCION")}
          style={tipo === "DEVOLUCION" ? btnDevolucionActivo : btnTipo}
        >
          📥 DEVOLUCIÓN
        </button>
      </div>

      <div style={grid}>
        <Campo label="Fecha">
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            style={input}
          />
        </Campo>

        <Campo label="Material">
          <select
            value={material}
            onChange={(e) => setMaterial(e.target.value)}
            style={input}
          >
            <option value="">Seleccione</option>
            {productos.map(p => (
              <option key={p.codigo} value={p.codigo}>
                {p.codigo} - {p.nombre}
              </option>
            ))}
          </select>
        </Campo>

        <Campo label="Cilindro disponible">
          <select
            value={cilindro}
            onChange={(e) => seleccionarCilindro(e.target.value)}
            style={input}
            disabled={disponibles.length === 0}
          >
            <option value="">Seleccione cilindro</option>
            {disponibles.map(d => (
              <option key={d.cilindro} value={d.cilindro}>
                {d.cilindro} - {d.estado} - {d.ubicacion ? obtenerNombreArea(d.ubicacion) : "Sin ubicación"}
              </option>
            ))}
          </select>
        </Campo>

        <Campo label="Área">
          <select
            value={area}
            onChange={(e) => setArea(e.target.value)}
            style={input}
            disabled={tipo === "DEVOLUCION"}
          >
            <option value="">Seleccione</option>
            {ubicaciones.map(u => (
              <option key={u.codigo} value={u.codigo}>
                {u.nombre}
              </option>
            ))}
          </select>
        </Campo>

        <Campo label="Autorizado por">
          <select
            value={encargado}
            onChange={(e) => setEncargado(e.target.value)}
            style={input}
          >
            <option value="">Seleccione</option>
            {usuarios.map(u => (
              <option key={u.codigo} value={u.codigo}>
                {u.nombre}
              </option>
            ))}
          </select>
        </Campo>

        <Campo label="Usuario que recoge/devuelve">
          <input
            type="text"
            value={responsable}
            onChange={(e) => setResponsable(e.target.value)}
            placeholder="Nombre del responsable"
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
      </div>

      {info && (
        <div style={infoBox}>
          {info}
        </div>
      )}

      <div style={acciones}>
        <button onClick={guardar} style={btnGuardar}>
          Guardar
        </button>

        <button onClick={limpiar} style={btnLimpiar}>
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
  background: "#718093",
  color: "white",
  cursor: "pointer"
};

const btnDespachoActivo = {
  ...btnTipo,
  background: "#44bd32"
};

const btnDevolucionActivo = {
  ...btnTipo,
  background: "#0097e6"
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
  background: "#273c75",
  color: "white",
  cursor: "pointer",
  fontWeight: "bold"
};

const btnLimpiar = {
  ...btnGuardar,
  background: "#718093"
};