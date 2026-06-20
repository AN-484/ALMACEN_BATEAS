import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../../components/Layout";
import { LeasingPageLoading } from "../../components/LeasingLoading";
import { apiGet } from "../../services/api";

export default function LeasingInicio() {
  const navigate = useNavigate();
  const [cargando, setCargando] = useState(true);
  const [resumen, setResumen] = useState({ total: 0, ingresos: 0, salidas: 0, otros: 0 });

  const cargarResumen = async () => {
    try {
      setCargando(true);
      const res = await apiGet("/api/leasing/estado/resumen");
      if (res.success) {
        setResumen(res.data || { total: 0, ingresos: 0, salidas: 0, otros: 0 });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarResumen();
  }, []);

  return (
    <Layout>
      <div style={page}>
        <div style={headerCard}>
          <div>
            <h2 style={{ margin: 0 }}>LeaseDesk</h2>
            <p style={{ margin: "6px 0 0", color: "rgba(255,255,255,0.8)" }}>
              Escritorio de Procesos Leasing.
            </p>
          </div>

          <div style={headerBtns}>
            <button onClick={() => navigate("/leasing/movimientos")} style={btnSecondary}>
              🔁 Movimientos
            </button>

            <button onClick={() => navigate("/leasing/historial")} style={btnSecondary}>
              📋 Historial
            </button>
          </div>
        </div>

        {cargando ? <LeasingPageLoading message="Cargando estado general de LeaseDesk..." /> : null}

        {!cargando ? (
          <section style={cardsGrid}>
            <div style={cardAzul}>
              <div style={cardTitulo}>Total materiales</div>
              <div style={cardNumero}>{resumen.total}</div>
              <div style={cardDetalle}>Registros en tabla estado</div>
            </div>

            <div style={cardVerde}>
              <div style={cardTitulo}>Materiales ingresados</div>
              <div style={cardNumero}>{resumen.ingresos}</div>
              <div style={cardDetalle}>Último mov = 101</div>
            </div>

            <div style={cardNaranja}>
              <div style={cardTitulo}>Materiales salidos</div>
              <div style={cardNumero}>{resumen.salidas}</div>
              <div style={cardDetalle}>Último mov = 201</div>
            </div>

            <div style={cardGris}>
              <div style={cardTitulo}>Otros estados</div>
              <div style={cardNumero}>{resumen.otros}</div>
              <div style={cardDetalle}>Mov distinto de 101/201</div>
            </div>
          </section>
        ) : null}
      </div>
    </Layout>
  );
}

const page = { display: "grid", gap: 16 };

const headerCard = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  background: "linear-gradient(135deg, #3b136f 0%, #6d28d9 100%)",
  color: "white",
  padding: "18px 20px",
  borderRadius: 16,
  boxShadow: "0 10px 30px rgba(59,19,111,0.22)",
  flexWrap: "wrap"
};

const headerBtns = { display: "flex", gap: 10, flexWrap: "wrap" };

const btnSecondary = {
  padding: "10px 14px",
  border: "1px solid rgba(255,255,255,0.35)",
  borderRadius: 10,
  background: "rgba(255,255,255,0.12)",
  color: "white",
  cursor: "pointer",
  fontWeight: 700
};

const cardsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12
};

const cardBase = {
  borderRadius: 14,
  padding: "16px",
  boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
  color: "white"
};

const cardAzul = { ...cardBase, background: "linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)" };
const cardVerde = { ...cardBase, background: "linear-gradient(135deg, #22c55e 0%, #15803d 100%)" };
const cardNaranja = { ...cardBase, background: "linear-gradient(135deg, #f59e0b 0%, #b45309 100%)" };
const cardGris = { ...cardBase, background: "linear-gradient(135deg, #64748b 0%, #334155 100%)" };

const cardTitulo = { fontSize: 14, opacity: 0.95 };
const cardNumero = { fontSize: 36, fontWeight: 800, marginTop: 6, lineHeight: 1 };
const cardDetalle = { fontSize: 12, marginTop: 8, opacity: 0.9 };
