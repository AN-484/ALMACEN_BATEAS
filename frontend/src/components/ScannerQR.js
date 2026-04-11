import { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

export default function ScannerQR({ onScan, activo }) {
  const scannerRef = useRef(null);
  const isRunning = useRef(false);

  useEffect(() => {
    if (!activo) return;

    const scanner = new Html5Qrcode("reader");
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        (decodedText) => {
          console.log("QR leído:", decodedText);

          // 🔥 LIMPIAR FORMATO DEL QR
          let codigoLimpio = decodedText;

          if (decodedText.includes("SAP:")) {
            codigoLimpio = decodedText.replace("SAP:", "");
          }

          if (decodedText.includes("/smds/")) {
            codigoLimpio = decodedText.split("/smds/")[1];
          }

          console.log("Código limpio:", codigoLimpio);

          onScan(codigoLimpio);

          if (isRunning.current) {
            scanner.stop().then(() => {
              isRunning.current = false;
            });
          }
        },
        () => {}
      )
      .then(() => {
        isRunning.current = true;
      });

    return () => {
      if (scannerRef.current && isRunning.current) {
        scannerRef.current
          .stop()
          .then(() => {
            isRunning.current = false;
          })
          .catch(() => {});
      }
    };
  }, [activo, onScan]);

  if (!activo) return null;

  return (
    <div>
      <h3>Escaneando...</h3>
      <div id="reader" style={{ width: "300px" }}></div>
    </div>
  );
}