import { useState } from "react";
import Layout from "../components/Layout";

import SolicitarEPPS from "./epps/SolicitarEPPS";
import HistorialEPPS from "./epps/HistorialEPPS";
import AdminEPPS from "./epps/AdminEPPS";

export default function EPPS() {
  const [vista, setVista] = useState("historial");
  const puedeDatos = localStorage.getItem("puede_datos") === "SI";

  return (
    <Layout>
      <div style={page}>
        <div style={headerCard}>
          <div>
            <h2 style={{ margin: 0 }}>🦺 Módulo EPPS</h2>
            <p style={headerSubtitle}>Gestión de solicitudes MEPPs y flujo de aprobación.</p>
          </div>

          <div style={headerActions}>
            <span style={headerTag}>MEPPs</span>
          </div>
        </div>

        <div style={tabs}>
          <button
            onClick={() => setVista("historial")}
            style={vista === "historial" ? btnActivo : btn}
          >
            Mis solicitudes
          </button>

          <button
            onClick={() => setVista("solicitar")}
            style={vista === "solicitar" ? btnActivo : btn}
          >
            Nueva solicitud
          </button>

          {puedeDatos && (
            <button
              onClick={() => setVista("admin")}
              style={vista === "admin" ? btnAdminActivo : btnAdmin}
            >
              ⚙️ Pendientes
            </button>
          )}
        </div>

        {vista === "historial" && <HistorialEPPS />}
        {vista === "solicitar" && (
          <SolicitarEPPS onCreado={() => setVista("historial")} />
        )}
        {vista === "admin" && puedeDatos && <AdminEPPS />}
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
  background: "linear-gradient(135deg, #8f4f1f 0%, #c77c38 100%)",
  color: "white",
  padding: "18px 20px",
  borderRadius: "16px",
  boxShadow: "0 10px 30px rgba(143,79,31,0.24)"
};

const headerSubtitle = {
  margin: "6px 0 0",
  color: "#fff6eb"
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
  background: "#b9a291",
  color: "white",
  cursor: "pointer"
};

const btnActivo = {
  ...btn,
  background: "#b8682a"
};

const btnAdmin = {
  ...btn,
  background: "#8a5a34",
  fontWeight: "bold"
};

const btnAdminActivo = {
  ...btnAdmin,
  background: "#d18b47",
  color: "white"
};