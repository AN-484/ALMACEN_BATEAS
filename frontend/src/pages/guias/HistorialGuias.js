import { useEffect, useState } from "react";
import { apiDelete, apiGet, apiPut } from "../../services/api";
import { formatearFecha } from "./utils/formatear";

export default function HistorialGuias() {
  const [documentos, setDocumentos] = useState([]);
  const [directorios, setDirectorios] = useState([]);
  const [tipos, setTipos] = useState([]);

  const [q, setQ] = useState("");
  const [idDirectorio, setIdDirectorio] = useState("");
  const [idTipo, setIdTipo] = useState("");
  const [cargando, setCargando] = useState(false);

  const [editando, setEditando] = useState(null);
    const [formEdit, setFormEdit] = useState({
    id_tipo: "",
    id_directorio: "",
    ruc_proveedor: "",
    nombre_proveedor: "",
    numero_guia_factura: "",
    numero_documento: "",
    orden_compra_servicio: ""
    });

    const usuarioCodigo = localStorage.getItem("codigo") || "";

    const puedeModificarDoc = (doc) => {
    return doc.usuario_registra === usuarioCodigo;
    };

    const abrirEditar = (doc) => {
    setEditando(doc);

    setFormEdit({
        id_tipo: doc.id_tipo || "",
        id_directorio: doc.id_directorio || "",
        ruc_proveedor: doc.ruc_proveedor || "",
        nombre_proveedor: doc.proveedor?.nombre || "",
        numero_guia_factura: doc.numero_guia_factura || "",
        numero_documento: doc.numero_documento || "",
        orden_compra_servicio: doc.orden_compra_servicio || ""
    });

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
    };

    const guardarEdicion = async () => {
        try {
            if (!editando) return;

            if (!formEdit.id_tipo || !formEdit.id_directorio || !formEdit.ruc_proveedor || !formEdit.numero_guia_factura) {
            alert("Complete los campos obligatorios");
            return;
            }

            if (formEdit.ruc_proveedor.length !== 11) {
            alert("El RUC debe tener 11 dígitos");
            return;
            }

            if (!formEdit.nombre_proveedor.trim()) {
            alert("Ingrese nombre del proveedor");
            return;
            }

            if (formEdit.numero_documento && formEdit.numero_documento.length !== 10) {
            alert("El N° documento debe tener 10 dígitos");
            return;
            }

            if (formEdit.orden_compra_servicio && formEdit.orden_compra_servicio.length !== 10) {
            alert("La OC/OS debe tener 10 dígitos");
            return;
            }

            const res = await apiPut(`/api/guias/documentos/${editando.id_documento}`, formEdit);

            if (res.success) {
            alert("Documento actualizado correctamente");
            setEditando(null);
            cargar();
            }
        } catch (error) {
            console.error(error);
            alert(error.message || "No se pudo actualizar documento");
        }
    };

    const eliminarDocumento = async (doc) => {
        const ok = window.confirm(
            `¿Eliminar el documento ${doc.id_documento}?\n\nSe ocultará del historial, pero el archivo se conservará en R2 por seguridad.`
        );

        if (!ok) return;

        try {
            const res = await apiDelete(`/api/guias/documentos/${doc.id_documento}`);

            if (res.success) {
            alert("Documento eliminado correctamente");
            cargar();
            }
        } catch (error) {
            console.error(error);
            alert(error.message || "No se pudo eliminar documento");
        }
    };

  const cargarCatalogos = async () => {
    try {
      const [resDir, resTipos] = await Promise.all([
        apiGet("/api/guias/directorios"),
        apiGet("/api/guias/tipos")
      ]);

      if (resDir.success) setDirectorios(resDir.data || []);
      if (resTipos.success) setTipos(resTipos.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const cargar = async () => {
    try {
      setCargando(true);

      const params = new URLSearchParams();

      if (q.trim()) params.append("q", q.trim());
      if (idDirectorio) params.append("id_directorio", idDirectorio);
      if (idTipo) params.append("id_tipo", idTipo);

      const res = await apiGet(`/api/guias/documentos?${params.toString()}`);

      if (res.success) {
        setDocumentos(res.data || []);
      }
    } catch (error) {
      console.error(error);
      alert("No se pudo cargar documentos");
    } finally {
      setCargando(false);
    }
  };

  const abrirDocumento = async (idDocumento) => {
    try {
      const res = await apiGet(`/api/guias/documentos/${idDocumento}/link`);

      if (res.success) {
        window.open(res.data.urlTemporal, "_blank");
      }
    } catch (error) {
      console.error(error);
      alert("No se pudo generar link temporal");
    }
  };

  useEffect(() => {
    cargarCatalogos();
    cargar();
  }, []);

  return (
    <div>
      <div style={card}>
        <div style={header}>
          <div>
            <h3 style={{ margin: 0 }}>Historial de guías / facturas</h3>
            <p style={subtitulo}>
              Consulta documentos registrados y genera links temporales.
            </p>
          </div>

          <button onClick={cargar} style={btnActualizar}>
            Actualizar
          </button>
        </div>

        <div style={filtros}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === "Enter") cargar();
            }}
            placeholder="Buscar por guía, factura, documento, OC/OS o RUC"
            style={input}
          />

          <select
            value={idDirectorio}
            onChange={(e) => setIdDirectorio(e.target.value)}
            style={input}
          >
            <option value="">Todos los directorios</option>
            {directorios.map(d => (
              <option key={d.id_directorio} value={d.id_directorio}>
                {d.nombre}
              </option>
            ))}
          </select>

          <select
            value={idTipo}
            onChange={(e) => setIdTipo(e.target.value)}
            style={input}
          >
            <option value="">Todos los tipos</option>
            {tipos.map(t => (
              <option key={t.id_tipo} value={t.id_tipo}>
                {t.descripcion}
              </option>
            ))}
          </select>

          <button onClick={cargar} style={btnBuscar}>
            Buscar
          </button>
        </div>
      </div>

      {editando && (
        <div style={editCard}>
            <div style={editHeader}>
            <div>
                <h3 style={{ margin: 0 }}>Editando documento</h3>
                <p style={subtitulo}>{editando.id_documento}</p>
            </div>

            <button
                onClick={() => setEditando(null)}
                style={btnCancelar}
            >
                Cancelar
            </button>
            </div>

            <div style={filtros}>
            <select
                value={formEdit.id_tipo}
                onChange={(e) => setFormEdit({ ...formEdit, id_tipo: e.target.value })}
                style={input}
            >
                {tipos.map(t => (
                <option key={t.id_tipo} value={t.id_tipo}>
                    {t.descripcion}
                </option>
                ))}
            </select>

            <select
                value={formEdit.id_directorio}
                onChange={(e) => setFormEdit({ ...formEdit, id_directorio: e.target.value })}
                style={input}
            >
                {directorios.map(d => (
                <option key={d.id_directorio} value={d.id_directorio}>
                    {d.nombre}
                </option>
                ))}
            </select>

            <input
                value={formEdit.ruc_proveedor}
                maxLength={11}
                onChange={(e) =>
                setFormEdit({
                    ...formEdit,
                    ruc_proveedor: e.target.value.replace(/\D/g, "").slice(0, 11)
                })
                }
                placeholder="RUC proveedor"
                style={input}
            />

            <input
                value={formEdit.nombre_proveedor}
                onChange={(e) =>
                setFormEdit({
                    ...formEdit,
                    nombre_proveedor: e.target.value.toUpperCase()
                })
                }
                placeholder="Nombre proveedor"
                style={input}
            />

            <input
                value={formEdit.numero_guia_factura}
                onChange={(e) =>
                setFormEdit({
                    ...formEdit,
                    numero_guia_factura: e.target.value.toUpperCase()
                })
                }
                placeholder="N° guía/factura"
                style={input}
            />

            <input
                value={formEdit.numero_documento}
                maxLength={10}
                onChange={(e) =>
                setFormEdit({
                    ...formEdit,
                    numero_documento: e.target.value.replace(/\D/g, "").slice(0, 10)
                })
                }
                placeholder="N° documento 10 dígitos"
                style={input}
            />

            <input
                value={formEdit.orden_compra_servicio}
                maxLength={10}
                onChange={(e) =>
                setFormEdit({
                    ...formEdit,
                    orden_compra_servicio: e.target.value.replace(/\D/g, "").slice(0, 10)
                })
                }
                placeholder="OC/OS 10 dígitos"
                style={input}
            />

            <button onClick={guardarEdicion} style={btnGuardarEdit}>
                Guardar cambios
            </button>
            </div>
        </div>
        )}

      {cargando && <p>Cargando documentos...</p>}

      {!cargando && documentos.length === 0 && (
        <div style={vacio}>
          No hay documentos registrados.
        </div>
      )}

      <div style={grid}>
        {documentos.map(doc => (
          <div key={doc.id_documento} style={docCard}>
            <div style={topCard}>
              <span style={badge}>
                {doc.tipo?.descripcion || doc.id_tipo}
              </span>

              <span style={fecha}>
                {formatearFecha(doc.fecha_registro)}
              </span>
            </div>

            <h3 style={titulo}>{doc.numero_guia_factura}</h3>

            <p style={meta}>
              <b>ID:</b> {doc.id_documento}
            </p>

            <p style={meta}>
              <b>Directorio:</b> {doc.directorio?.nombre}
            </p>

            <p style={meta}>
              <b>Proveedor:</b> {doc.proveedor?.nombre}
            </p>

            <p style={meta}>
              <b>RUC:</b> {doc.ruc_proveedor}
            </p>

            <p style={meta}>
              <b>OC/OS:</b> {doc.orden_compra_servicio || "-"}
            </p>

            <button
              onClick={() => abrirDocumento(doc.id_documento)}
              style={btnVer}
            >
              Ver / Descargar PDF
            </button>

            {puedeModificarDoc(doc) && (
            <div style={accionesDoc}>
                <button
                onClick={() => abrirEditar(doc)}
                style={btnEditar}
                >
                Editar
                </button>

                <button
                onClick={() => eliminarDocumento(doc)}
                style={btnEliminar}
                >
                Eliminar
                </button>
            </div>
            )}

          </div>
        ))}
      </div>
    </div>
  );
}

const card = {
  background: "white",
  padding: "18px",
  borderRadius: "14px",
  boxShadow: "0 0 10px rgba(0,0,0,0.1)",
  marginBottom: "20px"
};

const header = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  flexWrap: "wrap",
  marginBottom: "15px"
};

const subtitulo = {
  margin: "6px 0 0",
  color: "#666"
};

const filtros = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "10px"
};

const input = {
  padding: "10px",
  borderRadius: "8px",
  border: "1px solid #ccc"
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

const btnBuscar = {
  ...btnActualizar,
  background: "#40739e"
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
  gap: "15px"
};

const docCard = {
  background: "white",
  padding: "18px",
  borderRadius: "14px",
  boxShadow: "0 0 10px rgba(0,0,0,0.1)"
};

const topCard = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  marginBottom: "10px"
};

const badge = {
  background: "#273c75",
  color: "white",
  padding: "5px 9px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: "bold"
};

const fecha = {
  fontSize: "12px",
  color: "#666"
};

const titulo = {
  color: "#273c75",
  margin: "8px 0"
};

const meta = {
  margin: "5px 0",
  color: "#555",
  fontSize: "14px"
};

const btnVer = {
  marginTop: "12px",
  padding: "10px 14px",
  border: "none",
  borderRadius: "8px",
  background: "#44bd32",
  color: "white",
  cursor: "pointer",
  fontWeight: "bold"
};

const vacio = {
  background: "white",
  padding: "18px",
  borderRadius: "14px",
  boxShadow: "0 0 10px rgba(0,0,0,0.1)",
  color: "#666"
};

const accionesDoc = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  marginTop: "10px"
};

const btnEditar = {
  padding: "9px 12px",
  border: "none",
  borderRadius: "8px",
  background: "#e1b12c",
  color: "#000",
  cursor: "pointer",
  fontWeight: "bold"
};

const btnEliminar = {
  ...btnEditar,
  background: "#e84118",
  color: "white"
};

const editCard = {
  background: "#fff8d6",
  border: "1px solid #fbc531",
  padding: "18px",
  borderRadius: "14px",
  marginBottom: "20px"
};

const editHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
  marginBottom: "15px"
};

const btnCancelar = {
  padding: "9px 12px",
  border: "none",
  borderRadius: "8px",
  background: "#718093",
  color: "white",
  cursor: "pointer",
  fontWeight: "bold"
};

const btnGuardarEdit = {
  padding: "10px 14px",
  border: "none",
  borderRadius: "8px",
  background: "#273c75",
  color: "white",
  cursor: "pointer",
  fontWeight: "bold"
};