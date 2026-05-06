/*const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// 🔥 "Base de datos"
const usuarios = [
  { dni: "72029619", nombre: "Manuel Nifla Ll." },
  { dni: "40780411", nombre: "Miguel Benites D." },
  { dni: "40500778", nombre: "Cesar Ramirez M." },
  { dni: "43180022", nombre: "Bernardo Cayllahue S." },
  { dni: "48058310", nombre: "Ronald Valencia Q." },
  { dni: "41727399", nombre: "Angel Choque Q." },
  { dni: "72278030", nombre: "Walter Suni C." },
  { dni: "45167507", nombre: "Freddy Cutipa C." },
  { dni: "40950681", nombre: "Claudio Sisa C." },
  { dni: "80385123", nombre: "Santos Lenguani Q." },
  { dni: "24884512", nombre: "Santiago Cuyo C." },
  { dni: "02172614", nombre: "José Quispe A." },
  { dni: "40858173", nombre: "Sebastian Mayhua T." },
  { dni: "71784498", nombre: "Aldair Diaz R." },
  { dni: "73463551", nombre: "Betsy Chire M." }
];

// 🔐 LOGIN
app.post("/login", (req, res) => {
  const { dni } = req.body;

  const user = usuarios.find(u => u.dni === dni);

  if (user) {
    res.json({ success: true, user });
  } else {
    res.json({ success: false });
  }
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});*/


const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const cilindrosRoutes = require("./routes/cilindros");
const maestrosRoutes = require("./routes/maestros");

const app = express();

app.use(cors());
app.use(express.json());

// RUTAS
app.use("/api/auth", authRoutes);
app.use("/api/cilindros", cilindrosRoutes);
app.use("/api/maestros", maestrosRoutes);

// TEST
app.get("/", (req, res) => {
  res.send("API AlmaCore funcionando correctamente");
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});