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
  const [paginaPreview, setPaginaPreview] = useState(null);

  const [fotoPendiente, setFotoPendiente] = useState(null);
  const [puntosRecorte, setPuntosRecorte] = useState(null);
  const [puntoActivo, setPuntoActivo] = useState(null);

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

      // Captura solo el área equivalente al recuadro A4 visual.
      const cropWOriginal = Math.floor(anchoOriginal * 0.78);
      const cropHOriginal = Math.floor(cropWOriginal * 1.414);

      let finalCropW = cropWOriginal;
      let finalCropH = cropHOriginal;

      if (finalCropH > altoOriginal * 0.9) {
        finalCropH = Math.floor(altoOriginal * 0.9);
        finalCropW = Math.floor(finalCropH / 1.414);
      }

      const cropXOriginal = Math.floor((anchoOriginal - finalCropW) / 2);
      const cropYOriginal = Math.floor((altoOriginal - finalCropH) / 2);

      const anchoMax = 1600;
      const escala = Math.min(1, anchoMax / finalCropW);

      const ancho = Math.floor(finalCropW * escala);
      const alto = Math.floor(finalCropH * escala);

      canvas.width = ancho;
      canvas.height = alto;

      ctx.drawImage(
        video,
        cropXOriginal,
        cropYOriginal,
        finalCropW,
        finalCropH,
        0,
        0,
        ancho,
        alto
      );

      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);

      setFotoPendiente({
        id: Date.now(),
        dataUrl,
        width: ancho,
        height: alto
      });

      setPuntosRecorte({
        tl: { x: 0.05, y: 0.03 },
        tr: { x: 0.95, y: 0.03 },
        br: { x: 0.95, y: 0.97 },
        bl: { x: 0.05, y: 0.97 }
      });

      setMensaje("Ajuste las esquinas para dejar solo la hoja y confirme el recorte.");
    } catch (error) {
      console.error(error);
      alert("No se pudo capturar la página");
    }
  };

  const moverPuntoMouse = (evento) => {
    if (!puntoActivo || !puntosRecorte) return;

    const rect = evento.currentTarget.getBoundingClientRect();

    let x = (evento.clientX - rect.left) / rect.width;
    let y = (evento.clientY - rect.top) / rect.height;

    x = Math.max(0, Math.min(1, x));
    y = Math.max(0, Math.min(1, y));

    setPuntosRecorte(prev => ({
      ...prev,
      [puntoActivo]: { x, y }
    }));
  };

  const moverPuntoTouch = (evento) => {
    if (!puntoActivo || !puntosRecorte) return;

    const touch = evento.touches[0];
    if (!touch) return;

    const rect = evento.currentTarget.getBoundingClientRect();

    let x = (touch.clientX - rect.left) / rect.width;
    let y = (touch.clientY - rect.top) / rect.height;

    x = Math.max(0, Math.min(1, x));
    y = Math.max(0, Math.min(1, y));

    setPuntosRecorte(prev => ({
      ...prev,
      [puntoActivo]: { x, y }
    }));
  };

  const finalizarMovimiento = () => {
    setPuntoActivo(null);
  };

  const confirmarRecorteManual = async () => {
    try {
      if (!fotoPendiente || !puntosRecorte) return;

      setProcesando(true);
      setMensaje("Aplicando recorte...");

      const dataUrlRecortado = await recortarPorPuntos(
        fotoPendiente.dataUrl,
        puntosRecorte,
        mejoraActiva
      );

      setPaginas(prev => [
        ...prev,
        {
          id: Date.now(),
          dataUrl: dataUrlRecortado
        }
      ]);

      setFotoPendiente(null);
      setPuntosRecorte(null);
      setPuntoActivo(null);
      setMensaje("Página agregada correctamente.");
    } catch (error) {
      console.error(error);
      alert("No se pudo aplicar el recorte");
    } finally {
      setProcesando(false);
    }
  };

  const cancelarRecorteManual = () => {
    setFotoPendiente(null);
    setPuntosRecorte(null);
    setPuntoActivo(null);
    setMensaje("Captura cancelada.");
  };

  const usarFotoSinAjustar = async () => {
    try {
      if (!fotoPendiente) return;

      setProcesando(true);
      setMensaje("Procesando imagen...");

      const dataUrlFinal = await procesarImagenFinal(
        fotoPendiente.dataUrl,
        mejoraActiva
      );

      setPaginas(prev => [
        ...prev,
        {
          id: Date.now(),
          dataUrl: dataUrlFinal
        }
      ]);

      setFotoPendiente(null);
      setPuntosRecorte(null);
      setPuntoActivo(null);
      setMensaje("Página agregada sin ajuste manual.");
    } catch (error) {
      console.error(error);
      alert("No se pudo agregar la imagen");
    } finally {
      setProcesando(false);
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

        <span style={ayudaMejora}>
          Blanquea fondo, mejora contraste y mantiene sellos visibles.
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
              Coloque toda la hoja dentro del recuadro
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

      {fotoPendiente && puntosRecorte && (
        <div style={recorteBox}>
          <div style={recorteHeader}>
            <div>
              <h4 style={{ margin: 0 }}>Ajustar recorte de hoja</h4>
              <p style={hint}>
                Arrastre las esquinas para dejar solo la hoja.
              </p>
            </div>

            <button onClick={cancelarRecorteManual} style={btnCerrar}>
              Cancelar
            </button>
          </div>

          <div
            style={recorteImagenBox}
            onMouseMove={moverPuntoMouse}
            onMouseUp={finalizarMovimiento}
            onMouseLeave={finalizarMovimiento}
            onTouchMove={moverPuntoTouch}
            onTouchEnd={finalizarMovimiento}
          >
            <img
              src={fotoPendiente.dataUrl}
              alt="Ajuste de recorte"
              style={recorteImagen}
              draggable={false}
            />

            <svg style={svgRecorte} viewBox="0 0 100 100" preserveAspectRatio="none">
              <polygon
                points={`
                  ${puntosRecorte.tl.x * 100},${puntosRecorte.tl.y * 100}
                  ${puntosRecorte.tr.x * 100},${puntosRecorte.tr.y * 100}
                  ${puntosRecorte.br.x * 100},${puntosRecorte.br.y * 100}
                  ${puntosRecorte.bl.x * 100},${puntosRecorte.bl.y * 100}
                `}
                fill="rgba(251, 197, 49, 0.18)"
                stroke="#fbc531"
                strokeWidth="0.8"
              />
            </svg>

            {Object.entries(puntosRecorte).map(([key, punto]) => (
              <button
                key={key}
                onMouseDown={() => setPuntoActivo(key)}
                onTouchStart={() => setPuntoActivo(key)}
                style={{
                  ...puntoRecorte,
                  left: `${punto.x * 100}%`,
                  top: `${punto.y * 100}%`
                }}
                title={key}
              />
            ))}
          </div>

          <div style={acciones}>
            <button
              onClick={confirmarRecorteManual}
              disabled={procesando}
              style={procesando ? btnDisabled : btnGenerar}
            >
              {procesando ? "Procesando..." : "Confirmar recorte"}
            </button>

            <button
              onClick={usarFotoSinAjustar}
              disabled={procesando}
              style={btnCapturar}
            >
              Usar sin ajustar
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

function recortarPorPuntos(dataUrl, puntos, aplicarMejora) {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      try {
        const srcCanvas = document.createElement("canvas");
        const srcCtx = srcCanvas.getContext("2d");

        srcCanvas.width = img.width;
        srcCanvas.height = img.height;

        srcCtx.drawImage(img, 0, 0);

        const srcData = srcCtx.getImageData(0, 0, srcCanvas.width, srcCanvas.height);

        const w = img.width;
        const h = img.height;

        const p = {
          tl: { x: puntos.tl.x * w, y: puntos.tl.y * h },
          tr: { x: puntos.tr.x * w, y: puntos.tr.y * h },
          br: { x: puntos.br.x * w, y: puntos.br.y * h },
          bl: { x: puntos.bl.x * w, y: puntos.bl.y * h }
        };

        const anchoSuperior = distanciaPuntos(p.tl, p.tr);
        const anchoInferior = distanciaPuntos(p.bl, p.br);
        const altoIzquierdo = distanciaPuntos(p.tl, p.bl);
        const altoDerecho = distanciaPuntos(p.tr, p.br);

        let outW = Math.round(Math.max(anchoSuperior, anchoInferior));
        let outH = Math.round(Math.max(altoIzquierdo, altoDerecho));

        // Evitamos imágenes gigantes que puedan poner lenta la página.
        const maxOutW = 1400;
        if (outW > maxOutW) {
          const escala = maxOutW / outW;
          outW = Math.round(outW * escala);
          outH = Math.round(outH * escala);
        }

        outW = Math.max(300, outW);
        outH = Math.max(300, outH);

        const outCanvas = document.createElement("canvas");
        const outCtx = outCanvas.getContext("2d");

        outCanvas.width = outW;
        outCanvas.height = outH;

        const outImage = outCtx.createImageData(outW, outH);
        const outData = outImage.data;

        for (let y = 0; y < outH; y++) {
          const v = y / (outH - 1);

          for (let x = 0; x < outW; x++) {
            const u = x / (outW - 1);

            /*
              Mapeo bilineal:
              convierte el cuadrilátero marcado por las 4 esquinas
              en un rectángulo limpio.
            */
            const srcX =
              (1 - u) * (1 - v) * p.tl.x +
              u * (1 - v) * p.tr.x +
              u * v * p.br.x +
              (1 - u) * v * p.bl.x;

            const srcY =
              (1 - u) * (1 - v) * p.tl.y +
              u * (1 - v) * p.tr.y +
              u * v * p.br.y +
              (1 - u) * v * p.bl.y;

            const color = obtenerPixelBilineal(srcData, w, h, srcX, srcY);

            const idx = (y * outW + x) * 4;

            outData[idx] = color.r;
            outData[idx + 1] = color.g;
            outData[idx + 2] = color.b;
            outData[idx + 3] = 255;
          }
        }

        outCtx.putImageData(outImage, 0, 0);

        if (aplicarMejora) {
          mejorarImagenDocumentoCamScanner(outCtx, outW, outH);
        } else {
          mejorarImagenDocumentoSuave(outCtx, outW, outH);
        }

        resolve(outCanvas.toDataURL("image/jpeg", aplicarMejora ? 0.9 : 0.86));
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = reject;
    img.src = dataUrl;
  });
}

function distanciaPuntos(a, b) {
  return Math.sqrt(
    Math.pow(a.x - b.x, 2) +
    Math.pow(a.y - b.y, 2)
  );
}

function obtenerPixelBilineal(imageData, width, height, x, y) {
  x = Math.max(0, Math.min(width - 1, x));
  y = Math.max(0, Math.min(height - 1, y));

  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(width - 1, x0 + 1);
  const y1 = Math.min(height - 1, y0 + 1);

  const dx = x - x0;
  const dy = y - y0;

  const c00 = obtenerPixel(imageData, width, x0, y0);
  const c10 = obtenerPixel(imageData, width, x1, y0);
  const c01 = obtenerPixel(imageData, width, x0, y1);
  const c11 = obtenerPixel(imageData, width, x1, y1);

  return {
    r: interpolar(
      interpolar(c00.r, c10.r, dx),
      interpolar(c01.r, c11.r, dx),
      dy
    ),
    g: interpolar(
      interpolar(c00.g, c10.g, dx),
      interpolar(c01.g, c11.g, dx),
      dy
    ),
    b: interpolar(
      interpolar(c00.b, c10.b, dx),
      interpolar(c01.b, c11.b, dx),
      dy
    )
  };
}

function obtenerPixel(imageData, width, x, y) {
  const idx = (y * width + x) * 4;

  return {
    r: imageData.data[idx],
    g: imageData.data[idx + 1],
    b: imageData.data[idx + 2]
  };
}

function interpolar(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function procesarImagenFinal(dataUrl, aplicarMejora) {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        canvas.width = img.width;
        canvas.height = img.height;

        ctx.drawImage(img, 0, 0);

        if (aplicarMejora) {
          mejorarImagenDocumentoCamScanner(ctx, canvas.width, canvas.height);
        } else {
          mejorarImagenDocumentoSuave(ctx, canvas.width, canvas.height);
        }

        resolve(canvas.toDataURL("image/jpeg", aplicarMejora ? 0.9 : 0.86));
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = reject;
    img.src = dataUrl;
  });
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

    let gris = 0.299 * r + 0.587 * g + 0.114 * b;
    let nuevo;

    if (gris > 205) {
      nuevo = 255;
    } else if (gris > 165) {
      nuevo = Math.min(255, gris * 1.28);
    } else if (gris > 110) {
      nuevo = gris * 0.92;
    } else {
      nuevo = gris * 0.72;
    }

    nuevo = Math.max(0, Math.min(255, nuevo));

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const saturacion = max - min;

    if (saturacion > 45 && gris < 210) {
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
  width: "78%",
  aspectRatio: "1 / 1.414",
  maxHeight: "90%",
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

const recorteBox = {
  marginTop: "15px",
  padding: "14px",
  background: "white",
  border: "1px solid #dcdde1",
  borderRadius: "12px"
};

const recorteHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
  marginBottom: "12px"
};

const recorteImagenBox = {
  position: "relative",
  width: "min(520px, 100%)",
  borderRadius: "12px",
  overflow: "hidden",
  border: "2px solid #273c75",
  userSelect: "none",
  touchAction: "none",
  background: "#000"
};

const recorteImagen = {
  width: "100%",
  display: "block",
  pointerEvents: "none"
};

const svgRecorte = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  zIndex: 4,
  pointerEvents: "none"
};

const puntoRecorte = {
  position: "absolute",
  width: "22px",
  height: "22px",
  borderRadius: "50%",
  border: "3px solid white",
  background: "#e84118",
  transform: "translate(-50%, -50%)",
  cursor: "grab",
  zIndex: 5,
  boxShadow: "0 1px 6px rgba(0,0,0,0.5)"
};