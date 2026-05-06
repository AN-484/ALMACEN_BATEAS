const express = require("express");
const router = express.Router();
const supabase = require("../services/supabaseClient");
const { USUARIOS_CON_DATOS } = require("../middleware/permisos");

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

    return res.json({
      success: true,
      user: data,
      permisos: {
        puede_datos: USUARIOS_CON_DATOS.includes(data.nombre)
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