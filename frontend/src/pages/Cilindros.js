import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { SccoPageLoading } from "../components/SccoLoading";

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
  const [cambiandoVista, setCambiandoVista] = useState(false);
  const [esMovil, setEsMovil] = useState(window.innerWidth <= 768);

  const puedeDatos = localStorage.getItem("puede_datos") === "SI";

  useEffect(() => {
    if (!cambiandoVista) return;

    const timer = setTimeout(() => {
      setCambiandoVista(false);
    }, 450);

    return () => clearTimeout(timer);
  }, [cambiandoVista, vista]);

  useEffect(() => {
    const onResize = () => setEsMovil(window.innerWidth <= 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const onCambiarVista = (nuevaVista) => {
    if (nuevaVista === vista || cambiandoVista) return;
    setCambiandoVista(true);
    setVista(nuevaVista);
  };

  return (
    <Layout>
      {cambiandoVista ? <SccoPageLoading message="Cargando sección SCCO..." /> : null}

      <div style={page}>
        <div style={headerCard}>
          <div>
            <h2 style={{ margin: 0 }}>🧯 Módulo SCCO</h2>
            <p style={headerSubtitle}>Control operativo de cilindros y movimientos en almacén.</p>
          </div>

          <div style={headerActions}>
            <span style={headerTag}>SCCO</span>
          </div>
        </div>

        <div style={tabs(esMovil)}>
          <button
            style={vista === "dashboard" ? btnActivo(esMovil) : btn(esMovil)}
            onClick={() => onCambiarVista("dashboard")}
            disabled={cambiandoVista}
          >
            Dashboard
          </button>

          <button
            style={vista === "estado" ? btnActivo(esMovil) : btn(esMovil)}
            onClick={() => onCambiarVista("estado")}
            disabled={cambiandoVista}
          >
            Estado
          </button>

          <button
            style={vista === "ingreso" ? btnActivo(esMovil) : btn(esMovil)}
            onClick={() => onCambiarVista("ingreso")}
            disabled={cambiandoVista}
          >
            Ingreso / Recarga
          </button>

          <button
            style={vista === "ingreso_masivo" ? btnActivo(esMovil) : btn(esMovil)}
            onClick={() => onCambiarVista("ingreso_masivo")}
            disabled={cambiandoVista}
          >
            Ingreso Masivo
          </button>

          <button
            style={vista === "despacho" ? btnActivo(esMovil) : btn(esMovil)}
            onClick={() => onCambiarVista("despacho")}
            disabled={cambiandoVista}
          >
            Despacho / Devolución
          </button>

          <button
            style={vista === "despacho_masivo" ? btnActivo(esMovil) : btn(esMovil)}
            onClick={() => onCambiarVista("despacho_masivo")}
            disabled={cambiandoVista}
          >
            Despacho Masivo
          </button>

          <button
            style={vista === "reportes" ? btnActivo(esMovil) : btn(esMovil)}
            onClick={() => onCambiarVista("reportes")}
            disabled={cambiandoVista}
          >
            Reportes
          </button>

          {/* 🔥 SOLO USUARIOS AUTORIZADOS */}
          {puedeDatos && (
            <button
                style={vista === "datos" ? btnDatosActivo(esMovil) : btnDatos(esMovil)}
              onClick={() => onCambiarVista("datos")}
              disabled={cambiandoVista}
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
      </div>
    </Layout>
  );
}

const page = {
  display: "grid",
  gap: "16px"
};

const headerCard = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
  background: "linear-gradient(135deg, #145739 0%, #239a63 100%)",
  color: "white",
  padding: "18px 20px",
  borderRadius: "16px",
  boxShadow: "0 10px 30px rgba(20,87,57,0.24)"
};

const headerSubtitle = {
  margin: "6px 0 0",
  color: "#e8fff2"
};

const headerActions = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap"
};

const headerTag = {
  background: "rgba(255,255,255,0.18)",
  border: "1px solid rgba(255,255,255,0.35)",
  borderRadius: "999px",
  padding: "7px 12px",
  fontWeight: "bold"
};

const tabs = (esMovil) => ({
  display: "flex",
  gap: "10px",
  marginBottom: "20px",
  flexDirection: esMovil ? "column" : "row",
  alignItems: esMovil ? "stretch" : "flex-start"
});

const btn = (esMovil) => ({
  padding: "10px 14px",
  border: "none",
  borderRadius: "6px",
  background: "#7a9588",
  color: "white",
  cursor: "pointer",
  width: esMovil ? "100%" : "auto",
  textAlign: esMovil ? "left" : "center"
});

const btnActivo = (esMovil) => ({
  ...btn(esMovil),
  background: "#1f7a4d"
});

const btnDatos = (esMovil) => ({
  padding: "10px 14px",
  border: "none",
  borderRadius: "6px",
  background: "#2f4f41",
  color: "white",
  cursor: "pointer",
  fontWeight: "bold",
  width: esMovil ? "100%" : "auto",
  textAlign: esMovil ? "left" : "center"
});

const btnDatosActivo = (esMovil) => ({
  ...btnDatos(esMovil),
  background: "#2d8c5a",
  color: "white"
});