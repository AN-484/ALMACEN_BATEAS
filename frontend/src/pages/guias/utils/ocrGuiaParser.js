export function parsearTextoGuiaOCR(textoOCR) {
  const textoOriginal = String(textoOCR || "");
  const texto = normalizarTexto(textoOriginal);

  const resultado = {
    ruc: "",
    serie: "",
    numero: "",
    numero_guia_factura: "",
    texto_original: textoOriginal,
    texto_normalizado: texto,
    detectado: false
  };

  // 1. Detectar RUC: 11 dígitos
  const rucMatch = texto.match(/\b\d{11}\b/);
  if (rucMatch) {
    resultado.ruc = rucMatch[0];
  }

  // 2. Detectar serie + número en varios formatos
  const serieNumero = detectarSerieNumero(texto);

  if (serieNumero) {
    resultado.serie = serieNumero.serie;
    resultado.numero = serieNumero.numero;
    resultado.numero_guia_factura = `${serieNumero.serie}-${serieNumero.numero}`;
  }

  resultado.detectado = Boolean(
    resultado.ruc || resultado.numero_guia_factura
  );

  return resultado;
}

function normalizarTexto(valor) {
  return String(valor || "")
    .toUpperCase()

    // Normalizar símbolos raros de OCR
    .replace(/[|]/g, " ")
    .replace(/[–—]/g, "-")
    .replace(/[º°]/g, "°")

    // OCR suele confundir N° como N, NRO, NO, etc.
    .replace(/\bNRO\b/g, "N°")
    .replace(/\bNO\b/g, "N°")
    .replace(/\bNUMERO\b/g, "N°")
    .replace(/\bNÚMERO\b/g, "N°")

    // Separar signos
    .replace(/[:;]/g, " ")

    // Espacios
    .replace(/\s+/g, " ")
    .trim();
}

function detectarSerieNumero(texto) {
  const patrones = [
    // Caso: N° F901-00033780
    /\bN°?\s*([A-Z]{1,3}\d{2,4})\s*[-]?\s*(\d{3,12})\b/,

    // Caso: N° EG07 - 00001679
    /\bN°?\s*([A-Z]{1,3}\d{2,4})\s*[-]?\s*(\d{3,12})\b/,

    // Caso: T001-2991, T005-0010869, TR48-13128
    /\b([A-Z]{1,3}\d{2,4})\s*[-]\s*(\d{3,12})\b/,

    // Caso: FR48     N° 00057541
    /\b([A-Z]{1,3}\d{2,4})\s*(?:N°?\s*)+(\d{3,12})\b/,

    // Caso: FR48 00057541
    /\b([A-Z]{1,3}\d{2,4})\s+(\d{3,12})\b/
  ];

  for (const patron of patrones) {
    const match = texto.match(patron);

    if (match) {
      const serie = limpiarSerie(match[1]);
      const numero = limpiarNumeroConCeros(match[2]);

      if (serie && numero && serieValida(serie)) {
        return {
          serie,
          numero
        };
      }
    }
  }

  // Estrategia adicional:
  // Buscar cualquier serie y luego el número más cercano después.
  const serieMatch = texto.match(/\b[A-Z]{1,3}\d{2,4}\b/);

  if (serieMatch) {
    const serie = limpiarSerie(serieMatch[0]);
    const numero = buscarNumeroCercanoDespues(texto, serie);

    if (serie && numero && serieValida(serie)) {
      return {
        serie,
        numero
      };
    }
  }

  return null;
}

function limpiarSerie(valor) {
  return String(valor || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
}

function limpiarNumeroConCeros(valor) {
  return String(valor || "")
    .replace(/\D/g, "")
    .slice(0, 12);
}

function serieValida(serie) {
  // Ejemplos válidos:
  // F001, T001, E001, EG07, TR48, FR48
  return /^[A-Z]{1,3}\d{2,4}$/.test(serie);
}

function buscarNumeroCercanoDespues(texto, serie) {
  const index = texto.indexOf(serie);

  if (index === -1) return "";

  // Miramos hasta 80 caracteres después de la serie
  const despues = texto.slice(index + serie.length, index + serie.length + 80);

  // Eliminamos ruido común
  const limpio = despues
    .replace(/\bN°?\b/g, " ")
    .replace(/\bNRO\b/g, " ")
    .replace(/\bNO\b/g, " ");

  const match = limpio.match(/\b\d{3,12}\b/);

  if (!match) return "";

  return limpiarNumeroConCeros(match[0]);
}