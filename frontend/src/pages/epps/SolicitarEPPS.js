import { useState } from "react";
import { apiPost } from "../../services/api";
import BuscarEPP from "./components/BuscarEPP";
import TablaItemsEPP from "./components/TablaItemsEPP";

export default function SolicitarEPPS({ onCreado }) {
  const [items, setItems] = useState([]);
  const [guardando, setGuardando] = useState(false);

  const agregarEPP = (epp) => {
    const existe = items.some(item => item.id_epp === epp.id_epp);

    if (existe) {
      alert("Este EPP ya fue agregado");
      return;
    }

    setItems(prev => [
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

    setItems(prev =>
      prev.map(item =>
        item.id_epp === id_epp
          ? { ...item, cantidad: cantidad > 0 ? cantidad : 1 }
          : item
      )
    );
  };

  const eliminarItem = (id_epp) => {
    setItems(prev => prev.filter(item => item.id_epp !== id_epp));
  };

  const guardarSolicitud = async () => {
    try {
      if (items.length === 0) {
        alert("Agregue al menos un EPP");
        return;
      }

      setGuardando(true);

      const payload = {
        items: items.map(item => ({
          id_epp: item.id_epp,
          cantidad: Number(item.cantidad)
        }))
      };

      const res = await apiPost("/api/epps/solicitud", payload);

      if (res.success) {
        alert(`Solicitud creada correctamente: ${res.id_soli}`);
        setItems([]);

        if (onCreado) {
          onCreado();
        }
      }
    } catch (error) {
      console.error(error);
      alert(error.message || "No se pudo crear la solicitud");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div>
      <BuscarEPP onAgregar={agregarEPP} />

      <div style={card}>
        <div style={header}>
          <div>
            <h3 style={{ margin: 0 }}>Solicitud actual</h3>
            <p style={subtitulo}>
              Agregue varios EPPS y ajuste las cantidades según la unidad.
            </p>
          </div>
        </div>

        <TablaItemsEPP
          items={items}
          onCambiarCantidad={cambiarCantidad}
          onEliminar={eliminarItem}
          editable={true}
        />

        <button
          onClick={guardarSolicitud}
          disabled={guardando}
          style={guardando ? btnDisabledAbsoluto : btnGuardarAbsoluto}
        >
          {guardando ? "Guardando..." : "Enviar solicitud"}
        </button>
      </div>
    </div>
  );
}

const card = {
  background: "white",
  padding: "18px",
  paddingBottom: "70px",
  borderRadius: "14px",
  boxShadow: "0 0 10px rgba(0,0,0,0.1)",
  position: "relative"
};

const header = {
  marginBottom: "15px"
};

const subtitulo = {
  margin: "6px 0 0",
  color: "#666"
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

const btnGuardarAbsoluto = {
  ...btnGuardar,
  position: "absolute",
  right: 18,
  bottom: 18
};

const btnDisabledAbsoluto = {
  ...btnGuardarAbsoluto,
  background: "#718093",
  cursor: "not-allowed"
};