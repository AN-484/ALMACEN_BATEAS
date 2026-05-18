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
      <h2>🦺 Módulo EPPS</h2>

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

const btnAdmin = {
  ...btn,
  background: "#353b48",
  fontWeight: "bold"
};

const btnAdminActivo = {
  ...btnAdmin,
  background: "#e1b12c",
  color: "#000"
};