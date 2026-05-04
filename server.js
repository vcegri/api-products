const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Conexión a Railway MySQL
async function getConnection() {
  return mysql.createConnection({
    host: process.env.MYSQLHOST,
    port: process.env.MYSQLPORT,
    user: process.env.MYSQLUSER,
    password: process.env.MYSQLPASSWORD,
    database: process.env.MYSQLDATABASE
  });
}

// TEST
app.get("/", (req, res) => {
  res.json({ message: "API funcionando 🚀" });
});

// GET productos
app.get("/products", async (req, res) => {
  try {
    const db = await getConnection();
    const [rows] = await db.execute("SELECT * FROM Product");
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener productos" });
  }
});

// POST producto
app.post("/products", async (req, res) => {
  try {
    const {
      idProduct,
      username,
      date,
      numProducts,
      description,
      category,
      state,
      minStock,
      location
    } = req.body;

    const db = await getConnection();

    await db.execute(
      `INSERT INTO Product 
      (idProduct, username, date, numProducts, description, category, state, minStock, location)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [idProduct, username, date, numProducts, description, category, state, minStock, location]
    );

    res.json({ message: "Producto guardado ✅" });
  } catch (error) {
    res.status(500).json({ error: "Error al guardar producto" });
  }
});

// STATS
app.get("/stats", async (req, res) => {
  try {
    const db = await getConnection();

    const [rows] = await db.execute(`
      SELECT 
        COUNT(*) AS totalProducts,
        SUM(numProducts) AS stockTotal
      FROM Product
    `);

    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Error en stats" });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Servidor corriendo en puerto " + PORT);
});