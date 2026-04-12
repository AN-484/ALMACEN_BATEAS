import { useState } from "react";
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
        <h2>Sistema de Almacén</h2>

        <input
          type="text"
          placeholder="Ingrese DNI"
          value={dni}
          onChange={(e) => setDni(e.target.value)}
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
};