import { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

function limpiarQR(decodedText) {
  let codigo = String(decodedText || "");

  if (codigo.includes("SAP:")) {
    codigo = codigo.replace("SAP:", "");
  }

  if (codigo.includes("/smds/")) {
    codigo = codigo.split("/smds/")[1];
  }

  return codigo.replace(/\D/g, "").slice(0, 10);
}

export default function ScannerQR({ onScan, activo }) {
  const scannerRef = useRef(null);
  const isRunning = useRef(false);
  const yaEscaneado = useRef(false);

  useEffect(() => {
    if (!activo) return;

    yaEscaneado.current = false;

    const scanner = new Html5Qrcode("reader");
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        async (decodedText) => {
          if (yaEscaneado.current) return;

          yaEscaneado.current = true;

          const codigoLimpio = limpiarQR(decodedText);

          console.log("QR leído:", decodedText);
          console.log("Código limpio:", codigoLimpio);

          try {
            if (isRunning.current) {
              await scanner.stop();
              isRunning.current = false;
            }
          } catch (error) {
            console.warn("Error al detener scanner:", error);
          }

          try {
            await scanner.clear();
          } catch (error) {
            console.warn("Error al limpiar scanner:", error);
          }

          onScan(codigoLimpio);
        },
        () => {}
      )
      .then(() => {
        isRunning.current = true;
      })
      .catch((error) => {
        console.error("Error iniciando cámara:", error);
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
    <div>
      <h3>Escaneando...</h3>
      <div id="reader" style={reader}></div>
    </div>
  );
}

const reader = {
  width: "320px",
  maxWidth: "100%",
  borderRadius: "12px",
  overflow: "hidden"
};