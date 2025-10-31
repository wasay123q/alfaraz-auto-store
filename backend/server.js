// ===============================
// Alfaraz Auto Spare Parts Backend (PostgreSQL-ready)
// ===============================

const express = require("express");
const { Pool } = require("pg");
const bodyParser = require("body-parser");
const cors = require("cors");
const bcrypt = require("bcrypt");
const path = require("path");

const app = express();
const PORT = 4000;

// ---------- Middleware ----------
app.use(bodyParser.json());
app.use(cors());

// ---------- Database ----------
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

console.log("✅ Attempting to connect to PostgreSQL...");

// ---------- Create Tables (if they don't exist) ----------
async function initializeDatabase() {
  try {
    const client = await pool.connect();
    console.log("✅ Connected to PostgreSQL DB.");

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT,
        email TEXT UNIQUE,
        password TEXT
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS admin (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE,
        password TEXT
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS spare_parts (
        id SERIAL PRIMARY KEY,
        name TEXT,
        price DECIMAL(10, 2),
        quantity INTEGER
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        part_id INTEGER REFERENCES spare_parts(id),
        quantity INTEGER,
        total_price DECIMAL(10, 2),
        order_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ---------- Seed Admin ----------
    const adminUsername = "Muhammad Ahsan Ali";
    const adminPlainPassword = "Sprinter@6001";

    const res = await client.query("SELECT * FROM admin WHERE username = $1", [
      adminUsername,
    ]);

    if (res.rows.length === 0) {
      const hashed = await bcrypt.hash(adminPlainPassword, 10);
      await client.query(
        "INSERT INTO admin (username, password) VALUES ($1, $2)",
        [adminUsername, hashed]
      );
      console.log(`✅ Admin seeded -> username: "${adminUsername}"`);
    } else {
      console.log("ℹ️ Admin user already exists in DB.");
    }

    client.release();
  } catch (err) {
    console.error("❌ Database initialization error:", err.stack);
    process.exit(1);
  }
}

initializeDatabase();

// ---------- Helper ----------
function isEmailValid(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ===============================
// FRONTEND SERVING
// ===============================

const frontendPath = path.join(__dirname, "../frontend");

// Serve root route
app.get("/", (req, res) => {
  res.sendFile(path.join(frontendPath, "login.html"));
});

// Serve static frontend files
app.use(express.static(frontendPath));

// ===============================
// BACKEND ROUTES (Updated for PostgreSQL)
// ===============================

// ---- User Signup ----
app.post("/user/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ error: "All fields required" });

    if (!isEmailValid(email))
      return res.status(400).json({ error: "Invalid email" });

    if (password.length < 8)
      return res
        .status(400)
        .json({ error: "Password must be at least 8 characters" });

    const hashed = await bcrypt.hash(password, 10);

    const result = await pool.query(
      "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id",
      [name, email, hashed]
    );

    res.json({
      message: "User registered successfully",
      userId: result.rows[0].id,
    });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(400).json({ error: "Email already registered" });
    }
    res.status(500).json({ error: err.message });
  }
});

// ---- User Login ----
app.post("/user/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: "Email and password required" });

    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    const user = result.rows[0];

    if (!user) return res.status(400).json({ error: "User not found" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ error: "Wrong password" });

    res.json({ message: "Login successful", userId: user.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- Admin Login ----
app.post("/admin/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password)
      return res.status(400).json({ error: "Username and password required" });

    const result = await pool.query(
      "SELECT * FROM admin WHERE username = $1",
      [username]
    );
    const admin = result.rows[0];

    if (!admin) return res.status(400).json({ error: "Admin not found" });

    const ok = await bcrypt.compare(password, admin.password);
    if (!ok) return res.status(400).json({ error: "Wrong password" });

    res.json({ message: "Admin login successful" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- Spare Parts ----
app.get("/parts", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM spare_parts ORDER BY id DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/parts", async (req, res) => {
  try {
    const { name, price, quantity } = req.body;

    if (!name || price == null || quantity == null)
      return res.status(400).json({ error: "name, price, and quantity required" });

    const p = parseFloat(price),
      q = parseInt(quantity);

    if (isNaN(p) || isNaN(q) || p < 0 || q < 0)
      return res.status(400).json({ error: "Invalid price or quantity" });

    const result = await pool.query(
      "INSERT INTO spare_parts (name, price, quantity) VALUES ($1, $2, $3) RETURNING id",
      [name, p, q]
    );

    res.json({ message: "Part added", partId: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/parts/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const { name, price, quantity } = req.body;

    const p = parseFloat(price),
      q = parseInt(quantity);

    if (!name || isNaN(p) || isNaN(q))
      return res.status(400).json({ error: "Invalid data" });

    const result = await pool.query(
      "UPDATE spare_parts SET name=$1, price=$2, quantity=$3 WHERE id=$4",
      [name, p, q, id]
    );

    if (result.rowCount === 0)
      return res.status(404).json({ error: "Part not found" });

    res.json({ message: "Part updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/parts/:id", async (req, res) => {
  try {
    const result = await pool.query("DELETE FROM spare_parts WHERE id=$1", [
      req.params.id,
    ]);

    if (result.rowCount === 0)
      return res.status(404).json({ error: "Part not found" });

    res.json({ message: "Part deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- Orders ----
app.post("/cart/checkout", async (req, res) => {
  const { user_id, items } = req.body;

  if (!user_id || !Array.isArray(items) || items.length === 0)
    return res.status(400).json({ error: "user_id and items required" });

  const client = await pool.connect();

  try {
    let total = 0;
    await client.query("BEGIN");

    for (const it of items) {
      const part_id = it.part_id;
      const quantity = parseInt(it.quantity);
      const price = parseFloat(it.price);
      const rowTotal = price * quantity;
      total += rowTotal;

      await client.query(
        "INSERT INTO orders (user_id, part_id, quantity, total_price) VALUES ($1, $2, $3, $4)",
        [user_id, part_id, quantity, rowTotal]
      );

      await client.query(
        "UPDATE spare_parts SET quantity = quantity - $1 WHERE id = $2",
        [quantity, part_id]
      );
    }

    await client.query("COMMIT");
    res.json({ message: "Order placed", total: parseFloat(total.toFixed(2)) });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.get("/orders/:user_id", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT o.*, p.name AS part_name 
       FROM orders o 
       LEFT JOIN spare_parts p ON o.part_id = p.id 
       WHERE o.user_id = $1 
       ORDER BY o.order_date DESC`,
      [req.params.user_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/orders", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT o.*, u.name AS user_name, p.name AS part_name
       FROM orders o 
       LEFT JOIN users u ON o.user_id = u.id 
       LEFT JOIN spare_parts p ON o.part_id = p.id 
       ORDER BY o.order_date DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- Start Server ----------
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
