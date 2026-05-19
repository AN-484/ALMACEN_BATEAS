import { useRef, useState } from "react";
import Tesseract from "tesseract.js";
import { parsearTextoGuiaOCR } from "../utils/ocrGuiaParser";

export default function EscanearEncabezadoOCR({ onDetectar }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [activo, setActivo] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const abrirCamara = async () => {
    try {
      setMensaje("");
      setActivo(true);

      // Esperamos a que React pinte el <video>
      setTimeout(async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: "environment",
              width: { ideal: 1920 },
              height: { ideal: 1080 }
            },
            audio: false
          });

          streamRef.current = stream;

          if (videoRef.current) {
            videoRef.current.srcObject = stream;

            videoRef.current.onloadedmetadata = async () => {
              try {
                await videoRef.current.play();
              } catch (error) {
                console.error("No se pudo reproducir video:", error);
              }
            };
          }
        } catch (error) {
          console.error(error);
          alert("No se pudo abrir la cámara");
          setActivo(false);
        }
      }, 150);
    } catch (error) {
      console.error(error);
      alert("No se pudo iniciar la cámara");
      setActivo(false);
    }
  };

  const cerrarCamara = () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }

      setActivo(false);
    } catch (error) {
      console.warn("No se pudo cerrar cámara OCR:", error);
    }
  };

  const capturarYLeer = async () => {
    try {
      if (!videoRef.current || !canvasRef.current) return;

      const video = videoRef.current;

      if (!video.videoWidth || !video.videoHeight) {
        alert("La cámara aún no está lista. Espere un momento.");
        return;
      }

      setProcesando(true);
      setMensaje("Procesando encabezado...");

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      const anchoVideo = video.videoWidth;
      const altoVideo = video.videoHeight;

      // Captura cuadrada centrada
      const cropW = Math.floor(anchoVideo * 0.42);
    const cropH = Math.floor(altoVideo * 0.82);

    const sx = Math.floor((anchoVideo - cropW) / 2);
    const sy = Math.floor((altoVideo - cropH) / 2);

    canvas.width = cropW;
    canvas.height = cropH;

    ctx.drawImage(
    video,
    sx,
    sy,
    cropW,
    cropH,
    0,
    0,
    cropW,
    cropH
    );

      mejorarImagenParaOCR(ctx, canvas.width, canvas.height);

      const dataUrl = canvas.toDataURL("image/jpeg", 0.95);

      const result = await Tesseract.recognize(dataUrl, "eng", {
        logger: () => {},
        tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-:.° NºnroRUCFACTURAGUIAREMISIONELECTRONICA "
    });

      const textoOCR = result?.data?.text || "";
      const datos = parsearTextoGuiaOCR(textoOCR);

      console.log("Texto OCR:", textoOCR);
      console.log("Datos OCR detectados:", datos);

      cerrarCamara();

      if (!datos.detectado) {
        setMensaje("No se detectó RUC o número de guía/factura. Complete manualmente.");
        return;
      }

      setMensaje("Datos detectados desde el encabezado.");
      onDetectar(datos);
    } catch (error) {
      console.error(error);
      setMensaje("No se pudo leer el encabezado. Complete manualmente.");
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div style={card}>
      <div style={header}>
        <div>
          <h4 style={{ margin: 0 }}>Escanear encabezado</h4>
          <p style={hint}>
            Enfoque la zona donde aparece RUC, serie y número.
          </p>
        </div>

        {!activo ? (
          <button onClick={abrirCamara} style={btnOCR}>
            🔎 Abrir escáner OCR
          </button>
        ) : (
          <button onClick={cerrarCamara} style={btnCerrar}>
            ⛔ Cerrar cámara
          </button>
        )}
      </div>

      {activo && (
        <div>
          <div style={previewBox}>
            <video
              ref={videoRef}
              style={video}
              playsInline
              muted
              autoPlay
            />

            <div style={cuadroGuia}>
              <span style={textoGuia}>
                Centre aquí el RUC, serie y número
              </span>
            </div>
          </div>

          <button
            onClick={capturarYLeer}
            disabled={procesando}
            style={procesando ? btnDisabled : btnCapturar}
          >
            {procesando ? "Leyendo..." : "Capturar encabezado"}
          </button>
        </div>
      )}

      {mensaje && (
        <div style={mensajeBox}>
          {mensaje}
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}

function mejorarImagenParaOCR(ctx, width, height) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    let gris = 0.299 * r + 0.587 * g + 0.114 * b;

    // Contraste moderado
    gris = gris < 145 ? gris * 0.82 : gris * 1.18;
    gris = Math.max(0, Math.min(255, gris));

    data[i] = gris;
    data[i + 1] = gris;
    data[i + 2] = gris;
  }

  ctx.putImageData(imageData, 0, 0);
}

const card = {
  marginTop: "15px",
  padding: "15px",
  background: "#f5f6fa",
  border: "1px solid #dcdde1",
  borderRadius: "12px"
};

const header = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap"
};

const hint = {
  margin: "6px 0 0",
  color: "#666",
  fontSize: "13px"
};

const btnOCR = {
  padding: "11px 16px",
  border: "none",
  borderRadius: "10px",
  background: "#8c7ae6",
  color: "white",
  cursor: "pointer",
  fontWeight: "bold"
};

const btnCerrar = {
  ...btnOCR,
  background: "#e84118"
};

const btnCapturar = {
  marginTop: "12px",
  padding: "11px 16px",
  border: "none",
  borderRadius: "10px",
  background: "#273c75",
  color: "white",
  cursor: "pointer",
  fontWeight: "bold"
};

const btnDisabled = {
  ...btnCapturar,
  background: "#718093",
  cursor: "not-allowed"
};

const previewBox = {
  position: "relative",
  marginTop: "14px",
  width: "min(520px, 100%)",
  aspectRatio: "4 / 3",
  borderRadius: "14px",
  overflow: "hidden",
  border: "2px solid #273c75",
  background: "#000"
};

const video = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
  background: "#000"
};

const cuadroGuia = {
  position: "absolute",
  width: "72%",
  aspectRatio: "1 / 1",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  border: "3px dashed #fbc531",
  borderRadius: "14px",
  background: "rgba(0,0,0,0.18)",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  paddingTop: "10px",
  boxSizing: "border-box"
};

const textoGuia = {
  background: "rgba(0,0,0,0.55)",
  color: "#fff",
  padding: "6px 10px",
  borderRadius: "8px",
  fontWeight: "bold",
  fontSize: "13px",
  textAlign: "center"
};

const mensajeBox = {
  marginTop: "12px",
  padding: "10px",
  background: "#fff8d6",
  border: "1px solid #fbc531",
  borderRadius: "8px",
  color: "#6b5200",
  fontWeight: "bold"
};