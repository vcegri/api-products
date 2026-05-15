const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

async function getConnection() {
  return mysql.createConnection({
    host: process.env.MYSQLHOST,
    port: process.env.MYSQLPORT,
    user: process.env.MYSQLUSER,
    password: process.env.MYSQLPASSWORD,
    database: process.env.MYSQLDATABASE
  });
}

app.get("/", (req, res) => {
  res.json({ message: "API funcionando" });
});

// GET todos los productos
app.get("/products", async (req, res) => {
  try {
    const db = await getConnection();
    const [rows] = await db.execute("SELECT * FROM Product");
    await db.end();
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      error: "Error al obtener productos",
      detail: error.message
    });
  }
});

// GET un producto por ID
app.get("/products/:id", async (req, res) => {
  try {
    const db = await getConnection();
    const [rows] = await db.execute(
      "SELECT * FROM Product WHERE idProduct = ?",
      [req.params.id]
    );
    await db.end();

    if (rows.length === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener producto" });
  }
});

// INSERT producto
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

    await db.end();
    res.json({ message: "Producto creado" });

  } catch (error) {
    res.status(500).json({ error: "Error al crear producto" });
  }
});

// UPDATE producto completo
app.put("/products/:id", async (req, res) => {
  try {
    const {
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

    const [result] = await db.execute(
      `UPDATE Product 
       SET username = ?, date = ?, numProducts = ?, description = ?, 
           category = ?, state = ?, minStock = ?, location = ?
       WHERE idProduct = ?`,
      [username, date, numProducts, description, category, state, minStock, location, req.params.id]
    );

    await db.end();

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    res.json({ message: "Producto actualizado" });

  } catch (error) {
    res.status(500).json({ error: "Error al actualizar producto" });
  }
});

// DELETE producto
app.delete("/products/:id", async (req, res) => {
  try {
    const db = await getConnection();

    const [result] = await db.execute(
      "DELETE FROM Product WHERE idProduct = ?",
      [req.params.id]
    );

    await db.end();

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    res.json({ message: "Producto eliminado" });

  } catch (error) {
    res.status(500).json({ error: "Error al eliminar producto" });
  }
});

// USERS
app.get("/users", async (req, res) => {
  try {
    const db = await getConnection();
    const [rows] = await db.execute("SELECT username, email FROM User");
    await db.end();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener usuarios" });
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

    await db.end();
    res.json(rows[0]);

  } catch (error) {
    res.status(500).json({ error: "Error al obtener estadísticas" });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Servidor corriendo en puerto " + PORT);
});