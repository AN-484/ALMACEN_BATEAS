import { useState } from "react";

const API_URL =
  process.env.REACT_APP_API_URL || "http://localhost:3001";

export default function AdminMSDS() {
  const [sap, setSap] = useState("");
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [archivo, setArchivo] = useState(null);
  const [cargando, setCargando] = useState(false);

  const guardar = async () => {
    try {
      if (!sap.trim()) {
        alert("Ingrese código SAP");
        return;
      }

      if (!nombre.trim()) {
        alert("Ingrese nombre visible");
        return;
      }

      if (!archivo) {
        alert("Seleccione archivo PDF");
        return;
      }

      const formData = new FormData();
      formData.append("sap", sap.trim().toUpperCase());
      formData.append("nombre", nombre.trim().toUpperCase());
      formData.append("descripcion", descripcion.trim().toUpperCase());
      formData.append("archivo", archivo);

      setCargando(true);

      const res = await fetch(`${API_URL}/api/msds`, {
        method: "POST",
        headers: {
          "x-user-nombre": localStorage.getItem("nombre") || "",
          "x-user-codigo": localStorage.getItem("codigo") || ""
        },
        body: formData
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "No se pudo registrar MSDS");
      }

      alert("MSDS registrado correctamente");

      setSap("");
      setNombre("");
      setDescripcion("");
      setArchivo(null);

      const inputArchivo = document.getElementById("archivo-msds");
      if (inputArchivo) inputArchivo.value = "";

    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={card}>
      <h3>➕ Agregar nuevo MSDS</h3>

      <label style={label}>Código SAP</label>
      <input
        value={sap}
        onChange={(e) => setSap(e.target.value.toUpperCase())}
        placeholder="Ejemplo: 1000000474"
        style={input}
      />

      <label style={label}>Nombre visible</label>
      <input
        value={nombre}
        onChange={(e) => setNombre(e.target.value.toUpperCase())}
        placeholder="Ejemplo: HIDRÓXIDO DE AMONIO QP"
        style={input}
      />

      <label style={label}>Descripción</label>
      <textarea
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value.toUpperCase())}
        placeholder="Descripción opcional"
        style={textarea}
      />

      <label style={label}>Archivo PDF</label>
      <input
        id="archivo-msds"
        type="file"
        accept="application/pdf"
        onChange={(e) => setArchivo(e.target.files[0])}
        style={input}
      />

      <button
        onClick={guardar}
        disabled={cargando}
        style={cargando ? btnDisabled : btn}
      >
        {cargando ? "Guardando..." : "Guardar MSDS"}
      </button>
    </div>
  );
}

const card = {
  background: "white",
  padding: "20px",
  borderRadius: "12px",
  boxShadow: "0 0 10px rgba(0,0,0,0.1)",
  marginTop: "20px"
};

const label = {
  display: "block",
  marginTop: "12px",
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

const textarea = {
  ...input,
  minHeight: "80px",
  resize: "vertical"
};

const btn = {
  marginTop: "15px",
  padding: "10px 15px",
  border: "none",
  borderRadius: "6px",
  background: "#273c75",
  color: "white",
  cursor: "pointer",
  fontWeight: "bold"
};

const btnDisabled = {
  ...btn,
  background: "#718093",
  cursor: "not-allowed"
};