import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../../components/Layout";
import { apiGet, apiPost } from "../../services/api";

const FUNCIONES = [
  { codigo: 101, descripcion: "Ingreso", acceso: "usuario" },
  { codigo: 201, descripcion: "Salida", acceso: "usuario" },
  { codigo: 301, descripcion: "Modificación", acceso: "usuario" },
  { codigo: 401, descripcion: "Eliminación", acceso: "admin" }
];

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

function soloDigitos(valor) {
  return String(valor || "").replace(/\D/g, "");
}

function soloNumerosLimitado(valor, limite) {
  return soloDigitos(valor).slice(0, limite);
}

export default function Leasing({ funcionInicial }) {
  const navigate = useNavigate();
  const esAdmin = String(localStorage.getItem("puede_datos")) === "SI";

  const [busquedaFuncion, setBusquedaFuncion] = useState("");
  const [funcionActiva, setFuncionActiva] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [buscandoMaterial, setBuscandoMaterial] = useState(false);
  const [busquedaMaterial, setBusquedaMaterial] = useState("");
  const [resultadosMaterial, setResultadosMaterial] = useState([]);
  const [materialSalida, setMaterialSalida] = useState(null);

  const [material, setMaterial] = useState({
    codigo: "",
    descripcion: "",
    referencia: "",
    ubicacion: "",
    placa: ""
  });

  const [movimiento, setMovimiento] = useState({
    date_movi: hoyISO(),
    guia: "",
    ubic_destino: "",
    placa: "",
    obs: ""
  });

  const [movimientoSalida, setMovimientoSalida] = useState({
    date_movi: hoyISO(),
    ubic_destino: "",
    destinatario: "",
    obs: ""
  });

  const funcionesVisibles = useMemo(
    () => FUNCIONES.filter((funcion) => funcion.codigo !== 401 || esAdmin),
    [esAdmin]
  );

  const seleccionarFuncion = (funcion) => {
    if (funcion.codigo === 401 && !esAdmin) {
      alert("La función 401 está reservada para administradores.");
      return;
    }

    setFuncionActiva(funcion);
    setBusquedaFuncion(`${funcion.codigo} - ${funcion.descripcion}`);
  };

  useEffect(() => {
    if (!funcionInicial) {
      return;
    }

    const preseleccion = FUNCIONES.find(
      (funcion) => String(funcion.codigo) === String(funcionInicial)
    );

    if (preseleccion) {
      seleccionarFuncion(preseleccion);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [funcionInicial]);

  const actualizarMaterial = (campo, valor) => {
    setMaterial((prev) => ({ ...prev, [campo]: valor }));
  };

  const actualizarMovimiento = (campo, valor) => {
    setMovimiento((prev) => ({ ...prev, [campo]: valor }));
  };

  const actualizarMovimientoSalida = (campo, valor) => {
    setMovimientoSalida((prev) => ({ ...prev, [campo]: valor }));
  };

  const buscarMateriales = async (texto) => {
    try {
      const valor = String(texto || "").trim();
      setBusquedaMaterial(texto);

      if (valor.length < 2) {
        setResultadosMaterial([]);
        return;
      }

      setBuscandoMaterial(true);
      const res = await apiGet(`/api/leasing/materiales?q=${encodeURIComponent(valor)}`);
      if (res.success) {
        setResultadosMaterial(res.data || []);
      }
    } catch (error) {
      console.error(error);
      setResultadosMaterial([]);
    } finally {
      setBuscandoMaterial(false);
    }
  };

  const seleccionarMaterialSalida = (item) => {
    setMaterialSalida(item);
    setBusquedaMaterial(`${item.codigo} - ${item.descripcion}`);
    setResultadosMaterial([]);
    setMovimientoSalida((prev) => ({
      ...prev,
      ubic_destino: item.ubicacion || ""
    }));
  };

  const guardarIngreso = async () => {
    try {
      if (!funcionActiva || funcionActiva.codigo !== 101) {
        alert("Seleccione la función 101 para registrar un ingreso.");
        return;
      }

      if (!material.descripcion.trim()) {
        alert("La descripción del material es obligatoria.");
        return;
      }

      if (material.codigo && material.codigo.length !== 10) {
        alert("El código debe tener 10 dígitos o dejarse en blanco para autogenerarlo.");
        return;
      }

      if (material.placa && material.placa.length !== 9) {
        alert("La placa del material debe tener 9 dígitos.");
        return;
      }

      if (!movimiento.date_movi) {
        alert("La fecha de movimiento es obligatoria.");
        return;
      }

      setGuardando(true);

      const ubicacionNormalizada = material.ubicacion.trim().toUpperCase() || null;
      const placaMaterialNumero = material.placa ? Number(material.placa) : null;

      const payload = {
        material: {
          codigo: material.codigo ? Number(material.codigo) : null,
          descripcion: material.descripcion.trim().toUpperCase(),
          referencia: material.referencia.trim() || null,
          ubicacion: ubicacionNormalizada,
          placa: placaMaterialNumero
        },
        movimiento: {
          date_movi: movimiento.date_movi,
          guia: movimiento.guia.trim() || null,
          ubic_destino: ubicacionNormalizada,
          placa: placaMaterialNumero,
          obs: movimiento.obs.trim() || null
        }
      };

      const res = await apiPost("/api/leasing/ingresos", payload);

      if (res.success) {
        alert(`Ingreso registrado correctamente. Material ${res.data.material.id}`);
        setMaterial({
          codigo: "",
          descripcion: "",
          referencia: "",
          ubicacion: "",
          placa: ""
        });
        setMovimiento({
          date_movi: hoyISO(),
          guia: "",
          ubic_destino: "",
          placa: "",
          obs: ""
        });
      }
    } catch (error) {
      console.error(error);
      alert(error.message || "No se pudo guardar el ingreso");
    } finally {
      setGuardando(false);
    }
  };

  const guardarSalida = async () => {
    try {
      if (!funcionActiva || funcionActiva.codigo !== 201) {
        alert("Seleccione la función 201 para registrar una salida.");
        return;
      }

      if (!materialSalida?.id) {
        alert("Debe buscar y seleccionar un material.");
        return;
      }

      if (!movimientoSalida.date_movi) {
        alert("La fecha de movimiento es obligatoria.");
        return;
      }

      if (!movimientoSalida.ubic_destino.trim()) {
        alert("La ubicación / destino es obligatoria.");
        return;
      }

      setGuardando(true);

      const payload = {
        movimiento: {
          codigo_material: materialSalida.id,
          date_movi: movimientoSalida.date_movi,
          ubic_destino: movimientoSalida.ubic_destino.trim().toUpperCase(),
          destinatario: movimientoSalida.destinatario.trim() || null,
          obs: movimientoSalida.obs.trim() || null
        }
      };

      const res = await apiPost("/api/leasing/salidas", payload);

      if (res.success) {
        alert(`Salida registrada correctamente. Movimiento ${res.data.movimiento.id}`);
        setMaterialSalida(null);
        setBusquedaMaterial("");
        setResultadosMaterial([]);
        setMovimientoSalida({
          date_movi: hoyISO(),
          ubic_destino: "",
          destinatario: "",
          obs: ""
        });
      }
    } catch (error) {
      console.error(error);
      alert(error.message || "No se pudo guardar la salida");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Layout>
      <div style={page}>
        <div style={headerCard}>
          <div>
            <h2 style={{ margin: 0 }}>LeaseDesk</h2>
            <p style={{ margin: "6px 0 0", color: "#5b6270" }}>
              Funciones 101 / 201 / 301 para usuario y 401 para administración.
            </p>
          </div>

          <button onClick={() => navigate("/dashboard")} style={btnSecondary}>
            Volver al dashboard
          </button>
        </div>

        <section style={sectionCard}>
          <h3 style={sectionTitle}>1. Funciones</h3>
          <p style={sectionHint}>
            Escriba o seleccione una función como en SAP. La función 401 solo se
            muestra si el usuario es administrador.
          </p>

          <div style={selectorBox}>
            <input
              value={busquedaFuncion}
              onChange={(e) => {
                setBusquedaFuncion(e.target.value);
                  const match = funcionesVisibles.find((funcion) => {
                  const texto = e.target.value.trim().toLowerCase();
                  if (!texto) return false;
                  return (
                    String(funcion.codigo).includes(texto) ||
                    funcion.descripcion.toLowerCase().includes(texto)
                  );
                });

                if (match && (match.codigo !== 401 || esAdmin)) {
                  setFuncionActiva(match);
                } else {
                  setFuncionActiva(null);
                }
              }}
              placeholder="Escriba 101, 201, 301 o 401 / Ingreso, Salida, Modificación, Eliminación"
              style={inputSearch}
              list="funciones-leasing"
            />

            <datalist id="funciones-leasing">
              {funcionesVisibles.map((funcion) => (
                <option
                  key={funcion.codigo}
                  value={`${funcion.codigo} - ${funcion.descripcion}`}
                />
              ))}
            </datalist>

            <div style={chipsBox}>
              {funcionesVisibles.map((funcion) => (
                <button
                  key={funcion.codigo}
                  type="button"
                  onClick={() => seleccionarFuncion(funcion)}
                  style={
                    funcionActiva?.codigo === funcion.codigo
                      ? chipActive
                      : chip
                  }
                >
                  {funcion.codigo} - {funcion.descripcion}
                </button>
              ))}
            </div>
          </div>

          {funcionActiva && (
            <div style={activeBox}>
              <strong>Función seleccionada:</strong> {funcionActiva.codigo} - {funcionActiva.descripcion}
              {funcionActiva.codigo === 401 && !esAdmin ? (
                <span> (sin permisos)</span>
              ) : null}
            </div>
          )}
        </section>

        {funcionActiva?.codigo === 101 ? (
          <section style={sectionCard}>
            <h3 style={sectionTitle}>2. Ingreso de materiales (101)</h3>
            <p style={sectionHint}>
              Se registra el material, el movimiento de ingreso y el estado inicial
              del material en la base de datos de leasing.
            </p>

            <div style={grid2}>
              <Campo label="Código material (10 dígitos, opcional)">
                <input
                  value={material.codigo}
                  onChange={(e) => actualizarMaterial("codigo", soloNumerosLimitado(e.target.value, 10))}
                  placeholder="Se autogenera desde 9000000000 si queda vacío"
                  style={input}
                  maxLength={10}
                />
              </Campo>

              <Campo label="Descripción">
                <input
                  value={material.descripcion}
                  onChange={(e) => actualizarMaterial("descripcion", e.target.value.toUpperCase())}
                  placeholder="Ejemplo: CAJA"
                  style={input}
                />
              </Campo>

              <Campo label="Referencia">
                <input
                  value={material.referencia}
                  onChange={(e) => actualizarMaterial("referencia", e.target.value.toUpperCase())}
                  placeholder="Ejemplo: CARTA 625655"
                  style={input}
                />
              </Campo>

              <Campo label="Ubicación">
                <input
                  value={material.ubicacion}
                  onChange={(e) => actualizarMaterial("ubicacion", e.target.value.toUpperCase())}
                  placeholder="Ejemplo: ALMACEN / B.2.3.5"
                  style={input}
                />
              </Campo>

              <Campo label="Placa material (9 dígitos)">
                <input
                  value={material.placa}
                  onChange={(e) => actualizarMaterial("placa", soloNumerosLimitado(e.target.value, 9))}
                  placeholder="Ejemplo: 202500093"
                  style={input}
                  maxLength={9}
                />
              </Campo>
            </div>

            <div style={divider}></div>

            <div style={grid2}>
              <Campo label="Fecha de movimiento">
                <input
                  type="date"
                  value={movimiento.date_movi}
                  onChange={(e) => actualizarMovimiento("date_movi", e.target.value)}
                  style={input}
                />
              </Campo>

              <Campo label="Guía">
                <input
                  value={movimiento.guia}
                  onChange={(e) => actualizarMovimiento("guia", e.target.value.toUpperCase())}
                  placeholder="Ejemplo: EG07-000089"
                  style={input}
                />
              </Campo>

              <Campo label="Responsable">
                <input
                  value={`${localStorage.getItem("codigo") || ""} - ${localStorage.getItem("nombre") || "Usuario"}`}
                  readOnly
                  style={inputReadonly}
                />
              </Campo>

              <Campo label="Observaciones">
                <textarea
                  value={movimiento.obs}
                  onChange={(e) => actualizarMovimiento("obs", e.target.value)}
                  placeholder="Observaciones opcionales"
                  style={textarea}
                  rows={3}
                />
              </Campo>
            </div>

            <div style={summaryBox}>
              <div><b>Fecha creación:</b> automática</div>
              <div><b>Tipo movimiento:</b> 101 - INGRESO</div>
              <div><b>Estado:</b> 1</div>
              <div><b>Ubic / Destino:</b> se copia automáticamente de Ubicación</div>
              <div><b>Placa movimiento:</b> se copia automáticamente de Placa material</div>
            </div>

            <button onClick={guardarIngreso} disabled={guardando} style={guardando ? btnDisabled : btnPrimary}>
              {guardando ? "Guardando ingreso..." : "Registrar ingreso"}
            </button>
          </section>
        ) : funcionActiva?.codigo === 201 ? (
          <section style={sectionCard}>
            <h3 style={sectionTitle}>2. Salida de materiales (201)</h3>
            <p style={sectionHint}>
              Primero busque el material por código o nombre. Luego registre el
              movimiento de salida y se actualizará el estado a 201.
            </p>

            <div style={searchPanel}>
              <Campo label="Buscar material por código o nombre">
                <input
                  value={busquedaMaterial}
                  onChange={(e) => buscarMateriales(e.target.value.toUpperCase())}
                  placeholder="Escriba código o descripción"
                  style={input}
                />
              </Campo>

              {buscandoMaterial ? <p style={helperText}>Buscando materiales...</p> : null}

              {resultadosMaterial.length > 0 ? (
                <div style={resultadosBox}>
                  {resultadosMaterial.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => seleccionarMaterialSalida(item)}
                      style={resultadoBtn}
                    >
                      <b>{item.codigo}</b> - {item.descripcion}
                      <span style={resultadoMeta}>ID: {item.id} | Placa: {item.placa || "-"}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div style={divider}></div>

            <div style={grid2}>
              <Campo label="Código material">
                <input
                  value={materialSalida?.id || ""}
                  readOnly
                  style={inputReadonly}
                />
              </Campo>

              <Campo label="Descripción material">
                <input
                  value={materialSalida?.descripcion || ""}
                  readOnly
                  style={inputReadonly}
                />
              </Campo>

              <Campo label="Placa (9 dígitos)">
                <input
                  value={materialSalida?.placa || ""}
                  readOnly
                  style={inputReadonly}
                />
              </Campo>

              <Campo label="Fecha de movimiento">
                <input
                  type="date"
                  value={movimientoSalida.date_movi}
                  onChange={(e) => actualizarMovimientoSalida("date_movi", e.target.value)}
                  style={input}
                />
              </Campo>

              <Campo label="Ubic / Destino">
                <input
                  value={movimientoSalida.ubic_destino}
                  onChange={(e) => actualizarMovimientoSalida("ubic_destino", e.target.value.toUpperCase())}
                  placeholder="Ingrese ubicación o destino"
                  style={input}
                />
              </Campo>

              <Campo label="Responsable">
                <input
                  value={`${localStorage.getItem("codigo") || ""} - ${localStorage.getItem("nombre") || "Usuario"}`}
                  readOnly
                  style={inputReadonly}
                />
              </Campo>

              <Campo label="Destinatario">
                <input
                  value={movimientoSalida.destinatario}
                  onChange={(e) => actualizarMovimientoSalida("destinatario", e.target.value.toUpperCase())}
                  placeholder="Ingrese destinatario"
                  style={input}
                />
              </Campo>

              <Campo label="Observaciones">
                <textarea
                  value={movimientoSalida.obs}
                  onChange={(e) => actualizarMovimientoSalida("obs", e.target.value)}
                  placeholder="Observaciones opcionales"
                  style={textarea}
                  rows={3}
                />
              </Campo>
            </div>

            <div style={summaryBox}>
              <div><b>Tipo movimiento:</b> 201 - SALIDA</div>
              <div><b>Guía:</b> se registra automáticamente como NC</div>
              <div><b>Estado material:</b> se actualiza a 201</div>
            </div>

            <button onClick={guardarSalida} disabled={guardando} style={guardando ? btnDisabled : btnPrimary}>
              {guardando ? "Guardando salida..." : "Registrar salida"}
            </button>
          </section>
        ) : funcionActiva ? (
          <section style={sectionCard}>
            <h3 style={sectionTitle}>Función en preparación</h3>
            <p style={sectionHint}>
              La ventana única ya está lista. Por ahora el ingreso 101 es la función
              operativa. Salida 201, modificación 301 y eliminación 401 se conectarán
              sobre el mismo patrón.
            </p>
          </section>
        ) : (
          <section style={sectionCard}>
            <h3 style={sectionTitle}>Seleccione una función</h3>
            <p style={sectionHint}>
              Use el buscador superior para elegir 101, 201, 301 o 401.
            </p>
          </section>
        )}
      </div>
    </Layout>
  );
}

function Campo({ label, children }) {
  return (
    <label style={campo}>
      <span style={campoLabel}>{label}</span>
      {children}
    </label>
  );
}

const page = {
  display: "grid",
  gap: "16px"
};

const headerCard = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  background: "linear-gradient(135deg, #1f2d52 0%, #3f5aa6 100%)",
  color: "white",
  padding: "18px 20px",
  borderRadius: "16px",
  boxShadow: "0 10px 30px rgba(31,45,82,0.18)"
};

const sectionCard = {
  background: "white",
  borderRadius: "16px",
  padding: "18px",
  boxShadow: "0 10px 24px rgba(31,45,82,0.08)"
};

const sectionTitle = {
  margin: 0,
  marginBottom: "6px"
};

const sectionHint = {
  marginTop: 0,
  marginBottom: "16px",
  color: "#5b6270"
};

const selectorBox = {
  display: "grid",
  gap: "12px"
};

const inputSearch = {
  width: "100%",
  border: "1px solid #cdd4e0",
  borderRadius: "10px",
  padding: "12px 14px",
  boxSizing: "border-box",
  fontSize: "14px"
};

const chipsBox = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px"
};

const chip = {
  padding: "10px 12px",
  borderRadius: "999px",
  border: "1px solid #cdd4e0",
  background: "#f7f9fd",
  cursor: "pointer"
};

const chipActive = {
  ...chip,
  background: "#273c75",
  color: "white",
  borderColor: "#273c75"
};

const activeBox = {
  marginTop: "14px",
  padding: "12px 14px",
  borderRadius: "10px",
  background: "#eef4ff",
  color: "#20315d"
};

const grid2 = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "14px"
};

const campo = {
  display: "grid",
  gap: "8px"
};

const campoLabel = {
  fontSize: "13px",
  color: "#4a5568",
  fontWeight: 700
};

const input = {
  width: "100%",
  border: "1px solid #cdd4e0",
  borderRadius: "10px",
  padding: "11px 12px",
  boxSizing: "border-box",
  fontSize: "14px"
};

const inputReadonly = {
  ...input,
  background: "#f4f6fb",
  color: "#4a5568"
};

const textarea = {
  ...input,
  minHeight: "90px",
  resize: "vertical"
};

const divider = {
  height: "1px",
  background: "#e6ebf2",
  margin: "18px 0"
};

const summaryBox = {
  display: "grid",
  gap: "8px",
  marginTop: "16px",
  marginBottom: "16px",
  padding: "12px 14px",
  borderRadius: "12px",
  background: "#f8fafc",
  color: "#3b4252"
};

const searchPanel = {
  display: "grid",
  gap: "10px"
};

const helperText = {
  margin: 0,
  color: "#5b6270",
  fontSize: "13px"
};

const resultadosBox = {
  display: "grid",
  gap: "8px"
};

const resultadoBtn = {
  display: "grid",
  gap: "4px",
  textAlign: "left",
  border: "1px solid #d7dfea",
  borderRadius: "10px",
  padding: "10px 12px",
  background: "#f8fafc",
  cursor: "pointer"
};

const resultadoMeta = {
  fontSize: "12px",
  color: "#667085"
};

const btnPrimary = {
  padding: "12px 16px",
  border: "none",
  borderRadius: "10px",
  background: "#273c75",
  color: "white",
  cursor: "pointer",
  fontWeight: 700
};

const btnDisabled = {
  ...btnPrimary,
  background: "#7f8c9b",
  cursor: "not-allowed"
};

const btnSecondary = {
  padding: "10px 14px",
  border: "1px solid rgba(255,255,255,0.35)",
  borderRadius: "10px",
  background: "rgba(255,255,255,0.12)",
  color: "white",
  cursor: "pointer",
  fontWeight: 700
};
