import { useEffect, useMemo, useState } from "react";
import { apiGet } from "../../services/api";
import { SccoInlineLoading, SccoPageLoading, SccoSectionLoading } from "../../components/SccoLoading";

const RESUMEN_CONFIG = [
  { key: "total", titulo: "Total Cilindros", color: "#1f7a4d" },
  { key: "stock", titulo: "En Stock", color: "#2f9e63" },
  { key: "vacio", titulo: "Vacíos", color: "#f4b400" },
  { key: "cliente", titulo: "En Cliente", color: "#0097e6" },
  { key: "proveedor", titulo: "En Proveedor", color: "#e84118" },
  { key: "bateas", titulo: "BATEAS", color: "#2d8c5a" },
  { key: "linde", titulo: "LINDE", color: "#477b5c" }
];

export default function CilindrosDashboard() {
  const [data, setData] = useState(null);
  const [estadoRaw, setEstadoRaw] = useState([]);
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [indice, setIndice] = useState(0);

  const cargar = async () => {
    if (cargando) return;

    try {
      setCargando(true);
      const [resumen, estado, productosData] = await Promise.all([
        apiGet("/api/cilindros/dashboard"),
        apiGet("/api/cilindros/estado"),
        apiGet("/api/cilindros/productos")
      ]);

      setData(resumen);
      setEstadoRaw(Array.isArray(estado) ? estado : []);
      setProductos(Array.isArray(productosData) ? productosData : []);
      setIndice(0);
    } catch (error) {
      console.error(error);
      alert("No se pudo cargar dashboard de cilindros");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const materialCards = useMemo(() => {
    const mapaPorCodigo = new Map();

    (productos || []).forEach((p) => {
      mapaPorCodigo.set(String(p.codigo), {
        codigo: p.codigo,
        nombre: p.nombre || p.codigo,
        stock: 0,
        recarga: 0
      });
    });

    (estadoRaw || []).forEach((item) => {
      const codigo = String(item.material || "");
      if (!codigo) return;

      if (!mapaPorCodigo.has(codigo)) {
        mapaPorCodigo.set(codigo, {
          codigo,
          nombre: codigo,
          stock: 0,
          recarga: 0
        });
      }

      const material = mapaPorCodigo.get(codigo);
      if (item.estado === "ST") material.stock += 1;
      if (item.estado === "RE") material.recarga += 1;
    });

    return Array.from(mapaPorCodigo.values())
      .sort((a, b) => String(a.nombre).localeCompare(String(b.nombre)));
  }, [estadoRaw, productos]);

  const cardsPorVista = 3;
  const maxIndice = Math.max(0, materialCards.length - cardsPorVista);
  const cardsVisibles = materialCards.slice(indice, indice + cardsPorVista);

  if (!data) {
    return <SccoSectionLoading message="Cargando dashboard SCCO..." />;
  }

  return (
    <div>
      {cargando ? <SccoPageLoading message="Actualizando dashboard SCCO..." /> : null}

      <div style={headerRow}>
        <h3 style={{ margin: 0 }}>Resumen General</h3>
        <button onClick={cargar} style={btn} disabled={cargando}>
          {cargando ? <SccoInlineLoading message="Actualizando..." /> : "Actualizar"}
        </button>
      </div>

      <div style={gridResumen}>
        {RESUMEN_CONFIG.map((item) => (
          <CardResumen
            key={item.key}
            titulo={item.titulo}
            valor={Number(data[item.key] || 0)}
            color={item.color}
          />
        ))}
      </div>

      <div style={bloqueMateriales}>
        <div style={materialHeader}>
          <h4 style={{ margin: 0 }}>Stock y Recarga por Material</h4>
          <div style={navBtns}>
            <button
              onClick={() => setIndice((v) => Math.max(0, v - 1))}
              style={btnNav}
              disabled={indice === 0 || materialCards.length <= cardsPorVista}
              title="Anterior"
            >
              ◀
            </button>
            <button
              onClick={() => setIndice((v) => Math.min(maxIndice, v + 1))}
              style={btnNav}
              disabled={indice >= maxIndice || materialCards.length <= cardsPorVista}
              title="Siguiente"
            >
              ▶
            </button>
          </div>
        </div>

        {materialCards.length === 0 ? (
          <p style={{ marginTop: "12px" }}>No hay materiales para mostrar.</p>
        ) : (
          <div style={gridMateriales}>
            {cardsVisibles.map((m) => (
              <CardMaterial key={m.codigo} material={m} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CardResumen({ titulo, valor, color }) {
  return (
    <div style={{ ...cardResumen, borderTop: `4px solid ${color}` }}>
      <div style={tituloResumen}>{titulo}</div>
      <div style={{ ...valorResumen, color }}>{valor}</div>
    </div>
  );
}

function CardMaterial({ material }) {
  return (
    <div style={cardMaterial}>
      <div style={materialNombre}>{material.nombre}</div>
      <div style={materialCodigo}>Código: {material.codigo}</div>

      <div style={metricRow}>
        <div style={metricCardStock}>
          <div style={metricLabel}>Stock Actual</div>
          <div style={metricValor}>{material.stock}</div>
        </div>

        <div style={metricCardRecarga}>
          <div style={metricLabel}>En Recarga</div>
          <div style={metricValor}>{material.recarga}</div>
        </div>
      </div>
    </div>
  );
}

const headerRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  flexWrap: "wrap"
};

const gridResumen = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "14px",
  marginTop: "14px"
};

const cardResumen = {
  background: "linear-gradient(180deg, #ffffff 0%, #f8fbf9 100%)",
  padding: "16px",
  borderRadius: "14px",
  boxShadow: "0 10px 28px rgba(15, 60, 40, 0.10)",
  border: "1px solid #d9e8df"
};

const tituloResumen = {
  fontSize: "13px",
  color: "#5b6b63",
  fontWeight: 700,
  marginBottom: "8px"
};

const valorResumen = {
  fontSize: "30px",
  lineHeight: "1",
  fontWeight: 800
};

const bloqueMateriales = {
  marginTop: "24px",
  background: "white",
  border: "1px solid #d9e8df",
  borderRadius: "14px",
  boxShadow: "0 10px 28px rgba(15, 60, 40, 0.08)",
  padding: "16px"
};

const materialHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
  flexWrap: "wrap"
};

const navBtns = {
  display: "flex",
  gap: "8px"
};

const btnNav = {
  border: "1px solid #b8d3c3",
  background: "#f5faf7",
  color: "#215f41",
  borderRadius: "8px",
  width: "36px",
  height: "36px",
  cursor: "pointer",
  fontWeight: 700
};

const gridMateriales = {
  marginTop: "14px",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "12px"
};

const cardMaterial = {
  border: "1px solid #d9e8df",
  borderRadius: "12px",
  padding: "14px",
  background: "linear-gradient(180deg, #ffffff 0%, #f7fbf8 100%)"
};

const materialNombre = {
  fontWeight: 800,
  color: "#174c35"
};

const materialCodigo = {
  marginTop: "2px",
  color: "#6c8175",
  fontSize: "12px"
};

const metricRow = {
  marginTop: "12px",
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "8px"
};

const metricCardBase = {
  borderRadius: "10px",
  padding: "10px",
  textAlign: "center"
};

const metricCardStock = {
  ...metricCardBase,
  background: "#e8f5ef",
  border: "1px solid #bde1cd"
};

const metricCardRecarga = {
  ...metricCardBase,
  background: "#fff2df",
  border: "1px solid #f2d2a1"
};

const metricLabel = {
  fontSize: "12px",
  color: "#56645d",
  fontWeight: 700
};

const metricValor = {
  marginTop: "4px",
  fontSize: "22px",
  fontWeight: 800,
  color: "#1e3d2f"
};

const btn = {
  padding: "10px 14px",
  border: "none",
  borderRadius: "8px",
  background: "#1f7a4d",
  color: "white",
  cursor: "pointer",
  fontWeight: 700
};
