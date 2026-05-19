const {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand
} = require("@aws-sdk/client-s3");

const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const r2Client = require("../r2Client");

const BUCKET = process.env.R2_BUCKET;

function limpiarNombreArchivo(nombre) {
  return String(nombre || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .toLowerCase();
}

function limpiarTextoRuta(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .toUpperCase();
}

function construirR2Key({ directorio, tipo, numero, ocOs }) {
  const fecha = new Date();
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");

  const directorioLimpio = limpiarTextoRuta(directorio);
  const tipoLimpio = limpiarTextoRuta(tipo);
  const numeroLimpio = limpiarTextoRuta(numero);
  const ocOsLimpio = limpiarTextoRuta(ocOs || "SIN_OC_OS");

  const nombreFinal = `DOC_SELLADO_${numeroLimpio}_${ocOsLimpio}.pdf`;

  return `${directorioLimpio}/${anio}/${mes}/${tipoLimpio}_${Date.now()}_${nombreFinal}`;
}

async function subirArchivoGuia({ file, directorio, tipo, numero, ocOs }) {
  const key = construirR2Key({
    directorio,
    tipo,
    numero,
    ocOs
  });

  const numeroLimpio = limpiarTextoRuta(numero);
  const ocOsLimpio = limpiarTextoRuta(ocOs || "SIN_OC_OS");
  const nombreFinal = `DOC_SELLADO_${numeroLimpio}_${ocOsLimpio}.pdf`;

  await r2Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype || "application/pdf"
    })
  );

  return {
    r2_key: key,
    nombre_archivo: nombreFinal,
    mime_type: file.mimetype || "application/pdf"
  };
}

async function generarUrlTemporal(r2Key, segundos = 600) {
  return await getSignedUrl(
    r2Client,
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: r2Key
    }),
    {
      expiresIn: segundos
    }
  );
}

async function eliminarArchivoGuia(r2Key) {
  await r2Client.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: r2Key
    })
  );
}

module.exports = {
  subirArchivoGuia,
  generarUrlTemporal,
  eliminarArchivoGuia
};