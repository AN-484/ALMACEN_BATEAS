import { useRef, useState } from "react";
import { jsPDF } from "jspdf";

export default function EscanearDocumentoPDF({ onPDFGenerado }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [activo, setActivo] = useState(false);
  const [paginas, setPaginas] = useState([]);
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [mejoraActiva, setMejoraActiva] = useState(true);
  const [recorteAuto, setRecorteAuto] = useState(true);
  const [paginaPreview, setPaginaPreview] = useState(null);

  const abrirCamara = async () => {
    try {
      setMensaje("");
      setActivo(true);

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
              await videoRef.current.play();
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
      console.warn("No se pudo cerrar cámara:", error);
    }
  };

  const capturarPagina = () => {
    try {
      if (!videoRef.current || !canvasRef.current) return;

      const video = videoRef.current;

      if (!video.videoWidth || !video.videoHeight) {
        alert("La cámara aún no está lista. Espere un momento.");
        return;
      }

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      const anchoOriginal = video.videoWidth;
      const altoOriginal = video.videoHeight;

      // Máximo ancho para mantener nitidez sin hacer PDFs gigantes.
      const anchoMax = 1800;
      const escala = Math.min(1, anchoMax / anchoOriginal);

      const ancho = Math.floor(anchoOriginal * escala);
      const alto = Math.floor(altoOriginal * escala);

      canvas.width = ancho;
        canvas.height = alto;

        ctx.drawImage(video, 0, 0, ancho, alto);

        // 1. Si está activo, recortamos la zona probable de hoja.
        if (recorteAuto) {
        aplicarRecorteAutomaticoHoja(canvas, ctx);
        }

        // 2. Luego aplicamos mejora visual.
        const nuevoAncho = canvas.width;
        const nuevoAlto = canvas.height;

        if (mejoraActiva) {
        mejorarImagenDocumentoCamScanner(ctx, nuevoAncho, nuevoAlto);
        } else {
        mejorarImagenDocumentoSuave(ctx, nuevoAncho, nuevoAlto);
        }

        const dataUrl = canvas.toDataURL("image/jpeg", mejoraActiva ? 0.9 : 0.86);

      setPaginas(prev => [
        ...prev,
        {
          id: Date.now(),
          dataUrl
        }
      ]);

      setMensaje("Página capturada correctamente.");
    } catch (error) {
      console.error(error);
      alert("No se pudo capturar la página");
    }
  };

  const quitarPagina = (id) => {
    setPaginas(prev => prev.filter(p => p.id !== id));
  };

  const limpiarPaginas = () => {
    const ok = window.confirm("¿Eliminar todas las páginas capturadas?");
    if (!ok) return;

    setPaginas([]);
    setMensaje("");
  };

  const generarPDF = async () => {
    try {
      if (paginas.length === 0) {
        alert("Capture al menos una página");
        return;
      }

      setProcesando(true);
      setMensaje("Generando PDF...");

      const pdf = new jsPDF({
        orientation: "p",
        unit: "mm",
        format: "a4",
        compress: true
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < paginas.length; i++) {
        if (i > 0) pdf.addPage();

        const img = paginas[i].dataUrl;

        const imgProps = pdf.getImageProperties(img);
        const imgWidth = imgProps.width;
        const imgHeight = imgProps.height;

        const margin = 8;
        const maxW = pageWidth - margin * 2;
        const maxH = pageHeight - margin * 2;

        const ratio = Math.min(maxW / imgWidth, maxH / imgHeight);

        const renderW = imgWidth * ratio;
        const renderH = imgHeight * ratio;

        const x = (pageWidth - renderW) / 2;
        const y = (pageHeight - renderH) / 2;

        pdf.addImage(img, "JPEG", x, y, renderW, renderH);
      }

      const blob = pdf.output("blob");

      const file = new File(
        [blob],
        `DOCUMENTO_ESCANEADO_${Date.now()}.pdf`,
        { type: "application/pdf" }
      );

      onPDFGenerado(file);

      setMensaje(`PDF generado correctamente con ${paginas.length} página(s).`);
      cerrarCamara();
    } catch (error) {
      console.error(error);
      alert("No se pudo generar el PDF");
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div style={card}>
      <div style={header}>
        <div>
          <h4 style={{ margin: 0 }}>Escanear documento</h4>
          <p style={hint}>
            Capture una o varias hojas. Luego se generará un PDF multipágina.
          </p>
        </div>

        {!activo ? (
          <button onClick={abrirCamara} style={btnAbrir}>
            📄 Abrir cámara documento
          </button>
        ) : (
          <button onClick={cerrarCamara} style={btnCerrar}>
            ⛔ Cerrar cámara
          </button>
        )}
      </div>

      <div style={opcionesMejora}>
        <label style={checkLabel}>
            <input
            type="checkbox"
            checked={mejoraActiva}
            onChange={(e) => setMejoraActiva(e.target.checked)}
            />
            Mejorar documento automáticamente
        </label>

        <label style={checkLabel}>
            <input
            type="checkbox"
            checked={recorteAuto}
            onChange={(e) => setRecorteAuto(e.target.checked)}
            />
            Recortar hoja automáticamente
        </label>

        <span style={ayudaMejora}>
            Blanquea fondo, mejora contraste y elimina bordes sobrantes.
        </span>
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

            <div style={guiaDocumento}>
            Centre toda la hoja dentro del recuadro
            </div>
          </div>

          <div style={acciones}>
            <button onClick={capturarPagina} style={btnCapturar}>
              📸 Capturar página
            </button>

            <button
              onClick={generarPDF}
              disabled={procesando || paginas.length === 0}
              style={procesando || paginas.length === 0 ? btnDisabled : btnGenerar}
            >
              {procesando ? "Generando..." : "Generar PDF"}
            </button>
          </div>
        </div>
      )}

      {paginas.length > 0 && (
        <div style={paginasBox}>
          <div style={paginasHeader}>
            <b>Páginas capturadas: {paginas.length}</b>

            <button onClick={limpiarPaginas} style={btnLimpiar}>
              Limpiar
            </button>
          </div>

          <div style={miniaturas}>
            {paginas.map((pagina, index) => (
              <div key={pagina.id} style={miniaturaCard}>
                <img
                    src={pagina.dataUrl}
                    alt={`Página ${index + 1}`}
                    style={miniatura}
                />

                <div style={miniaturaFooter}>
                    <span>Hoja {index + 1}</span>

                    <div style={miniaturaAcciones}>
                    <button
                        onClick={() =>
                        setPaginaPreview({
                            ...pagina,
                            index: index + 1
                        })
                        }
                        style={btnDetalle}
                    >
                        Ver
                    </button>

                    <button
                        onClick={() => quitarPagina(pagina.id)}
                        style={btnQuitar}
                    >
                        ✕
                    </button>
                    </div>
                </div>
                </div>
            ))}
          </div>
        </div>
      )}

      {mensaje && (
        <div style={mensajeBox}>
          {mensaje}
        </div>
      )}

      {paginaPreview && (
        <div style={modalOverlay}>
            <div style={modalContenido}>
            <div style={modalHeader}>
                <h3 style={{ margin: 0 }}>
                Vista previa - Hoja {paginaPreview.index}
                </h3>

                <button
                onClick={() => setPaginaPreview(null)}
                style={btnCerrarModal}
                >
                Cerrar
                </button>
            </div>

            <div style={modalImagenBox}>
                <img
                src={paginaPreview.dataUrl}
                alt={`Vista previa hoja ${paginaPreview.index}`}
                style={modalImagen}
                />
            </div>
            </div>
        </div>
        )}

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}

function mejorarImagenDocumentoSuave(ctx, width, height) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    r = Math.min(255, r * 1.06);
    g = Math.min(255, g * 1.06);
    b = Math.min(255, b * 1.06);

    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }

  ctx.putImageData(imageData, 0, 0);
}

function mejorarImagenDocumentoCamScanner(ctx, width, height) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Luminancia perceptual
    let gris = 0.299 * r + 0.587 * g + 0.114 * b;

    // Contraste tipo documento:
    // - fondos claros se empujan a blanco
    // - texto oscuro se oscurece
    let nuevo;

    if (gris > 205) {
      // Fondo casi blanco
      nuevo = 255;
    } else if (gris > 165) {
      // Fondo gris claro / sombras suaves
      nuevo = Math.min(255, gris * 1.28);
    } else if (gris > 110) {
      // Zona media: contraste
      nuevo = gris * 0.92;
    } else {
      // Texto oscuro
      nuevo = gris * 0.72;
    }

    nuevo = Math.max(0, Math.min(255, nuevo));

    // Mantener algo de color en sellos/firmas.
    // Si el píxel tiene mucho color, no lo volvemos totalmente gris.
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const saturacion = max - min;

    if (saturacion > 45 && gris < 210) {
      // Color detectado: sello, firma, tinta azul/roja, etc.
      data[i] = Math.min(255, r * 1.08);
      data[i + 1] = Math.min(255, g * 1.08);
      data[i + 2] = Math.min(255, b * 1.08);
    } else {
      data[i] = nuevo;
      data[i + 1] = nuevo;
      data[i + 2] = nuevo;
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

function aplicarRecorteAutomaticoHoja(canvas, ctx) {
  const width = canvas.width;
  const height = canvas.height;

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;

  const paso = 6;

  for (let y = 0; y < height; y += paso) {
    for (let x = 0; x < width; x += paso) {
      const i = (y * width + x) * 4;

      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const brillo = (r + g + b) / 3;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const saturacion = max - min;

      /*
        Detectamos zonas claras tipo hoja:
        - brillo alto
        - baja saturación
        Esto evita tomar objetos coloridos como parte de la hoja.
      */
      const pareceHoja = brillo > 145 && saturacion < 55;

      if (pareceHoja) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  const anchoDetectado = maxX - minX;
  const altoDetectado = maxY - minY;

  // Si no detecta una zona razonable, no recortamos.
  if (
    anchoDetectado < width * 0.35 ||
    altoDetectado < height * 0.35 ||
    minX >= maxX ||
    minY >= maxY
  ) {
    return;
  }

  // Margen pequeño para no cortar bordes del documento.
  const margenX = Math.floor(anchoDetectado * 0.04);
  const margenY = Math.floor(altoDetectado * 0.04);

  const cropX = Math.max(0, minX - margenX);
  const cropY = Math.max(0, minY - margenY);
  const cropW = Math.min(width - cropX, anchoDetectado + margenX * 2);
  const cropH = Math.min(height - cropY, altoDetectado + margenY * 2);

  const tempCanvas = document.createElement("canvas");
  const tempCtx = tempCanvas.getContext("2d");

  tempCanvas.width = cropW;
  tempCanvas.height = cropH;

  tempCtx.drawImage(
    canvas,
    cropX,
    cropY,
    cropW,
    cropH,
    0,
    0,
    cropW,
    cropH
  );

  canvas.width = cropW;
  canvas.height = cropH;

  ctx.drawImage(tempCanvas, 0, 0);
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

const btnAbrir = {
  padding: "11px 16px",
  border: "none",
  borderRadius: "10px",
  background: "#40739e",
  color: "white",
  cursor: "pointer",
  fontWeight: "bold"
};

const btnCerrar = {
  ...btnAbrir,
  background: "#e84118"
};

const previewBox = {
  position: "relative",
  marginTop: "14px",
  width: "min(520px, 100%)",
  aspectRatio: "3 / 4",
  borderRadius: "14px",
  overflow: "hidden",
  border: "2px solid #273c75",
  background: "#000"
};

const video = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block"
};

const guiaDocumento = {
  position: "absolute",
  width: "82%",
  height: "86%",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  border: "3px dashed #fbc531",
  borderRadius: "12px",
  color: "white",
  background: "rgba(0,0,0,0.12)",
  display: "flex",
  justifyContent: "center",
  alignItems: "flex-start",
  paddingTop: "10px",
  boxSizing: "border-box",
  fontWeight: "bold",
  textShadow: "0 1px 3px #000"
};

const acciones = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  marginTop: "12px"
};

const btnCapturar = {
  padding: "11px 16px",
  border: "none",
  borderRadius: "10px",
  background: "#273c75",
  color: "white",
  cursor: "pointer",
  fontWeight: "bold"
};

const btnGenerar = {
  ...btnCapturar,
  background: "#44bd32"
};

const btnDisabled = {
  ...btnGenerar,
  background: "#718093",
  cursor: "not-allowed"
};

const paginasBox = {
  marginTop: "15px",
  background: "white",
  borderRadius: "12px",
  padding: "12px",
  border: "1px solid #ddd"
};

const paginasHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px",
  flexWrap: "wrap",
  marginBottom: "10px"
};

const btnLimpiar = {
  padding: "7px 10px",
  border: "none",
  borderRadius: "8px",
  background: "#718093",
  color: "white",
  cursor: "pointer"
};

const miniaturas = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
  gap: "10px"
};

const miniaturaCard = {
  border: "1px solid #ddd",
  borderRadius: "10px",
  overflow: "hidden",
  background: "#f5f6fa"
};

const miniatura = {
  width: "100%",
  height: "150px",
  objectFit: "cover",
  display: "block"
};

const miniaturaFooter = {
  padding: "8px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  fontSize: "13px"
};

const btnQuitar = {
  border: "none",
  background: "#e84118",
  color: "white",
  borderRadius: "6px",
  cursor: "pointer",
  padding: "4px 7px"
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

const opcionesMejora = {
  marginTop: "12px",
  padding: "10px",
  background: "white",
  border: "1px solid #dcdde1",
  borderRadius: "10px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
  flexWrap: "wrap"
};

const checkLabel = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  fontWeight: "bold",
  color: "#2f3640"
};

const ayudaMejora = {
  color: "#666",
  fontSize: "13px"
};

const miniaturaAcciones = {
  display: "flex",
  gap: "6px",
  alignItems: "center"
};

const btnDetalle = {
  border: "none",
  background: "#273c75",
  color: "white",
  borderRadius: "6px",
  cursor: "pointer",
  padding: "4px 8px",
  fontSize: "12px"
};

const modalOverlay = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(0,0,0,0.72)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 9999,
  padding: "18px"
};

const modalContenido = {
  background: "white",
  borderRadius: "14px",
  padding: "16px",
  width: "min(900px, 96vw)",
  maxHeight: "92vh",
  display: "flex",
  flexDirection: "column",
  boxShadow: "0 10px 30px rgba(0,0,0,0.35)"
};

const modalHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px",
  marginBottom: "12px"
};

const btnCerrarModal = {
  padding: "8px 12px",
  border: "none",
  borderRadius: "8px",
  background: "#e84118",
  color: "white",
  cursor: "pointer",
  fontWeight: "bold"
};

const modalImagenBox = {
  overflow: "auto",
  border: "1px solid #ddd",
  borderRadius: "10px",
  background: "#f5f6fa",
  maxHeight: "78vh",
  textAlign: "center"
};

const modalImagen = {
  maxWidth: "100%",
  height: "auto",
  display: "block",
  margin: "0 auto"
};