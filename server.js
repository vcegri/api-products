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
  res.json({
    message: "API funcionando",
    endpoints: [
      "GET /products",
      "GET /products/:id",
      "POST /products",
      "PUT /products/:id",
      "DELETE /products/:id",
      "GET /products/:id/qr",
      "GET /products/qr/all",
      "GET /users",
      "GET /stats"
    ]
  });
});

// GET todos los productos
app.get("/products", async (req, res) => {
  try {
    const db = await getConnection();
    const [rows] = await db.execute("SELECT * FROM Product");
    await db.end();
    res.json(rows);
  } catch (error) {
    console.error("ERROR GET /products:", error);
    res.status(500).json({
      error: "Error al obtener productos",
      detail: error.message
    });
  }
});

// PÁGINA HTML con QR de todos los productos
// IMPORTANTE: va antes de /products/:id
app.get("/products/qr/all", async (req, res) => {
  try {
    const db = await getConnection();
    const [products] = await db.execute("SELECT * FROM Product ORDER BY idProduct ASC");
    await db.end();

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>QR Productos</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            background: #f5f5f5;
          }
          h1 {
            text-align: center;
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
            gap: 20px;
          }
          .card {
            background: white;
            border-radius: 12px;
            padding: 16px;
            text-align: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.12);
          }
          img {
            width: 220px;
            height: 220px;
          }
          pre {
            text-align: left;
            white-space: pre-wrap;
            word-break: break-word;
            background: #eee;
            padding: 10px;
            border-radius: 8px;
            font-size: 12px;
          }
          .print {
            margin-bottom: 20px;
            text-align: center;
          }
          button {
            padding: 10px 20px;
            font-size: 16px;
            cursor: pointer;
          }
        </style>
      </head>
      <body>
        <h1>QR de productos</h1>
        <div class="print">
          <button onclick="window.print()">Imprimir QRs</button>
        </div>
        <div class="grid">
    `;

    for (const product of products) {
      const qrText = JSON.stringify(product);
      const qrImage = await QRCode.toDataURL(qrText);

      html += `
        <div class="card">
          <h2>Producto ${product.idProduct}</h2>
          <p><strong>${product.description}</strong></p>
          <img src="${qrImage}" alt="QR producto ${product.idProduct}">
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
    console.error("ERROR GET /products/qr/all:", error);
    res.status(500).json({
      error: "Error generando QRs",
      detail: error.message
    });
  }
});

// QR de un producto concreto en HTML
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
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>QR Producto ${product.idProduct}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            text-align: center;
            padding: 30px;
          }
          img {
            width: 300px;
            height: 300px;
          }
          pre {
            text-align: left;
            max-width: 600px;
            margin: 20px auto;
            white-space: pre-wrap;
            word-break: break-word;
            background: #eee;
            padding: 12px;
            border-radius: 8px;
          }
          button {
            padding: 10px 20px;
            font-size: 16px;
            cursor: pointer;
          }
        </style>
      </head>
      <body>
        <h1>QR Producto ${product.idProduct}</h1>
        <h2>${product.description}</h2>
        <img src="${qrImage}" alt="QR producto ${product.idProduct}">
        <button onclick="window.print()">Imprimir QR</button>
      </body>
      </html>
    `);

  } catch (error) {
    console.error("ERROR GET /products/:id/qr:", error);
    res.status(500).json({
      error: "Error generando QR",
      detail: error.message
    });
  }
});

// QR de un producto concreto como imagen PNG
app.get("/products/:id/qr.png", async (req, res) => {
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

    res.setHeader("Content-Type", "image/png");
    QRCode.toFileStream(res, qrText, {
      type: "png",
      width: 400,
      margin: 2
    });

  } catch (error) {
    console.error("ERROR GET /products/:id/qr.png:", error);
    res.status(500).json({
      error: "Error generando imagen QR",
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
    console.error("ERROR GET /products/:id:", error);
    res.status(500).json({
      error: "Error al obtener producto",
      detail: error.message
    });
  }
});

// INSERT producto
app.post("/products", async (req, res) => {
  try {
    const {
      idProduct,
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
      (idProduct, date, numProducts, description, category, state, minStock, location)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [idProduct, date, numProducts, description, category, state, minStock, location]
    );

    await db.end();

    res.json({
      message: "Producto creado",
      product: {
        idProduct,
        date,
        numProducts,
        description,
        category,
        state,
        minStock,
        location
      },
      qrUrl: `/products/${idProduct}/qr`
    });

  } catch (error) {
    console.error("ERROR POST /products:", error);
    res.status(500).json({
      error: "Error al crear producto",
      detail: error.message
    });
  }
});

// UPDATE producto completo
app.put("/products/:id", async (req, res) => {
  try {
    const {
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
       SET date = ?, numProducts = ?, description = ?, 
           category = ?, state = ?, minStock = ?, location = ?
       WHERE idProduct = ?`,
      [date, numProducts, description, category, state, minStock, location, req.params.id]
    );

    await db.end();

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    res.json({
      message: "Producto actualizado",
      qrUrl: `/products/${req.params.id}/qr`
    });

  } catch (error) {
    console.error("ERROR PUT /products/:id:", error);
    res.status(500).json({
      error: "Error al actualizar producto",
      detail: error.message
    });
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
    console.error("ERROR DELETE /products/:id:", error);
    res.status(500).json({
      error: "Error al eliminar producto",
      detail: error.message
    });
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
    console.error("ERROR GET /users:", error);
    res.status(500).json({
      error: "Error al obtener usuarios",
      detail: error.message
    });
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
    console.error("ERROR GET /stats:", error);
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