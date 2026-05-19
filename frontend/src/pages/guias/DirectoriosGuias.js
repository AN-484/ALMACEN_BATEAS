import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../../services/api";
import { mayus } from "./utils/formatear";

export default function DirectoriosGuias() {
  const [directorios, setDirectorios] = useState([]);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [guardando, setGuardando] = useState(false);

  const cargar = async () => {
    try {
      const res = await apiGet("/api/guias/directorios");

      if (res.success) {
        setDirectorios(res.data || []);
      }
    } catch (error) {
      console.error(error);
      alert("No se pudo cargar directorios");
    }
  };

  const guardar = async () => {
    try {
      if (!nombre.trim()) {
        alert("Ingrese nombre del directorio");
        return;
      }

      setGuardando(true);

      const res = await apiPost("/api/guias/directorios", {
        nombre,
        descripcion
      });

      if (res.success) {
        alert("Directorio creado correctamente");
        setNombre("");
        setDescripcion("");
        cargar();
      }
    } catch (error) {
      console.error(error);
      alert(error.message || "No se pudo crear directorio");
    } finally {
      setGuardando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  return (
    <div>
      <div style={card}>
        <h3>Crear directorio</h3>

        <div style={grid}>
          <input
            value={nombre}
            onChange={(e) => setNombre(mayus(e.target.value))}
            placeholder="Ejemplo: RECIBIDAS_AQP"
            style={input}
          />

          <input
            value={descripcion}
            onChange={(e) => setDescripcion(mayus(e.target.value))}
            placeholder="Descripción"
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
        <h3>Directorios registrados</h3>

        <div style={lista}>
          {directorios.map(d => (
            <div key={d.id_directorio} style={item}>
              <b>{d.id_directorio}</b>
              <span>{d.nombre}</span>
              <small>{d.descripcion || "-"}</small>
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
  gap: "10px"
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