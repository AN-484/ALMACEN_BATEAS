import { useEffect, useState } from "react";
import { apiGet } from "../../../services/api";
import ScannerEPPQR from "./ScannerEPPQR";
import { limpiarSAP, formatearSAPVisual, mayus } from "../utils/sap";

export default function BuscarEPP({ onAgregar = () => {} }) {
  const [q, setQ] = useState("");
  const [resultados, setResultados] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [camara, setCamara] = useState(false);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    const texto = String(q || "").trim();

    if (texto.length < 2) {
        setResultados([]);
        setMensaje("");
        return;
    }

    const timer = setTimeout(() => {
        buscar(texto);
    }, 350);

    return () => clearTimeout(timer);
    }, [q]);

  const buscar = async (textoBuscar = q) => {
    try {
      const texto = String(textoBuscar || "").trim();

      if (!texto) {
        alert("Ingrese SAP o descripción del EPP");
        return;
      }

      setCargando(true);
      setMensaje("");
      setResultados([]);

      const res = await apiGet(`/api/epps/catalogo?q=${encodeURIComponent(texto)}`);

      if (res.success) {
        setResultados(res.data || []);

        if (!res.data || res.data.length === 0) {
          setMensaje("No se encontraron EPPS.");
        }
      }
    } catch (error) {
      console.error(error);
      alert("No se pudo buscar EPPS");
    } finally {
      setCargando(false);
    }
  };

  const buscarPorQR = async (sap) => {
    try {
      setCamara(false);

      const codigo = limpiarSAP(sap);

      if (codigo.length !== 10) {
        alert("El QR no contiene un SAP válido de 10 dígitos");
        return;
      }

      setQ(codigo);
      setCargando(true);
      setMensaje("");
      setResultados([]);

      const res = await apiGet(`/api/epps/catalogo/sap/${codigo}`);

      if (res.success && res.data) {
        onAgregar(res.data);

        setQ("");
        setResultados([]);
        setMensaje(`EPP agregado: ${res.data.descripcion}`);
        }
    } catch (error) {
      console.error(error);
      alert("No se encontró el EPP del QR");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={card}>
      <div style={header}>
        <div>
          <h3 style={{ margin: 0 }}>Buscar EPP</h3>
          <p style={subtitulo}>Busque por descripción, SAP o escanee el QR.</p>
        </div>

        {!camara ? (
          <button
            onClick={() => setCamara(true)}
            style={btnCamara}
          >
            <span style={icono}>📷</span>
            Escanear QR
          </button>
        ) : (
          <button
            onClick={() => setCamara(false)}
            style={btnCerrar}
          >
            <span style={icono}>⛔</span>
            Cerrar cámara
          </button>
        )}
      </div>

      <div style={busqueda}>
        <input
          value={q}
          onChange={(e) => setQ(mayus(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === "Enter") buscar();
          }}
          placeholder="Buscar por SAP o descripción"
          style={input}
        />

        <button
          onClick={() => buscar()}
          disabled={cargando}
          style={cargando ? btnDisabled : btnBuscar}
        >
          {cargando ? "Buscando..." : "Buscar"}
        </button>
      </div>

      <ScannerEPPQR activo={camara} onScan={buscarPorQR} />

      {mensaje && (
        <div style={mensajeBox}>
          {mensaje}
        </div>
      )}

      {resultados.length > 0 && (
        <div style={grid}>
          {resultados.map((epp) => (
            <div key={epp.id_epp} style={itemCard}>
  <div>
    <h4 style={{ margin: "0 0 6px" }}>{epp.descripcion}</h4>
    <p style={meta}>
      SAP: {epp.sap_visual || formatearSAPVisual(epp.sap)}
    </p>
    <p style={meta}>Unidad: {epp.unidad}</p>
        </div>

        <button
            onClick={() => {
            if (typeof onAgregar !== "function") {
                alert("No se configuró la función para agregar EPP");
                return;
            }

            onAgregar(epp);

            // Limpiar búsqueda y resultados después de agregar
            setQ("");
            setResultados([]);
            setMensaje("");
            }}
            style={btnAgregar}
        >
            + Agregar
        </button>
        </div>
          ))}
        </div>
      )}
    </div>
  );
}

const card = {
  background: "#c5e8d4",
  padding: "18px",
  borderRadius: "14px",
  boxShadow: "0 0 10px rgba(0,0,0,0.1)",
  marginBottom: "20px"
};

const header = {
  display: "flex",
  justifyContent: "space-between",
  gap: "15px",
  alignItems: "center",
  flexWrap: "wrap",
  marginBottom: "15px"
};

const subtitulo = {
  margin: "6px 0 0",
  color: "#666"
};

const busqueda = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap"
};

const input = {
  flex: 1,
  minWidth: "240px",
  padding: "11px",
  borderRadius: "8px",
  border: "1px solid #ccc"
};

const btnBase = {
  padding: "11px 15px",
  border: "none",
  borderRadius: "8px",
  color: "white",
  cursor: "pointer",
  fontWeight: "bold"
};

const btnBuscar = {
  ...btnBase,
  background: "#b8682a"
};

const btnDisabled = {
  ...btnBuscar,
  background: "#b9a291",
  cursor: "not-allowed"
};

const btnCamara = {
  ...btnBase,
  background: "linear-gradient(135deg, #c67a36, #9a7f36)",
  display: "flex",
  alignItems: "center",
  gap: "8px"
};

const btnCerrar = {
  ...btnCamara,
  background: "linear-gradient(135deg, #272424, #c23616)",
};

const icono = {
  fontSize: "18px"
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "12px",
  marginTop: "15px"
};

const itemCard = {
  border: "1px solid #eee",
  borderRadius: "12px",
  padding: "14px",
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  alignItems: "center"
};

const meta = {
  margin: "3px 0",
  color: "#666",
  fontSize: "13px"
};

const btnAgregar = {
  ...btnBase,
  background: "#44bd32",
  whiteSpace: "nowrap"
};

const mensajeBox = {
  marginTop: "12px",
  padding: "10px",
  background: "#fff8d6",
  border: "1px solid #fbc531",
  borderRadius: "8px",
  fontWeight: "bold"
};