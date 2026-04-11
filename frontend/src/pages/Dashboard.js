 import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();
  const dni = localStorage.getItem("dni");

  const cerrarSesion = () => {
    localStorage.removeItem("dni");
    navigate("/");
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Bienvenido - DNI: {dni} - {localStorage.getItem("nombre")}</h2>

      <h3>Módulos</h3>

      <button onClick={() => navigate("/smds")} style={{
    padding: "12px 20px",
    margin: "10px",
    borderRadius: "10px",
    border: "none",
    backgroundColor: "#273c75",
    color: "white",
    fontSize: "16px",
    cursor: "pointer"
  }}>
        📄 SMDS
      </button>

      <br /><br />

      <button onClick={cerrarSesion} style={{
    background: "white",
    padding: "10px",
    borderRadius: "12px",
    boxShadow: "0 0 10px rgba(247, 8, 8, 0.93)"
  }}>
        ❌ Salir
      </button>
    </div>
  );
}