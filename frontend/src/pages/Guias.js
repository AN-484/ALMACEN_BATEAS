import { useState } from "react";
import Layout from "../components/Layout";

import HistorialGuias from "./guias/HistorialGuias";
import SubirGuia from "./guias/SubirGuia";
import DirectoriosGuias from "./guias/DirectoriosGuias";
import ProveedoresGuias from "./guias/ProveedoresGuias";

export default function Guias() {
  const [vista, setVista] = useState("historial");
  const puedeDatos = localStorage.getItem("puede_datos") === "SI";

  return (
    <Layout>
      <h2>📦 Guías / Facturas</h2>

      <div style={tabs}>
        <button
          onClick={() => setVista("historial")}
          style={vista === "historial" ? btnActivo : btn}
        >
          Historial
        </button>

        <button
          onClick={() => setVista("subir")}
          style={vista === "subir" ? btnActivo : btn}
        >
          Subir documento
        </button>

        {puedeDatos && (
          <>
            <button
              onClick={() => setVista("directorios")}
              style={vista === "directorios" ? btnAdminActivo : btnAdmin}
            >
              Directorios
            </button>

            <button
              onClick={() => setVista("proveedores")}
              style={vista === "proveedores" ? btnAdminActivo : btnAdmin}
            >
              Proveedores
            </button>
          </>
        )}
      </div>

      {vista === "historial" && <HistorialGuias />}
      {vista === "subir" && <SubirGuia onRegistrado={() => setVista("historial")} />}
      {vista === "directorios" && puedeDatos && <DirectoriosGuias />}
      {vista === "proveedores" && puedeDatos && <ProveedoresGuias />}
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
  borderRadius: "8px",
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