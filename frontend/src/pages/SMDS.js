/*import Layout from "../components/Layout";
import Buscador from "../components/Buscador";

export default function SMDS() {
  return (
    <Layout>
      <h2>Módulo SMDS</h2>
      <Buscador />
    </Layout>
  );
}*/
import { useState } from "react";
import Layout from "../components/Layout";
import Buscador from "../components/Buscador";
import FuncionesMSDS from "./msds/FuncionesMSDS";

export default function SMDS() {
  const [vista, setVista] = useState("buscar");

  const puedeDatos = localStorage.getItem("puede_datos") === "SI";

  return (
    <Layout>
      <h2>Módulo MSDS</h2>

      <div style={tabs}>
        <button
          onClick={() => setVista("buscar")}
          style={vista === "buscar" ? btnActivo : btn}
        >
          Buscar MSDS
        </button>

        {puedeDatos && (
          <button
            onClick={() => setVista("funciones")}
            style={vista === "funciones" ? btnFuncionesActivo : btnFunciones}
          >
            ⚙️ Funciones
          </button>
        )}
      </div>

      {vista === "buscar" && <Buscador />}
      {vista === "funciones" && puedeDatos && <FuncionesMSDS />}
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

const btnFunciones = {
  ...btn,
  background: "#353b48",
  fontWeight: "bold"
};

const btnFuncionesActivo = {
  ...btnFunciones,
  background: "#e1b12c",
  color: "#000"
};