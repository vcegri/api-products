const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const QRCode = require("qrcode");

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

/* ===================== PRODUCTS ===================== */

app.get("/products", async (req, res) => {
  try {
    const db = await getConnection();
    const [rows] = await db.execute("SELECT * FROM Product");
    await db.end();
    res.json(rows);
  } catch (error) {
    res.status(500).json({
      error: "Error al obtener productos",
      detail: error.message
    });
  }
});

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
    res.status(500).json({
      error: "Error al obtener producto",
      detail: error.message
    });
  }
});

app.post("/products", async (req, res) => {
  try {
    const {
      idProduct,
      name,
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
      (idProduct, name, date, numProducts, description, category, state, minStock, location)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [idProduct, name, date, numProducts, description, category, state, minStock, location]
    );

    await db.end();

    res.json({ message: "Producto creado" });

  } catch (error) {
    res.status(500).json({
      error: "Error al crear producto",
      detail: error.message
    });
  }
});

app.put("/products/:id", async (req, res) => {
  try {
    const {
      name,
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
       SET name = ?, date = ?, numProducts = ?, description = ?,
           category = ?, state = ?, minStock = ?, location = ?
       WHERE idProduct = ?`,
      [name, date, numProducts, description, category, state, minStock, location, req.params.id]
    );

    await db.end();

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    res.json({ message: "Producto actualizado" });

  } catch (error) {
    res.status(500).json({
      error: "Error al actualizar producto",
      detail: error.message
    });
  }
});

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
    res.status(500).json({
      error: "Error al eliminar producto",
      detail: error.message
    });
  }
});

/* ===================== QR ===================== */

app.get("/products/qr/all", async (req, res) => {
  try {
    const db = await getConnection();
    const [products] = await db.execute("SELECT * FROM Product ORDER BY idProduct ASC");
    await db.end();

    let html = `
      <html>
      <head>
        <meta charset="UTF-8">
        <title>QR Productos</title>
        <style>
          body { font-family: Arial; padding: 20px; background: #f5f5f5; }
          h1 { text-align: center; }
          .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 20px; }
          .card { background: white; border-radius: 12px; padding: 16px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.12); }
          img { width: 220px; height: 220px; }
          button { padding: 10px 20px; font-size: 16px; cursor: pointer; }
        </style>
      </head>
      <body>
        <h1>QR de productos</h1>
        <div style="text-align:center; margin-bottom:20px;">
          <button onclick="window.print()">Imprimir QRs</button>
        </div>
        <div class="grid">
    `;

    for (const product of products) {
      const qrText = JSON.stringify(product);
      const qrImage = await QRCode.toDataURL(qrText);

      html += `
        <div class="card">
          <h2>${product.name}</h2>
          <p>${product.description}</p>
          <img src="${qrImage}" alt="QR ${product.name}">
        </div>
      `;
    }

    html += `
        </div>
      </body>
      </html>
    `;

    res.send(html);

  } catch (error) {
    res.status(500).json({
      error: "Error generando QRs",
      detail: error.message
    });
  }
});

app.get("/products/:id/qr", async (req, res) => {
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

    const product = rows[0];
    const qrText = JSON.stringify(product);
    const qrImage = await QRCode.toDataURL(qrText);

    res.send(`
      <html>
      <head>
        <meta charset="UTF-8">
        <title>QR ${product.name}</title>
        <style>
          body { font-family: Arial; text-align: center; padding: 30px; }
          img { width: 300px; height: 300px; }
          button { padding: 10px 20px; font-size: 16px; cursor: pointer; }
        </style>
      </head>
      <body>
        <h1>${product.name}</h1>
        <p>${product.description}</p>
        <img src="${qrImage}" alt="QR ${product.name}">
        <br><br>
        <button onclick="window.print()">Imprimir QR</button>
      </body>
      </html>
    `);

  } catch (error) {
    res.status(500).json({
      error: "Error generando QR",
      detail: error.message
    });
  }
});

/* ===================== MOVEMENTS ===================== */

app.get("/movements", async (req, res) => {
  try {
    const db = await getConnection();
    const [rows] = await db.execute("SELECT * FROM Movements");
    await db.end();
    res.json(rows);
  } catch (error) {
    res.status(500).json({
      error: "Error al obtener movimientos",
      detail: error.message
    });
  }
});

app.post("/movements", async (req, res) => {
  try {
    const { Move } = req.body;

    const db = await getConnection();

    await db.execute(
      "INSERT INTO Movements (Move) VALUES (?)",
      [Move]
    );

    await db.end();

    res.json({ message: "Movimiento creado" });

  } catch (error) {
    res.status(500).json({
      error: "Error al crear movimiento",
      detail: error.message
    });
  }
});

/* ===================== USERS ===================== */

app.get("/users", async (req, res) => {
  try {
    const db = await getConnection();
    const [rows] = await db.execute("SELECT username, email FROM User");
    await db.end();
    res.json(rows);
  } catch (error) {
    res.status(500).json({
      error: "Error al obtener usuarios",
      detail: error.message
    });
  }
});

/*DELETE MOVEMENTS*/

app.delete("/movements", async (req, res) => {
  try {
    const db = await getConnection();

    const [result] = await db.execute(
      "DELETE FROM Movements LIMIT 1"
    );

    await db.end();

    if (result.affectedRows === 0) {
      return res.json({ message: "No hay movimientos para borrar" });
    }

    res.json({ message: "Movimiento borrado" });

  } catch (error) {
    res.status(500).json({
      error: "Error al borrar movimiento",
      detail: error.message
    });
  }
});

/* ===================== STATS ===================== */

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
    res.status(500).json({
      error: "Error al obtener estadísticas",
      detail: error.message
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Servidor corriendo en puerto " + PORT);
});