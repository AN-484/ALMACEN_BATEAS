import { useCallback, useState } from "react";
import ScannerQR from "./ScannerQR";
import { apiGet } from "../services/api";

function limpiarSAP(valor) {
  return String(valor || "")
    .replace(/\D/g, "")
    .slice(0, 10);
}

export default function Buscador() {
  const [codigo, setCodigo] = useState("");
  const [resultado, setResultado] = useState(null);
  const [opciones, setOpciones] = useState([]);
  const [activarCamara, setActivarCamara] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const normalizarResultado = (item) => ({
    sap: item.sap,
    nombre: item.nombre,
    descripcion: item.descripcion || "",
    archivo_id: item.archivo_id || item.archivo?.id || "",
    nombre_archivo: item.nombre_archivo || item.archivo?.nombre_archivo || "",
    pdf_url: item.pdf_url || item.archivo?.url_archivo || ""
  });

  const seleccionarResultado = (item) => {
    setResultado(normalizarResultado(item));
    setOpciones([]);
    setMensaje("");
    setActivarCamara(false);
  };

  const buscarProducto = useCallback(async (codigoBuscar) => {
    const sap = limpiarSAP(codigoBuscar);

    setCodigo(sap);
    setResultado(null);
    setOpciones([]);
    setMensaje("");

    // Igual que tu versión antigua: después de recibir código, apaga cámara.
    setActivarCamara(false);

    if (sap.length !== 10) {
      setMensaje("Ingrese un SAP válido de 10 dígitos.");
      return;
    }

    try {
      setCargando(true);

      const data = await apiGet(`/api/msds/buscar?q=${encodeURIComponent(sap)}`);

      const encontrados = Array.isArray(data.data)
        ? data.data.filter((item) => String(item.sap) === sap)
        : [];

      if (encontrados.length === 0) {
        setMensaje("No se encontró una hoja MSDS para este código SAP.");
        return;
      }

      if (encontrados.length === 1) {
        seleccionarResultado(encontrados[0]);
        return;
      }

      setOpciones(encontrados.map(normalizarResultado));
      setMensaje(`Se encontraron ${encontrados.length} registros. Seleccione una opción.`);

    } catch (error) {
      console.error(error);
      setMensaje("No se pudo consultar la hoja MSDS.");
    } finally {
      setCargando(false);
    }
  }, []);

  return (
    <div style={contenedor}>
      <div style={header}>
        <h2 style={{ margin: 0 }}>Buscar Hoja MSDS</h2>
        <p style={{ margin: "6px 0 0", color: "#555" }}>
          Consulta por código SAP o escaneo QR.
        </p>
      </div>

      <div style={panel}>
        <input
          type="text"
          placeholder="Código SAP"
          value={codigo}
          maxLength={10}
          onChange={(e) => setCodigo(limpiarSAP(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              buscarProducto(codigo);
            }
          }}
          style={input}
        />

        <button
          onClick={() => buscarProducto(codigo)}
          disabled={cargando}
          style={cargando ? btnDisabled : btnBuscar}
        >
          {cargando ? "Buscando..." : "Buscar"}
        </button>
      </div>

      <div style={acciones}>
        {!activarCamara ? (
          <button
            onClick={() => {
              setResultado(null);
              setOpciones([]);
              setMensaje("");
              setActivarCamara(true);
            }}
            style={btnCamaraPro}
          >
            <span style={iconoBoton}>📷</span>
            <span>
              <b>Abrir cámara</b>
              <small style={textoBoton}>Escanear código QR</small>
            </span>
          </button>
        ) : (
          <button
            onClick={() => setActivarCamara(false)}
            style={btnCerrarPro}
          >
            <span style={iconoBoton}>⛔</span>
            <span>
              <b>Cerrar cámara</b>
              <small style={textoBoton}>Detener escaneo</small>
            </span>
          </button>
        )}
      </div>

      <ScannerQR
        onScan={buscarProducto}
        activo={activarCamara}
      />

      {mensaje && (
        <div style={mensajeBox}>
          {mensaje}
        </div>
      )}

      {opciones.length > 0 && (
        <div style={opcionesGrid}>
          {opciones.map((item) => (
            <div key={`${item.sap}-${item.archivo_id}`} style={opcionCard}>
              <div>
                <h4 style={{ margin: "0 0 6px" }}>{item.nombre}</h4>
                <p style={textoPequeno}>SAP: {item.sap}</p>
                <p style={textoPequeno}>
                  Archivo: {item.nombre_archivo || "PDF MSDS"}
                </p>
              </div>

              <button
                onClick={() => seleccionarResultado(item)}
                style={btnVer}
              >
                Ver PDF
              </button>
            </div>
          ))}
        </div>
      )}

      {resultado && (
        <div style={resultadoCard}>
          <div style={resultadoHeader}>
            <div>
              <span style={badge}>MSDS ENCONTRADO</span>
              <h3 style={{ margin: "8px 0" }}>{resultado.nombre}</h3>
              <p style={textoPequeno}>
                <b>SAP:</b> {resultado.sap}
              </p>
              <p style={textoPequeno}>
                <b>Archivo:</b> {resultado.nombre_archivo || "PDF"}
              </p>
            </div>

            {resultado.pdf_url && (
              <a
                href={resultado.pdf_url}
                target="_blank"
                rel="noreferrer"
                style={btnAbrir}
              >
                Abrir PDF
              </a>
            )}
          </div>

          <iframe
            src={resultado.pdf_url}
            width="100%"
            height="650px"
            title="MSDS"
            style={iframe}
          ></iframe>
        </div>
      )}
    </div>
  );
}

const contenedor = {
  padding: "20px"
};

const header = {
  background: "white",
  padding: "18px",
  borderRadius: "14px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  marginBottom: "15px"
};

const panel = {
  background: "white",
  padding: "18px",
  borderRadius: "14px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  marginBottom: "15px"
};

const input = {
  flex: 1,
  minWidth: "240px",
  padding: "12px",
  borderRadius: "8px",
  border: "1px solid #ccc",
  fontSize: "16px"
};

const btnBuscar = {
  padding: "12px 18px",
  border: "none",
  borderRadius: "8px",
  background: "#273c75",
  color: "white",
  cursor: "pointer",
  fontWeight: "bold"
};

const btnDisabled = {
  ...btnBuscar,
  background: "#718093",
  cursor: "not-allowed"
};

const btnCamara = {
  ...btnBuscar,
  background: "#40739e"
};

const btnCerrar = {
  ...btnBuscar,
  background: "#e84118"
};

const mensajeBox = {
  background: "#fff8d6",
  border: "1px solid #fbc531",
  color: "#6b5200",
  padding: "12px",
  borderRadius: "10px",
  marginTop: "15px",
  fontWeight: "bold"
};

const opcionesGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "12px",
  marginTop: "15px"
};

const opcionCard = {
  background: "white",
  padding: "15px",
  borderRadius: "12px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px"
};

const textoPequeno = {
  margin: "4px 0",
  color: "#555",
  fontSize: "14px"
};

const btnVer = {
  ...btnBuscar,
  background: "#44bd32",
  whiteSpace: "nowrap"
};

const resultadoCard = {
  background: "white",
  padding: "18px",
  borderRadius: "14px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  marginTop: "20px"
};

const resultadoHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "start",
  gap: "15px",
  flexWrap: "wrap",
  marginBottom: "15px"
};

const badge = {
  background: "#eafaf1",
  color: "#218c4f",
  padding: "5px 9px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: "bold"
};

const btnAbrir = {
  background: "#273c75",
  color: "white",
  padding: "10px 14px",
  borderRadius: "8px",
  textDecoration: "none",
  fontWeight: "bold"
};

const iframe = {
  border: "1px solid #ccc",
  borderRadius: "12px",
  background: "white"
};


const acciones = {
  display: "flex",
  gap: "12px",
  marginBottom: "18px",
  flexWrap: "wrap"
};

const btnCamaraPro = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "13px 18px",
  border: "none",
  borderRadius: "14px",
  background: "linear-gradient(135deg, #40739e, #27752b)",
  color: "white",
  cursor: "pointer",
  fontWeight: "bold",
  boxShadow: "0 6px 16px rgba(39,60,117,0.25)",
  transition: "transform 0.15s ease, box-shadow 0.15s ease"
};

const btnCerrarPro = {
  ...btnCamaraPro,
  background: "linear-gradient(135deg, #272424, #c23616)",
  boxShadow: "0 6px 16px rgba(232,65,24,0.25)"
};

const iconoBoton = {
  width: "42px",
  height: "42px",
  borderRadius: "12px",
  background: "rgba(255,255,255,0.18)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "22px"
};

const textoBoton = {
  display: "block",
  fontSize: "12px",
  fontWeight: "normal",
  opacity: 0.85,
  marginTop: "2px"
};