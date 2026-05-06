import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Layout({ children }) {
  const navigate = useNavigate();
  const [menuAbierto, setMenuAbierto] = useState(true);

  const cerrarSesion = () => {
    localStorage.clear();
    navigate("/");
  };

  const nombre = localStorage.getItem("nombre");

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>

      {menuAbierto && (
        <div style={sidebar}>
          <h2>AlmaCore</h2>

          <p style={usuario}>
            {nombre || "Usuario"}
          </p>

          <button onClick={() => navigate("/dashboard")} style={btn}>
            🏠 Dashboard
          </button>

          <button onClick={() => navigate("/smds")} style={btn}>
            📄 MSDS
          </button>

          <button onClick={() => navigate("/cilindros")} style={btn}>
            🧯 SCCO
          </button>

          <hr />

          <button onClick={cerrarSesion} style={btnDanger}>
            ❌ Salir
          </button>
        </div>
      )}

      <div style={contenido}>
        <button
          onClick={() => setMenuAbierto(!menuAbierto)}
          style={btnMenu}
          title="Mostrar/Ocultar menú"
        >
          ☰
        </button>

        {children}
      </div>
    </div>
  );
}

const sidebar = {
  width: "230px",
  backgroundColor: "#2f3640",
  color: "white",
  padding: "20px",
  boxSizing: "border-box"
};

const usuario = {
  fontSize: "13px",
  color: "#dcdde1",
  marginBottom: "25px"
};

const contenido = {
  flex: 1,
  padding: "25px",
  background: "#f5f6fa",
  boxSizing: "border-box"
};

const btnMenu = {
  width: "42px",
  height: "42px",
  border: "none",
  borderRadius: "8px",
  background: "#273c75",
  color: "white",
  fontSize: "22px",
  cursor: "pointer",
  marginBottom: "15px"
};

const btn = {
  display: "block",
  width: "100%",
  margin: "10px 0",
  padding: "10px",
  background: "#40739e",
  color: "white",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  textAlign: "left"
};

const btnDanger = {
  ...btn,
  background: "#e84118"
};