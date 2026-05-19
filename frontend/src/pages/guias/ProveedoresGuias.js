import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../../services/api";
import { limpiarRuc, mayus } from "./utils/formatear";

export default function ProveedoresGuias() {
  const [proveedores, setProveedores] = useState([]);
  const [q, setQ] = useState("");
  const [ruc, setRuc] = useState("");
  const [nombre, setNombre] = useState("");
  const [guardando, setGuardando] = useState(false);

  const buscar = async (texto = q) => {
    try {
      const res = await apiGet(`/api/guias/proveedores?q=${encodeURIComponent(texto)}`);

      if (res.success) {
        setProveedores(res.data || []);
      }
    } catch (error) {
      console.error(error);
      alert("No se pudo buscar proveedores");
    }
  };

  const guardar = async () => {
    try {
      if (ruc.length !== 11) {
        alert("El RUC debe tener 11 dígitos");
        return;
      }

      if (!nombre.trim()) {
        alert("Ingrese nombre del proveedor");
        return;
      }

      setGuardando(true);

      const res = await apiPost("/api/guias/proveedores", {
        ruc,
        nombre
      });

      if (res.success) {
        alert("Proveedor registrado correctamente");
        setRuc("");
        setNombre("");
        buscar("");
      }
    } catch (error) {
      console.error(error);
      alert(error.message || "No se pudo registrar proveedor");
    } finally {
      setGuardando(false);
    }
  };

  useEffect(() => {
    buscar("");
  }, []);

  return (
    <div>
      <div style={card}>
        <h3>Registrar proveedor</h3>

        <div style={grid}>
          <input
            value={ruc}
            maxLength={11}
            onChange={(e) => setRuc(limpiarRuc(e.target.value))}
            placeholder="RUC"
            style={input}
          />

          <input
            value={nombre}
            onChange={(e) => setNombre(mayus(e.target.value))}
            placeholder="Nombre proveedor"
            style={input}
          />

          <button
            onClick={guardar}
            disabled={guardando}
            style={guardando ? btnDisabled : btnGuardar}
          >
            {guardando ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>

      <div style={card}>
        <h3>Buscar proveedores</h3>

        <div style={grid}>
          <input
            value={q}
            onChange={(e) => setQ(mayus(e.target.value))}
            onKeyDown={(e) => {
              if (e.key === "Enter") buscar();
            }}
            placeholder="Buscar por RUC o nombre"
            style={input}
          />

          <button onClick={() => buscar()} style={btnGuardar}>
            Buscar
          </button>
        </div>

        <div style={lista}>
          {proveedores.map(p => (
            <div key={p.ruc} style={item}>
              <b>{p.ruc}</b>
              <span>{p.nombre}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const card = {
  background: "white",
  padding: "18px",
  borderRadius: "14px",
  boxShadow: "0 0 10px rgba(0,0,0,0.1)",
  marginBottom: "20px"
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "10px",
  marginBottom: "15px"
};

const input = {
  padding: "10px",
  borderRadius: "8px",
  border: "1px solid #ccc"
};

const btnGuardar = {
  padding: "10px 14px",
  border: "none",
  borderRadius: "8px",
  background: "#273c75",
  color: "white",
  cursor: "pointer",
  fontWeight: "bold"
};

const btnDisabled = {
  ...btnGuardar,
  background: "#718093",
  cursor: "not-allowed"
};

const lista = {
  display: "grid",
  gap: "10px"
};

const item = {
  padding: "12px",
  border: "1px solid #eee",
  borderRadius: "10px",
  display: "grid",
  gap: "4px"
};