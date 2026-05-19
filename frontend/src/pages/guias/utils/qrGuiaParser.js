export function parsearQRGuia(textoQR) {
  const textoOriginal = String(textoQR || "").trim();
  const texto = textoOriginal.toUpperCase();

  const resultado = {
    ruc: "",
    serie: "",
    numero: "",
    numero_guia_factura: "",
    texto_original: textoOriginal,
    detectado: false
  };

  // 1. Buscar RUC: 11 dígitos
  const rucMatch = texto.match(/\b\d{11}\b/);
  if (rucMatch) {
    resultado.ruc = rucMatch[0];
  }

  // 2. Intentar leer como URL con parámetros
  try {
    if (textoOriginal.startsWith("http")) {
      const url = new URL(textoOriginal);
      const params = url.searchParams;

      const posiblesRuc = [
        params.get("ruc"),
        params.get("RUC"),
        params.get("numRuc"),
        params.get("NUMRUC")
      ].filter(Boolean);

      const posiblesSerie = [
        params.get("serie"),
        params.get("SERIE"),
        params.get("numSerie"),
        params.get("NUMSERIE")
      ].filter(Boolean);

      const posiblesNumero = [
        params.get("numero"),
        params.get("NUMERO"),
        params.get("correlativo"),
        params.get("CORRELATIVO"),
        params.get("numCpe"),
        params.get("NUMCPE")
      ].filter(Boolean);

      if (posiblesRuc.length > 0) {
        const rucUrl = limpiarSoloNumeros(posiblesRuc[0]).slice(0, 11);
        if (rucUrl.length === 11) resultado.ruc = rucUrl;
      }

      if (posiblesSerie.length > 0) {
        resultado.serie = limpiarSerie(posiblesSerie[0]);
      }

      if (posiblesNumero.length > 0) {
        resultado.numero = limpiarNumero(posiblesNumero[0]);
      }
    }
  } catch {
    // Si no es URL válida, seguimos con regex.
  }

  // 3. Buscar serie tipo F001, T001, V001, E001, EG01, etc.
  if (!resultado.serie) {
    const serieMatch = texto.match(/\b[A-Z]{1,3}\d{2,4}\b/);
    if (serieMatch) {
      resultado.serie = limpiarSerie(serieMatch[0]);
    }
  }

  // 4. Buscar número correlativo cerca de la serie
  if (resultado.serie && !resultado.numero) {
    resultado.numero = buscarNumeroDespuesDeSerie(texto, resultado.serie);
  }

  // 5. Si no encontró número cerca de serie, buscar números largos que no sean RUC
  if (!resultado.numero) {
    const numeros = texto.match(/\b\d{4,12}\b/g) || [];

    const candidatos = numeros.filter(n => n !== resultado.ruc);

    if (candidatos.length > 0) {
      // Tomamos el último candidato porque en muchos QR el correlativo va después.
      resultado.numero = limpiarNumero(candidatos[candidatos.length - 1]);
    }
  }

  if (resultado.serie && resultado.numero) {
    resultado.numero_guia_factura = `${resultado.serie}-${resultado.numero}`;
  }

  resultado.detectado = Boolean(
    resultado.ruc || resultado.numero_guia_factura
  );

  return resultado;
}

function limpiarSoloNumeros(valor) {
  return String(valor || "").replace(/\D/g, "");
}

function limpiarSerie(valor) {
  return String(valor || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
}

function limpiarNumero(valor) {
  return String(valor || "")
    .replace(/\D/g, "")
    .replace(/^0+/, "") || "0";
}

function buscarNumeroDespuesDeSerie(texto, serie) {
  const index = texto.indexOf(serie);

  if (index === -1) return "";

  const despues = texto.slice(index + serie.length, index + serie.length + 40);

  const match = despues.match(/\d{4,12}/);

  if (!match) return "";

  return limpiarNumero(match[0]);
}