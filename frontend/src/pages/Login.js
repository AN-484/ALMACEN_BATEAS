import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [dni, setDni] = useState("");
  const navigate = useNavigate();

  /*const ingresar = () => {
    if (dni.length === 8) {
      localStorage.setItem("dni", dni); // 🔥 guardamos sesión
      navigate("/dashboard");
    } else {
      alert("DNI inválido");
    }
  };*/
  const ingresar = async () => {
    const res = await fetch("https://app-almacen-bateas-backend.onrender.com/login", {
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

  return (
    <div style={{ padding: "20px" }}>
      <h2>Ingreso al Sistema</h2>

      <input
        type="text"
        placeholder="Ingrese DNI"
        value={dni}
        onChange={(e) => setDni(e.target.value)}
      />

      <br /><br />

      <button onClick={ingresar}>
        Ingresar
      </button>
    </div>
  );
}