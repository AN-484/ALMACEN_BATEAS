import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../../components/Layout";
import { LeasingInlineLoading, LeasingPageLoading } from "../../components/LeasingLoading";
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

function descripcionTipoMovimiento(tipo) {
  const tipoNum = Number(tipo);
  if (tipoNum === 101) return "101 - INGRESO";
  if (tipoNum === 201) return "201 - SALIDA";
  if (tipoNum === 301) return "301 - MODIFICACION";
  if (tipoNum === 401) return "401 - ELIMINACION";
  return String(tipo || "-");
}

function nombreResponsable(responsable, responsableNombre) {
  if (String(responsableNombre || "").trim()) {
    return String(responsableNombre).trim();
  }

  const valor = String(responsable || "").trim();
  if (!valor) return "-";

  // Soporta formatos como "12345 - JUAN PEREZ" para mostrar solo el nombre.
  const match = valor.match(/^\d+\s*-\s*(.+)$/);
  if (match) return match[1].trim();

  return valor;
}

export default function Leasing({ funcionInicial }) {
  const navigate = useNavigate();
  const esAdmin = String(localStorage.getItem("puede_datos")) === "SI";

  const [cargandoPantalla, setCargandoPantalla] = useState(true);
  const [busquedaFuncion, setBusquedaFuncion] = useState("");
  const [funcionActiva, setFuncionActiva] = useState(null);
  const [vistaAdmin401, setVistaAdmin401] = useState("eliminacion");
  const [guardando, setGuardando] = useState(false);
  const [buscandoMaterial, setBuscandoMaterial] = useState(false);
  const [busquedaMaterial, setBusquedaMaterial] = useState("");
  const [resultadosMaterial, setResultadosMaterial] = useState([]);
  const [materialSalida, setMaterialSalida] = useState(null);
  const [buscandoMovimiento, setBuscandoMovimiento] = useState(false);
  const [busquedaMovimiento, setBusquedaMovimiento] = useState("");
  const [tipoBusquedaMovimiento, setTipoBusquedaMovimiento] = useState("101");
  const [resultadosMovimiento, setResultadosMovimiento] = useState([]);
  const [movimientoOriginal, setMovimientoOriginal] = useState(null);

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

  const [busquedaEliminacion, setBusquedaEliminacion] = useState("");
  const [tipoBusquedaEliminacion, setTipoBusquedaEliminacion] = useState("101");
  const [buscandoMovimientoElim, setBuscandoMovimientoElim] = useState(false);
  const [resultadosEliminacion, setResultadosEliminacion] = useState([]);
  const [movimientoAEliminar, setMovimientoAEliminar] = useState(null);

  const [movimientoModificacion, setMovimientoModificacion] = useState({
    date_modif: hoyISO(),
    date_movi: hoyISO(),
    date_crea: "",
    tipo_movimiento: "",
    guia: "",
    ubic_destino: "",
    placa: "",
    destinatario: "",
    obs: ""
  });

  // Deshabilitado intencionalmente: selección de función por buscador.
  // Requerimiento actual: ocultar barra y operar solo con botones de función.

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
    if (funcion.codigo === 401) {
      setVistaAdmin401("eliminacion");
    }
    setBusquedaFuncion(`${funcion.codigo} - ${funcion.descripcion}`);
  };

  useEffect(() => {
    const timer = setTimeout(() => setCargandoPantalla(false), 220);
    return () => clearTimeout(timer);
  }, []);

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

  const actualizarMovimientoModificacion = (campo, valor) => {
    setMovimientoModificacion((prev) => ({ ...prev, [campo]: valor }));
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

  const buscarMovimientos = async (texto, tipo = tipoBusquedaMovimiento) => {
    try {
      const valor = String(texto || "").trim();
      setBusquedaMovimiento(texto);

      if (valor.length < 2) {
        setResultadosMovimiento([]);
        return;
      }

      setBuscandoMovimiento(true);
      const res = await apiGet(
        `/api/leasing/movimientos?q=${encodeURIComponent(valor)}&tipo=${encodeURIComponent(tipo)}`
      );

      if (res.success) {
        setResultadosMovimiento(res.data || []);
      }
    } catch (error) {
      console.error(error);
      setResultadosMovimiento([]);
    } finally {
      setBuscandoMovimiento(false);
    }
  };

  const seleccionarMovimiento = (item) => {
    setMovimientoOriginal(item);
    setBusquedaMovimiento(`${item.material?.codigo || ""} - ${item.material?.descripcion || ""}`);
    setResultadosMovimiento([]);
    setMovimientoModificacion({
      date_modif: hoyISO(),
      date_movi: item.date_movi || hoyISO(),
      date_crea: item.date_crea || "",
      tipo_movimiento: String(item.tipo_movimiento || ""),
      guia: item.guia || "",
      ubic_destino: item.ubic_destino || "",
      placa: item.placa ? String(item.placa) : "",
      destinatario: item.destinatario || "",
      obs: item.obs || ""
    });
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

  const buscarMovimientosElim = async (texto, tipo = tipoBusquedaEliminacion) => {
    try {
      const valor = String(texto || "").trim();
      setBusquedaEliminacion(texto);

      if (valor.length < 2) {
        setResultadosEliminacion([]);
        return;
      }

      setBuscandoMovimientoElim(true);
      const res = await apiGet(
        `/api/leasing/movimientos?q=${encodeURIComponent(valor)}&tipo=${encodeURIComponent(tipo)}`
      );

      if (res.success) {
        setResultadosEliminacion(res.data || []);
      }
    } catch (error) {
      console.error(error);
      setResultadosEliminacion([]);
    } finally {
      setBuscandoMovimientoElim(false);
    }
  };

  const seleccionarMovimientoElim = (item) => {
    setMovimientoAEliminar(item);
    setBusquedaEliminacion(`${item.material?.codigo || ""} - ${item.material?.descripcion || ""}`);
    setResultadosEliminacion([]);
  };

  const ejecutarEliminacion = async () => {
    try {
      if (!esAdmin) {
        alert("Solo los administradores pueden eliminar movimientos.");
        return;
      }

      if (!movimientoAEliminar?.id) {
        alert("Debe buscar y seleccionar un movimiento.");
        return;
      }

      const confirmar = window.confirm(
        `¿Confirma la eliminación del movimiento ${movimientoAEliminar.id}?\n` +
        `Material: ${movimientoAEliminar.material?.descripcion || movimientoAEliminar.codigo_material}\n` +
        `Tipo: ${movimientoAEliminar.tipo_movimiento} | Fecha: ${movimientoAEliminar.date_movi}`
      );

      if (!confirmar) return;

      setGuardando(true);

      const res = await apiPost("/api/leasing/eliminaciones", {
        id_movimiento: movimientoAEliminar.id
      });

      if (res.success) {
        alert(
          `Movimiento ${res.data.movimiento.id} eliminado.\n` +
          `Fecha eliminación: ${res.data.movimiento.date_elim}`
        );
        setMovimientoAEliminar(null);
        setBusquedaEliminacion("");
        setResultadosEliminacion([]);
      }
    } catch (error) {
      console.error(error);
      alert(error.message || "No se pudo eliminar el movimiento");
    } finally {
      setGuardando(false);
    }
  };

  const guardarModificacion = async () => {
    try {
      if (!funcionActiva || funcionActiva.codigo !== 301) {
        alert("Seleccione la función 301 para registrar una modificación.");
        return;
      }

      if (!movimientoOriginal?.id) {
        alert("Debe buscar y seleccionar un movimiento.");
        return;
      }

      if (!movimientoModificacion.date_movi) {
        alert("La fecha de movimiento es obligatoria.");
        return;
      }

      if (movimientoModificacion.placa && movimientoModificacion.placa.length !== 9) {
        alert("La placa debe tener 9 dígitos.");
        return;
      }

      setGuardando(true);

      const payload = {
        id_movimiento: movimientoOriginal.id,
        movimiento: {
          date_movi: movimientoModificacion.date_movi,
          guia: movimientoModificacion.guia.trim() || null,
          ubic_destino: movimientoModificacion.ubic_destino.trim().toUpperCase() || null,
          placa: movimientoModificacion.placa ? Number(movimientoModificacion.placa) : null,
          destinatario:
            Number(movimientoOriginal.tipo_movimiento) === 201
              ? movimientoModificacion.destinatario.trim() || null
              : null,
          obs: movimientoModificacion.obs.trim() || null
        }
      };

      const res = await apiPost("/api/leasing/modificaciones", payload);

      if (res.success) {
        alert(`Modificación registrada correctamente. ${res.data.modificacion.id}`);
        setMovimientoOriginal(null);
        setBusquedaMovimiento("");
        setResultadosMovimiento([]);
        setMovimientoModificacion({
          date_modif: hoyISO(),
          date_movi: hoyISO(),
          date_crea: "",
          tipo_movimiento: "",
          guia: "",
          ubic_destino: "",
          placa: "",
          destinatario: "",
          obs: ""
        });
      }
    } catch (error) {
      console.error(error);
      alert(error.message || "No se pudo guardar la modificación");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Layout>
      <div style={page}>
        {cargandoPantalla ? <LeasingPageLoading message="Cargando pantalla de movimientos..." /> : null}

        {!cargandoPantalla ? (
          <>
        <div style={headerCard}>
          <div>
            <h2 style={{ margin: 0 }}>LeaseDesk</h2>
            <p style={{ margin: "6px 0 0", color: "#fafafb" }}>
              Movimientos: Funciones Principales.
            </p>
          </div>

          <div style={headerActions}>
            <button onClick={() => navigate("/leasing")} style={btnSecondary}>
              ↩ Estados generales
            </button>

            <button onClick={() => navigate("/leasing/historial")} style={btnSecondary}>
              📋 Historial
            </button>
          </div>
        </div>

        <section style={sectionCard}>
          <h3 style={sectionTitle}>1. Funciones</h3>
          <p style={sectionHint}>
            Seleccione un movimiento. La función de Eliminar solo esta disponible si es administrador.
          </p>

          <div style={selectorBox}>
            {/* Buscador oculto por requerimiento: se usa exclusivamente selección por botones. */}

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
                  {funcion.descripcion}
                </button>
              ))}
            </div>
          </div>
        </section>

        {funcionActiva?.codigo === 101 ? (
          <section style={sectionCard}>
            <h3 style={sectionTitle}>2. Ingreso de materiales</h3>
            <p style={sectionHint}>
              Complete los siguientes campos:
            </p>

            <div style={grid2}>
              <Campo label="Código material (Opcional):">
                <input
                  value={material.codigo}
                  onChange={(e) => actualizarMaterial("codigo", soloNumerosLimitado(e.target.value, 10))}
                  placeholder="10 dígitos"
                  style={input}
                  maxLength={10}
                />
              </Campo>

              <Campo label="Descripción">
                <input
                  value={material.descripcion}
                  onChange={(e) => actualizarMaterial("descripcion", e.target.value.toUpperCase())}
                  placeholder="Ejemplo: Cargador Frontal"
                  style={input}
                />
              </Campo>

              <Campo label="Referencia">
                <input
                  value={material.referencia}
                  onChange={(e) => actualizarMaterial("referencia", e.target.value.toUpperCase())}
                  placeholder="Ejemplo: Carta / Orden de compra"
                  style={input}
                />
              </Campo>

              <Campo label="Ubicación">
                <input
                  value={material.ubicacion}
                  onChange={(e) => actualizarMaterial("ubicacion", e.target.value.toUpperCase())}
                  placeholder="Ejemplo: Almacen / 2.B.2.3.5"
                  style={input}
                />
              </Campo>

              <Campo label="Placa material:">
                <input
                  value={material.placa}
                  onChange={(e) => actualizarMaterial("placa", soloNumerosLimitado(e.target.value, 9))}
                  placeholder="9 dígitos"
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

              <Campo label="Atendido por:">
                <input
                  value={`${localStorage.getItem("nombre") || "Usuario"}`}
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
              <div><b>Tipo movimiento:</b> INGRESO</div>
            </div>

            <button onClick={guardarIngreso} disabled={guardando} style={guardando ? btnDisabled : btnPrimary}>
              {guardando ? <LeasingInlineLoading message="Guardando ingreso..." /> : "Registrar Ingreso"}
            </button>
          </section>
        ) : funcionActiva?.codigo === 201 ? (
          <section style={sectionCard}>
            <h3 style={sectionTitle}>2. Salida de materiales</h3>
            <p style={sectionHint}>
              Busque el material y seleccione. Complete los siguientes campos:
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
                  placeholder="Ejemplo: Proyectos / 2.B.2.3.5"
                  style={input}
                />
              </Campo>

              <Campo label="Responsable">
                <input
                  value={`${localStorage.getItem("nombre") || "Usuario"}`}
                  readOnly
                  style={inputReadonly}
                />
              </Campo>

              <Campo label="Usuario Destinatario">
                <input
                  value={movimientoSalida.destinatario}
                  onChange={(e) => actualizarMovimientoSalida("destinatario", e.target.value.toUpperCase())}
                  placeholder="Ingrese nombre"
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
              <div><b>Tipo movimiento:</b> SALIDA</div>
            </div>

            <button onClick={guardarSalida} disabled={guardando} style={guardando ? btnDisabled : btnPrimary}>
              {guardando ? <LeasingInlineLoading message="Guardando salida..." /> : "Registrar Salida"}
            </button>
          </section>
        ) : funcionActiva?.codigo === 301 ? (
          <section style={sectionCard}>
            <h3 style={sectionTitle}>2. Modificación de movimientos</h3>
            <p style={sectionHint}>
              Buscar por material y tipo de movimiento.
            </p>

            <div style={searchPanel}>
              <div style={grid2}>
                <Campo label="Buscar material por código o nombre">
                  <input
                    value={busquedaMovimiento}
                    onChange={(e) => buscarMovimientos(e.target.value.toUpperCase())}
                    placeholder="Escriba código o descripción"
                    style={input}
                  />
                </Campo>

                <Campo label="Tipo movimiento">
                  <select
                    value={tipoBusquedaMovimiento}
                    onChange={(e) => {
                      setTipoBusquedaMovimiento(e.target.value);
                      if (busquedaMovimiento.trim().length >= 2) {
                        buscarMovimientos(busquedaMovimiento, e.target.value);
                      }
                    }}
                    style={input}
                  >
                    <option value="101">INGRESO</option>
                    <option value="201">SALIDA</option>
                  </select>
                </Campo>
              </div>

              {buscandoMovimiento ? <p style={helperText}>Buscando movimientos...</p> : null}

              {resultadosMovimiento.length > 0 ? (
                <div style={resultadosBox}>
                  {resultadosMovimiento.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => seleccionarMovimiento(item)}
                      style={resultadoBtn}
                    >
                      <b>{item.material?.codigo || item.codigo_material}</b> - {item.material?.descripcion || "Sin descripción"}
                      <span style={resultadoMeta}>
                        Mov: {item.id} | Tipo: {item.tipo_movimiento} | Fecha: {item.date_movi}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div style={divider}></div>

            <div style={grid2}>
              <Campo label="Fecha modificación">
                <input
                  value={movimientoModificacion.date_modif}
                  readOnly
                  style={inputReadonly}
                />
              </Campo>

              <Campo label="Código material">
                <input
                  value={movimientoOriginal?.codigo_material || ""}
                  readOnly
                  style={inputReadonly}
                />
              </Campo>

              <Campo label="Fecha movimiento">
                <input
                  type="date"
                  value={movimientoModificacion.date_movi}
                  onChange={(e) => actualizarMovimientoModificacion("date_movi", e.target.value)}
                  style={input}
                />
              </Campo>

              <Campo label="Fecha creación">
                <input
                  value={movimientoModificacion.date_crea}
                  readOnly
                  style={inputReadonly}
                />
              </Campo>

              <Campo label="Tipo movimiento">
                <input
                  value={movimientoModificacion.tipo_movimiento}
                  readOnly
                  style={inputReadonly}
                />
              </Campo>

              <Campo label="Guía">
                <input
                  value={movimientoModificacion.guia}
                  onChange={(e) => actualizarMovimientoModificacion("guia", e.target.value.toUpperCase())}
                  style={input}
                />
              </Campo>

              <Campo label="Ubic / Destino">
                <input
                  value={movimientoModificacion.ubic_destino}
                  onChange={(e) => actualizarMovimientoModificacion("ubic_destino", e.target.value.toUpperCase())}
                  style={input}
                />
              </Campo>

              <Campo label="Placa (9 dígitos)">
                <input
                  value={movimientoModificacion.placa}
                  onChange={(e) => actualizarMovimientoModificacion("placa", soloNumerosLimitado(e.target.value, 9))}
                  maxLength={9}
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

              {Number(movimientoOriginal?.tipo_movimiento) === 201 ? (
                <Campo label="UsuarioDestinatario">
                  <input
                    value={movimientoModificacion.destinatario}
                    onChange={(e) => actualizarMovimientoModificacion("destinatario", e.target.value.toUpperCase())}
                    style={input}
                  />
                </Campo>
              ) : null}

              <Campo label="Observaciones">
                <textarea
                  value={movimientoModificacion.obs}
                  onChange={(e) => actualizarMovimientoModificacion("obs", e.target.value)}
                  style={textarea}
                  rows={3}
                />
              </Campo>
            </div>

            <div style={summaryBox}>
              <div><b>Tipo movimiento:</b> MODIFICACION</div>
            </div>

            <button onClick={guardarModificacion} disabled={guardando} style={guardando ? btnDisabled : btnPrimary}>
              {guardando ? <LeasingInlineLoading message="Guardando modificación..." /> : "Registrar Modificación"}
            </button>
          </section>
        ) : funcionActiva?.codigo === 401 ? (
          <section style={sectionCard}>
            <h3 style={{ ...sectionTitle, color: "#c0672b" }}>2. Eliminar de movimientos — Solo administradores</h3>
            <p style={sectionHint}>
              Busque el movimiento por material y tipo de movimiento.
            </p>

            <div style={adminToggleBox}>
              <button
                type="button"
                onClick={() => setVistaAdmin401("eliminacion")}
                style={vistaAdmin401 === "eliminacion" ? adminToggleActive : adminToggleBtn}
              >
                Eliminación de movimientos
              </button>

              <button
                type="button"
                onClick={() => setVistaAdmin401("materiales")}
                style={vistaAdmin401 === "materiales" ? adminMaterialToggleActive : adminMaterialToggleBtn}
              >
                Editar / Eliminar Materiales
              </button> 
            </div>

            {!esAdmin ? (
              <div style={alertBox}>No tiene permisos para esta función.</div>
            ) : (
              <>
                {vistaAdmin401 === "eliminacion" ? (
                  <>
                <div style={searchPanel}>
                  <div style={grid2}>
                    <Campo label="Buscar material por código o nombre">
                      <input
                        value={busquedaEliminacion}
                        onChange={(e) => buscarMovimientosElim(e.target.value.toUpperCase())}
                        placeholder="Escriba código o descripción"
                        style={input}
                      />
                    </Campo>

                    <Campo label="Tipo movimiento">
                      <select
                        value={tipoBusquedaEliminacion}
                        onChange={(e) => {
                          setTipoBusquedaEliminacion(e.target.value);
                          if (busquedaEliminacion.trim().length >= 2) {
                            buscarMovimientosElim(busquedaEliminacion, e.target.value);
                          }
                        }}
                        style={input}
                      >
                        <option value="101">INGRESO</option>
                        <option value="201">SALIDA</option>
                      </select>
                    </Campo>
                  </div>

                  {buscandoMovimientoElim ? <p style={helperText}>Buscando movimientos...</p> : null}

                  {resultadosEliminacion.length > 0 ? (
                    <div style={resultadosBox}>
                      {resultadosEliminacion.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => seleccionarMovimientoElim(item)}
                          style={resultadoBtn}
                        >
                          <b>{item.material?.codigo || item.codigo_material}</b> - {item.material?.descripcion || "Sin descripción"}
                          <span style={resultadoMeta}>
                            Mov: {item.id} | Tipo: {descripcionTipoMovimiento(item.tipo_movimiento)} | Fecha: {item.date_movi}
                          </span>
                          <span style={resultadoMetaSec}>
                            Responsable: {nombreResponsable(item.responsable, item.responsable_nombre)} | Ubicación: {item.ubic_destino || item.ubicacion || "-"} | Placa: {item.placa || item.material?.placa || "-"}
                          </span>
                          {Number(item.tipo_movimiento) === 201 ? (
                            <span style={resultadoMetaSec}>Destinatario: {item.destinatario || "-"}</span>
                          ) : null}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                {movimientoAEliminar ? (
                  <>
                    <div style={divider}></div>

                    <div style={{ ...summaryBox, background: "#fdf2f2", border: "1px solid #f5c6cb" }}>
                      <div><b>Movimiento:</b> {movimientoAEliminar.id}</div>
                      <div><b>Material:</b> {movimientoAEliminar.material?.descripcion || movimientoAEliminar.codigo_material}</div>
                      <div><b>Tipo:</b> {descripcionTipoMovimiento(movimientoAEliminar.tipo_movimiento)}</div>
                      <div><b>Fecha movimiento:</b> {movimientoAEliminar.date_movi}</div>
                      <div><b>Responsable:</b> {nombreResponsable(movimientoAEliminar.responsable, movimientoAEliminar.responsable_nombre)}</div>
                      <div><b>Ubicación:</b> {movimientoAEliminar.ubic_destino || movimientoAEliminar.ubicacion || "-"}</div>
                      <div><b>Placa:</b> {movimientoAEliminar.placa || movimientoAEliminar.material?.placa || "-"}</div>
                      {Number(movimientoAEliminar.tipo_movimiento) === 201 ? (
                        <div><b>Destinatario:</b> {movimientoAEliminar.destinatario || "-"}</div>
                      ) : null}
                    </div>

                    <button
                      onClick={ejecutarEliminacion}
                      disabled={guardando}
                      style={guardando ? btnDisabled : btnDanger}
                    >
                      {guardando ? <LeasingInlineLoading message="Eliminando..." /> : "Confirmar eliminación"}
                    </button>
                  </>
                ) : null}
                  </>
                ) : (
                  <div style={summaryBox}>
                    <div>Administración directa de materiales (editar/eliminar materiales LEASING).</div>
                    <button
                      onClick={() => navigate("/leasing/admin-materiales")}
                      style={{ ...btnDangerCompact, marginTop: 8, display: "inline-block" }}
                      disabled={guardando}
                    >
                      Ir a Gestión de Materiales (Admin)
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        ) : funcionActiva ? (
          <section style={sectionCard}>
            <h3 style={sectionTitle}>Función no reconocida</h3>
          </section>
        ) : (
          <section style={sectionCard}>
            <h3 style={sectionTitle}>Seleccione una función</h3>
            <p style={sectionHint}>
              Use el buscador superior para elegir 101, 201, 301 o 401.
            </p>
          </section>
        )}
          </>
        ) : null}
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
  background: "linear-gradient(135deg, #3b136f 0%, #6d28d9 100%)",
  color: "white",
  padding: "18px 20px",
  borderRadius: "16px",
  boxShadow: "0 10px 30px rgba(59,19,111,0.22)"
};

const headerActions = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap"
};

const sectionCard = {
  background: "white",
  borderRadius: "16px",
  padding: "18px",
  boxShadow: "0 10px 24px rgba(76,29,149,0.08)"
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

const chipsBox = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px"
};

const chip = {
  padding: "10px 12px",
  borderRadius: "999px",
  border: "1px solid #177172",
  background: "#dff8f8",
  color: "#0f5f63",
  cursor: "pointer"
};

const chipActive = {
  ...chip,
  background: "#177172",
  color: "white",
  borderColor: "#177172"
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

const resultadoMetaSec = {
  ...resultadoMeta,
  color: "#475467"
};

const btnPrimary = {
  padding: "12px 16px",
  border: "none",
  borderRadius: "10px",
  background: "#6d28d9",
  color: "white",
  cursor: "pointer",
  fontWeight: 700
};

const btnDisabled = {
  ...btnPrimary,
  background: "#7f8c9b",
  cursor: "not-allowed"
};

const btnDanger = {
  padding: "12px 16px",
  border: "none",
  borderRadius: "10px",
  background: "#cf781c",
  color: "white",
  cursor: "pointer",
  fontWeight: 700
};

const btnDangerCompact = {
  ...btnDanger,
  padding: "8px 10px",
  fontSize: "12px",
  maxWidth: "500px",
  whiteSpace: "normal",
  lineHeight: 1.2,
  textAlign: "center"
};

const alertBox = {
  padding: "12px 14px",
  borderRadius: "10px",
  background: "#fdf2f2",
  color: "#c0982b",
  fontWeight: 600
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

const adminToggleBox = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
  marginBottom: "14px"
};

const adminToggleBtn = {
  padding: "10px 12px",
  borderRadius: "10px",
  border: "1px solid #d8caef",
  background: "#f8f3ff",
  color: "#4c1d95",
  fontWeight: 700,
  cursor: "pointer"
};

const adminToggleActive = {
  ...adminToggleBtn,
  background: "#6d28d9",
  borderColor: "#6d28d9",
  color: "white"
};

const adminMaterialToggleBtn = {
  ...adminToggleBtn,
  border: "1px solid #efc9c5",
  background: "#fdeceb",
  color: "#7b1c1c"
};

const adminMaterialToggleActive = {
  ...adminMaterialToggleBtn,
  background: "#c0392b",
  borderColor: "#c0392b",
  color: "white"
};
