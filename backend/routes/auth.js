const express = require("express");
const router = express.Router();
const supabase = require("../services/supabaseClient");

router.post("/login", async (req, res) => {
  try {
    const { dni } = req.body;

    if (!dni || dni.length !== 8) {
      return res.status(400).json({
        success: false,
        message: "DNI inválido"
      });
    }

    const { data, error } = await supabase
      .from("usuarios")
      .select("*")
      .eq("dni", dni)
      .limit(1)
      .single();

    if (error || !data) {
      return res.json({
        success: false,
        message: "DNI no autorizado"
      });
    }

    const puedeDatos = Number(data.permisos) === 1;

    return res.json({
      success: true,
      user: data,
      permisos: {
        puede_datos: puedeDatos
      }
    });

  } catch (error) {
    console.error("Error login:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor"
    });
  }
});

module.exports = router;