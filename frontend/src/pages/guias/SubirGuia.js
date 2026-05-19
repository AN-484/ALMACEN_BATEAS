import { useEffect, useState } from "react";
import { apiGet } from "../../services/api";
import { limpiarRuc, mayus } from "./utils/formatear";
import ScannerGuiaQR from "./components/ScannerGuiaQR";
import { parsearQRGuia } from "./utils/qrGuiaParser";
import EscanearEncabezadoOCR from "./components/EscanearEncabezadoOCR";
import EscanearDocumentoPDF from "./components/EscanearDocumentoPDF";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

export default function SubirGuia({ onRegistrado }) {
  const [tipos, setTipos] = useState([]);
  const [directorios, setDirectorios] = useState([]);
  const [proveedores, setProveedores] = useState([]);

  const [idTipo, setIdTipo] = useState("G1");
  const [idDirectorio, setIdDirectorio] = useState("");
  const [rucProveedor, setRucProveedor] = useState("");
  const [nombreProveedor, setNombreProveedor] = useState("");

  const [numeroGuiaFactura, setNumeroGuiaFactura] = useState("");
  const [numeroDocumento, setNumeroDocumento] = useState("");
  const [ordenCompraServicio, setOrdenCompraServicio] = useState("");
  const [archivo, setArchivo] = useState(null);

  const [cargando, setCargando] = useState(false);
  const [buscandoProveedor, setBuscandoProveedor] = useState(false);

  const [camaraQR, setCamaraQR] = useState(false);
  const [mensajeQR, setMensajeQR] = useState("");

  function solo10Digitos(valor) {
    return String(valor || "")
        .replace(/\D/g, "")
        .slice(0, 10);
    }

  const cargarCatalogos = async () => {
    try {
      const [resTipos, resDirectorios] = await Promise.all([
        apiGet("/api/guias/tipos"),
        apiGet("/api/guias/directorios")
      ]);

      if (resTipos.success) setTipos(resTipos.data || []);
      if (resDirectorios.success) {
        setDirectorios(resDirectorios.data || []);
        if ((resDirectorios.data || []).length > 0) {
          setIdDirectorio(resDirectorios.data[0].id_directorio);
        }
      }
    } catch (error) {
      console.error(error);
      alert("No se pudieron cargar catálogos");
    }
  };

  const buscarProveedor = async (valor) => {
    try {
      const texto = String(valor || "").trim();

      if (texto.length < 2) {
        setProveedores([]);
        return;
      }

      setBuscandoProveedor(true);

      const res = await apiGet(`/api/guias/proveedores?q=${encodeURIComponent(texto)}`);

      if (res.success) {
        setProveedores(res.data || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setBuscandoProveedor(false);
    }
  };

  const seleccionarProveedor = (p) => {
    setRucProveedor(p.ruc);
    setNombreProveedor(p.nombre);
    setProveedores([]);
  };


  const guardar = async () => {
    try {
      if (!idTipo || !idDirectorio || !rucProveedor || !numeroGuiaFactura || !archivo) {
        alert("Complete los campos obligatorios y adjunte el PDF");
        return;
      }

      if (rucProveedor.length !== 11) {
        alert("El RUC debe tener 11 dígitos");
        return;
      }

      if (numeroDocumento && numeroDocumento.length !== 10) {
        alert("El N° de documento debe tener 10 dígitos");
        return;
        }
        if (!nombreProveedor.trim()) {
        alert("Ingrese el nombre del proveedor");
        return;
        }

    if (ordenCompraServicio && ordenCompraServicio.length !== 10) {
        alert("La OC/OS debe tener 10 dígitos");
        return;
        }

      const formData = new FormData();
      formData.append("id_tipo", idTipo);
      formData.append("id_directorio", idDirectorio);
      formData.append("ruc_proveedor", rucProveedor);
      formData.append("nombre_proveedor", nombreProveedor);
      formData.append("numero_guia_factura", numeroGuiaFactura);
      formData.append("numero_documento", numeroDocumento);
      formData.append("orden_compra_servicio", ordenCompraServicio);
      formData.append("archivo", archivo);

      setCargando(true);

      const res = await fetch(`${API_URL}/api/guias/documentos`, {
        method: "POST",
        headers: {
          "x-user-nombre": localStorage.getItem("nombre") || "",
          "x-user-codigo": localStorage.getItem("codigo") || ""
        },
        body: formData
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "No se pudo registrar documento");
      }

      alert(`Documento registrado: ${data.data.id_documento}`);

      setNumeroGuiaFactura("");
      setNumeroDocumento("");
      setOrdenCompraServicio("");
      setArchivo(null);

      const inputArchivo = document.getElementById("archivo-guia");
      if (inputArchivo) inputArchivo.value = "";

      if (onRegistrado) onRegistrado();
    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      setCargando(false);
    }
  };

  const procesarDatosOCR = async (datos) => {
    try {
        if (datos.ruc) {
        setRucProveedor(datos.ruc);

        try {
            const res = await apiGet(`/api/guias/proveedores?q=${encodeURIComponent(datos.ruc)}`);

            if (res.success && res.data && res.data.length > 0) {
            const proveedor = res.data[0];
            setNombreProveedor(proveedor.nombre);
            } else {
            setNombreProveedor("");
            }
        } catch {
            // Si no encuentra proveedor, el usuario lo completa manualmente.
        }
        }

        if (datos.numero_guia_factura) {
        setNumeroGuiaFactura(datos.numero_guia_factura);
        }

        alert("Datos detectados desde el encabezado. Revise antes de guardar.");
    } catch (error) {
        console.error(error);
        alert("No se pudieron aplicar los datos detectados");
    }
    };

  const procesarQR = async (textoQR) => {
    try {
        setCamaraQR(false);

        const datos = parsearQRGuia(textoQR);

        console.log("QR leído:", textoQR);
        console.log("Datos detectados:", datos);

        if (!datos.detectado) {
        setMensajeQR("No se pudo detectar información útil del QR. Complete manualmente.");
        return;
        }

        if (datos.ruc) {
        setRucProveedor(datos.ruc);

        try {
            const res = await apiGet(`/api/guias/proveedores?q=${encodeURIComponent(datos.ruc)}`);

            if (res.success && res.data && res.data.length > 0) {
            const proveedor = res.data[0];
            setNombreProveedor(proveedor.nombre);
            setMensajeQR(`QR leído. RUC detectado y proveedor encontrado: ${proveedor.nombre}`);
            } else {
            setNombreProveedor("");
            setMensajeQR("QR leído. RUC detectado, pero proveedor no registrado. Ingrese el nombre.");
            }
        } catch {
            setMensajeQR("QR leído. RUC detectado, pero no se pudo buscar proveedor.");
        }
        }

        if (datos.numero_guia_factura) {
        setNumeroGuiaFactura(datos.numero_guia_factura);
        }

        if (!datos.ruc && datos.numero_guia_factura) {
        setMensajeQR("QR leído. Se detectó número de guía/factura. Complete RUC manualmente.");
        }

    } catch (error) {
        console.error(error);
        setMensajeQR("Error al procesar el QR. Complete manualmente.");
    }
    };

  useEffect(() => {
    cargarCatalogos();
  }, []);

  return (
    <div style={card}>
      <h3>Subir guía / factura</h3>

      <div style={qrBox}>
        {!camaraQR ? (
            <button
            onClick={() => {
                setMensajeQR("");
                setCamaraQR(true);
            }}
            style={btnQR}
            >
            📷 Escanear QR para autocompletar
            </button>
        ) : (
            <button
            onClick={() => setCamaraQR(false)}
            style={btnCerrarQR}
            >
            ⛔ Cerrar cámara QR
            </button>
        )}

        <p style={qrHint}>
            El QR intentará completar RUC proveedor y N° guía/factura. El tipo de documento se selecciona manualmente.
        </p>
        </div>

        <ScannerGuiaQR activo={camaraQR} onScan={procesarQR} />

        {mensajeQR && (
        <div style={mensajeQRStyle}>
            {mensajeQR}
        </div>
        )}

        <EscanearEncabezadoOCR onDetectar={procesarDatosOCR} />

      <div style={grid}>
        <Campo label="Tipo documento">
          <select
            value={idTipo}
            onChange={(e) => setIdTipo(e.target.value)}
            style={input}
          >
            {tipos.map(t => (
              <option key={t.id_tipo} value={t.id_tipo}>
                {t.descripcion}
              </option>
            ))}
          </select>
        </Campo>

        <Campo label="Directorio">
          <select
            value={idDirectorio}
            onChange={(e) => setIdDirectorio(e.target.value)}
            style={input}
          >
            {directorios.map(d => (
              <option key={d.id_directorio} value={d.id_directorio}>
                {d.id_directorio} - {d.nombre}
              </option>
            ))}
          </select>
        </Campo>

        <Campo label="RUC proveedor">
          <input
            value={rucProveedor}
            maxLength={11}
            onChange={(e) => {
              const ruc = limpiarRuc(e.target.value);
              setRucProveedor(ruc);
              buscarProveedor(ruc);
            }}
            style={input}
            placeholder="RUC de 11 dígitos"
          />
        </Campo>

        <Campo label="Nombre proveedor">
          <input
            value={nombreProveedor}
            onChange={(e) => {
              const texto = mayus(e.target.value);
              setNombreProveedor(texto);
              buscarProveedor(texto);
            }}
            style={input}
            placeholder="Buscar o ingresar proveedor"
          />
        </Campo>
      </div>

      {buscandoProveedor && <p>Buscando proveedor...</p>}

      {proveedores.length > 0 && (
        <div style={proveedoresBox}>
          {proveedores.map(p => (
            <button
              key={p.ruc}
              onClick={() => seleccionarProveedor(p)}
              style={proveedorBtn}
            >
              <b>{p.ruc}</b> - {p.nombre}
            </button>
          ))}
        </div>
      )}

      <div style={avisoProveedor}>
        Si el proveedor no existe, se registrará automáticamente al guardar el documento.
        Si el RUC ya existe y el nombre cambió, se actualizará automáticamente.
        </div>

      <div style={grid}>
        <Campo label="N° guía / factura">
          <input
            value={numeroGuiaFactura}
            onChange={(e) => setNumeroGuiaFactura(mayus(e.target.value))}
            style={input}
            placeholder="Ejemplo: T001-000123"
          />
        </Campo>

        <Campo label="N° documento">
            <input
                value={numeroDocumento}
                maxLength={10}
                onChange={(e) => setNumeroDocumento(solo10Digitos(e.target.value))}
                style={input}
                placeholder="10 dígitos"
            />
        </Campo>

        <Campo label="Orden de compra / servicio">
          <input
            value={ordenCompraServicio}
            maxLength={10}
            onChange={(e) => setOrdenCompraServicio(solo10Digitos(e.target.value))}
            style={input}
            placeholder="10 dígitos"
            />
        </Campo>

        <Campo label="Archivo PDF">
            <input
                id="archivo-guia"
                type="file"
                accept="application/pdf"
                onChange={(e) => setArchivo(e.target.files[0])}
                style={input}
            />

            {archivo && (
                <div style={archivoSeleccionado}>
                Archivo seleccionado: <b>{archivo.name}</b>
                </div>
            )}
        </Campo>
      </div>

      <EscanearDocumentoPDF
        onPDFGenerado={(file) => {
            setArchivo(file);

            const inputArchivo = document.getElementById("archivo-guia");
            if (inputArchivo) inputArchivo.value = "";

            alert("PDF generado desde cámara y listo para guardar.");
        }}
        />

      <button
        onClick={guardar}
        disabled={cargando}
        style={cargando ? btnDisabled : btnGuardar}
      >
        {cargando ? "Guardando..." : "Guardar documento"}
      </button>
    </div>
  );
}

function Campo({ label, children }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

const card = {
  background: "white",
  padding: "20px",
  borderRadius: "14px",
  boxShadow: "0 0 10px rgba(0,0,0,0.1)"
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "15px",
  marginTop: "15px"
};

const labelStyle = {
  display: "block",
  marginBottom: "5px",
  fontWeight: "bold"
};

const input = {
  width: "100%",
  padding: "10px",
  borderRadius: "8px",
  border: "1px solid #ccc",
  boxSizing: "border-box"
};

const proveedoresBox = {
  display: "grid",
  gap: "8px",
  marginTop: "12px",
  marginBottom: "12px"
};

const proveedorBtn = {
  padding: "10px",
  border: "1px solid #ddd",
  borderRadius: "8px",
  background: "#f5f6fa",
  textAlign: "left",
  cursor: "pointer"
};

const btnGuardar = {
  marginTop: "20px",
  padding: "11px 16px",
  border: "none",
  borderRadius: "8px",
  background: "#273c75",
  color: "white",
  cursor: "pointer",
  fontWeight: "bold"
};

const btnDisabled = {
  ...btnGuardar,
  background: "#718093",
  cursor: "not-allowed"
};


const avisoProveedor = {
  marginTop: "12px",
  padding: "10px",
  background: "#fff8d6",
  border: "1px solid #fbc531",
  borderRadius: "8px",
  color: "#6b5200",
  fontWeight: "bold",
  fontSize: "13px"
};

const qrBox = {
  marginTop: "10px",
  marginBottom: "15px",
  padding: "12px",
  background: "#f5f6fa",
  border: "1px solid #dcdde1",
  borderRadius: "12px"
};

const btnQR = {
  padding: "11px 16px",
  border: "none",
  borderRadius: "10px",
  background: "#40739e",
  color: "white",
  cursor: "pointer",
  fontWeight: "bold"
};

const btnCerrarQR = {
  ...btnQR,
  background: "#e84118"
};

const qrHint = {
  margin: "8px 0 0",
  color: "#666",
  fontSize: "13px"
};

const mensajeQRStyle = {
  marginTop: "12px",
  padding: "10px",
  background: "#fff8d6",
  border: "1px solid #fbc531",
  borderRadius: "8px",
  color: "#6b5200",
  fontWeight: "bold"
};

const archivoSeleccionado = {
  marginTop: "8px",
  padding: "8px",
  background: "#eafaf1",
  border: "1px solid #44bd32",
  borderRadius: "8px",
  color: "#218c4f",
  fontSize: "13px"
};