/*import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [dni, setDni] = useState("");
  const navigate = useNavigate();

  const ingresar = async () => {
    const res = await fetch("https://almacen-bateas.onrender.com/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ dni })
    });

    const data = await res.json();

    if (data.success) {
      localStorage.setItem("dni", data.user.dni);
      localStorage.setItem("nombre", data.user.nombre);
      navigate("/dashboard");
    } else {
      alert("DNI no autorizado");
    }
  };

  // 🔥 ENTER activa login
  const handleKey = (e) => {
    if (e.key === "Enter") {
      ingresar();
    }
  };

  return (
    <div style={container}>
      <div style={card}>
        <h1>AlmaCore</h1>
        <h3>Sistema de Almacén</h3>

        <input
          type="text"
          placeholder="Ingrese DNI"
          value={dni}
          onChange={(e) => setDni(e.target.value.toUpperCase())}
          onKeyDown={handleKey}
          style={input}
        />

        <button onClick={ingresar} style={button}>
          Ingresar
        </button>
      </div>
    </div>
  );
}

const container = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  height: "100vh",
  background: "#dcdde1"
};

const card = {
  background: "white",
  padding: "30px",
  borderRadius: "10px",
  boxShadow: "0 0 15px rgba(0,0,0,0.2)",
  textAlign: "center"
};

const input = {
  width: "100%",
  padding: "10px",
  margin: "10px 0",
  borderRadius: "5px",
  border: "1px solid #ccc"
};

const button = {
  width: "100%",
  padding: "10px",
  background: "#273c75",
  color: "white",
  border: "none",
  borderRadius: "5px",
  cursor: "pointer"
};*/



import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiPost } from "../services/api";

export default function Login() {
  const [dni, setDni] = useState("");
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.clear();
    window.history.replaceState(null, "", "/");
  }, []);

  const ingresar = async () => {
    if (cargando) return;

    try {
      if (dni.length !== 8) {
        alert("El DNI debe tener 8 dígitos");
        return;
      }

      setCargando(true);

      const data = await apiPost("/api/auth/login", { dni });

      if (data.success) {
        localStorage.setItem("dni", data.user.dni);
        localStorage.setItem("codigo", data.user.codigo);
        localStorage.setItem("nombre", data.user.nombre);
        localStorage.setItem("cargo", data.user.cargo || "");
        localStorage.setItem(
          "puede_datos",
          data.permisos?.puede_datos ? "SI" : "NO"
        );

        navigate("/dashboard", { replace: true });
      } else {
        alert("DNI no autorizado");
      }
    } catch (error) {
      console.error(error);
      alert("No se pudo conectar con el servidor");
    } finally {
      setCargando(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter") {
      ingresar();
    }
  };

  return (
    <div style={container}>
      <div style={overlay}></div>

      <div style={card}>
        <h2 style={{ textAlign: "center" }}>AlmaCore</h2>

        <p style={{ textAlign: "center", marginBottom: "20px" }}>
          Iniciar sesión
        </p>

        <input
          type="text"
          placeholder="Ingrese su DNI"
          value={dni}
          maxLength={8}
          disabled={cargando}
          onChange={(e) =>
            setDni(e.target.value.toUpperCase().replace(/\D/g, ""))
          }
          onKeyDown={handleKey}
          style={input}
        />

        <button
          onClick={ingresar}
          style={cargando ? btnDisabled : btn}
          disabled={cargando}
        >
          {cargando ? "Ingresando..." : "Ingresar"}
        </button>

        {cargando && (
          <div style={loadingBox}>
            <span style={spinner}></span>
            <span>Conectando con el servidor...</span>
          </div>
        )}
      </div>
    </div>
  );
}

const container = {
  position: "relative",
  height: "100vh",
  width: "100%",
  backgroundImage: "url('/img/login-bg.png')",
  backgroundSize: "cover",
  backgroundPosition: "center",
  display: "flex",
  justifyContent: "center",
  alignItems: "center"
};

const overlay = {
  position: "absolute",
  width: "100%",
  height: "100%",
  background: "rgba(0,0,0,0.5)"
};

const card = {
  position: "relative",
  background: "rgba(255,255,255,0.85)",
  backdropFilter: "blur(6px)",
  padding: "35px",
  borderRadius: "12px",
  boxShadow: "0 0 20px rgba(0,0,0,0.3)",
  width: "300px",
  zIndex: 2
};

const input = {
  width: "100%",
  padding: "12px",
  marginBottom: "15px",
  borderRadius: "6px",
  border: "1px solid #ccc",
  boxSizing: "border-box"
};

const btn = {
  width: "100%",
  padding: "12px",
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

const loadingBox = {
  marginTop: "15px",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  gap: "8px",
  fontSize: "13px",
  color: "#333"
};

const spinner = {
  width: "14px",
  height: "14px",
  border: "3px solid #dcdde1",
  borderTop: "3px solid #273c75",
  borderRadius: "50%",
  display: "inline-block",
  animation: "spin 1s linear infinite"
};