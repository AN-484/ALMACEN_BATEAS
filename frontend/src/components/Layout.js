import { useNavigate } from "react-router-dom";

export default function Layout({ children }) {
  const navigate = useNavigate();

  const cerrarSesion = () => {
    localStorage.clear();
    navigate("/");
  };

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      
      {/* SIDEBAR */}
      <div
        style={{
          width: "220px",
          backgroundColor: "#2f3640",
          color: "white",
          padding: "20px"
        }}
      >
        <h2>Almacén</h2>

        <button onClick={() => navigate("/dashboard")} style={btn}>
          🏠 Dashboard
        </button>

        <button onClick={() => navigate("/smds")} style={btn}>
          📄 SMDS
        </button>

        <hr />

        <button onClick={cerrarSesion} style={btnDanger}>
          ❌ Salir
        </button>
      </div>

      {/* CONTENIDO */}
      <div style={{ flex: 1, padding: "20px", background: "#f5f6fa" }}>
        {children}
      </div>
    </div>
  );
}

const btn = {
  display: "block",
  width: "100%",
  margin: "10px 0",
  padding: "10px",
  background: "#40739e",
  color: "white",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer"
};

const btnDanger = {
  ...btn,
  background: "#e84118"
};