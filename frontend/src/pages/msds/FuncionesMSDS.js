import { useState } from "react";
import { apiGet } from "../../services/api";

const API_URL =
  process.env.REACT_APP_API_URL || "http://localhost:3001";

function soloSAP10(valor) {
  return String(valor || "")
    .replace(/\D/g, "")
    .slice(0, 10);
}

function mayus(valor) {
  return String(valor || "").toUpperCase();
}

export default function FuncionesMSDS() {
  const [accion, setAccion] = useState("agregar");

  return (
    <div style={card}>
      <h3>⚙️ Funciones MSDS</h3>

      <div style={tabs}>
        <button
          onClick={() => setAccion("agregar")}
          style={accion === "agregar" ? btnActivo : btn}
        >
          ➕ Agregar
        </button>

        <button
          onClick={() => setAccion("actualizar")}
          style={accion === "actualizar" ? btnActivo : btn}
        >
          ✏️ Actualizar
        </button>

        <button
          onClick={() => setAccion("eliminar")}
          style={accion === "eliminar" ? btnPeligroActivo : btnPeligro}
        >
          🗑️ Eliminar
        </button>
      </div>

      {accion === "agregar" && <AgregarMSDS />}
      {accion === "actualizar" && <ActualizarMSDS />}
      {accion === "eliminar" && <EliminarMSDS />}
    </div>
  );
}

function AgregarMSDS() {
  const [sap, setSap] = useState("");
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [modoArchivo, setModoArchivo] = useState("NUEVO");
  const [sapReferencia, setSapReferencia] = useState("");
  const [archivo, setArchivo] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [bloqueadoExiste, setBloqueadoExiste] = useState(false);

  const limpiar = () => {
    setSap("");
    setNombre("");
    setDescripcion("");
    setModoArchivo("NUEVO");
    setSapReferencia("");
    setArchivo(null);
    setBloqueadoExiste(false);

    const input = document.getElementById("archivo-agregar-msds");
    if (input) input.value = "";
  };

  const verificarSAP = async (sapValor) => {
    try {
      if (sapValor.length !== 10) {
        setBloqueadoExiste(false);
        return;
      }

      const data = await apiGet(`/api/msds/${sapValor}`);

      if (data.success) {
        setBloqueadoExiste(true);
        alert("Este SAP ya existe. No se puede agregar. Use Actualizar.");
      }
    } catch {
      setBloqueadoExiste(false);
    }
  };

  const guardar = async () => {
    try {
      if (bloqueadoExiste) {
        alert("Este SAP ya existe. Use Actualizar.");
        return;
      }

      if (sap.length !== 10) {
        alert("El SAP debe tener exactamente 10 dígitos");
        return;
      }

      if (!nombre.trim()) {
        alert("Ingrese nombre visible");
        return;
      }

      if (modoArchivo === "NUEVO" && !archivo) {
        alert("Seleccione archivo PDF");
        return;
      }

      if (modoArchivo === "REFERENCIA" && sapReferencia.length !== 10) {
        alert("Ingrese SAP de referencia de 10 dígitos");
        return;
      }

      if (modoArchivo === "REFERENCIA" && sapReferencia === sap) {
        alert("No puede referenciarse a sí mismo");
        return;
      }

      const formData = new FormData();
      formData.append("sap", sap);
      formData.append("nombre", nombre);
      formData.append("descripcion", descripcion);
      formData.append("modo_archivo", modoArchivo);
      formData.append("sap_referencia", sapReferencia);

      if (modoArchivo === "NUEVO" && archivo) {
        formData.append("archivo", archivo);
      }

      setCargando(true);

      const res = await fetch(`${API_URL}/api/msds`, {
        method: "POST",
        headers: {
          "x-user-nombre": localStorage.getItem("nombre") || "",
          "x-user-codigo": localStorage.getItem("codigo") || ""
        },
        body: formData
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "No se pudo registrar MSDS");
      }

      alert("MSDS registrado correctamente");
      limpiar();
    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div>
      <h4>Agregar nuevo MSDS</h4>

      <FormularioBase
        sap={sap}
        setSap={(valor) => {
          const limpio = soloSAP10(valor);
          setSap(limpio);
          verificarSAP(limpio);
        }}
        nombre={nombre}
        setNombre={setNombre}
        descripcion={descripcion}
        setDescripcion={setDescripcion}
        modoArchivo={modoArchivo}
        setModoArchivo={setModoArchivo}
        sapReferencia={sapReferencia}
        setSapReferencia={setSapReferencia}
        archivoId="archivo-agregar-msds"
        setArchivo={setArchivo}
        mostrarMantener={false}
        bloquearSAP={false}
        bloqueadoExiste={bloqueadoExiste}
      />

      {bloqueadoExiste && (
        <div style={alerta}>
          Este SAP ya existe. No se puede agregar. Use la opción Actualizar.
        </div>
      )}

      <div style={acciones}>
        <button
          onClick={guardar}
          disabled={cargando || bloqueadoExiste}
          style={cargando || bloqueadoExiste ? btnDisabled : btnGuardar}
        >
          {cargando ? "Guardando..." : "Guardar"}
        </button>

        <button onClick={limpiar} style={btnLimpiar}>
          Limpiar
        </button>
      </div>
    </div>
  );
}

function ActualizarMSDS() {
  const [sap, setSap] = useState("");
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [modoArchivo, setModoArchivo] = useState("MANTENER");
  const [sapReferencia, setSapReferencia] = useState("");
  const [archivo, setArchivo] = useState(null);
  const [pdfActual, setPdfActual] = useState("");
  const [referenciasArchivo, setReferenciasArchivo] = useState(0);
  const [cargando, setCargando] = useState(false);
  const [encontrado, setEncontrado] = useState(false);

  const buscar = async () => {
    try {
      if (sap.length !== 10) {
        alert("El SAP debe tener exactamente 10 dígitos");
        return;
      }

      setCargando(true);

      const data = await apiGet(`/api/msds/${sap}`);

      if (data.success) {
        setNombre(data.producto.nombre || "");
        setDescripcion(data.producto.descripcion || "");
        setPdfActual(data.producto.pdf_url || "");
        setReferenciasArchivo(data.producto.referencias_archivo || 0);
        setModoArchivo("MANTENER");
        setSapReferencia("");
        setArchivo(null);
        setEncontrado(true);

        const input = document.getElementById("archivo-actualizar-msds");
        if (input) input.value = "";
      }
    } catch (error) {
      console.error(error);
      alert("No se encontró MSDS con ese SAP");
      setEncontrado(false);
      setNombre("");
      setDescripcion("");
      setPdfActual("");
      setReferenciasArchivo(0);
    } finally {
      setCargando(false);
    }
  };

  const actualizar = async () => {
    try {
      if (sap.length !== 10) {
        alert("El SAP debe tener exactamente 10 dígitos");
        return;
      }

      if (!nombre.trim()) {
        alert("Ingrese nombre visible");
        return;
      }

      if (modoArchivo === "NUEVO" && !archivo) {
        alert("Seleccione nuevo PDF");
        return;
      }

      if (modoArchivo === "REFERENCIA" && sapReferencia.length !== 10) {
        alert("Ingrese SAP de referencia de 10 dígitos");
        return;
      }

      if (modoArchivo === "REFERENCIA" && sapReferencia === sap) {
        alert("No puede referenciarse a sí mismo");
        return;
      }

      const formData = new FormData();
      formData.append("nombre", nombre);
      formData.append("descripcion", descripcion);
      formData.append("modo_archivo", modoArchivo);
      formData.append("sap_referencia", sapReferencia);

      if (modoArchivo === "NUEVO" && archivo) {
        formData.append("archivo", archivo);
      }

      setCargando(true);

      const res = await fetch(`${API_URL}/api/msds/${sap}`, {
        method: "PUT",
        headers: {
          "x-user-nombre": localStorage.getItem("nombre") || "",
          "x-user-codigo": localStorage.getItem("codigo") || ""
        },
        body: formData
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "No se pudo actualizar MSDS");
      }

      alert("MSDS actualizado correctamente");
      buscar();
    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div>
      <h4>Actualizar MSDS</h4>

      <div style={busquedaBox}>
        <input
          value={sap}
          maxLength={10}
          onChange={(e) => {
            setSap(soloSAP10(e.target.value));
            setEncontrado(false);
          }}
          placeholder="SAP de 10 dígitos"
          style={input}
        />

        <button onClick={buscar} disabled={cargando} style={btnBuscar}>
          Buscar
        </button>
      </div>

      {encontrado && (
        <>
          <FormularioBase
            sap={sap}
            setSap={setSap}
            nombre={nombre}
            setNombre={setNombre}
            descripcion={descripcion}
            setDescripcion={setDescripcion}
            modoArchivo={modoArchivo}
            setModoArchivo={setModoArchivo}
            sapReferencia={sapReferencia}
            setSapReferencia={setSapReferencia}
            archivoId="archivo-actualizar-msds"
            setArchivo={setArchivo}
            mostrarMantener={true}
            bloquearSAP={true}
          />

          {pdfActual && (
            <div style={textoInfo}>
              <p>
                PDF actual:{" "}
                <a href={pdfActual} target="_blank" rel="noreferrer">
                  Ver archivo
                </a>
              </p>

              <p>
                Este archivo está referenciado por{" "}
                <b>{referenciasArchivo}</b> SAP.
              </p>
            </div>
          )}

          <div style={acciones}>
            <button
              onClick={actualizar}
              disabled={cargando}
              style={cargando ? btnDisabled : btnGuardar}
            >
              {cargando ? "Actualizando..." : "Actualizar"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function EliminarMSDS() {
  const [sap, setSap] = useState("");
  const [producto, setProducto] = useState(null);
  const [cargando, setCargando] = useState(false);

  const buscar = async () => {
    try {
      if (sap.length !== 10) {
        alert("El SAP debe tener exactamente 10 dígitos");
        return;
      }

      setCargando(true);

      const data = await apiGet(`/api/msds/${sap}`);

      if (data.success) {
        setProducto(data.producto);
      }
    } catch (error) {
      console.error(error);
      alert("No se encontró MSDS con ese SAP");
      setProducto(null);
    } finally {
      setCargando(false);
    }
  };

  const eliminar = async () => {
    try {
      if (!producto) return;

      const mensaje =
        producto.referencias_archivo <= 1
          ? `Este SAP es el único que usa el PDF.\n\nSe eliminará el registro SAP y también el archivo PDF.`
          : `Este PDF está usado por ${producto.referencias_archivo} SAP.\n\nSolo se eliminará el registro SAP. El PDF se conservará.`;

      const ok = window.confirm(
        `¿Eliminar el MSDS del SAP ${producto.sap}?\n\n${producto.nombre}\n\n${mensaje}`
      );

      if (!ok) return;

      setCargando(true);

      const res = await fetch(`${API_URL}/api/msds/${producto.sap}`, {
        method: "DELETE",
        headers: {
          "x-user-nombre": localStorage.getItem("nombre") || "",
          "x-user-codigo": localStorage.getItem("codigo") || ""
        }
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "No se pudo eliminar MSDS");
      }

      alert(data.message || "MSDS eliminado correctamente");
      setSap("");
      setProducto(null);
    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div>
      <h4>Eliminar MSDS</h4>

      <div style={busquedaBox}>
        <input
          value={sap}
          maxLength={10}
          onChange={(e) => {
            setSap(soloSAP10(e.target.value));
            setProducto(null);
          }}
          placeholder="SAP de 10 dígitos"
          style={input}
        />

        <button onClick={buscar} disabled={cargando} style={btnBuscar}>
          Buscar
        </button>
      </div>

      {producto && (
        <div style={dangerBox}>
          <h4>{producto.nombre}</h4>
          <p>SAP: {producto.sap}</p>
          <p>
            Referencias del PDF:{" "}
            <b>{producto.referencias_archivo}</b>
          </p>

          {producto.pdf_url && (
            <p>
              <a href={producto.pdf_url} target="_blank" rel="noreferrer">
                Ver PDF actual
              </a>
            </p>
          )}

          {producto.referencias_archivo <= 1 ? (
            <p style={alertaRoja}>
              Este SAP es el único que usa el archivo. Al eliminarlo, también se eliminará el PDF.
            </p>
          ) : (
            <p style={alerta}>
              El PDF está compartido. Solo se eliminará el SAP; el PDF se conservará.
            </p>
          )}

          <button onClick={eliminar} disabled={cargando} style={btnEliminar}>
            Eliminar
          </button>
        </div>
      )}
    </div>
  );
}

function FormularioBase({
  sap,
  setSap,
  nombre,
  setNombre,
  descripcion,
  setDescripcion,
  modoArchivo,
  setModoArchivo,
  sapReferencia,
  setSapReferencia,
  archivoId,
  setArchivo,
  mostrarMantener,
  bloquearSAP,
  bloqueadoExiste
}) {
  return (
    <div style={grid}>
      <Campo label="Código SAP">
        <input
          value={sap}
          maxLength={10}
          disabled={bloquearSAP}
          onChange={(e) => setSap(soloSAP10(e.target.value))}
          placeholder="Ejemplo: 1000000474"
          style={bloquearSAP || bloqueadoExiste ? inputReadOnly : input}
        />
      </Campo>

      <Campo label="Nombre visible">
        <input
          value={nombre}
          onChange={(e) => setNombre(mayus(e.target.value))}
          placeholder="Nombre que verá el usuario"
          style={input}
        />
      </Campo>

      <Campo label="Descripción">
        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(mayus(e.target.value))}
          placeholder="Descripción opcional"
          style={textarea}
        />
      </Campo>

      <Campo label="Modo de archivo">
        <select
          value={modoArchivo}
          onChange={(e) => {
            setModoArchivo(e.target.value);
            setArchivo(null);

            const inputFile = document.getElementById(archivoId);
            if (inputFile) inputFile.value = "";
          }}
          style={input}
        >
          {mostrarMantener && (
            <option value="MANTENER">Mantener PDF actual</option>
          )}
          <option value="NUEVO">Subir PDF nuevo</option>
          <option value="REFERENCIA">Referenciar PDF de otro SAP</option>
        </select>
      </Campo>

      {modoArchivo === "NUEVO" && (
        <Campo label="Archivo PDF">
          <input
            id={archivoId}
            type="file"
            accept="application/pdf"
            onChange={(e) => setArchivo(e.target.files[0])}
            style={input}
          />
        </Campo>
      )}

      {modoArchivo === "REFERENCIA" && (
        <Campo label="SAP de referencia">
          <input
            value={sapReferencia}
            maxLength={10}
            onChange={(e) => setSapReferencia(soloSAP10(e.target.value))}
            placeholder="SAP que ya tiene el PDF"
            style={input}
          />
        </Campo>
      )}
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
  borderRadius: "12px",
  boxShadow: "0 0 10px rgba(0,0,0,0.1)"
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
  background: "#718093",
  color: "white",
  cursor: "pointer"
};

const btnActivo = {
  ...btn,
  background: "#273c75"
};

const btnPeligro = {
  ...btn,
  background: "#8c7ae6"
};

const btnPeligroActivo = {
  ...btn,
  background: "#e84118"
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "15px"
};

const labelStyle = {
  display: "block",
  marginBottom: "5px",
  fontWeight: "bold"
};

const input = {
  width: "100%",
  padding: "10px",
  borderRadius: "6px",
  border: "1px solid #ccc",
  boxSizing: "border-box"
};

const inputReadOnly = {
  ...input,
  background: "#e9ecef",
  fontWeight: "bold"
};

const textarea = {
  ...input,
  minHeight: "80px",
  resize: "vertical"
};

const acciones = {
  display: "flex",
  gap: "10px",
  marginTop: "20px",
  flexWrap: "wrap"
};

const btnGuardar = {
  padding: "10px 15px",
  border: "none",
  borderRadius: "6px",
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

const btnLimpiar = {
  ...btnGuardar,
  background: "#718093"
};

const btnBuscar = {
  ...btnGuardar,
  background: "#40739e"
};

const btnEliminar = {
  ...btnGuardar,
  background: "#e84118"
};

const busquedaBox = {
  display: "flex",
  gap: "10px",
  marginBottom: "20px",
  flexWrap: "wrap"
};

const textoInfo = {
  marginTop: "15px",
  background: "#f5f6fa",
  padding: "10px",
  borderRadius: "8px"
};

const dangerBox = {
  marginTop: "20px",
  padding: "15px",
  background: "#fff0f0",
  border: "1px solid #ffb4b4",
  borderRadius: "10px"
};

const alerta = {
  marginTop: "15px",
  padding: "10px",
  background: "#fff8d6",
  border: "1px solid #fbc531",
  borderRadius: "8px",
  color: "#6b5200",
  fontWeight: "bold"
};

const alertaRoja = {
  marginTop: "15px",
  padding: "10px",
  background: "#ffe0e0",
  border: "1px solid #e84118",
  borderRadius: "8px",
  color: "#7a0000",
  fontWeight: "bold"
};