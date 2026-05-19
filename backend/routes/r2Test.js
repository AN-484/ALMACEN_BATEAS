const express = require("express");
const multer = require("multer");
const {
  PutObjectCommand,
  GetObjectCommand
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const r2Client = require("../services/r2Client");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Solo se permiten archivos PDF"));
    }

    cb(null, true);
  }
});

router.post("/upload", upload.single("archivo"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Debe enviar un PDF"
      });
    }

    const nombreLimpio = req.file.originalname
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9._-]/g, "")
      .toLowerCase();

    const key = `PRUEBAS/${Date.now()}_${nombreLimpio}`;

    await r2Client.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: key,
        Body: req.file.buffer,
        ContentType: "application/pdf"
      })
    );

    const urlTemporal = await getSignedUrl(
      r2Client,
      new GetObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: key
      }),
      {
        expiresIn: 600
      }
    );

    res.json({
      success: true,
      message: "PDF subido a R2 correctamente",
      key,
      urlTemporal
    });
  } catch (error) {
    console.error("Error R2 upload:", error);

    res.status(500).json({
      success: false,
      message: "Error al subir PDF a R2",
      detail: error.message
    });
  }
});

module.exports = router;