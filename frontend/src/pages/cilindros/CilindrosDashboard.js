import { useEffect, useState } from "react";
import { apiGet } from "../../services/api";

export default function CilindrosDashboard() {
  const [data, setData] = useState(null);

  const cargar = async () => {
    try {
      const res = await apiGet("/api/cilindros/dashboard");
      setData(res);
    } catch (error) {
      console.error(error);
      alert("No se pudo cargar dashboard de cilindros");
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  if (!data) {
    return <p>Cargando dashboard...</p>;
  }

  return (
    <div>
      <h3>Resumen General</h3>

      <div style={grid}>
        <Card titulo="Total Cilindros" valor={data.total} />
        <Card titulo="En Stock" valor={data.stock} />
        <Card titulo="Vacíos" valor={data.vacio} />
        <Card titulo="En Cliente" valor={data.cliente} />
        <Card titulo="En Proveedor" valor={data.proveedor} />
        <Card titulo="BATEAS" valor={data.bateas} />
        <Card titulo="LINDE" valor={data.linde} />
      </div>

      <button onClick={cargar} style={btn}>
        Actualizar
      </button>
    </div>
  );
}

function Card({ titulo, valor }) {
  return (
    <div style={card}>
      <h4>{titulo}</h4>
      <h2>{valor}</h2>
    </div>
  );
}

const grid = {
  display: "flex",
  flexWrap: "wrap",
  gap: "15px",
  marginTop: "20px"
};

const card = {
  background: "white",
  padding: "20px",
  borderRadius: "12px",
  boxShadow: "0 0 10px rgba(0,0,0,0.1)",
  width: "180px",
  textAlign: "center"
};

const btn = {
  marginTop: "20px",
  padding: "10px 15px",
  border: "none",
  borderRadius: "6px",
  background: "#273c75",
  color: "white",
  cursor: "pointer"
};