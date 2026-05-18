import { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { limpiarSAP } from "../utils/sap";

function limpiarQR(decodedText) {
  let codigo = String(decodedText || "");

  if (codigo.includes("SAP:")) {
    codigo = codigo.replace("SAP:", "");
  }

  if (codigo.includes("/epps/")) {
    codigo = codigo.split("/epps/")[1];
  }

  return limpiarSAP(codigo);
}

export default function ScannerEPPQR({ activo, onScan }) {
  const scannerRef = useRef(null);
  const isRunning = useRef(false);
  const yaEscaneado = useRef(false);

  useEffect(() => {
    if (!activo) return;

    yaEscaneado.current = false;

    const scanner = new Html5Qrcode("reader-epp");
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        async (decodedText) => {
          if (yaEscaneado.current) return;

          yaEscaneado.current = true;

          const codigoLimpio = limpiarQR(decodedText);

          try {
            if (isRunning.current) {
              await scanner.stop();
              isRunning.current = false;
            }
          } catch {}

          try {
            await scanner.clear();
          } catch {}

          onScan(codigoLimpio);
        },
        () => {}
      )
      .then(() => {
        isRunning.current = true;
      })
      .catch((error) => {
        console.error("Error iniciando cámara EPP:", error);
      });

    return () => {
      if (scannerRef.current && isRunning.current) {
        scannerRef.current
          .stop()
          .then(() => {
            isRunning.current = false;
            return scannerRef.current.clear();
          })
          .catch(() => {});
      }
    };
  }, [activo]);

  if (!activo) return null;

  return (
    <div style={scannerBox}>
      <h4 style={{ marginTop: 0 }}>Escaneando EPP...</h4>
      <div id="reader-epp" style={reader}></div>
    </div>
  );
}

const scannerBox = {
  background: "white",
  padding: "15px",
  borderRadius: "12px",
  boxShadow: "0 0 10px rgba(0,0,0,0.1)",
  marginTop: "15px"
};

const reader = {
  width: "320px",
  maxWidth: "100%",
  borderRadius: "12px",
  overflow: "hidden"
};