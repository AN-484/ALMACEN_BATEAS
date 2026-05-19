import { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

export default function ScannerGuiaQR({ activo, onScan }) {
  const scannerRef = useRef(null);
  const isRunning = useRef(false);
  const yaEscaneado = useRef(false);

  useEffect(() => {
    if (!activo) return;

    yaEscaneado.current = false;

    const scanner = new Html5Qrcode("reader-guia-qr");
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: 250
        },
        async (decodedText) => {
          if (yaEscaneado.current) return;

          yaEscaneado.current = true;

          try {
            if (isRunning.current) {
              await scanner.stop();
              isRunning.current = false;
            }
          } catch (error) {
            console.warn("Error al detener scanner QR guía:", error);
          }

          try {
            await scanner.clear();
          } catch {}

          onScan(decodedText);
        },
        () => {}
      )
      .then(() => {
        isRunning.current = true;
      })
      .catch((error) => {
        console.error("Error iniciando cámara QR guía:", error);
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
    <div style={card}>
      <div style={header}>
        <h4 style={{ margin: 0 }}>Escaneando QR</h4>
        <span style={hint}>Apunte al QR de la guía o factura</span>
      </div>

      <div id="reader-guia-qr" style={reader}></div>
    </div>
  );
}

const card = {
  marginTop: "15px",
  background: "white",
  padding: "15px",
  borderRadius: "12px",
  border: "1px solid #ddd",
  boxShadow: "0 0 8px rgba(0,0,0,0.08)"
};

const header = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  flexWrap: "wrap",
  marginBottom: "10px"
};

const hint = {
  color: "#666",
  fontSize: "13px"
};

const reader = {
  width: "320px",
  maxWidth: "100%",
  borderRadius: "12px",
  overflow: "hidden"
};