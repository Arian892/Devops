import express from "express";
import { jwtVerify, createRemoteJWKSet } from "jose";
import { injectGremlin } from "./gremlin.js";
import pg from "pg";

const app = express();
app.use(express.json());

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const JWKS = createRemoteJWKSet(new URL(process.env.AUTH_JWKS_URL));

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer "))
    return res.status(401).json({ error: "Missing token" });

  const token = authHeader.split(" ")[1];

  try {
    console.log("Expected Iss:", process.env.JWT_ISSUER);

    const { payload } = await jwtVerify(token, JWKS, {
      issuer: process.env.JWT_ISSUER,
      audience: process.env.JWT_AUDIENCE,
    });
    console.log("Token Iss:", payload.iss);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: "Unauthorized: " + e.message });
  }
};

export const authorize = (allowedRoles = []) => {
  return async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer "))
      return res.status(401).json({ error: "Missing token" });
    const token = authHeader.split(" ")[1];
    try {
      const { payload } = await jwtVerify(token, JWKS, {
        issuer: process.env.JWT_ISSUER,
        audience: process.env.JWT_AUDIENCE,
      });
      if (allowedRoles.length > 0 && !allowedRoles.includes(payload.role)) {
        return res.status(403).json({
          error: `Forbidden: This action requires one of these roles: ${allowedRoles.join(", ")}`,
        });
      }
      req.user = payload;
      next();
    } catch (e) {
      return res.status(401).json({ error: "Unauthorized: " + e.message });
    }
  };
};

app.use(
  "/api/inventory-service/update-stock",
  injectGremlin({
    failureRate: 0.9,
    minDelay: 2000,
    maxDelay: 7000,
  }),
);

app.get(
  "/api/inventory-service/preferences",
  async (req, res) => {
    try {
      const { rows } = await pool.query(
        "SELECT * FROM user_preferences WHERE user_id = $1",
        [req.user.id],
      );
      res.json({ user: req.user.email, preferences: rows[0] || {} });
    } catch (err) {
      res.status(500).json({ error: "Database error" });
    }
  },
);

app.post(
  "/api/inventory-service/restock", 
  async (req, res) => {
    const { productId, quantity } = req.body;

    if (!productId || !quantity || quantity <= 0) {
      return res.status(400).json({ error: "Invalid product or quantity" });
    }

    try {
      const result = await pool.query(
        `INSERT INTO inventory_service.inventory (product_id, quantity)
         VALUES ($1, $2)
         ON CONFLICT (product_id) 
         DO UPDATE SET quantity = inventory.quantity + $2
         RETURNING *`,
        [productId, quantity]
      );

      res.status(200).json({ 
        message: "Stock updated successfully", 
        item: result.rows[0] 
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Database error during restock" });
    }
  }
);

app.post("/api/inventory-service/update-stock", async (req, res) => {
  const { productId, quantity, orderId } = req.body;
  try {
    const result = await pool.query(
      `UPDATE inventory_service.inventory 
             SET quantity = quantity - $1 
             WHERE product_id = $2 AND quantity >= $1
             RETURNING *`,
      [quantity, productId],
    );

    if (result.rowCount === 0) {
      return res.status(400).json({ error: "Insufficient stock" });
    }
    res.status(200).json({ status: "success", stock: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// app.post("/api/inventory-service/update-stock", authorize(["admin"]), async (req, res) => {
//   const { productId, quantity, requestId } = req.body; // Using requestId instead of orderId

//   const client = await pool.connect();
//   try {
//     await client.query('BEGIN');

//     const alreadyDone = await client.query(
//       "INSERT INTO inventory_service.processed_transactions (request_id) VALUES ($1) ON CONFLICT DO NOTHING",
//       [requestId]
//     );

//     if (alreadyDone.rowCount === 0) {
//       await client.query('ROLLBACK');
//       return res.status(200).json({ status: "success", message: "Duplicate request ignored" });
//     }

//     const result = await client.query(
//       `UPDATE inventory_service.inventory SET quantity = quantity - $1 
//        WHERE product_id = $2 AND quantity >= $1 RETURNING *`,
//       [quantity, productId]
//     );

//     if (result.rowCount === 0) {
//       throw new Error("INSUFFICIENT_STOCK");
//     }

//     await client.query('COMMIT');
//     res.json({ status: "success" });

//   } catch (err) {
//     await client.query('ROLLBACK');
//     const status = err.message === "INSUFFICIENT_STOCK" ? 400 : 500;
//     res.status(status).json({ error: err.message });
//   } finally {
//     client.release();
//   }
// });

const PORT = 3001;
app.listen(PORT, () =>
  console.log(`Inventory service running on internal port ${PORT}`),
);
