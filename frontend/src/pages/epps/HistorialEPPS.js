import { useEffect, useState } from "react";
import { apiDelete, apiGet, apiPut } from "../../services/api";
import TarjetaSolicitud from "./components/TarjetaSolicitud";
import DetalleSolicitud from "./components/DetalleSolicitud";
import TablaItemsEPP from "./components/TablaItemsEPP";
import BuscarEPP from "./components/BuscarEPP";

export default function HistorialEPPS() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [detalle, setDetalle] = useState(null);
  const [editando, setEditando] = useState(null);
  const [itemsEdicion, setItemsEdicion] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const cargar = async () => {
    try {
      setCargando(true);

      const res = await apiGet("/api/epps/mis-solicitudes");

      if (res.success) {
        setSolicitudes(res.data || []);
      }
    } catch (error) {
      console.error(error);
      alert("No se pudo cargar historial EPPS");
    } finally {
      setCargando(false);
    }
  };

  const verDetalle = async (id_soli) => {
    try {
      setEditando(null);
      setItemsEdicion([]);

      const res = await apiGet(`/api/epps/solicitud/${id_soli}`);

      if (res.success) {
        setDetalle(res.data);
      }
    } catch (error) {
      console.error(error);
      alert("No se pudo cargar detalle");
    }
  };

  const editar = async (id_soli) => {
    try {
      setDetalle(null);

      const res = await apiGet(`/api/epps/solicitud/${id_soli}`);

      if (!res.success) {
        alert("No se pudo cargar la solicitud");
        return;
      }

      const solicitud = res.data;

      if (solicitud.estado !== "S1") {
        alert("Solo se pueden editar solicitudes pendientes");
        return;
      }

      setEditando(solicitud);

      setItemsEdicion(
        (solicitud.items || []).map(item => ({
          id_epp: item.epp?.id_epp,
          sap: item.epp?.sap,
          sap_visual: item.epp?.sap_visual,
          descripcion: item.epp?.descripcion,
          unidad: item.epp?.unidad,
          cantidad: item.cantidad
        }))
      );
    } catch (error) {
      console.error(error);
      alert("No se pudo abrir edición");
    }
  };

  const agregarEPP = (epp) => {
    if (!editando) return;

    const existe = itemsEdicion.some(item => item.id_epp === epp.id_epp);

    if (existe) {
      alert("Este EPP ya está en la solicitud");
      return;
    }

    setItemsEdicion(prev => [
      ...prev,
      {
        id_epp: epp.id_epp,
        sap: epp.sap,
        sap_visual: epp.sap_visual,
        descripcion: epp.descripcion,
        unidad: epp.unidad,
        cantidad: 1
      }
    ]);
  };

  const cambiarCantidad = (id_epp, valor) => {
    const cantidad = Number(valor);

    setItemsEdicion(prev =>
      prev.map(item =>
        item.id_epp === id_epp
          ? { ...item, cantidad: cantidad > 0 ? cantidad : 1 }
          : item
      )
    );
  };

  const quitarItem = (id_epp) => {
    setItemsEdicion(prev => prev.filter(item => item.id_epp !== id_epp));
  };

  const guardarEdicion = async () => {
    try {
      if (!editando) return;

      if (itemsEdicion.length === 0) {
        alert("La solicitud debe tener al menos un EPP");
        return;
      }

      setGuardando(true);

      const payload = {
        items: itemsEdicion.map(item => ({
          id_epp: item.id_epp,
          cantidad: Number(item.cantidad)
        }))
      };

      const res = await apiPut(
        `/api/epps/solicitud/${editando.id_soli}`,
        payload
      );

      if (res.success) {
        alert("Solicitud actualizada correctamente");
        setEditando(null);
        setItemsEdicion([]);
        cargar();
      }
    } catch (error) {
      console.error(error);
      alert(error.message || "No se pudo actualizar la solicitud");
    } finally {
      setGuardando(false);
    }
  };

  const cancelarEdicion = () => {
    const ok = window.confirm("¿Cancelar edición? Los cambios no guardados se perderán.");

    if (!ok) return;

    setEditando(null);
    setItemsEdicion([]);
  };

  const eliminar = async (id_soli) => {
    const ok = window.confirm(
      `¿Eliminar la solicitud ${id_soli}?\n\nSolo se puede eliminar si aún está pendiente.`
    );

    if (!ok) return;

    try {
      const res = await apiDelete(`/api/epps/solicitud/${id_soli}`);

      if (res.success) {
        alert("Solicitud eliminada correctamente");
        setDetalle(null);
        setEditando(null);
        setItemsEdicion([]);
        cargar();
      }
    } catch (error) {
      console.error(error);
      alert(error.message || "No se pudo eliminar solicitud");
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  return (
    <div>
      <div style={header}>
        <div>
          <h3 style={{ margin: 0 }}>Mis solicitudes EPPS</h3>
          <p style={subtitulo}>
            Historial de solicitudes, estado, reserva y detalle.
          </p>
        </div>

        <button onClick={cargar} style={btnActualizar}>
          Actualizar
        </button>
      </div>

      {cargando && <p>Cargando solicitudes...</p>}

      {!cargando && solicitudes.length === 0 && (
        <div style={vacio}>
          No tienes solicitudes registradas.
        </div>
      )}


      <DetalleSolicitud
        detalle={detalle}
        onCerrar={() => setDetalle(null)}
      />

      {editando && (
        <div style={edicionCard}>
          <div style={edicionHeader}>
            <div>
              <span style={badgeEdicion}>EDITANDO SOLICITUD</span>
              <h3 style={{ margin: "8px 0 4px" }}>{editando.id_soli}</h3>
              <p style={subtitulo}>
                Puede agregar EPPS, quitar items o modificar cantidades.
              </p>
            </div>

            <button onClick={cancelarEdicion} style={btnCancelar}>
              Cancelar
            </button>
          </div>

          <BuscarEPP onAgregar={agregarEPP} />

          <div style={cardInterno}>
            <div style={edicionHeader}>
              <div>
                <h3 style={{ margin: 0 }}>Items de la solicitud</h3>
                <p style={subtitulo}>
                  Estos cambios solo se permiten mientras la solicitud esté pendiente.
                </p>
              </div>

              <button
                onClick={guardarEdicion}
                disabled={guardando}
                style={guardando ? btnDisabled : btnGuardar}
              >
                {guardando ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>

            <TablaItemsEPP
              items={itemsEdicion}
              onCambiarCantidad={cambiarCantidad}
              onEliminar={quitarItem}
              editable={true}
            />
          </div>
        </div>
      )}

        <div style={grid}>
            {solicitudes.map(s => (
            <TarjetaSolicitud
              key={s.id_soli}
              solicitud={s}
              onVer={verDetalle}
              onEditar={editar}
              onEliminar={eliminar}
              onRecogido={cargar}
            />
            ))}
        </div>
    </div>



  );
}

const header = {
  background: "white",
  padding: "18px",
  borderRadius: "14px",
  boxShadow: "0 0 10px rgba(0,0,0,0.1)",
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  flexWrap: "wrap",
  alignItems: "center",
  marginBottom: "20px"
};

const subtitulo = {
  margin: "6px 0 0",
  color: "#666"
};

const btnActualizar = {
  padding: "10px 14px",
  border: "none",
  borderRadius: "8px",
  background: "#273c75",
  color: "white",
  cursor: "pointer",
  fontWeight: "bold"
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "15px",
  marginTop: "20px"
};

const vacio = {
  background: "white",
  padding: "18px",
  borderRadius: "14px",
  boxShadow: "0 0 10px rgba(0,0,0,0.1)",
  color: "#666"
};

const edicionCard = {
  marginTop: "25px",
  background: "#d0d0d0",
  padding: "18px",
  borderRadius: "16px",
  border: "1px solid #dcdde1"
};

const edicionHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  flexWrap: "wrap",
  alignItems: "center",
  marginBottom: "15px"
};

const badgeEdicion = {
  background: "#e1b12c",
  color: "#000",
  padding: "6px 10px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: "bold"
};

const btnCancelar = {
  padding: "10px 14px",
  border: "none",
  borderRadius: "8px",
  background: "#718093",
  color: "white",
  cursor: "pointer",
  fontWeight: "bold"
};

const cardInterno = {
  background: "white",
  padding: "18px",
  borderRadius: "14px",
  boxShadow: "0 0 10px rgba(0,0,0,0.08)"
};

const btnGuardar = {
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