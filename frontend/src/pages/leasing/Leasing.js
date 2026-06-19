import { useNavigate } from "react-router-dom";
import Layout from "../../components/Layout";

export default function Leasing() {
  const navigate = useNavigate();

  return (
    <Layout>
      <div>
        <h2>LeaseDesk: Escritorio de Leasing</h2>
        <p>Seleccione el tipo de operación:</p>

        <div style={{ display: "flex", gap: 16, marginTop: 20 }}>
          <button onClick={() => navigate("/leasing/ingresos")} style={btn}>
            Ingresos
          </button>

          <button onClick={() => navigate("/leasing/salidas")} style={btn}>
            Salidas
          </button>

          <button onClick={() => navigate("/leasing/modificaciones")} style={btn}>
            Modificaciones
          </button>
        </div>
      </div>
    </Layout>
  );
}

const btn = {
  padding: "10px 18px",
  border: "none",
  borderRadius: 8,
  background: "#273c75",
  color: "white",
  cursor: "pointer"
};
