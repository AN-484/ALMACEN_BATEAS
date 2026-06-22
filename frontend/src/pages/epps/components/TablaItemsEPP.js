import { formatearSAPVisual } from "../utils/sap";

export default function TablaItemsEPP({
  items,
  onCambiarCantidad,
  onEliminar,
  editable = true
}) {
  if (!items || items.length === 0) {
    return (
      <div style={vacio}>
        No hay EPPS agregados a la solicitud.
      </div>
    );
  }

  return (
    <div style={tablaBox}>
      <table style={tabla}>
        <thead>
          <tr>
            <th style={th}>SAP</th>
            <th style={th}>Descripción</th>
            <th style={th}>Unidad</th>
            <th style={th}>Cantidad</th>
            {editable && <th style={th}>Quitar</th>}
          </tr>
        </thead>

        <tbody>
          {items.map((item) => (
            <tr key={item.id_epp}>
              <td style={td}>
                {item.sap_visual || formatearSAPVisual(item.sap)}
              </td>

              <td style={td}>{item.descripcion}</td>

              <td style={td}>{item.unidad}</td>

              <td style={td}>
                {editable ? (
                  <input
                    type="number"
                    min="1"
                    value={item.cantidad}
                    onChange={(e) =>
                      onCambiarCantidad(item.id_epp, e.target.value)
                    }
                    style={inputCantidad}
                  />
                ) : (
                  item.cantidad
                )}
              </td>

              {editable && (
                <td style={td}>
                  <button
                    onClick={() => onEliminar(item.id_epp)}
                    style={btnEliminar}
                  >
                    ✕
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const tablaBox = {
  overflowX: "auto",
  background: "white",
  borderRadius: "12px",
  border: "1px solid #ddd"
};

const tabla = {
  width: "100%",
  borderCollapse: "collapse"
};

const th = {
  background: "#b8682a",
  color: "white",
  padding: "10px",
  textAlign: "left",
  whiteSpace: "nowrap"
};

const td = {
  padding: "10px",
  borderBottom: "1px solid #eee",
  whiteSpace: "nowrap"
};

const inputCantidad = {
  width: "90px",
  padding: "8px",
  borderRadius: "6px",
  border: "1px solid #ccc"
};

const btnEliminar = {
  padding: "6px 10px",
  border: "none",
  borderRadius: "6px",
  background: "#e84118",
  color: "white",
  cursor: "pointer"
};

const vacio = {
  padding: "15px",
  background: "white",
  borderRadius: "12px",
  border: "1px solid #ddd",
  color: "#666"
};