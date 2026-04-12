import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";

export default function Dashboard() {
  const navigate = useNavigate();

  const dni = localStorage.getItem("dni");
  const nombre = localStorage.getItem("nombre");

  const cerrarSesion = () => {
    localStorage.clear();
    navigate("/");
  };

  return (
    <Layout>
      <div>
        {/* ENCABEZADO */}
        <h2 style={{ marginBottom: "5px" }}>
          Bienvenido, {nombre}
        </h2>

        <p style={{ color: "#555" }}>
          DNI: {dni}
        </p>

        {/* MÓDULOS */}
        <h3 style={{ marginTop: "30px" }}>Módulos del Sistema</h3>

        <div style={contenedorCards}>
          
          {/* SMDS */}
          <div style={card}>
            <h4>📄 SMDS</h4>
            <p>Consulta hojas de seguridad</p>

            <button
              onClick={() => navigate("/smds")}
              style={btn}
            >
              Ingresar
            </button>
          </div>

          {/* INVENTARIO (FUTURO) */}
          <div style={card}>
            <h4>📦 Inventario</h4>
            <p>Control de productos</p>

            <button style={btnDisabled}>
              Próximamente
            </button>
          </div>

          {/* REPORTES */}
          <div style={card}>
            <h4>📊 Reportes</h4>
            <p>Análisis del almacén</p>

            <button style={btnDisabled}>
              Próximamente
            </button>
          </div>

          {/* USUARIOS */}
          <div style={card}>
            <h4>👤 Usuarios</h4>
            <p>Gestión de accesos</p>

            <button style={btnDisabled}>
              Próximamente
            </button>
          </div>

        </div>

        {/* BOTÓN SALIR */}
        <button onClick={cerrarSesion} style={btnSalir}>
          ❌ Cerrar sesión
        </button>
      </div>
    </Layout>
  );
}

//////////////////////////////////////////////////
// 🎨 ESTILOS
//////////////////////////////////////////////////

const contenedorCards = {
  display: "flex",
  gap: "20px",
  marginTop: "20px",
  flexWrap: "wrap"
};

const card = {
  background: "white",
  padding: "20px",
  borderRadius: "12px",
  boxShadow: "0 0 10px rgba(0,0,0,0.1)",
  width: "220px",
  textAlign: "center"
};

const btn = {
  marginTop: "10px",
  padding: "10px",
  border: "none",
  borderRadius: "6px",
  backgroundColor: "#273c75",
  color: "white",
  cursor: "pointer",
  width: "100%"
};

const btnDisabled = {
  ...btn,
  backgroundColor: "#aaa",
  cursor: "not-allowed"
};

const btnSalir = {
  marginTop: "40px",
  padding: "10px 20px",
  border: "none",
  borderRadius: "6px",
  backgroundColor: "#e84118",
  color: "white",
  cursor: "pointer"
};