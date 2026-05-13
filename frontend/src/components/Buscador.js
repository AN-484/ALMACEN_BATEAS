import { useState } from "react";
import { productos } from "../data/productos";
import ScannerQR from "./ScannerQR";

export default function Buscador() {
  const [codigo, setCodigo] = useState("");
  const [resultado, setResultado] = useState(null);
  const [activarCamara, setActivarCamara] = useState(false);

  const buscarProducto = (codigoBuscar) => {
    const encontrado = productos.find(
      (p) => p.codigo_sap === codigoBuscar
    );

    setResultado(encontrado);
    setCodigo(codigoBuscar);
    setActivarCamara(false); // 🔥 apaga cámara después de escanear
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Buscar Hoja SMDS</h2>

      <input
        type="text"
        placeholder="Código SAP"
        value={codigo}
        onChange={(e) => setCodigo(e.target.value.toUpperCase())}
      />

      <button onClick={() => buscarProducto(codigo)}>
        Buscar
      </button>

      <hr />

      {/* 🔥 BOTÓN DE CÁMARA */}
      <button onClick={() => setActivarCamara(true)}>
        📷 Abrir cámara
      </button>

      <button onClick={() => setActivarCamara(false)}>
        ❌ Cerrar cámara
      </button>

      <ScannerQR
        onScan={buscarProducto}
        activo={activarCamara}
      />

      {resultado ? (
        <div style={{ marginTop: "20px" }}>
          <h3>{resultado.nombre}</h3>

          <iframe
            src={resultado.pdf}
            width="100%"
            height="500px"
            title="SMDS"
            style={{
              border: "1px solid #ccc",
              borderRadius: "10px"
            }}
          ></iframe>
        </div>
      ) : (
        codigo && <p>No encontrado</p>
      )}
    </div>
  );
}