import { useEffect, useState } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "../services/api";

const CONFIG = {
  productos: {
    titulo: "Productos",
    campos: [
      { key: "codigo", label: "Código" },
      { key: "nombre", label: "Nombre" },
      { key: "medida", label: "Medida" }
    ]
  },
  transportistas: {
    titulo: "Transportistas",
    campos: [
      { key: "codigo", label: "Código" },
      { key: "nombre", label: "Nombre" },
      { key: "ruc", label: "RUC" }
    ]
  },
  ubicaciones: {
    titulo: "Ubicaciones",
    campos: [
      { key: "codigo", label: "Código" },
      { key: "nombre", label: "Nombre" }
    ]
  },
  almacenes: {
    titulo: "Almacenes",
    campos: [
      { key: "codigo", label: "Código" },
      { key: "nombre", label: "Nombre" }
    ]
  },
  propietarios: {
    titulo: "Propietarios",
    campos: [
      { key: "codigo", label: "Código" },
      { key: "nombre", label: "Nombre" }
    ]
  },
  usuarios: {
    titulo: "Personal",
    campos: [
      { key: "codigo", label: "Código" },
      { key: "dni", label: "DNI" },
      { key: "nombre", label: "Nombre" },
      { key: "cargo", label: "Cargo" }
    ]
  },
  cilindros: {
    titulo: "Cilindros",
    campos: [
      { key: "codigo", label: "Código" },
      { key: "propietario", label: "Propietario", type: "select", source: "propietarios" },
      { key: "producto", label: "Producto", type: "select", source: "productos" },
      { key: "fecha_hidrostatica", label: "Fecha Hidrostática", type: "date" },
      { key: "nuevo", label: "Nuevo SI/NO" }
    ]
  }
};

export default function Maestros() {
  const puedeDatos = localStorage.getItem("puede_datos") === "SI";
  const [tabla, setTabla] = useState("productos");

  if (!puedeDatos) {
    return (
      <div style={card}>
        <h2>Acceso restringido</h2>
        <p>No tienes permiso para modificar datos maestros.</p>
      </div>
    );
  }

  return (
    <div>
      <h3>⚙️ Datos Maestros</h3>

      <div style={tabs}>
        {Object.keys(CONFIG).map(key => (
          <button
            key={key}
            onClick={() => setTabla(key)}
            style={tabla === key ? btnActivo : btn}
          >
            {CONFIG[key].titulo}
          </button>
        ))}
      </div>

      <MaestroTabla tabla={tabla} config={CONFIG[tabla]} />
    </div>
  );
}

function MaestroTabla({ tabla, config }) {
  const [datos, setDatos] = useState([]);
  const [form, setForm] = useState({});
  const [editando, setEditando] = useState(false);

  const [productos, setProductos] = useState([]);
  const [propietarios, setPropietarios] = useState([]);

  const cargar = async () => {
    try {
      const res = await apiGet(`/api/maestros/${tabla}`);
      setDatos(res);
    } catch (error) {
      console.error(error);
      alert("No se pudieron cargar datos");
    }
  };

  const cargarCombosCilindros = async () => {
    try {
      const prod = await apiGet("/api/maestros/productos");
      const prop = await apiGet("/api/maestros/propietarios");

      setProductos(prod);
      setPropietarios(prop);
    } catch (error) {
      console.error(error);
      alert("No se pudieron cargar productos/propietarios");
    }
  };

  useEffect(() => {
    limpiar();
    cargar();

    if (tabla === "cilindros") {
      cargarCombosCilindros();
    }
  }, [tabla]);

  const cambiar = (key, value) => {
    setForm(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const limpiar = () => {
    const limpio = {};

    for (const campo of config.campos) {
      if (campo.key === "nuevo") {
        limpio[campo.key] = "SI";
      } else if (campo.type === "date") {
        limpio[campo.key] = "";
      } else {
        limpio[campo.key] = "";
      }
    }

    setForm(limpio);
    setEditando(false);
  };

  const guardar = async () => {
    try {
      if (!form.codigo) {
        alert("Ingrese código");
        return;
      }

      if (tabla === "usuarios") {
        if (!form.dni || form.dni.length !== 8) {
          alert("El DNI debe tener 8 dígitos");
          return;
        }
      }

      if (tabla === "cilindros") {
        if (!form.propietario) {
          alert("Seleccione propietario");
          return;
        }

        if (!form.producto) {
          alert("Seleccione producto");
          return;
        }
      }

      if (editando) {
        await apiPut(`/api/maestros/${tabla}/${form.codigo}`, form);
        alert("Registro actualizado");
      } else {
        await apiPost(`/api/maestros/${tabla}`, form);
        alert("Registro creado");
      }

      limpiar();
      cargar();
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  };

  const editar = (item) => {
    setForm(item);
    setEditando(true);
  };

  const eliminar = async (codigo) => {
    const ok = window.confirm(`¿Eliminar registro ${codigo}?`);

    if (!ok) return;

    try {
      await apiDelete(`/api/maestros/${tabla}/${codigo}`);
      alert("Registro eliminado");
      cargar();
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  };

  const obtenerNombreProducto = (codigo) => {
    const item = productos.find(p => p.codigo === codigo);
    return item ? item.nombre : codigo;
  };

  const obtenerNombrePropietario = (codigo) => {
    const item = propietarios.find(p => p.codigo === codigo);
    return item ? item.nombre : codigo;
  };

  const mostrarValor = (campo, valor) => {
    if (tabla === "cilindros" && campo.key === "propietario") {
      return obtenerNombrePropietario(valor);
    }

    if (tabla === "cilindros" && campo.key === "producto") {
      return obtenerNombreProducto(valor);
    }

    return valor || "";
  };

  const renderCampo = (campo) => {
    if (tabla === "cilindros" && campo.key === "propietario") {
      return (
        <select
          value={form[campo.key] || ""}
          onChange={(e) => cambiar(campo.key, e.target.value.toUpperCase())}
          style={input}
        >
          <option value="">Seleccione propietario</option>
          {propietarios.map(p => (
            <option key={p.codigo} value={p.codigo}>
              {p.codigo} - {p.nombre}
            </option>
          ))}
        </select>
      );
    }

    if (tabla === "cilindros" && campo.key === "producto") {
      return (
        <select
          value={form[campo.key] || ""}
          onChange={(e) => cambiar(campo.key, e.target.value.toUpperCase())}
          style={input}
        >
          <option value="">Seleccione producto</option>
          {productos.map(p => (
            <option key={p.codigo} value={p.codigo}>
              {p.codigo} - {p.nombre}
            </option>
          ))}
        </select>
      );
    }

    if (campo.key === "nuevo") {
      return (
        <select
          value={form[campo.key] || "SI"}
          onChange={(e) => cambiar(campo.key, e.target.value.toUpperCase())}
          style={input}
        >
          <option value="SI">SI</option>
          <option value="NO">NO</option>
        </select>
      );
    }

    return (
      <input
        type={campo.type || "text"}
        value={form[campo.key] || ""}
        disabled={editando && campo.key === "codigo"}
        onChange={(e) => cambiar(campo.key, e.target.value.toUpperCase())}
        style={input}
      />
    );
  };

  return (
    <div style={card}>
      <h3>{config.titulo}</h3>

      <div style={grid}>
        {config.campos.map(campo => (
          <div key={campo.key}>
            <label style={label}>{campo.label}</label>
            {renderCampo(campo)}
          </div>
        ))}
      </div>

      <div style={acciones}>
        <button onClick={guardar} style={btnGuardar}>
          {editando ? "Actualizar" : "Agregar"}
        </button>

        <button onClick={limpiar} style={btnLimpiar}>
          Limpiar
        </button>
      </div>

      <div style={tablaBox}>
        <table style={tablaStyle}>
          <thead>
            <tr>
              {config.campos.map(campo => (
                <th key={campo.key} style={th}>
                  {campo.label}
                </th>
              ))}
              <th style={th}>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {datos.map(item => (
              <tr key={item.codigo}>
                {config.campos.map(campo => (
                  <td key={campo.key} style={td}>
                    {mostrarValor(campo, item[campo.key])}
                  </td>
                ))}

                <td style={td}>
                  <button onClick={() => editar(item)} style={btnEditar}>
                    Editar
                  </button>

                  <button
                    onClick={() => eliminar(item.codigo)}
                    style={btnEliminar}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {datos.length === 0 && (
          <p style={{ padding: "15px" }}>No hay datos.</p>
        )}
      </div>
    </div>
  );
}

const card = {
  background: "white",
  padding: "20px",
  borderRadius: "12px",
  boxShadow: "0 0 10px rgba(0,0,0,0.1)"
};

const tabs = {
  display: "flex",
  gap: "10px",
  marginBottom: "20px",
  flexWrap: "wrap"
};

const btn = {
  padding: "10px 14px",
  border: "none",
  borderRadius: "6px",
  background: "#718093",
  color: "white",
  cursor: "pointer"
};

const btnActivo = {
  ...btn,
  background: "#273c75"
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "15px",
  marginBottom: "15px"
};

const label = {
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

const acciones = {
  display: "flex",
  gap: "10px",
  marginBottom: "20px"
};

const btnGuardar = {
  padding: "10px 15px",
  border: "none",
  borderRadius: "6px",
  background: "#273c75",
  color: "white",
  cursor: "pointer"
};

const btnLimpiar = {
  ...btnGuardar,
  background: "#718093"
};

const tablaBox = {
  overflowX: "auto",
  border: "1px solid #ddd",
  borderRadius: "10px"
};

const tablaStyle = {
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
  borderBottom: "1px solid #ddd",
  whiteSpace: "nowrap"
};

const btnEditar = {
  padding: "6px 10px",
  marginRight: "6px",
  border: "none",
  borderRadius: "5px",
  background: "#40739e",
  color: "white",
  cursor: "pointer"
};

const btnEliminar = {
  ...btnEditar,
  background: "#e84118"
};