import { useEffect, useRef, useState } from "react";

/**
 * SccoComboBox — filtro inteligente: permite escribir para filtrar opciones
 * Y también abrir el listado completo con la flecha.
 *
 * Props:
 *  options      [{value, label}]   Lista de opciones
 *  value        string             Valor seleccionado (controlado)
 *  onChange     (value) => void    Callback al seleccionar
 *  placeholder  string             Texto de ayuda en el input
 *  disabled     bool
 *  emptyLabel   string             Texto de la opción "todos / ninguno"
 *  wrapperStyle object             Estilos extras para el contenedor
 *  dropdownDirection "down"|"up"  Dirección de apertura de opciones
 */
export default function SccoComboBox({
  options = [],
  value = "",
  onChange,
  placeholder = "Buscar o seleccionar...",
  disabled = false,
  emptyLabel = "Todos",
  wrapperStyle = {},
  dropdownDirection = "down"
}) {
  const [texto, setTexto] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [hoveredValue, setHoveredValue] = useState(null);
  const containerRef = useRef(null);

  // Sincronizar texto visible con el value externo
  useEffect(() => {
    if (value === "" || value === null || value === undefined) {
      setTexto("");
    } else {
      const opcion = options.find((o) => String(o.value) === String(value));
      setTexto(opcion ? opcion.label : String(value));
    }
  }, [value, options]);

  // Cerrar al hacer click fuera; restaurar texto si no se seleccionó nada
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setAbierto(false);
        setHoveredValue(null);
        if (value) {
          const opcion = options.find((o) => String(o.value) === String(value));
          setTexto(opcion ? opcion.label : "");
        } else {
          setTexto("");
        }
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [value, options]);

  // Filtrar opciones según texto escrito
  const opcionesFiltradas = texto.trim()
    ? options.filter((o) =>
        o.label.toLowerCase().includes(texto.toLowerCase())
      )
    : options;

  const seleccionar = (opcion) => {
    onChange(opcion.value);
    setTexto(opcion.label);
    setAbierto(false);
    setHoveredValue(null);
  };

  const limpiarSeleccion = () => {
    onChange("");
    setTexto("");
    setAbierto(false);
    setHoveredValue(null);
  };

  const alCambiarTexto = (e) => {
    const nuevo = e.target.value;
    setTexto(nuevo);
    setAbierto(true);
    if (!nuevo.trim()) {
      onChange("");
    }
  };

  const bgOpcion = (val) => {
    if (String(val) === String(value)) return "#e8f5ef";
    if (String(val) === String(hoveredValue)) return "#f4faf7";
    return "white";
  };

  const abreArriba = dropdownDirection === "up";

  return (
    <div ref={containerRef} style={{ position: "relative", ...wrapperStyle }}>
      <div style={{ display: "flex" }}>
        <input
          type="text"
          value={texto}
          onChange={alCambiarTexto}
          onFocus={() => { if (!disabled) setAbierto(true); }}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          style={estiloInput(disabled)}
        />
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            if (!disabled) setAbierto((prev) => !prev);
          }}
          disabled={disabled}
          tabIndex={-1}
          style={estiloFlecha(disabled)}
          title="Ver opciones"
        >
          {abierto ? "▴" : "▾"}
        </button>
      </div>

      {abierto && !disabled && (
        <div style={estiloDropdown(abreArriba)}>
          {/* Opción "vacío" */}
          <div
            style={{
              ...estiloOpcion,
              color: "#888",
              fontStyle: "italic",
              background: !value ? "#f4faf7" : "white"
            }}
            onMouseDown={limpiarSeleccion}
            onMouseEnter={() => setHoveredValue("__empty__")}
            onMouseLeave={() => setHoveredValue(null)}
          >
            — {emptyLabel} —
          </div>

          {opcionesFiltradas.map((opcion) => (
            <div
              key={opcion.value}
              style={{
                ...estiloOpcion,
                background: bgOpcion(opcion.value),
                fontWeight: String(opcion.value) === String(value) ? "bold" : "normal",
                color: String(opcion.value) === String(value) ? "#1f7a4d" : "#333"
              }}
              onMouseDown={() => seleccionar(opcion)}
              onMouseEnter={() => setHoveredValue(opcion.value)}
              onMouseLeave={() => setHoveredValue(null)}
            >
              {opcion.label}
            </div>
          ))}

          {opcionesFiltradas.length === 0 && (
            <div style={{ ...estiloOpcion, color: "#aaa", fontStyle: "italic" }}>
              Sin resultados para &ldquo;{texto}&rdquo;
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const estiloInput = (disabled) => ({
  flex: 1,
  minWidth: 0,
  padding: "10px",
  borderRadius: "6px 0 0 6px",
  border: "1px solid #ccc",
  borderRight: "none",
  boxSizing: "border-box",
  outline: "none",
  fontSize: "14px",
  background: disabled ? "#e9ecef" : "white",
  color: disabled ? "#666" : "#222",
  cursor: disabled ? "not-allowed" : "text"
});

const estiloFlecha = (disabled) => ({
  padding: "0 11px",
  border: "1px solid #ccc",
  borderLeft: "1px solid #e0e0e0",
  borderRadius: "0 6px 6px 0",
  background: disabled ? "#e9ecef" : "#f5f6fa",
  cursor: disabled ? "not-allowed" : "pointer",
  color: disabled ? "#aaa" : "#555",
  fontSize: "12px",
  lineHeight: "1",
  flexShrink: 0
});

const estiloDropdown = (abreArriba) => ({
  position: "absolute",
  top: abreArriba ? "auto" : "100%",
  bottom: abreArriba ? "100%" : "auto",
  left: 0,
  right: 0,
  background: "white",
  border: "1px solid #b5d9c6",
  borderTop: abreArriba ? "1px solid #b5d9c6" : "none",
  borderBottom: abreArriba ? "none" : "1px solid #b5d9c6",
  borderRadius: abreArriba ? "8px 8px 0 0" : "0 0 8px 8px",
  boxShadow: "0 6px 20px rgba(10, 60, 35, 0.13)",
  zIndex: 1000,
  maxHeight: "220px",
  overflowY: "auto"
});

const estiloOpcion = {
  padding: "9px 12px",
  cursor: "pointer",
  borderBottom: "1px solid #f0f0f0",
  fontSize: "14px",
  userSelect: "none"
};
