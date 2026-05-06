import { useState } from "react";
import Layout from "../components/Layout";

import CilindrosDashboard from "./cilindros/CilindrosDashboard";
import EstadoCilindros from "./cilindros/EstadoCilindros";
import IngresoRecarga from "./cilindros/IngresoRecarga";
import IngresoRecargaMasivo from "./cilindros/IngresoRecargaMasivo";
import DespachoDevolucion from "./cilindros/DespachoDevolucion";
import DespachoDevolucionMasivo from "./cilindros/DespachoDevolucionMasivo";
import ReportesCilindros from "./cilindros/ReportesCilindros";
import Maestros from "./Maestros";

export default function Cilindros() {
  const [vista, setVista] = useState("dashboard");

  const puedeDatos = localStorage.getItem("puede_datos") === "SI";

  return (
    <Layout>
      <h2>🧯 Módulo de Cilindros</h2>

      <div style={tabs}>
        <button
          style={vista === "dashboard" ? btnActivo : btn}
          onClick={() => setVista("dashboard")}
        >
          Dashboard
        </button>

        <button
          style={vista === "estado" ? btnActivo : btn}
          onClick={() => setVista("estado")}
        >
          Estado
        </button>

        <button
          style={vista === "ingreso" ? btnActivo : btn}
          onClick={() => setVista("ingreso")}
        >
          Ingreso / Recarga
        </button>

        <button
          style={vista === "ingreso_masivo" ? btnActivo : btn}
          onClick={() => setVista("ingreso_masivo")}
        >
          Ingreso Masivo
        </button>

        <button
          style={vista === "despacho" ? btnActivo : btn}
          onClick={() => setVista("despacho")}
        >
          Despacho / Devolución
        </button>

        <button
          style={vista === "despacho_masivo" ? btnActivo : btn}
          onClick={() => setVista("despacho_masivo")}
        >
          Despacho Masivo
        </button>

        <button
          style={vista === "reportes" ? btnActivo : btn}
          onClick={() => setVista("reportes")}
        >
          Reportes
        </button>

        {/* 🔥 SOLO USUARIOS AUTORIZADOS */}
        {puedeDatos && (
            <button
                style={vista === "datos" ? btnDatosActivo : btnDatos}
                onClick={() => setVista("datos")}
            >
                ⚙️ Datos
            </button>
            )}
      </div>

      {vista === "dashboard" && <CilindrosDashboard />}
      {vista === "estado" && <EstadoCilindros />}
      {vista === "ingreso" && <IngresoRecarga />}
      {vista === "ingreso_masivo" && <IngresoRecargaMasivo />}
      {vista === "despacho" && <DespachoDevolucion />}
      {vista === "despacho_masivo" && <DespachoDevolucionMasivo />}
      {vista === "reportes" && <ReportesCilindros />}
      {vista === "datos" && <Maestros />}
    </Layout>
  );
}

const tabs = {
  display: "flex",
  gap: "10px",
  marginBottom: "20px",
  flexWrap: "wrap"
};

const btn = {
  padding: "10px 14px",
  border: "none",
  borderRadius: "6px",
  background: "#718093",
  color: "white",
  cursor: "pointer"
};

const btnActivo = {
  ...btn,
  background: "#273c75"
};

const btnDatos = {
  padding: "10px 14px",
  border: "none",
  borderRadius: "6px",
  background: "#353b48", // gris oscuro
  color: "white",
  cursor: "pointer",
  fontWeight: "bold"
};

const btnDatosActivo = {
  ...btnDatos,
  background: "#e1b12c", // dorado tipo admin
  color: "#000"
};