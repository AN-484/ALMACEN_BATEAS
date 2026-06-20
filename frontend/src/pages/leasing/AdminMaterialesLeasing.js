import { useCallback, useEffect, useState } from "react";
import Layout from "../../components/Layout";
import { apiGet, apiPut, apiDelete } from "../../services/api";

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

function soloDigitos(v) {
  return String(v || "").replace(/\D/g, "");
}

export default function AdminMaterialesLeasing() {
  const esAdmin = String(localStorage.getItem("puede_datos")) === "SI";

  const [busqueda, setBusqueda] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [materiales, setMateriales] = useState([]);
  const [materialEditando, setMaterialEditando] = useState(null);
  const [form, setForm] = useState({});
  const [guardando, setGuardando] = useState(false);

  const buscar = useCallback(async (texto) => {
    const valor = String(texto || "").trim();

    if (valor.length < 2) {
      setMateriales([]);
      return;
    }

    try {
      setBuscando(true);
      const res = await apiGet(
        `/api/leasing/materiales?q=${encodeURIComponent(valor)}`
      );

      if (res.success) {
        setMateriales(res.data || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setBuscando(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (busqueda.trim().length >= 2) {
        buscar(busqueda);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [busqueda, buscar]);

  const abrirEdicion = (mat) => {
    setMaterialEditando(mat);
    setForm({
      codigo: String(mat.codigo || ""),
      descripcion: mat.descripcion || "",
      referencia: mat.referencia || "",
      ubicacion: mat.ubicacion || "",
      placa: mat.placa ? String(mat.placa) : ""
    });
  };

  const cerrarEdicion = () => {
    setMaterialEditando(null);
    setForm({});
  };

  const guardarEdicion = async () => {
    try {
      if (!form.descripcion.trim()) {
        alert("La descripción es obligatoria.");
        return;
      }

      if (form.codigo && form.codigo.length !== 10) {
        alert("El código debe tener 10 dígitos.");
        return;
      }

      if (form.placa && form.placa.length !== 9) {
        alert("La placa debe tener 9 dígitos.");
        return;
      }

      setGuardando(true);

      const payload = {
        codigo: form.codigo ? Number(form.codigo) : null,
        descripcion: form.descripcion.trim().toUpperCase(),
        referencia: form.referencia.trim() || null,
        ubicacion: form.ubicacion.trim().toUpperCase() || null,
        placa: form.placa ? Number(form.placa) : null
      };

      const res = await apiPut(`/api/leasing/materiales/${materialEditando.id}`, payload);

      if (res.success) {
        alert(`Material ${materialEditando.id} actualizado.`);
        setMateriales((prev) =>
          prev.map((m) => (m.id === materialEditando.id ? res.data : m))
        );
        cerrarEdicion();
      }
    } catch (error) {
      console.error(error);
      alert(error.message || "No se pudo guardar el material");
    } finally {
      setGuardando(false);
    }
  };

  const eliminarMaterial = async (mat) => {
    const confirmar = window.confirm(
      `¿Confirma la eliminación del material ${mat.id}?\n` +
      `Descripción: ${mat.descripcion}\n` +
      `Se marcará como estado = 0 con fecha de hoy.`
    );

    if (!confirmar) return;

    try {
      setGuardando(true);
      const res = await apiDelete(`/api/leasing/materiales/${mat.id}`);

      if (res.success) {
        alert(`Material ${mat.id} eliminado. Fecha: ${res.data.date_elim}`);
        setMateriales((prev) => prev.filter((m) => m.id !== mat.id));

        if (materialEditando?.id === mat.id) {
          cerrarEdicion();
        }
      }
    } catch (error) {
      console.error(error);
      alert(error.message || "No se pudo eliminar el material");
    } finally {
      setGuardando(false);
    }
  };

  if (!esAdmin) {
    return (
      <Layout>
        <div style={alertBox}>No tiene permisos para acceder a esta sección.</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={page}>
        <div style={headerCard}>
          <div>
            <h2 style={{ margin: 0 }}>Gestión de Materiales LEASING</h2>
            <p style={{ margin: "6px 0 0", color: "rgba(255,255,255,0.8)" }}>
              Solo administradores. Modificación y eliminación directa de materiales.
            </p>
          </div>
        </div>

        <section style={sectionCard}>
          <h3 style={sectionTitle}>Buscar material</h3>

          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value.toUpperCase())}
            placeholder="Escriba código o descripción (mínimo 2 caracteres)"
            style={inputSearch}
          />

          {buscando ? <p style={helperText}>Buscando...</p> : null}

          {!buscando && busqueda.trim().length >= 2 && materiales.length === 0 ? (
            <p style={helperText}>Sin resultados.</p>
          ) : null}

          {materiales.length > 0 ? (
            <div style={{ marginTop: 12 }}>
              <table style={tabla}>
                <thead>
                  <tr>
                    {["ID", "Código", "Descripción", "Referencia", "Ubicación", "Placa", "Acciones"].map(
                      (h) => (
                        <th key={h} style={th}>{h}</th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {materiales.map((mat) => (
                    <tr key={mat.id} style={materialEditando?.id === mat.id ? trActivo : trNormal}>
                      <td style={td}>{mat.id}</td>
                      <td style={td}>{mat.codigo}</td>
                      <td style={td}>{mat.descripcion}</td>
                      <td style={td}>{mat.referencia || "-"}</td>
                      <td style={td}>{mat.ubicacion || "-"}</td>
                      <td style={td}>{mat.placa || "-"}</td>
                      <td style={td}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            onClick={() => abrirEdicion(mat)}
                            style={btnEdit}
                            disabled={guardando}
                          >
                            ✏️ Editar
                          </button>
                          <button
                            onClick={() => eliminarMaterial(mat)}
                            style={btnDel}
                            disabled={guardando}
                          >
                            🗑️ Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>

        {materialEditando ? (
          <section style={sectionCard}>
            <h3 style={sectionTitle}>Editando: {materialEditando.id} — {materialEditando.descripcion}</h3>

            <div style={grid2}>
              <Campo label="Código (10 dígitos)">
                <input
                  value={form.codigo}
                  maxLength={10}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, codigo: soloDigitos(e.target.value).slice(0, 10) }))
                  }
                  style={input}
                />
              </Campo>

              <Campo label="Descripción">
                <input
                  value={form.descripcion}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, descripcion: e.target.value.toUpperCase() }))
                  }
                  style={input}
                />
              </Campo>

              <Campo label="Referencia">
                <input
                  value={form.referencia}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, referencia: e.target.value.toUpperCase() }))
                  }
                  style={input}
                />
              </Campo>

              <Campo label="Ubicación">
                <input
                  value={form.ubicacion}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, ubicacion: e.target.value.toUpperCase() }))
                  }
                  style={input}
                />
              </Campo>

              <Campo label="Placa (9 dígitos)">
                <input
                  value={form.placa}
                  maxLength={9}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, placa: soloDigitos(e.target.value).slice(0, 9) }))
                  }
                  style={input}
                />
              </Campo>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button
                onClick={guardarEdicion}
                disabled={guardando}
                style={guardando ? btnDisabled : btnPrimary}
              >
                {guardando ? "Guardando..." : "Guardar cambios"}
              </button>

              <button onClick={cerrarEdicion} style={btnSecondary} disabled={guardando}>
                Cancelar
              </button>
            </div>
          </section>
        ) : null}
      </div>
    </Layout>
  );
}

function Campo({ label, children }) {
  return (
    <label style={{ display: "grid", gap: 8 }}>
      <span style={{ fontSize: 13, color: "#4a5568", fontWeight: 700 }}>{label}</span>
      {children}
    </label>
  );
}

const page = { display: "grid", gap: 16 };

const headerCard = {
  background: "linear-gradient(135deg, #7b1c1c 0%, #c0392b 100%)",
  color: "white",
  padding: "18px 20px",
  borderRadius: 16,
  boxShadow: "0 10px 30px rgba(192,57,43,0.2)"
};

const sectionCard = {
  background: "white",
  borderRadius: 16,
  padding: 18,
  boxShadow: "0 10px 24px rgba(31,45,82,0.08)"
};

const sectionTitle = { margin: 0, marginBottom: 10 };
const helperText = { margin: 0, color: "#5b6270", fontSize: 13 };

const inputSearch = {
  width: "100%",
  border: "1px solid #cdd4e0",
  borderRadius: 10,
  padding: "12px 14px",
  boxSizing: "border-box",
  fontSize: 14
};

const input = {
  width: "100%",
  border: "1px solid #cdd4e0",
  borderRadius: 10,
  padding: "11px 12px",
  boxSizing: "border-box",
  fontSize: 14
};

const grid2 = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 14
};

const tabla = { width: "100%", borderCollapse: "collapse", fontSize: 13 };
const th = {
  textAlign: "left",
  padding: "8px 10px",
  background: "#f0f4fa",
  borderBottom: "1px solid #d7dfea",
  fontWeight: 700
};
const td = { padding: "8px 10px", borderBottom: "1px solid #edf0f5" };
const trNormal = {};
const trActivo = { background: "#eef4ff" };

const btnEdit = {
  padding: "5px 10px",
  border: "none",
  borderRadius: 6,
  background: "#273c75",
  color: "white",
  cursor: "pointer",
  fontSize: 12
};

const btnDel = {
  padding: "5px 10px",
  border: "none",
  borderRadius: 6,
  background: "#c0392b",
  color: "white",
  cursor: "pointer",
  fontSize: 12
};

const btnPrimary = {
  padding: "11px 16px",
  border: "none",
  borderRadius: 10,
  background: "#273c75",
  color: "white",
  cursor: "pointer",
  fontWeight: 700
};

const btnDisabled = { ...btnPrimary, background: "#7f8c9b", cursor: "not-allowed" };

const btnSecondary = {
  padding: "11px 16px",
  border: "1px solid #cdd4e0",
  borderRadius: 10,
  background: "white",
  cursor: "pointer",
  fontWeight: 700
};

const alertBox = {
  padding: "14px 16px",
  borderRadius: 10,
  background: "#fdf2f2",
  color: "#c0392b",
  fontWeight: 600
};
